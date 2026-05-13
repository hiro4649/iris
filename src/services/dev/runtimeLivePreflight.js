import { ContractError } from "../../core/contracts.js";
import {
  assertFreshEvidenceEnvelopeSafe,
  createFreshEvidenceEnvelope,
} from "./freshEvidenceEnvelope.js";

const BRIDGE_SECTION_FIELDS = new Set([
  "schema",
  "fresh_worker_evidence",
  "blocker",
  "boundary_policy",
]);

const BRIDGE_SECTION_BOUNDARY_FIELDS = new Set([
  "bridge_section_only",
  "fresh_worker_evidence_and_blocker_only",
  "no_raw_bridge_payload",
  "no_endpoint_values",
  "no_token_values",
]);

const TTS_SECTION_FIELDS = new Set([
  "schema",
  "engine_health",
  "voice_status",
  "license_status",
  "boundary_policy",
]);

const TTS_SECTION_BOUNDARY_FIELDS = new Set([
  "tts_section_only",
  "engine_voice_license_status_only",
  "no_raw_audio",
  "no_vendor_diagnostics",
  "no_endpoint_values",
  "no_token_values",
]);

const LIVE2D_SECTION_FIELDS = new Set([
  "schema",
  "renderer_status",
  "model_status",
  "cue_capability",
  "recovery_readiness",
  "boundary_policy",
]);

const LIVE2D_SECTION_BOUNDARY_FIELDS = new Set([
  "live2d_section_only",
  "renderer_model_cue_recovery_status_only",
  "no_model_path",
  "no_raw_cue",
  "no_endpoint_values",
  "no_token_values",
]);

const SUBTITLE_SECTION_FIELDS = new Set([
  "schema",
  "engine_status",
  "sync_status",
  "safe_area_status",
  "rtl_status",
  "boundary_policy",
]);

const SUBTITLE_SECTION_BOUNDARY_FIELDS = new Set([
  "subtitle_section_only",
  "engine_sync_safe_area_rtl_status_only",
  "no_raw_subtitle_payload",
  "no_endpoint_values",
  "no_token_values",
]);

const OBS_SECTION_FIELDS = new Set([
  "schema",
  "browser_source_status",
  "pickup_status",
  "heartbeat_status",
  "artifact_freshness",
  "boundary_policy",
]);

const OBS_SECTION_BOUNDARY_FIELDS = new Set([
  "obs_section_only",
  "browser_pickup_heartbeat_artifact_status_only",
  "no_url_values",
  "no_credentials",
  "no_raw_event",
  "no_endpoint_values",
  "no_token_values",
]);

const DB_SECTION_FIELDS = new Set([
  "schema",
  "connection_status",
  "schema_status",
  "index_status",
  "migration_status",
  "backup_status",
  "boundary_policy",
]);

const DB_SECTION_BOUNDARY_FIELDS = new Set([
  "db_section_only",
  "connection_schema_index_migration_backup_status_only",
  "no_connection_string",
  "no_raw_sql",
  "no_endpoint_values",
  "no_token_values",
]);

const YOUTUBE_SECTION_FIELDS = new Set([
  "schema",
  "oauth_status",
  "token_status",
  "chat_status",
  "polling_status",
  "moderation_status",
  "boundary_policy",
]);

const YOUTUBE_SECTION_BOUNDARY_FIELDS = new Set([
  "youtube_section_only",
  "oauth_token_chat_polling_moderation_status_only",
  "no_token_values",
  "no_raw_api_response",
  "no_endpoint_values",
]);

const GAME_SECTION_FIELDS = new Set([
  "schema",
  "mode",
  "safe_map_status",
  "manual_approval_status",
  "emergency_stop_status",
  "audit_status",
  "boundary_policy",
]);

const GAME_SECTION_BOUNDARY_FIELDS = new Set([
  "game_section_only",
  "mode_safe_map_manual_emergency_audit_status_only",
  "no_raw_input",
  "no_os_command",
  "no_endpoint_values",
  "no_token_values",
]);

const AGGREGATE_SECTION_FIELDS = new Set([
  "schema",
  "bridge_section",
  "tts_section",
  "live2d_section",
  "subtitle_section",
  "obs_section",
  "db_section",
  "youtube_section",
  "game_section",
  "blocked_section_count",
  "overall_go",
  "boundary_policy",
]);

const FIXTURE_PACK_FIELDS = new Set([
  "schema",
  "pack_status",
  "fixture_count",
  "bridge_fixture",
  "tts_fixture",
  "live2d_fixture",
  "subtitle_fixture",
  "obs_fixture",
  "db_fixture",
  "youtube_fixture",
  "game_fixture",
  "aggregate_fixture",
  "boundary_policy",
]);

const FIXTURE_RESULT_FIELDS = new Set([
  "schema",
  "fixture_label",
  "fixture_status",
]);

const AGGREGATE_SECTION_BOUNDARY_FIELDS = new Set([
  "runtime_live_preflight_sections_only",
  "blocked_section_blocks_overall_go",
  "safe_section_status_only",
  "no_raw_payloads",
  "no_endpoint_values",
  "no_token_values",
]);

const FIXTURE_PACK_BOUNDARY_FIELDS = new Set([
  "safe_fixture_status_only",
  "bridge_tts_live2d_subtitle_obs_db_youtube_game_covered",
  "mixed_readiness_covered",
  "no_raw_payloads",
  "no_endpoint_values",
  "no_token_values",
]);

const BRIDGE_BLOCKERS = new Set(["none", "fresh_worker_evidence_required"]);
const GAME_MODES = new Set(["manual_approval", "approved_safe_adapter"]);
const SAFE_STATUS_LABELS = new Set([
  "ready",
  "configured",
  "missing",
  "attention",
  "BLOCKED",
]);
const SAFE_LABEL_PATTERN = /^[a-z0-9_.:-]{1,80}$/u;
const UNSAFE_FIELD_PATTERN =
  /(?:^|_)(raw|payload|endpoint|url|token|secret|authorization|credential|credentials|password|command|audio|diagnostics|path|event|sql|string|input)(?:$|_)/iu;
const UNSAFE_VALUE_PATTERN =
  /\b(?:https?:\/\/|endpoint|oauth[_ -]?token|token[_ -]?value|authorization|bearer|api[_ -]?key|secret|credential|credentials|connection[_ -]?string|raw[_ -]?(?:api[_ -]?response|sql)|select\s+|insert\s+|update\s+|delete\s+|raw[_ -]?(?:payload|command|audio|cue|subtitle|event|input)|payload|command|os[_ -]?command|subtitle[_ -]?payload|vendor[_ -]?diagnostics|diagnostics|model[_ -]?path|[a-z]:\\|\/[a-z0-9_.-]+\/)\b/iu;

export function createRuntimeLivePreflightBridgeSection({
  freshWorkerEvidence,
} = {}) {
  assertFreshEvidenceEnvelopeSafe(
    freshWorkerEvidence,
    "runtime live preflight bridge worker evidence"
  );
  const freshWorkerReady =
    freshWorkerEvidence.component === "bridge_worker" &&
    freshWorkerEvidence.status === "ready" &&
    freshWorkerEvidence.freshness === "fresh";
  const section = {
    schema: "iris_runtime_live_preflight_bridge_section_v1",
    fresh_worker_evidence: freshWorkerEvidence,
    blocker: freshWorkerReady ? "none" : "fresh_worker_evidence_required",
    boundary_policy: Object.fromEntries(
      [...BRIDGE_SECTION_BOUNDARY_FIELDS].map((field) => [field, true])
    ),
  };
  assertRuntimeLivePreflightBridgeSectionSafe(section);
  return section;
}

export function createRuntimeLivePreflightTtsSection({
  engineHealth = "missing",
  voiceStatus = "missing",
  licenseStatus = "missing",
} = {}) {
  const section = {
    schema: "iris_runtime_live_preflight_tts_section_v1",
    engine_health: safeStatus(engineHealth),
    voice_status: safeStatus(voiceStatus),
    license_status: safeStatus(licenseStatus),
    boundary_policy: Object.fromEntries(
      [...TTS_SECTION_BOUNDARY_FIELDS].map((field) => [field, true])
    ),
  };
  assertRuntimeLivePreflightTtsSectionSafe(section);
  return section;
}

export function createRuntimeLivePreflightLive2dSection({
  rendererStatus = "missing",
  modelStatus = "missing",
  cueCapability = "missing",
  recoveryReadiness = "missing",
} = {}) {
  const section = {
    schema: "iris_runtime_live_preflight_live2d_section_v1",
    renderer_status: safeStatus(rendererStatus),
    model_status: safeStatus(modelStatus),
    cue_capability: safeStatus(cueCapability),
    recovery_readiness: safeStatus(recoveryReadiness),
    boundary_policy: Object.fromEntries(
      [...LIVE2D_SECTION_BOUNDARY_FIELDS].map((field) => [field, true])
    ),
  };
  assertRuntimeLivePreflightLive2dSectionSafe(section);
  return section;
}

export function createRuntimeLivePreflightSubtitleSection({
  engineStatus = "missing",
  syncStatus = "missing",
  safeAreaStatus = "missing",
  rtlStatus = "missing",
} = {}) {
  const section = {
    schema: "iris_runtime_live_preflight_subtitle_section_v1",
    engine_status: safeStatus(engineStatus),
    sync_status: safeStatus(syncStatus),
    safe_area_status: safeStatus(safeAreaStatus),
    rtl_status: safeStatus(rtlStatus),
    boundary_policy: Object.fromEntries(
      [...SUBTITLE_SECTION_BOUNDARY_FIELDS].map((field) => [field, true])
    ),
  };
  assertRuntimeLivePreflightSubtitleSectionSafe(section);
  return section;
}

export function createRuntimeLivePreflightObsSection({
  browserSourceStatus = "missing",
  pickupStatus = "missing",
  heartbeatStatus = "missing",
  artifactFreshness = "missing",
} = {}) {
  const section = {
    schema: "iris_runtime_live_preflight_obs_section_v1",
    browser_source_status: safeStatus(browserSourceStatus),
    pickup_status: safeStatus(pickupStatus),
    heartbeat_status: safeStatus(heartbeatStatus),
    artifact_freshness: safeStatus(artifactFreshness),
    boundary_policy: Object.fromEntries(
      [...OBS_SECTION_BOUNDARY_FIELDS].map((field) => [field, true])
    ),
  };
  assertRuntimeLivePreflightObsSectionSafe(section);
  return section;
}

export function createRuntimeLivePreflightDbSection({
  connectionStatus = "missing",
  schemaStatus = "missing",
  indexStatus = "missing",
  migrationStatus = "missing",
  backupStatus = "missing",
} = {}) {
  const section = {
    schema: "iris_runtime_live_preflight_db_section_v1",
    connection_status: safeStatus(connectionStatus),
    schema_status: safeStatus(schemaStatus),
    index_status: safeStatus(indexStatus),
    migration_status: safeStatus(migrationStatus),
    backup_status: safeStatus(backupStatus),
    boundary_policy: Object.fromEntries(
      [...DB_SECTION_BOUNDARY_FIELDS].map((field) => [field, true])
    ),
  };
  assertRuntimeLivePreflightDbSectionSafe(section);
  return section;
}

export function createRuntimeLivePreflightYouTubeSection({
  oauthStatus = "missing",
  tokenStatus = "missing",
  chatStatus = "missing",
  pollingStatus = "missing",
  moderationStatus = "missing",
} = {}) {
  const section = {
    schema: "iris_runtime_live_preflight_youtube_section_v1",
    oauth_status: safeStatus(oauthStatus),
    token_status: safeStatus(tokenStatus),
    chat_status: safeStatus(chatStatus),
    polling_status: safeStatus(pollingStatus),
    moderation_status: safeStatus(moderationStatus),
    boundary_policy: Object.fromEntries(
      [...YOUTUBE_SECTION_BOUNDARY_FIELDS].map((field) => [field, true])
    ),
  };
  assertRuntimeLivePreflightYouTubeSectionSafe(section);
  return section;
}

export function createRuntimeLivePreflightGameSection({
  mode = "manual_approval",
  safeMapStatus = "missing",
  manualApprovalStatus = "missing",
  emergencyStopStatus = "missing",
  auditStatus = "missing",
} = {}) {
  const section = {
    schema: "iris_runtime_live_preflight_game_section_v1",
    mode: safeGameMode(mode),
    safe_map_status: safeStatus(safeMapStatus),
    manual_approval_status: safeStatus(manualApprovalStatus),
    emergency_stop_status: safeStatus(emergencyStopStatus),
    audit_status: safeStatus(auditStatus),
    boundary_policy: Object.fromEntries(
      [...GAME_SECTION_BOUNDARY_FIELDS].map((field) => [field, true])
    ),
  };
  assertRuntimeLivePreflightGameSectionSafe(section);
  return section;
}

export function createRuntimeLivePreflightAggregateSection({
  bridgeSection,
  ttsSection,
  live2dSection,
  subtitleSection,
  obsSection,
  dbSection,
  youtubeSection,
  gameSection,
} = {}) {
  assertRuntimeLivePreflightBridgeSectionSafe(bridgeSection);
  assertRuntimeLivePreflightTtsSectionSafe(ttsSection);
  assertRuntimeLivePreflightLive2dSectionSafe(live2dSection);
  assertRuntimeLivePreflightSubtitleSectionSafe(subtitleSection);
  assertRuntimeLivePreflightObsSectionSafe(obsSection);
  assertRuntimeLivePreflightDbSectionSafe(dbSection);
  assertRuntimeLivePreflightYouTubeSectionSafe(youtubeSection);
  assertRuntimeLivePreflightGameSectionSafe(gameSection);
  const sections = [
    bridgeSection,
    ttsSection,
    live2dSection,
    subtitleSection,
    obsSection,
    dbSection,
    youtubeSection,
    gameSection,
  ];
  const blockedSectionCount = sections.filter(sectionHasBlocker).length;
  const aggregate = {
    schema: "iris_runtime_live_preflight_aggregate_section_v1",
    bridge_section: bridgeSection,
    tts_section: ttsSection,
    live2d_section: live2dSection,
    subtitle_section: subtitleSection,
    obs_section: obsSection,
    db_section: dbSection,
    youtube_section: youtubeSection,
    game_section: gameSection,
    blocked_section_count: blockedSectionCount,
    overall_go: blockedSectionCount === 0,
    boundary_policy: Object.fromEntries(
      [...AGGREGATE_SECTION_BOUNDARY_FIELDS].map((field) => [field, true])
    ),
  };
  assertRuntimeLivePreflightAggregateSectionSafe(aggregate);
  return aggregate;
}

export function createRuntimeLivePreflightFixturePack({ nowMs = 10_000 } = {}) {
  const bridgeSection = createRuntimeLivePreflightBridgeSection({
    freshWorkerEvidence: createFreshEvidenceEnvelope({
      component: "bridge_worker",
      status: "ready",
      evidenceTimestampMs: nowMs,
      evidenceSource: "real_probe",
      freshness: "fresh",
      nowMs,
    }),
  });
  const ttsSection = createRuntimeLivePreflightTtsSection({
    engineHealth: "ready",
    voiceStatus: "ready",
    licenseStatus: "ready",
  });
  const live2dSection = createRuntimeLivePreflightLive2dSection({
    rendererStatus: "ready",
    modelStatus: "configured",
    cueCapability: "ready",
    recoveryReadiness: "ready",
  });
  const subtitleSection = createRuntimeLivePreflightSubtitleSection({
    engineStatus: "ready",
    syncStatus: "ready",
    safeAreaStatus: "ready",
    rtlStatus: "ready",
  });
  const obsSection = createRuntimeLivePreflightObsSection({
    browserSourceStatus: "ready",
    pickupStatus: "ready",
    heartbeatStatus: "ready",
    artifactFreshness: "ready",
  });
  const dbSection = createRuntimeLivePreflightDbSection({
    connectionStatus: "ready",
    schemaStatus: "ready",
    indexStatus: "ready",
    migrationStatus: "ready",
    backupStatus: "ready",
  });
  const youtubeSection = createRuntimeLivePreflightYouTubeSection({
    oauthStatus: "ready",
    tokenStatus: "ready",
    chatStatus: "ready",
    pollingStatus: "ready",
    moderationStatus: "ready",
  });
  const gameSection = createRuntimeLivePreflightGameSection({
    mode: "manual_approval",
    safeMapStatus: "ready",
    manualApprovalStatus: "ready",
    emergencyStopStatus: "ready",
    auditStatus: "ready",
  });
  const blockedTtsSection = {
    ...ttsSection,
    engine_health: "BLOCKED",
  };
  const aggregateSection = createRuntimeLivePreflightAggregateSection({
    bridgeSection,
    ttsSection: blockedTtsSection,
    live2dSection,
    subtitleSection,
    obsSection,
    dbSection,
    youtubeSection,
    gameSection,
  });
  const pack = {
    schema: "iris_runtime_live_preflight_fixture_pack_v1",
    pack_status: "pass",
    fixture_count: 9,
    bridge_fixture: createFixtureResult("bridge", bridgeSection.blocker),
    tts_fixture: createFixtureResult("tts", blockedTtsSection.engine_health),
    live2d_fixture: createFixtureResult("live2d", live2dSection.renderer_status),
    subtitle_fixture: createFixtureResult("subtitle", subtitleSection.engine_status),
    obs_fixture: createFixtureResult("obs", obsSection.browser_source_status),
    db_fixture: createFixtureResult("db", dbSection.connection_status),
    youtube_fixture: createFixtureResult("youtube", youtubeSection.oauth_status),
    game_fixture: createFixtureResult("game", gameSection.safe_map_status),
    aggregate_fixture: createFixtureResult(
      "aggregate",
      aggregateSection.overall_go ? "go" : "blocked"
    ),
    boundary_policy: Object.fromEntries(
      [...FIXTURE_PACK_BOUNDARY_FIELDS].map((field) => [field, true])
    ),
  };
  assertRuntimeLivePreflightFixturePackSafe(pack);
  return pack;
}

export function assertRuntimeLivePreflightBridgeSectionSafe(
  section,
  context = "runtime live preflight bridge section"
) {
  if (!section || typeof section !== "object" || Array.isArray(section)) {
    throw new ContractError(`${context}: section required`);
  }
  assertNoUnsafeMaterial(section, context);
  for (const field of Object.keys(section)) {
    if (!BRIDGE_SECTION_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected section field`, { field });
    }
  }
  if (
    section.schema !== "iris_runtime_live_preflight_bridge_section_v1" ||
    !BRIDGE_BLOCKERS.has(section.blocker)
  ) {
    throw new ContractError(`${context}: invalid section`);
  }
  assertFreshEvidenceEnvelopeSafe(
    section.fresh_worker_evidence,
    `${context}: fresh worker evidence`
  );
  const freshWorkerReady =
    section.fresh_worker_evidence.component === "bridge_worker" &&
    section.fresh_worker_evidence.status === "ready" &&
    section.fresh_worker_evidence.freshness === "fresh";
  if (
    section.blocker !==
    (freshWorkerReady ? "none" : "fresh_worker_evidence_required")
  ) {
    throw new ContractError(`${context}: blocker mismatch`);
  }
  assertBoundaryPolicy(section.boundary_policy, BRIDGE_SECTION_BOUNDARY_FIELDS, context);
}

export function assertRuntimeLivePreflightTtsSectionSafe(
  section,
  context = "runtime live preflight TTS section"
) {
  if (!section || typeof section !== "object" || Array.isArray(section)) {
    throw new ContractError(`${context}: section required`);
  }
  assertNoUnsafeMaterial(section, context);
  for (const field of Object.keys(section)) {
    if (!TTS_SECTION_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected section field`, { field });
    }
  }
  if (
    section.schema !== "iris_runtime_live_preflight_tts_section_v1" ||
    !SAFE_STATUS_LABELS.has(section.engine_health) ||
    !SAFE_STATUS_LABELS.has(section.voice_status) ||
    !SAFE_STATUS_LABELS.has(section.license_status)
  ) {
    throw new ContractError(`${context}: invalid section`);
  }
  assertBoundaryPolicy(section.boundary_policy, TTS_SECTION_BOUNDARY_FIELDS, context);
}

export function assertRuntimeLivePreflightLive2dSectionSafe(
  section,
  context = "runtime live preflight Live2D section"
) {
  if (!section || typeof section !== "object" || Array.isArray(section)) {
    throw new ContractError(`${context}: section required`);
  }
  assertNoUnsafeMaterial(section, context);
  for (const field of Object.keys(section)) {
    if (!LIVE2D_SECTION_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected section field`, { field });
    }
  }
  if (
    section.schema !== "iris_runtime_live_preflight_live2d_section_v1" ||
    !SAFE_STATUS_LABELS.has(section.renderer_status) ||
    !SAFE_STATUS_LABELS.has(section.model_status) ||
    !SAFE_STATUS_LABELS.has(section.cue_capability) ||
    !SAFE_STATUS_LABELS.has(section.recovery_readiness)
  ) {
    throw new ContractError(`${context}: invalid section`);
  }
  assertBoundaryPolicy(section.boundary_policy, LIVE2D_SECTION_BOUNDARY_FIELDS, context);
}

export function assertRuntimeLivePreflightSubtitleSectionSafe(
  section,
  context = "runtime live preflight subtitle section"
) {
  if (!section || typeof section !== "object" || Array.isArray(section)) {
    throw new ContractError(`${context}: section required`);
  }
  assertNoUnsafeMaterial(section, context);
  for (const field of Object.keys(section)) {
    if (!SUBTITLE_SECTION_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected section field`, { field });
    }
  }
  if (
    section.schema !== "iris_runtime_live_preflight_subtitle_section_v1" ||
    !SAFE_STATUS_LABELS.has(section.engine_status) ||
    !SAFE_STATUS_LABELS.has(section.sync_status) ||
    !SAFE_STATUS_LABELS.has(section.safe_area_status) ||
    !SAFE_STATUS_LABELS.has(section.rtl_status)
  ) {
    throw new ContractError(`${context}: invalid section`);
  }
  assertBoundaryPolicy(section.boundary_policy, SUBTITLE_SECTION_BOUNDARY_FIELDS, context);
}

export function assertRuntimeLivePreflightObsSectionSafe(
  section,
  context = "runtime live preflight OBS section"
) {
  if (!section || typeof section !== "object" || Array.isArray(section)) {
    throw new ContractError(`${context}: section required`);
  }
  assertNoUnsafeMaterial(section, context);
  for (const field of Object.keys(section)) {
    if (!OBS_SECTION_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected section field`, { field });
    }
  }
  if (
    section.schema !== "iris_runtime_live_preflight_obs_section_v1" ||
    !SAFE_STATUS_LABELS.has(section.browser_source_status) ||
    !SAFE_STATUS_LABELS.has(section.pickup_status) ||
    !SAFE_STATUS_LABELS.has(section.heartbeat_status) ||
    !SAFE_STATUS_LABELS.has(section.artifact_freshness)
  ) {
    throw new ContractError(`${context}: invalid section`);
  }
  assertBoundaryPolicy(section.boundary_policy, OBS_SECTION_BOUNDARY_FIELDS, context);
}

export function assertRuntimeLivePreflightDbSectionSafe(
  section,
  context = "runtime live preflight DB section"
) {
  if (!section || typeof section !== "object" || Array.isArray(section)) {
    throw new ContractError(`${context}: section required`);
  }
  assertNoUnsafeMaterial(section, context);
  for (const field of Object.keys(section)) {
    if (!DB_SECTION_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected section field`, { field });
    }
  }
  if (
    section.schema !== "iris_runtime_live_preflight_db_section_v1" ||
    !SAFE_STATUS_LABELS.has(section.connection_status) ||
    !SAFE_STATUS_LABELS.has(section.schema_status) ||
    !SAFE_STATUS_LABELS.has(section.index_status) ||
    !SAFE_STATUS_LABELS.has(section.migration_status) ||
    !SAFE_STATUS_LABELS.has(section.backup_status)
  ) {
    throw new ContractError(`${context}: invalid section`);
  }
  assertBoundaryPolicy(section.boundary_policy, DB_SECTION_BOUNDARY_FIELDS, context);
}

export function assertRuntimeLivePreflightYouTubeSectionSafe(
  section,
  context = "runtime live preflight YouTube section"
) {
  if (!section || typeof section !== "object" || Array.isArray(section)) {
    throw new ContractError(`${context}: section required`);
  }
  assertNoUnsafeMaterial(section, context);
  for (const field of Object.keys(section)) {
    if (!YOUTUBE_SECTION_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected section field`, { field });
    }
  }
  if (
    section.schema !== "iris_runtime_live_preflight_youtube_section_v1" ||
    !SAFE_STATUS_LABELS.has(section.oauth_status) ||
    !SAFE_STATUS_LABELS.has(section.token_status) ||
    !SAFE_STATUS_LABELS.has(section.chat_status) ||
    !SAFE_STATUS_LABELS.has(section.polling_status) ||
    !SAFE_STATUS_LABELS.has(section.moderation_status)
  ) {
    throw new ContractError(`${context}: invalid section`);
  }
  assertBoundaryPolicy(section.boundary_policy, YOUTUBE_SECTION_BOUNDARY_FIELDS, context);
}

export function assertRuntimeLivePreflightGameSectionSafe(
  section,
  context = "runtime live preflight Game section"
) {
  if (!section || typeof section !== "object" || Array.isArray(section)) {
    throw new ContractError(`${context}: section required`);
  }
  assertNoUnsafeMaterial(section, context);
  for (const field of Object.keys(section)) {
    if (!GAME_SECTION_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected section field`, { field });
    }
  }
  if (
    section.schema !== "iris_runtime_live_preflight_game_section_v1" ||
    !GAME_MODES.has(section.mode) ||
    !SAFE_STATUS_LABELS.has(section.safe_map_status) ||
    !SAFE_STATUS_LABELS.has(section.manual_approval_status) ||
    !SAFE_STATUS_LABELS.has(section.emergency_stop_status) ||
    !SAFE_STATUS_LABELS.has(section.audit_status)
  ) {
    throw new ContractError(`${context}: invalid section`);
  }
  assertBoundaryPolicy(section.boundary_policy, GAME_SECTION_BOUNDARY_FIELDS, context);
}

export function assertRuntimeLivePreflightAggregateSectionSafe(
  aggregate,
  context = "runtime live preflight aggregate section"
) {
  if (!aggregate || typeof aggregate !== "object" || Array.isArray(aggregate)) {
    throw new ContractError(`${context}: aggregate required`);
  }
  assertNoUnsafeMaterial(aggregate, context);
  for (const field of Object.keys(aggregate)) {
    if (!AGGREGATE_SECTION_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected aggregate field`, { field });
    }
  }
  if (
    aggregate.schema !== "iris_runtime_live_preflight_aggregate_section_v1" ||
    !Number.isInteger(aggregate.blocked_section_count) ||
    aggregate.blocked_section_count < 0 ||
    typeof aggregate.overall_go !== "boolean"
  ) {
    throw new ContractError(`${context}: invalid aggregate`);
  }
  assertRuntimeLivePreflightBridgeSectionSafe(aggregate.bridge_section, context);
  assertRuntimeLivePreflightTtsSectionSafe(aggregate.tts_section, context);
  assertRuntimeLivePreflightLive2dSectionSafe(aggregate.live2d_section, context);
  assertRuntimeLivePreflightSubtitleSectionSafe(aggregate.subtitle_section, context);
  assertRuntimeLivePreflightObsSectionSafe(aggregate.obs_section, context);
  assertRuntimeLivePreflightDbSectionSafe(aggregate.db_section, context);
  assertRuntimeLivePreflightYouTubeSectionSafe(aggregate.youtube_section, context);
  assertRuntimeLivePreflightGameSectionSafe(aggregate.game_section, context);
  const sections = [
    aggregate.bridge_section,
    aggregate.tts_section,
    aggregate.live2d_section,
    aggregate.subtitle_section,
    aggregate.obs_section,
    aggregate.db_section,
    aggregate.youtube_section,
    aggregate.game_section,
  ];
  const blockedSectionCount = sections.filter(sectionHasBlocker).length;
  if (
    aggregate.blocked_section_count !== blockedSectionCount ||
    aggregate.overall_go !== (blockedSectionCount === 0)
  ) {
    throw new ContractError(`${context}: aggregate status mismatch`);
  }
  assertBoundaryPolicy(
    aggregate.boundary_policy,
    AGGREGATE_SECTION_BOUNDARY_FIELDS,
    context
  );
}

export function assertRuntimeLivePreflightFixturePackSafe(
  pack,
  context = "runtime live preflight fixture pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: pack required`);
  }
  assertNoUnsafeMaterial(pack, context);
  for (const field of Object.keys(pack)) {
    if (!FIXTURE_PACK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected pack field`, { field });
    }
  }
  if (
    pack.schema !== "iris_runtime_live_preflight_fixture_pack_v1" ||
    pack.pack_status !== "pass" ||
    pack.fixture_count !== 9
  ) {
    throw new ContractError(`${context}: invalid pack`);
  }
  const expected = {
    bridge_fixture: ["bridge", "none"],
    tts_fixture: ["tts", "blocked"],
    live2d_fixture: ["live2d", "ready"],
    subtitle_fixture: ["subtitle", "ready"],
    obs_fixture: ["obs", "ready"],
    db_fixture: ["db", "ready"],
    youtube_fixture: ["youtube", "ready"],
    game_fixture: ["game", "ready"],
    aggregate_fixture: ["aggregate", "blocked"],
  };
  for (const [field, [label, status]] of Object.entries(expected)) {
    assertFixtureResultSafe(pack[field], context);
    if (
      pack[field].fixture_label !== label ||
      pack[field].fixture_status !== status
    ) {
      throw new ContractError(`${context}: fixture mismatch`, { field });
    }
  }
  assertBoundaryPolicy(pack.boundary_policy, FIXTURE_PACK_BOUNDARY_FIELDS, context);
}

function assertBoundaryPolicy(policy, requiredFields, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!requiredFields.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`, { field });
    }
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary field must be true`, { field });
    }
  }
  for (const field of requiredFields) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: missing boundary field`, { field });
    }
  }
}

function safeStatus(value) {
  const label = String(value ?? "missing");
  return SAFE_STATUS_LABELS.has(label) ? label : "attention";
}

function safeGameMode(value) {
  const label = String(value ?? "manual_approval");
  return GAME_MODES.has(label) ? label : "manual_approval";
}

function sectionHasBlocker(section) {
  if (section?.blocker && section.blocker !== "none") return true;
  return Object.values(section ?? {}).some((value) => value === "BLOCKED");
}

function createFixtureResult(fixtureLabel, fixtureStatus) {
  return {
    schema: "iris_runtime_live_preflight_fixture_result_v1",
    fixture_label: safeLabel(fixtureLabel),
    fixture_status: safeLabel(fixtureStatus),
  };
}

function assertFixtureResultSafe(item, context) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new ContractError(`${context}: fixture result required`);
  }
  for (const field of Object.keys(item)) {
    if (!FIXTURE_RESULT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture result field`, {
        field,
      });
    }
  }
  if (
    item.schema !== "iris_runtime_live_preflight_fixture_result_v1" ||
    !SAFE_LABEL_PATTERN.test(item.fixture_label) ||
    !SAFE_LABEL_PATTERN.test(item.fixture_status)
  ) {
    throw new ContractError(`${context}: invalid fixture result`);
  }
}

function safeLabel(value) {
  return (
    String(value ?? "unknown")
      .toLowerCase()
      .replace(/[^a-z0-9_.:-]+/gu, "_")
      .replace(/^_+|_+$/gu, "")
      .slice(0, 80) || "unknown"
  );
}

function assertNoUnsafeMaterial(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  for (const [field, child] of Object.entries(value)) {
    if (
      !path.endsWith(".boundary_policy") &&
      field !== "token_status" &&
      UNSAFE_FIELD_PATTERN.test(field)
    ) {
      throw new ContractError(`${context}: unsafe field`, { field, path });
    }
    if (typeof child === "string") {
      if (
        (child !== "BLOCKED" && !SAFE_LABEL_PATTERN.test(child)) ||
        UNSAFE_VALUE_PATTERN.test(child)
      ) {
        throw new ContractError(`${context}: unsafe value`, { field, path });
      }
    }
    assertNoUnsafeMaterial(child, context, `${path}.${field}`);
  }
}
