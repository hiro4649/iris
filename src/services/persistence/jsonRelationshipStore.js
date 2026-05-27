import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { assertCandidateNotExecutable, ContractError } from "../../core/contracts.js";
import { inferSensitivityLevel, redactSensitiveText } from "../safety/privacyGuards.js";
import { classifyStoreReadError } from "./storeStatusErrors.js";
import { withJsonStoreWriteLock, writeJsonFileAtomic } from "./jsonStoreWriteSafety.js";

const STORE_SCHEMA = "iris_relationship_store_v1";
const UNSAFE_PUBLIC_RELATIONSHIP_TEXT_PATTERN =
  /\b(world_command|input_action|input_action_candidate|approved_game_input_action|execute|commit|write|apply|memory_write|direct_memory_write|commit_memory|authorization|bearer|api[_-]?key|oauth|access[_-]?token|refresh[_-]?token|token|secret|password|endpoint|url)\b|https?:\/\//i;
const FORBIDDEN_RELATIONSHIP_PUBLIC_FIELDS = new Set([
  "world_command",
  "input_action",
  "input_action_candidate",
  "approved_game_input_action",
  "execute",
  "commit",
  "write",
  "apply",
  "memory_write",
  "direct_memory_write",
  "commit_memory",
  "relationship_update_candidate",
  "internal_relationship_stage",
  "memory_carryover_candidates",
  "community_memory_candidates",
  "approved_memory_record",
  "approved_relationship_record",
  "affinity_score",
  "familiarity_score",
  "relationship_score",
  "relation_score",
  "hidden_rank",
  "hidden_relationship_rank",
  "intent",
  "action_type",
  "emotion",
  "tone",
  "character_tag",
  "task_type",
  "conversation_state",
  "endpoint",
  "url",
  "filePath",
  "file_path",
  "memory_store_path",
  "relationship_store_path",
  "store_path",
  "api_key",
  "apiKey",
  "oauth_token",
  "oauthToken",
  "access_token",
  "refresh_token",
  "token",
  "secret",
  "password",
  "authorization",
]);
const FORBIDDEN_RELATIONSHIP_PERSISTED_FIELDS = new Set(
  [...FORBIDDEN_RELATIONSHIP_PUBLIC_FIELDS].filter(
    (field) => !["affinity_score", "familiarity_score"].includes(field)
  )
);
const JSON_RELATIONSHIP_STORE_STATUS_FIELDS = new Set([
  "schema",
  "health",
  "store_available",
  "read_error",
  "error_kind",
  "profile_count",
  "latest_interaction_at_ms",
  "relationship_level_counts",
  "max_profiles",
  "recent_summary_limit",
  "retention_enabled",
  "persistence_operation_status",
  "durability",
  "boundary_policy",
]);
const JSON_RELATIONSHIP_STORE_STATUS_BOUNDARY_POLICY = {
  counts_only: true,
  no_profile_payloads: true,
  approved_schema_only: true,
  no_hidden_scores: true,
  no_store_paths: true,
  no_error_messages: true,
};
const RELATIONSHIP_PROFILE_PUBLIC_FIELDS = new Set([
  "schema",
  "linked_identity_id",
  "display_name",
  "relationship_level",
  "interaction_count",
  "last_interaction_at_ms",
  "recent_summaries",
  "public_boundary",
]);
const RELATIONSHIP_ADMIN_ORDINARY_VIEW_FIELDS = new Set([
  "schema",
  "display_name",
  "public_relationship_level",
  "moderation_status",
  "interaction_count",
  "recent_summary_count",
  "public_summary",
  "owner_only_available",
  "boundary_policy",
]);
const RELATIONSHIP_ADMIN_ORDINARY_BOUNDARY_POLICY = {
  public_level_and_status_only: true,
  internal_stage_role_gated: true,
  no_internal_stage: true,
  no_hidden_scores: true,
  no_private_viewer_id: true,
  no_raw_memory: true,
  no_raw_support: true,
  no_candidates: true,
  no_commands: true,
};

export function createJsonRelationshipStore(
  filePath,
  { maxProfiles = 5000, recentSummaryLimit = 5 } = {}
) {
  const persistenceOperation = createPersistenceOperationTracker();
  const backupWriteOperation = createBackupWriteOperationTracker();
  const retention = {
    maxProfiles: clampInteger(maxProfiles, 1, 100_000, 5000),
    recentSummaryLimit: clampInteger(recentSummaryLimit, 1, 50, 5),
  };
  return {
    filePath,
    getProfile(linkedIdentityId) {
      if (!linkedIdentityId) return null;
      const state = readStateWithRecovery(filePath).state;
      return state.profiles[linkedIdentityId] ?? null;
    },
    listProfiles() {
      return Object.values(readStateWithRecovery(filePath).state.profiles);
    },
    summarize(linkedIdentityId) {
      const profile = this.getProfile(linkedIdentityId);
      if (!profile) return null;
      const latest = sanitizePublicRelationshipSummary(profile.recent_summaries.at(-1));
      const closeness =
        profile.familiarity_score >= 0.5 || profile.interaction_count >= 4
          ? "familiar"
          : profile.interaction_count >= 2
            ? "returning"
            : "new";
      return `${closeness} viewer${latest ? `, last: ${latest}` : ""}`;
    },
    upsertApproved(record) {
      assertApprovedRelationshipRecordShape(record, "JSON relationship store upsert");
      markPersistenceOperationAttempt(persistenceOperation);
      try {
        return withJsonStoreWriteLock(filePath, () => {
          const state = readStateWithRecovery(filePath).state;
          const existing = state.profiles[record.linked_identity_id] ?? createEmptyProfile(record);
          const recordKey = relationshipRecordKey(record);
          const committedRecordKeys = Array.isArray(existing.committed_record_keys)
            ? existing.committed_record_keys
            : [];
          if (recordKey && committedRecordKeys.includes(recordKey)) {
            markPersistenceOperationSuccess(persistenceOperation);
            return {
              ...existing,
              committed_record_keys: committedRecordKeys,
              duplicate_record_ignored: true,
            };
          }
          const updated = {
            ...existing,
            display_name: record.display_name ?? existing.display_name,
            affinity_score: clamp01(existing.affinity_score + record.affinity_delta),
            familiarity_score: clamp01(existing.familiarity_score + record.familiarity_delta),
            interaction_count: existing.interaction_count + 1,
            last_interaction_at_ms: record.committed_at_ms,
            recent_summaries: [...existing.recent_summaries, record.summary]
              .filter(Boolean)
              .slice(-retention.recentSummaryLimit),
            committed_record_keys: recordKey
              ? [...committedRecordKeys, recordKey].slice(-retention.maxProfiles)
              : committedRecordKeys,
          };
          state.profiles[record.linked_identity_id] = updated;
          writeState(filePath, applyProfileRetention(state, retention), backupWriteOperation);
          markPersistenceOperationSuccess(persistenceOperation);
          return updated;
        });
      } catch (error) {
        markPersistenceOperationError(persistenceOperation, error);
        throw error;
      }
    },
    status() {
      const { profiles, errorKind, recovery } = readProfilesForStatus(filePath);
      const status = {
        schema: "iris_json_relationship_store_status_v1",
        health: errorKind ? "attention" : "ready",
        store_available: !errorKind,
        read_error: Boolean(errorKind),
        error_kind: errorKind,
        profile_count: profiles.length,
        latest_interaction_at_ms: latestProfileTime(profiles),
        relationship_level_counts: countRelationshipLevels(profiles),
        max_profiles: retention.maxProfiles,
        recent_summary_limit: retention.recentSummaryLimit,
        retention_enabled: true,
        persistence_operation_status: createPersistenceOperationStatus(persistenceOperation),
        durability: createDurabilityStatus(filePath, recovery, backupWriteOperation),
        boundary_policy: { ...JSON_RELATIONSHIP_STORE_STATUS_BOUNDARY_POLICY },
      };
      assertJsonRelationshipStoreStatusSafe(status);
      return status;
    },
  };
}

export function assertJsonRelationshipStoreStatusSafe(
  status,
  context = "JSON relationship store status"
) {
  if (!status || typeof status !== "object" || Array.isArray(status)) {
    throw new ContractError(`${context}: status must be an object`);
  }
  if (status.schema !== "iris_json_relationship_store_status_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(status)) {
    if (!JSON_RELATIONSHIP_STORE_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected status field`, { field });
    }
  }
  if (!["ready", "attention"].includes(status.health)) {
    throw new ContractError(`${context}: invalid health`);
  }
  assertExactBoundaryPolicy(
    status.boundary_policy,
    JSON_RELATIONSHIP_STORE_STATUS_BOUNDARY_POLICY,
    context
  );
  for (const key of Object.keys(JSON_RELATIONSHIP_STORE_STATUS_BOUNDARY_POLICY)) {
    if (status.boundary_policy[key] !== true) {
      throw new ContractError(`${context}: boundary policy ${key} must be true`);
    }
  }
  assertNoForbiddenRelationshipPublicFields(status, context);
}

const RELATIONSHIP_LEVELS = [
  "new",
  "recognized",
  "familiar",
  "trusted",
  "long_term_friend",
  "bounded",
];
const MODERATION_PUBLIC_LEVEL_OVERRIDE_STATUSES = new Set([
  "muted",
  "blocked",
  "limited",
  "bounded",
]);

function countRelationshipLevels(profiles) {
  const counts = Object.fromEntries(RELATIONSHIP_LEVELS.map((level) => [level, 0]));
  for (const profile of profiles) {
    const level = relationshipLevel(profile);
    if (Object.hasOwn(counts, level)) counts[level] += 1;
  }
  return counts;
}

export function approveRelationshipCandidate(
  phase05,
  phase15,
  { enableRelationshipMemory = false } = {}
) {
  if (enableRelationshipMemory !== true) return null;
  if (phase15.final_normalized_status !== "safe") return null;
  const candidate = phase05.relationship_candidate;
  if (!candidate) return null;

  assertCandidateNotExecutable(candidate, "Phase05 relationship candidate approval");
  if (candidate.candidate_kind !== "relationship_memory") {
    throw new ContractError("unsupported relationship candidate kind", {
      candidate_kind: candidate.candidate_kind,
    });
  }

  return {
    schema: "approved_relationship_record",
    approved: true,
    trace_id: candidate.trace_id,
    event_id: candidate.event_id,
    linked_identity_id: candidate.linked_identity_id,
    display_name: candidate.display_name,
    store: candidate.relationship_store,
    affinity_delta: candidate.affinity_delta,
    familiarity_delta: candidate.familiarity_delta,
    topic_key: candidate.topic_key,
    summary: candidate.summary,
    audit_status: "approved",
    commit_snapshot_id: `snapshot:phase05:${candidate.event_id}`,
    rollback_pointer_id: `rollback:phase05:${candidate.event_id}`,
    moderation_precheck_status: "allowed",
    committed_at_ms: Date.now(),
  };
}

export function commitApprovedRelationshipRecord(relationshipStore, approvedRecord) {
  if (!approvedRecord) return { committed: false, reason: "no_approved_record" };
  if (
    approvedRecord.schema !== "approved_relationship_record" ||
    approvedRecord.approved !== true
  ) {
    throw new ContractError("relationship writer received non-approved record");
  }
  const profile = relationshipStore.upsertApproved(approvedRecord);
  if (profile.duplicate_record_ignored === true) {
    return {
      committed: false,
      reason: "duplicate_relationship_record",
      record: approvedRecord,
      profile,
    };
  }
  return { committed: true, record: approvedRecord, profile };
}

export function sanitizeRelationshipProfileForPublicState(profile) {
  if (!profile) return null;
  const publicProfile = {
    schema: "iris_relationship_profile_public_v1",
    linked_identity_id: sanitizePublicRelationshipIdentityId(profile.linked_identity_id),
    display_name: sanitizePublicDisplayName(profile.display_name),
    relationship_level: publicRelationshipLevelForProfile(profile),
    interaction_count: Number(profile.interaction_count ?? 0),
    last_interaction_at_ms: profile.last_interaction_at_ms ?? null,
    recent_summaries: sanitizePublicRelationshipSummaries(profile.recent_summaries),
    public_boundary: {
      public_relationship_level_only: true,
      no_internal_stage: true,
      no_scores: true,
      no_hidden_order: true,
      no_hidden_scores: true,
      no_viewer_ranking: true,
      no_exclusive_claims: true,
      no_private_summaries: true,
    },
  };
  assertRelationshipProfilePublicSafe(publicProfile);
  return publicProfile;
}

export function mapInternalRelationshipStageToPublicLevel(stage) {
  const normalizedStage = clampInteger(stage, 0, 99, 0);
  if (normalizedStage >= 80) return "long_term_friend";
  if (normalizedStage >= 55) return "trusted";
  if (normalizedStage >= 30) return "familiar";
  if (normalizedStage >= 8) return "recognized";
  return "new";
}

function sanitizePublicRelationshipSummaries(summaries) {
  if (!Array.isArray(summaries)) return [];
  return summaries
    .slice(-5)
    .map((summary) => sanitizePublicRelationshipSummary(summary))
    .filter(Boolean);
}

function sanitizePublicRelationshipSummary(summary) {
  const sensitivity = inferSensitivityLevel(summary);
  if (sensitivity === "private" || sensitivity === "sensitive") return null;
  const text = redactSensitiveText(summary, { maxLength: 220 });
  if (!text || UNSAFE_PUBLIC_RELATIONSHIP_TEXT_PATTERN.test(text)) return null;
  return text;
}

function sanitizePublicDisplayName(value) {
  const text = String(value ?? "viewer")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  if (!text || UNSAFE_PUBLIC_RELATIONSHIP_TEXT_PATTERN.test(text)) return "viewer";
  return text;
}

function sanitizePublicRelationshipIdentityId(value) {
  const text = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
  if (!text || UNSAFE_PUBLIC_RELATIONSHIP_TEXT_PATTERN.test(text)) return null;
  return text;
}

export function sanitizeRelationshipProfilesForPublicState(profiles) {
  if (!Array.isArray(profiles)) return [];
  return profiles.map((profile) => sanitizeRelationshipProfileForPublicState(profile)).filter(Boolean);
}

export function createRelationshipAdminOrdinaryViewSummary(profile) {
  const publicProfile = sanitizeRelationshipProfileForPublicState(profile);
  const recentSummaryCount = Array.isArray(publicProfile?.recent_summaries)
    ? publicProfile.recent_summaries.length
    : 0;
  const summary = {
    schema: "iris_relationship_admin_ordinary_view_summary_v1",
    display_name: publicProfile?.display_name ?? "viewer",
    public_relationship_level: publicProfile?.relationship_level ?? "new",
    moderation_status: safePublicModerationStatus(moderationPublicLevelStatus(profile)),
    interaction_count: Number(publicProfile?.interaction_count ?? 0),
    recent_summary_count: recentSummaryCount,
    public_summary: recentSummaryCount > 0 ? "safe_public_summary_available" : "none",
    owner_only_available:
      profile?.internal_relationship_stage !== undefined ||
      profile?.affinity_score !== undefined ||
      profile?.familiarity_score !== undefined,
    boundary_policy: { ...RELATIONSHIP_ADMIN_ORDINARY_BOUNDARY_POLICY },
  };
  assertRelationshipAdminOrdinaryViewSummarySafe(summary);
  return summary;
}

export function assertRelationshipAdminOrdinaryViewSummarySafe(
  summary,
  context = "relationship admin ordinary view summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary must be an object`);
  }
  for (const field of Object.keys(summary)) {
    if (!RELATIONSHIP_ADMIN_ORDINARY_VIEW_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected summary field`, { field });
    }
  }
  if (summary.schema !== "iris_relationship_admin_ordinary_view_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!RELATIONSHIP_LEVELS.includes(summary.public_relationship_level)) {
    throw new ContractError(`${context}: invalid public level`);
  }
  if (!["allowed", "watch", "limited", "muted", "blocked", "bounded", "unknown"].includes(summary.moderation_status)) {
    throw new ContractError(`${context}: invalid moderation status`);
  }
  if (!Number.isInteger(summary.interaction_count) || summary.interaction_count < 0) {
    throw new ContractError(`${context}: invalid interaction count`);
  }
  if (!Number.isInteger(summary.recent_summary_count) || summary.recent_summary_count < 0) {
    throw new ContractError(`${context}: invalid recent summary count`);
  }
  if (!["safe_public_summary_available", "none"].includes(summary.public_summary)) {
    throw new ContractError(`${context}: invalid public summary`);
  }
  if (typeof summary.owner_only_available !== "boolean") {
    throw new ContractError(`${context}: invalid owner-only gate`);
  }
  assertExactBoundaryPolicy(
    summary.boundary_policy,
    RELATIONSHIP_ADMIN_ORDINARY_BOUNDARY_POLICY,
    context
  );
  assertNoForbiddenRelationshipPublicFields(summary, context);
}

export function assertRelationshipProfilePublicSafe(profile, context = "relationship profile public") {
  if (!profile || typeof profile !== "object") {
    throw new ContractError(`${context}: missing profile`);
  }
  assertNoForbiddenRelationshipPublicFields(profile, context);
  if (profile.schema !== "iris_relationship_profile_public_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: profile.schema });
  }
  if (!RELATIONSHIP_LEVELS.includes(profile.relationship_level)) {
    throw new ContractError(`${context}: invalid public relationship level`, {
      relationship_level: profile.relationship_level,
    });
  }
  for (const field of Object.keys(profile)) {
    if (!RELATIONSHIP_PROFILE_PUBLIC_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected public profile field`, { field });
    }
  }
}

function createEmptyProfile(record) {
  return {
    linked_identity_id: record.linked_identity_id,
    display_name: record.display_name ?? "viewer",
    affinity_score: 0,
    familiarity_score: 0,
    interaction_count: 0,
    last_interaction_at_ms: null,
    recent_summaries: [],
    committed_record_keys: [],
  };
}

function assertApprovedRelationshipRecordShape(record, context) {
  assertNoForbiddenRelationshipPublicFields(record, context);
  if (record?.schema !== "approved_relationship_record" || record.approved !== true) {
    throw new ContractError(`${context}: invalid approved relationship record`);
  }
  if (!record.linked_identity_id) {
    throw new ContractError(`${context}: linked_identity_id is required`);
  }
  assertRollbackGuardFields(record, context);
}

function assertRollbackGuardFields(record, context) {
  for (const field of [
    "audit_status",
    "commit_snapshot_id",
    "rollback_pointer_id",
    "moderation_precheck_status",
  ]) {
    if (typeof record[field] !== "string" || record[field].trim() === "") {
      throw new ContractError(`${context}: ${field} is required`);
    }
  }
  if (record.audit_status !== "approved") {
    throw new ContractError(`${context}: approved audit status required`);
  }
  if (record.moderation_precheck_status !== "allowed") {
    throw new ContractError(`${context}: allowed moderation precheck required`);
  }
}

function relationshipRecordKey(record) {
  if (!record || typeof record !== "object") return "";
  if (record.relationship_record_id) return `relationship_id:${record.relationship_record_id}`;
  if (!record.event_id) return "";
  return [
    "event",
    record.event_id,
    record.source_phase ?? "phase05",
    record.source_candidate_kind ?? record.topic_key ?? "relationship",
  ].join(":");
}

function relationshipLevel(profile) {
  const affinity = Number(profile.affinity_score ?? 0);
  const familiarity = Number(profile.familiarity_score ?? 0);
  const interactions = Number(profile.interaction_count ?? 0);
  if (affinity < 0.15 && interactions >= 1) return "bounded";
  if (interactions >= 20 || familiarity >= 0.85) return "long_term_friend";
  if (interactions >= 10 || familiarity >= 0.65) return "trusted";
  if (interactions >= 4 || familiarity >= 0.4) return "familiar";
  if (interactions >= 2 || familiarity >= 0.1) return "recognized";
  return "new";
}

function publicRelationshipLevelForProfile(profile) {
  if (MODERATION_PUBLIC_LEVEL_OVERRIDE_STATUSES.has(moderationPublicLevelStatus(profile))) {
    return "bounded";
  }
  if (profile?.internal_relationship_stage !== undefined) {
    return mapInternalRelationshipStageToPublicLevel(profile.internal_relationship_stage);
  }
  return relationshipLevel(profile);
}

function moderationPublicLevelStatus(profile) {
  return String(
    profile?.moderation_relationship_status ??
      profile?.moderation_status ??
      profile?.public_relationship_moderation_status ??
      ""
  )
    .trim()
    .toLowerCase();
}

function safePublicModerationStatus(value) {
  const status = String(value ?? "").trim().toLowerCase();
  if (["allowed", "watch", "limited", "muted", "blocked", "bounded"].includes(status)) {
    return status;
  }
  return "unknown";
}

function readState(filePath) {
  if (!existsSync(filePath)) return { schema: STORE_SCHEMA, profiles: {} };
  const raw = readFileSync(filePath, "utf8");
  if (!raw.trim()) return { schema: STORE_SCHEMA, profiles: {} };
  const parsed = JSON.parse(raw);
  if (parsed.schema !== STORE_SCHEMA || typeof parsed.profiles !== "object") {
    throw new ContractError("relationship store file has an invalid schema", { filePath });
  }
  assertRelationshipStateShape(parsed, "JSON relationship store file");
  return parsed;
}

function assertRelationshipStateShape(state, context) {
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new ContractError(`${context}: invalid relationship store state`);
  }
  if (state.schema !== STORE_SCHEMA || !state.profiles || typeof state.profiles !== "object") {
    throw new ContractError(`${context}: invalid relationship store schema`);
  }
  if (Array.isArray(state.profiles)) {
    throw new ContractError(`${context}: relationship profiles must be an object`);
  }
  for (const [profileKey, profile] of Object.entries(state.profiles)) {
    assertRelationshipProfileShape(profile, `${context} profile`);
    if (profile.linked_identity_id !== profileKey) {
      throw new ContractError(`${context}: relationship profile key mismatch`);
    }
  }
}

function assertRelationshipProfileShape(profile, context) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    throw new ContractError(`${context}: invalid relationship profile`);
  }
  assertNoForbiddenRelationshipPersistedFields(profile, context);
  if (!profile.linked_identity_id) {
    throw new ContractError(`${context}: linked_identity_id is required`);
  }
  if (
    profile.recent_summaries !== undefined &&
    !Array.isArray(profile.recent_summaries)
  ) {
    throw new ContractError(`${context}: recent summaries must be an array`);
  }
  if (
    profile.committed_record_keys !== undefined &&
    !Array.isArray(profile.committed_record_keys)
  ) {
    throw new ContractError(`${context}: committed record keys must be an array`);
  }
}

function readProfilesForStatus(filePath) {
  try {
    const recovered = readStateWithRecovery(filePath);
    return {
      profiles: Object.values(recovered.state.profiles),
      errorKind: null,
      recovery: recovered.recovery,
    };
  } catch (error) {
    return {
      profiles: [],
      errorKind: classifyStoreReadError(error),
      recovery: {
        backup_available: hasReadableBackup(filePath),
        recovered_from_backup: false,
        primary_error_kind: classifyStoreReadError(error),
      },
    };
  }
}

function writeState(filePath, state, backupWriteOperation = null) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeJsonAtomic(filePath, state);
  writeBackupSafely(filePath, state, backupWriteOperation);
}

function createPersistenceOperationTracker() {
  return {
    attempt_count: 0,
    success_count: 0,
    error_count: 0,
    last_success_at_ms: null,
    last_error_kind: null,
  };
}

function markPersistenceOperationAttempt(tracker) {
  tracker.attempt_count += 1;
}

function markPersistenceOperationSuccess(tracker) {
  tracker.success_count += 1;
  tracker.last_success_at_ms = Date.now();
  tracker.last_error_kind = null;
}

function markPersistenceOperationError(tracker, error) {
  tracker.error_count += 1;
  tracker.last_error_kind = classifyStoreReadError(error);
}

function createPersistenceOperationStatus(tracker) {
  return {
    schema: "iris_json_store_persistence_operation_status_v1",
    operation_health:
      tracker.last_error_kind !== null ? "attention" : tracker.success_count > 0 ? "ready" : "idle",
    attempt_count: tracker.attempt_count,
    success_count: tracker.success_count,
    error_count: tracker.error_count,
    last_success_at_ms: tracker.last_success_at_ms,
    last_error_kind: tracker.last_error_kind,
    boundary_policy: {
      counts_only: true,
      no_profile_payloads: true,
      no_store_paths: true,
      no_error_messages: true,
    },
  };
}

function createBackupWriteOperationTracker() {
  return {
    attempt_count: 0,
    success_count: 0,
    error_count: 0,
    last_success_at_ms: null,
    last_error_kind: null,
  };
}

function markBackupWriteSuccess(tracker) {
  if (!tracker) return;
  tracker.attempt_count += 1;
  tracker.success_count += 1;
  tracker.last_success_at_ms = Date.now();
  tracker.last_error_kind = null;
}

function markBackupWriteError(tracker, error) {
  if (!tracker) return;
  tracker.attempt_count += 1;
  tracker.error_count += 1;
  tracker.last_error_kind = classifyStoreReadError(error);
}

function readStateWithRecovery(filePath) {
  const backupAvailable = hasReadableBackup(filePath);
  if (!existsSync(filePath) && backupAvailable) {
    return {
      state: readBackupState(filePath),
      recovery: {
        backup_available: true,
        recovered_from_backup: true,
        primary_error_kind: "store_location_unavailable",
      },
    };
  }
  try {
    return {
      state: readState(filePath),
      recovery: {
        backup_available: backupAvailable,
        recovered_from_backup: false,
        primary_error_kind: null,
      },
    };
  } catch (error) {
    let state;
    try {
      state = readBackupState(filePath);
    } catch {
      throw error;
    }
    return {
      state,
      recovery: {
        backup_available: true,
        recovered_from_backup: true,
        primary_error_kind: classifyStoreReadError(error),
      },
    };
  }
}

function hasReadableBackup(filePath) {
  try {
    readBackupState(filePath);
    return true;
  } catch {
    return false;
  }
}

function readBackupState(filePath) {
  const sidecarPath = backupPath(filePath);
  if (!existsSync(sidecarPath)) {
    throw new ContractError("relationship store backup is unavailable");
  }
  return readState(sidecarPath);
}

function writeBackupSafely(filePath, state, backupWriteOperation = null) {
  try {
    writeJsonAtomic(backupPath(filePath), state);
    markBackupWriteSuccess(backupWriteOperation);
  } catch (error) {
    markBackupWriteError(backupWriteOperation, error);
    // Primary persistence has already succeeded; backup health is reported by status().
  }
}

function backupPath(filePath) {
  return `${filePath}.bak`;
}

function createDurabilityStatus(filePath, recovery = {}, backupWriteOperation = null) {
  const backupErrorKind = backupWriteOperation?.last_error_kind ?? null;
  return {
    sidecar_backup_enabled: true,
    backup_available: hasReadableBackup(filePath),
    recovered_from_backup: recovery.recovered_from_backup === true,
    primary_read_error: Boolean(recovery.primary_error_kind),
    primary_error_kind: recovery.primary_error_kind ?? null,
    backup_write_health: backupErrorKind
      ? "attention"
      : backupWriteOperation?.success_count > 0
        ? "ready"
        : "idle",
    backup_write_error: Boolean(backupErrorKind),
    backup_error_kind: backupErrorKind,
    backup_write_attempt_count: backupWriteOperation?.attempt_count ?? 0,
    backup_write_success_count: backupWriteOperation?.success_count ?? 0,
    backup_write_error_count: backupWriteOperation?.error_count ?? 0,
    last_backup_write_at_ms: backupWriteOperation?.last_success_at_ms ?? null,
    boundary_policy: {
      counts_only: true,
      no_backup_payloads: true,
      no_store_paths: true,
      no_error_messages: true,
    },
  };
}

function applyProfileRetention(state, { maxProfiles }) {
  const profiles = Object.values(state.profiles).sort(
    (a, b) => safeProfileTime(a) - safeProfileTime(b)
  );
  const retained = profiles.slice(-maxProfiles);
  return {
    ...state,
    profiles: Object.fromEntries(retained.map((profile) => [profile.linked_identity_id, profile])),
  };
}

function writeJsonAtomic(filePath, value) {
  writeJsonFileAtomic(filePath, value);
}

function clamp01(value) {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return Number(value.toFixed(4));
}

function clampInteger(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(number)));
}

function safeProfileTime(profile) {
  const number = Number(profile?.last_interaction_at_ms ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function latestProfileTime(profiles) {
  const latest = profiles.reduce((max, profile) => Math.max(max, safeProfileTime(profile)), 0);
  return latest > 0 ? latest : null;
}

function assertNoForbiddenRelationshipPublicFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenRelationshipPublicFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_RELATIONSHIP_PUBLIC_FIELDS.has(field)) {
      throw new ContractError(`${context}: public relationship profile contains unsafe field`, {
        field,
        path,
      });
    }
    assertNoForbiddenRelationshipPublicFields(child, context, `${path}.${field}`);
  }
}

function assertNoForbiddenRelationshipPersistedFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenRelationshipPersistedFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_RELATIONSHIP_PERSISTED_FIELDS.has(field)) {
      throw new ContractError(`${context}: persisted relationship profile contains unsafe field`, {
        field,
        path,
      });
    }
    assertNoForbiddenRelationshipPersistedFields(child, context, `${path}.${field}`);
  }
}

function assertExactBoundaryPolicy(policy, expected, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy is missing`);
  }
  for (const field of Object.keys(policy)) {
    if (!Object.hasOwn(expected, field)) {
      throw new ContractError(`${context}: unexpected boundary policy ${field}`);
    }
  }
}
