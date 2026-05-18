import {
  ContractError,
  assertNoDirectCandidateCommit,
  assertNoDirectMemoryWrite,
  assertNoWorldCommand,
} from "../../core/contracts.js";
import {
  createExternalTopicReaction,
  sanitizeExternalTopicReactionForPublicState,
} from "../interaction/externalTopicReaction.js";
import {
  createMediaWatchReaction,
  sanitizeMediaWatchReactionForPublicState,
} from "../interaction/mediaWatchReaction.js";

const REPORT_FIELDS = new Set([
  "schema",
  "ok",
  "status",
  "external_real_evidence_status",
  "next_readiness_state",
  "production_ready_allowed",
  "go_no_go",
  "source_reference_summary",
  "reaction_guard_summary",
  "content_rights_summary",
  "production_handoff_summary",
  "boundary_policy",
]);

const SOURCE_REFERENCE_FIELDS = new Set([
  "schema",
  "reference_count",
  "source_kind_count",
  "source_kinds",
  "media_watch_status",
  "external_topic_status",
  "news_reference_status",
  "game_state_reference_status",
  "source_trust_label",
  "freshness_label",
  "real_external_source_evidence_status",
  "rights_evidence_status",
  "operator_confirmation_status",
]);

const REACTION_GUARD_FIELDS = new Set([
  "schema",
  "checked_reaction_count",
  "read_only_reference_count",
  "truth_claim_count",
  "memory_commit_count",
  "media_memory_candidate_count",
  "media_memory_candidate_requires_validation_count",
  "game_input_count",
  "world_command_count",
  "youtube_metadata_update_count",
  "obs_command_count",
  "viewer_suggestion_direct_action_count",
  "raw_leak_detected",
]);

const CONTENT_RIGHTS_FIELDS = new Set([
  "schema",
  "checked_media_count",
  "summary_only_count",
  "long_quote_reproduction_count",
  "raw_article_text_count",
  "raw_transcript_count",
  "lyrics_reproduction_count",
  "subtitle_reproduction_count",
  "existing_melody_reproduction_count",
]);

const HANDOFF_FIELDS = new Set([
  "schema",
  "fixture_observation_only",
  "real_external_ingest_not_started",
  "external_api_not_called",
  "youtube_metadata_not_changed",
  "obs_command_not_generated",
  "game_input_not_performed",
  "world_command_not_generated",
  "memory_commit_not_performed",
  "safe_summary_only",
  "production_ready_allowed",
  "go_no_go",
  "next_validation_script",
]);

const BOUNDARY_FIELDS = new Set([
  "media_watch_observation_read_only",
  "external_topic_reference_only",
  "news_reference_not_truth",
  "game_state_reference_not_truth",
  "source_trust_label_only",
  "freshness_label_only",
  "no_memory_commit_from_observation",
  "no_game_input_from_observation",
  "no_world_command_from_observation",
  "no_youtube_metadata_update",
  "no_obs_command",
  "no_raw_media_body",
  "no_raw_external_text",
  "no_raw_article_text",
  "no_raw_transcript",
  "no_long_quote_reproduction",
  "no_lyrics",
  "no_subtitle_reproduction",
  "no_existing_melody",
  "no_endpoint_values",
  "no_api_key_values",
  "no_token_values",
  "fixture_observation_not_real_ready",
  "production_ready_not_allowed",
]);

const SAFE_SOURCE_KINDS = [
  "media_watch_observation",
  "external_topic_reference",
  "news_reference",
  "game_state_reference",
];

export function createMediaExternalTopicIngestionBoundaryReport() {
  const mediaReaction = createMediaWatchReaction(createMediaWatchFixture());
  const topicReaction = createExternalTopicReaction(createExternalTopicFixture());
  const publicSummaries = [
    sanitizeMediaWatchReactionForPublicState(mediaReaction),
    sanitizeExternalTopicReactionForPublicState(topicReaction),
  ];
  for (const summary of publicSummaries) {
    assertNoWorldCommand(summary, "media external topic public summary");
    assertNoDirectMemoryWrite(summary, "media external topic public summary");
    assertNoDirectCandidateCommit(summary, "media external topic public summary");
  }

  const observedValues = [mediaReaction, topicReaction, publicSummaries];
  const mediaCandidate = mediaReaction.media_memory_candidate;
  const truthClaimCount =
    topicReaction.truth_guard_result?.truth_claim_allowed === true ? 1 : 0;
  const mediaCandidateCount = mediaCandidate ? 1 : 0;
  const mediaCandidateRequiresValidationCount =
    mediaCandidate?.requires_validation === true ? 1 : 0;

  const report = {
    schema: "iris_media_external_topic_ingestion_boundary_v1",
    ok: false,
    status: "blocked",
    external_real_evidence_status: "external_real_evidence_blocked",
    next_readiness_state: "operator_review_required",
    production_ready_allowed: false,
    go_no_go: "no_go",
    source_reference_summary: {
      schema: "iris_media_external_topic_source_reference_summary_v1",
      reference_count: SAFE_SOURCE_KINDS.length,
      source_kind_count: SAFE_SOURCE_KINDS.length,
      source_kinds: SAFE_SOURCE_KINDS,
      media_watch_status: "read_only_observation",
      external_topic_status: "reference_only",
      news_reference_status: "reference_only",
      game_state_reference_status: "reference_only",
      source_trust_label: "unverified_external_reference",
      freshness_label: "fixture_reference_only",
      real_external_source_evidence_status: "external_real_evidence_blocked",
      rights_evidence_status: "operator_review_required",
      operator_confirmation_status: "operator_review_required",
    },
    reaction_guard_summary: {
      schema: "iris_media_external_topic_reaction_guard_summary_v1",
      checked_reaction_count: 2,
      read_only_reference_count: 2,
      truth_claim_count: truthClaimCount,
      memory_commit_count: countFields(
        observedValues,
        FORBIDDEN_MEMORY_COMMIT_FIELD_NAMES
      ),
      media_memory_candidate_count: mediaCandidateCount,
      media_memory_candidate_requires_validation_count:
        mediaCandidateRequiresValidationCount,
      game_input_count: countFields(
        observedValues,
        FORBIDDEN_GAME_INPUT_FIELD_NAMES
      ),
      world_command_count: countFields(
        observedValues,
        FORBIDDEN_WORLD_COMMAND_FIELD_NAMES
      ),
      youtube_metadata_update_count: countFields(
        observedValues,
        FORBIDDEN_YOUTUBE_METADATA_FIELD_NAMES
      ),
      obs_command_count: countFields(
        observedValues,
        FORBIDDEN_OBS_COMMAND_FIELD_NAMES
      ),
      viewer_suggestion_direct_action_count: 0,
      raw_leak_detected: hasUnsafeValueLeak(publicSummaries),
    },
    content_rights_summary: {
      schema: "iris_media_external_topic_content_rights_summary_v1",
      checked_media_count: 1,
      summary_only_count: 1,
      long_quote_reproduction_count: 0,
      raw_article_text_count: 0,
      raw_transcript_count: 0,
      lyrics_reproduction_count: 0,
      subtitle_reproduction_count: 0,
      existing_melody_reproduction_count: 0,
    },
    production_handoff_summary: {
      schema: "iris_media_external_topic_production_handoff_summary_v1",
      fixture_observation_only: true,
      real_external_ingest_not_started: true,
      external_api_not_called: true,
      youtube_metadata_not_changed: true,
      obs_command_not_generated: true,
      game_input_not_performed: true,
      world_command_not_generated: true,
      memory_commit_not_performed: true,
      safe_summary_only: true,
      production_ready_allowed: false,
      go_no_go: "no_go",
      next_validation_script:
        "node scripts/dev-media-external-topic-ingestion-boundary.js",
    },
    boundary_policy: {
      media_watch_observation_read_only: true,
      external_topic_reference_only: true,
      news_reference_not_truth: true,
      game_state_reference_not_truth: true,
      source_trust_label_only: true,
      freshness_label_only: true,
      no_memory_commit_from_observation: true,
      no_game_input_from_observation: true,
      no_world_command_from_observation: true,
      no_youtube_metadata_update: true,
      no_obs_command: true,
      no_raw_media_body: true,
      no_raw_external_text: true,
      no_raw_article_text: true,
      no_raw_transcript: true,
      no_long_quote_reproduction: true,
      no_lyrics: true,
      no_subtitle_reproduction: true,
      no_existing_melody: true,
      no_endpoint_values: true,
      no_api_key_values: true,
      no_token_values: true,
      fixture_observation_not_real_ready: true,
      production_ready_not_allowed: true,
    },
  };

  report.ok =
    report.production_ready_allowed === false &&
    report.go_no_go === "no_go" &&
    report.source_reference_summary.reference_count === 4 &&
    report.reaction_guard_summary.truth_claim_count === 0 &&
    report.reaction_guard_summary.memory_commit_count === 0 &&
    report.reaction_guard_summary.game_input_count === 0 &&
    report.reaction_guard_summary.world_command_count === 0 &&
    report.reaction_guard_summary.youtube_metadata_update_count === 0 &&
    report.reaction_guard_summary.obs_command_count === 0 &&
    report.reaction_guard_summary.raw_leak_detected === false &&
    report.reaction_guard_summary.media_memory_candidate_count ===
      report.reaction_guard_summary
        .media_memory_candidate_requires_validation_count &&
    report.content_rights_summary.long_quote_reproduction_count === 0 &&
    report.content_rights_summary.raw_article_text_count === 0 &&
    report.content_rights_summary.raw_transcript_count === 0 &&
    report.content_rights_summary.lyrics_reproduction_count === 0 &&
    report.content_rights_summary.subtitle_reproduction_count === 0 &&
    report.content_rights_summary.existing_melody_reproduction_count === 0;

  assertMediaExternalTopicIngestionBoundaryReportSafe(report);
  return report;
}

export function assertMediaExternalTopicIngestionBoundaryReportSafe(
  report,
  context = "media external topic ingestion boundary"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError(`${context}: report required`);
  }
  if (report.schema !== "iris_media_external_topic_ingestion_boundary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(report)) {
    if (!REPORT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field`, { field });
    }
  }
  if (
    report.ok !== true ||
    report.status !== "blocked" ||
    report.external_real_evidence_status !== "external_real_evidence_blocked" ||
    report.next_readiness_state !== "operator_review_required" ||
    report.production_ready_allowed !== false ||
    report.go_no_go !== "no_go"
  ) {
    throw new ContractError(`${context}: no-go invariant mismatch`);
  }
  assertSourceReferenceSummarySafe(report.source_reference_summary, context);
  assertReactionGuardSummarySafe(report.reaction_guard_summary, context);
  assertContentRightsSummarySafe(report.content_rights_summary, context);
  assertProductionHandoffSummarySafe(report.production_handoff_summary, context);
  assertBoundaryPolicySafe(report.boundary_policy, context);
  assertNoWorldCommand(report, context);
  assertNoDirectMemoryWrite(report, context);
  assertNoDirectCandidateCommit(report, context);
  assertNoUnsafeReportLeak(report, context);
}

function createMediaWatchFixture() {
  const traceId = "media_external_boundary_media";
  const eventId = "media_external_boundary_media_event";
  return {
    event: {
      trace_id: traceId,
      event_id: eventId,
      source: "media_watch",
      payload: { payload_kind: "media_watch_observation" },
    },
    coreResult: {
      phase01: {
        trace_id: traceId,
        event_id: eventId,
        payload_kind: "media_watch_observation",
        media_watch_context: {
          media_kind: "short_clip",
          media_title: "fixture_media_reference",
          detected_mood: "surprise",
          observation_summary: "short summary only",
          rights_risk_note: "summary_only",
          confidence: 0.78,
        },
      },
      phase15: {
        trace_id: traceId,
        event_id: eventId,
        final_decision: "allow",
      },
    },
  };
}

function createExternalTopicFixture() {
  const traceId = "media_external_boundary_topic";
  const eventId = "media_external_boundary_topic_event";
  return {
    event: {
      trace_id: traceId,
      event_id: eventId,
      source: "external_topic",
      payload: { payload_kind: "external_topic_observation" },
    },
    coreResult: {
      phase01: {
        trace_id: traceId,
        event_id: eventId,
        payload_kind: "external_topic_observation",
        external_topic_context: {
          topic_title: "fixture_topic_reference",
          risk_category: "general",
          freshness_score: 0.72,
          source_trust_score: 0.64,
        },
      },
      phase15: {
        trace_id: traceId,
        event_id: eventId,
        final_decision: "allow",
      },
    },
  };
}

function assertSourceReferenceSummarySafe(summary, context) {
  assertFields(summary, SOURCE_REFERENCE_FIELDS, context, "source reference");
  if (
    summary.schema !== "iris_media_external_topic_source_reference_summary_v1" ||
    summary.reference_count !== SAFE_SOURCE_KINDS.length ||
    summary.source_kind_count !== SAFE_SOURCE_KINDS.length ||
    summary.media_watch_status !== "read_only_observation" ||
    summary.external_topic_status !== "reference_only" ||
    summary.news_reference_status !== "reference_only" ||
    summary.game_state_reference_status !== "reference_only" ||
    summary.source_trust_label !== "unverified_external_reference" ||
    summary.freshness_label !== "fixture_reference_only" ||
    summary.real_external_source_evidence_status !==
      "external_real_evidence_blocked" ||
    summary.rights_evidence_status !== "operator_review_required" ||
    summary.operator_confirmation_status !== "operator_review_required"
  ) {
    throw new ContractError(`${context}: source reference summary mismatch`);
  }
  assertSafeLabels(summary.source_kinds, SAFE_SOURCE_KINDS, context);
}

function assertReactionGuardSummarySafe(summary, context) {
  assertFields(summary, REACTION_GUARD_FIELDS, context, "reaction guard");
  for (const field of [
    "checked_reaction_count",
    "read_only_reference_count",
    "truth_claim_count",
    "memory_commit_count",
    "media_memory_candidate_count",
    "media_memory_candidate_requires_validation_count",
    "game_input_count",
    "world_command_count",
    "youtube_metadata_update_count",
    "obs_command_count",
    "viewer_suggestion_direct_action_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid reaction guard count`, {
        field,
      });
    }
  }
  if (
    summary.schema !== "iris_media_external_topic_reaction_guard_summary_v1" ||
    summary.checked_reaction_count !== 2 ||
    summary.read_only_reference_count !== 2 ||
    summary.truth_claim_count !== 0 ||
    summary.memory_commit_count !== 0 ||
    summary.game_input_count !== 0 ||
    summary.world_command_count !== 0 ||
    summary.youtube_metadata_update_count !== 0 ||
    summary.obs_command_count !== 0 ||
    summary.viewer_suggestion_direct_action_count !== 0 ||
    summary.raw_leak_detected !== false ||
    summary.media_memory_candidate_count !==
      summary.media_memory_candidate_requires_validation_count
  ) {
    throw new ContractError(`${context}: reaction guard invariant mismatch`);
  }
}

function assertContentRightsSummarySafe(summary, context) {
  assertFields(summary, CONTENT_RIGHTS_FIELDS, context, "content rights");
  for (const field of [
    "checked_media_count",
    "summary_only_count",
    "long_quote_reproduction_count",
    "raw_article_text_count",
    "raw_transcript_count",
    "lyrics_reproduction_count",
    "subtitle_reproduction_count",
    "existing_melody_reproduction_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid content rights count`, {
        field,
      });
    }
  }
  if (
    summary.schema !== "iris_media_external_topic_content_rights_summary_v1" ||
    summary.checked_media_count !== 1 ||
    summary.summary_only_count !== 1 ||
    summary.long_quote_reproduction_count !== 0 ||
    summary.raw_article_text_count !== 0 ||
    summary.raw_transcript_count !== 0 ||
    summary.lyrics_reproduction_count !== 0 ||
    summary.subtitle_reproduction_count !== 0 ||
    summary.existing_melody_reproduction_count !== 0
  ) {
    throw new ContractError(`${context}: content rights invariant mismatch`);
  }
}

function assertProductionHandoffSummarySafe(summary, context) {
  assertFields(summary, HANDOFF_FIELDS, context, "production handoff");
  for (const field of [
    "fixture_observation_only",
    "real_external_ingest_not_started",
    "external_api_not_called",
    "youtube_metadata_not_changed",
    "obs_command_not_generated",
    "game_input_not_performed",
    "world_command_not_generated",
    "memory_commit_not_performed",
    "safe_summary_only",
  ]) {
    if (summary[field] !== true) {
      throw new ContractError(`${context}: handoff flag failed`, { field });
    }
  }
  if (
    summary.schema !== "iris_media_external_topic_production_handoff_summary_v1" ||
    summary.production_ready_allowed !== false ||
    summary.go_no_go !== "no_go" ||
    summary.next_validation_script !==
      "node scripts/dev-media-external-topic-ingestion-boundary.js"
  ) {
    throw new ContractError(`${context}: handoff no-go mismatch`);
  }
}

function assertBoundaryPolicySafe(policy, context) {
  assertFields(policy, BOUNDARY_FIELDS, context, "boundary policy");
  for (const field of BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary flag failed`, { field });
    }
  }
}

function assertFields(value, expectedFields, context, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ContractError(`${context}: ${label} required`);
  }
  for (const field of Object.keys(value)) {
    if (!expectedFields.has(field)) {
      throw new ContractError(`${context}: unexpected ${label} field`, { field });
    }
  }
  for (const field of expectedFields) {
    if (!(field in value)) {
      throw new ContractError(`${context}: missing ${label} field`, { field });
    }
  }
}

function assertSafeLabels(labels, expectedLabels, context) {
  if (!Array.isArray(labels) || labels.length !== expectedLabels.length) {
    throw new ContractError(`${context}: invalid source label list`);
  }
  for (const label of labels) {
    if (!expectedLabels.includes(label) || !/^[a-z0-9_]+$/.test(label)) {
      throw new ContractError(`${context}: unsafe source label`, { label });
    }
  }
}

const FORBIDDEN_WORLD_COMMAND_FIELD_NAMES = new Set(["world_command"]);
const FORBIDDEN_MEMORY_COMMIT_FIELD_NAMES = new Set([
  "memory_write",
  "direct_memory_write",
  "commit_memory",
  "approved_memory_record",
  "approved_relationship_record",
]);
const FORBIDDEN_GAME_INPUT_FIELD_NAMES = new Set([
  "input_action",
  "input_action_candidate",
  "approved_game_input_action",
  "game_input",
  "os_input",
]);
const FORBIDDEN_YOUTUBE_METADATA_FIELD_NAMES = new Set([
  "youtube_metadata_update",
  "youtube_title",
  "youtube_description",
  "youtube_tags",
  "thumbnail_update",
]);
const FORBIDDEN_OBS_COMMAND_FIELD_NAMES = new Set([
  "obs_command",
  "obs_event",
  "obs_scene_update",
]);

function countFields(value, forbiddenFields, seen = new WeakSet()) {
  if (!value || typeof value !== "object") return 0;
  if (seen.has(value)) return 0;
  seen.add(value);
  if (Array.isArray(value)) {
    return value.reduce(
      (count, item) => count + countFields(item, forbiddenFields, seen),
      0
    );
  }
  let count = 0;
  for (const [field, child] of Object.entries(value)) {
    if (forbiddenFields.has(field)) count += 1;
    count += countFields(child, forbiddenFields, seen);
  }
  return count;
}

function hasUnsafeValueLeak(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return unsafeStringValue(value);
  if (Array.isArray(value)) return value.some((item) => hasUnsafeValueLeak(item));
  if (typeof value === "object") {
    return Object.values(value).some((item) => hasUnsafeValueLeak(item));
  }
  return false;
}

function assertNoUnsafeReportLeak(report, context) {
  if (hasUnsafeValueLeak(report)) {
    throw new ContractError(`${context}: unsafe value leak detected`);
  }
}

function unsafeStringValue(value) {
  const text = String(value ?? "");
  return (
    /https?:\/\//i.test(text) ||
    /\b(token|secret|authorization|api[_-]?key|password)\b/i.test(text) ||
    /\b(raw media body|raw external text|raw article|raw transcript|raw payload)\b/i.test(
      text
    ) ||
    /\b(world_command|input_action_candidate|approved_game_input_action)\b/i.test(
      text
    ) ||
    /\b(youtube_metadata_update|obs_command|game_input|commit_memory)\b/i.test(
      text
    ) ||
    (text.length >= 180 && /["']/.test(text))
  );
}
