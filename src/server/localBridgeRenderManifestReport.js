import { existsSync, readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { extname, join, resolve, sep } from "node:path";
import { ContractError } from "../core/contracts.js";
import {
  assertLocalBridgeEventRenderManifestSafe,
  assertLocalBridgeEventRenderManifestStoreStatusSafe,
  createLocalBridgeEventRenderManifestStoreStatus,
} from "./localBridgeEngineWorker.js";
import { validateLocalRenderArtifactForPickup } from "./localBridgeArtifactValidation.js";

const ADAPTER_KINDS = ["tts", "live2d", "subtitle"];
const MAX_RENDER_MANIFEST_AGE_MS = 24 * 3_600_000;
const MAX_RENDER_ARTIFACT_SKEW_MS = 3_600_000;
const LOCAL_BRIDGE_RENDER_MANIFEST_OPERATOR_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "generated_at_ms",
  "manifest_available",
  "latest_manifest_error_kind",
  "obs_pickup_status",
  "obs_handoff_readiness_status",
  "store_status",
  "latest_manifest_summary",
  "boundary_policy",
  "adapter_validation_required",
  "local_debug_paths",
]);
const FORBIDDEN_RENDER_MANIFEST_REPORT_FIELDS = new Set([
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
  "memory_carryover_candidates",
  "community_memory_candidates",
  "approved_memory_record",
  "approved_relationship_record",
  "final_text",
  "text",
  "subtitle_text",
  "raw_packet",
  "job_payload",
  "event_id",
  "trace_id",
  "endpoint",
  "url",
  "audio_url",
  "artifact_url",
  "authorization",
  "api_key",
  "apiKey",
  "token",
  "secret",
  "password",
]);
const PUBLIC_MANIFEST_LABEL_PATTERN = /^[a-zA-Z0-9_.:-]+$/;
const UNSAFE_PUBLIC_MANIFEST_LABEL_PATTERN =
  /(https?:\/\/|authorization|bearer|api[_-]?key|oauth|access[_-]?token|refresh[_-]?token|token|secret|password|endpoint|url|payload|text|input_action|input_action_candidate|approved_game_input_action|commit|memory_write|relationship_update_candidate|canonical_envelope)/i;
const UNSAFE_REPORT_STRING_VALUE_PATTERN =
  /(https?:\/\/|authorization|bearer|api[_-]?key|oauth|access[_-]?token|refresh[_-]?token|secret|password)/i;

export function createLocalBridgeRenderManifestOperatorReport({
  artifactDir = "data/local_bridge_artifacts",
  showLocalPaths = false,
  maxManifestAgeMs = null,
  maxArtifactRenderSkewMs = null,
  nowMs = Date.now(),
} = {}) {
  const safeMaxManifestAgeMs = normalizeOptionalMaxAgeMs(maxManifestAgeMs);
  const safeMaxArtifactRenderSkewMs =
    normalizeOptionalMaxArtifactRenderSkewMs(maxArtifactRenderSkewMs);
  const storeStatus = createLocalBridgeEventRenderManifestStoreStatus({ artifactDir });
  const { manifest, manifestAvailable, errorKind } = readLatestManifest({ artifactDir });
  const latestManifestSummary = manifest
    ? summarizeManifest(manifest, {
        artifactDir,
        nowMs,
        maxManifestAgeMs: safeMaxManifestAgeMs,
        maxArtifactRenderSkewMs: safeMaxArtifactRenderSkewMs,
      })
    : null;
  const obsPickupStatus = classifyObsPickupStatus({
    manifest,
    errorKind,
    latestManifestSummary,
  });
  const report = {
    ok: errorKind === null,
    schema: "iris_local_bridge_render_manifest_operator_report_v1",
    generated_at_ms: safeOptionalNumber(nowMs),
    manifest_available:
      manifest !== null && typeof manifest === "object" && !Array.isArray(manifest),
    latest_manifest_error_kind: errorKind,
    obs_pickup_status: obsPickupStatus,
    obs_handoff_readiness_status: classifyObsHandoffReadinessStatus(obsPickupStatus),
    store_status: storeStatus,
    latest_manifest_summary: latestManifestSummary,
    boundary_policy: {
      local_operator_report: true,
      no_path_values_by_default: true,
      local_path_values_explicitly_enabled: showLocalPaths === true,
      no_raw_jobs: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_external_file_existence_probe: true,
      stale_manifest_guard_supported: true,
      stale_artifact_guard_supported: true,
      artifact_render_sync_guard_supported: true,
    },
    adapter_validation_required: true,
  };
  maybeAttachLocalDebugPaths(report, { manifest, artifactDir, showLocalPaths });
  assertLocalBridgeRenderManifestOperatorReportSafe(report);
  return report;
}

export function assertLocalBridgeRenderManifestOperatorReportSafe(
  report,
  context = "local bridge render manifest operator report"
) {
  if (!report || typeof report !== "object") {
    throw new ContractError(`${context}: missing report`);
  }
  for (const field of Object.keys(report)) {
    if (!LOCAL_BRIDGE_RENDER_MANIFEST_OPERATOR_REPORT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected report field ${field}`);
    }
  }
  assertNoForbiddenReportFields(report, context);
  assertNoUnsafeReportStringValues(report, context);
  if (report.schema !== "iris_local_bridge_render_manifest_operator_report_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: report.schema });
  }
  assertBoundaryPolicy(report.boundary_policy, [
    "local_operator_report",
    "no_path_values_by_default",
    "no_raw_jobs",
    "no_text_payloads",
    "no_candidates",
    "no_commands",
    "no_endpoint_values",
    "no_secret_values",
    "no_external_file_existence_probe",
    "stale_manifest_guard_supported",
    "stale_artifact_guard_supported",
    "artifact_render_sync_guard_supported",
  ], context, ["local_path_values_explicitly_enabled"]);
  if (
    report.local_debug_paths &&
    report.boundary_policy.local_path_values_explicitly_enabled !== true
  ) {
    throw new ContractError(`${context}: local paths require explicit opt-in`);
  }
  assertLocalBridgeEventRenderManifestStoreStatusSafe(
    report.store_status,
    `${context}: store status`
  );
  if (report.latest_manifest_summary !== null) {
    assertManifestSummaryBoundaryPolicy(
      report.latest_manifest_summary?.boundary_policy,
      `${context}: latest manifest summary`
    );
  }
  if (report.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation flag required`);
  }
  assertObsPickupStatusSafe(report.obs_pickup_status, context);
  assertObsHandoffReadinessStatusSafe(report.obs_handoff_readiness_status, context);
  assertObsHandoffMatchesPickupStatus({
    pickupStatus: report.obs_pickup_status,
    handoffStatus: report.obs_handoff_readiness_status,
    context,
  });
  if (report.latest_manifest_summary) {
    assertObsPickupStatusSafe(report.latest_manifest_summary.obs_pickup_status, context);
    if (report.obs_pickup_status !== report.latest_manifest_summary.obs_pickup_status) {
      throw new ContractError(`${context}: OBS pickup status summary mismatch`);
    }
    assertObsHandoffReadinessStatusSafe(
      report.latest_manifest_summary.obs_handoff_readiness_status,
      context
    );
    if (
      report.obs_handoff_readiness_status !==
      report.latest_manifest_summary.obs_handoff_readiness_status
    ) {
      throw new ContractError(`${context}: OBS handoff readiness summary mismatch`);
    }
    assertObsHandoffMatchesPickupStatus({
      pickupStatus: report.latest_manifest_summary.obs_pickup_status,
      handoffStatus: report.latest_manifest_summary.obs_handoff_readiness_status,
      context,
    });
    assertObsPickupBlockingStatusByAdapterSafe(
      report.latest_manifest_summary.obs_pickup_blocking_status_by_adapter,
      context
    );
    assertArtifactRenderTimestampSummarySafe(report.latest_manifest_summary, context);
    assertObsPickupBlockingSummaryConsistent(report.latest_manifest_summary, context);
    assertPublicLabelSafetySummarySafe(report.latest_manifest_summary, context);
  }
}

function readLatestManifest({ artifactDir }) {
  const filePath = join(String(artifactDir || ""), "latest_event_render_manifest.json");
  if (!artifactDir || !existsSync(filePath)) {
    return { manifest: null, manifestAvailable: false, errorKind: null };
  }
  try {
    const manifest = JSON.parse(readFileSync(filePath, "utf8"));
    assertLocalBridgeEventRenderManifestSafe(manifest, "latest render manifest operator report");
    return { manifest, manifestAvailable: true, errorKind: null };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { manifest: null, manifestAvailable: false, errorKind: "invalid_json" };
    }
    return { manifest: null, manifestAvailable: false, errorKind: "unsafe_manifest" };
  }
}

function summarizeManifest(
  manifest,
  { artifactDir, nowMs, maxManifestAgeMs, maxArtifactRenderSkewMs }
) {
  const artifactInfoByAdapter = Object.fromEntries(
    ADAPTER_KINDS.map((kind) => [
      kind,
      summarizeArtifactForPickup({
        artifactDir,
        artifact: manifest.artifact_set?.[kind],
      }),
    ])
  );
  const manifestAgeMs = computeAgeMs({ createdAtMs: manifest.created_at_ms, nowMs });
  const freshness = classifyManifestFreshness({
    ageMs: manifestAgeMs,
    maxManifestAgeMs,
  });
  const artifactFreshnessByAdapter = Object.fromEntries(
    ADAPTER_KINDS.map((kind) => [
      kind,
      classifyArtifactFreshness({
        ageMs: computeSignedAgeMs({
          timestampMs: manifest.artifact_set?.[kind]?.rendered_at_ms,
          nowMs,
        }),
        maxManifestAgeMs,
      }),
    ])
  );
  const artifactRenderSync = classifyArtifactRenderSync({
    manifest,
    maxArtifactRenderSkewMs,
  });
  const manifestPublicLabelStatus = classifyManifestPublicLabelStatus(manifest);
  const artifactPublicLabelStatusByAdapter = Object.fromEntries(
    ADAPTER_KINDS.map((kind) => [
      kind,
      classifyArtifactPublicLabelStatus(manifest.artifact_set?.[kind], kind),
    ])
  );
  const manifestIdPresent = safeText(manifest.manifest_id, 220) !== "";
  const eventIdPresent = safeText(manifest.event_id, 160) !== "";
  const summary = {
    schema: "iris_local_bridge_render_manifest_operator_summary_v1",
    manifest_id: safePublicManifestLabel(manifest.manifest_id, 220, "redacted_manifest_id"),
    manifest_id_present: manifestIdPresent,
    event_id_present: eventIdPresent,
    created_at_ms: safeOptionalNumber(manifest.created_at_ms),
    manifest_age_ms: manifestAgeMs,
    max_manifest_age_ms: maxManifestAgeMs,
    manifest_freshness_status: freshness.status,
    manifest_fresh: freshness.fresh,
    stale_manifest_rejected_for_obs_pickup: freshness.blocksPickup,
    complete: manifest.complete === true,
    required_adapter_kinds: ADAPTER_KINDS,
    artifact_kind_by_adapter: Object.fromEntries(
      ADAPTER_KINDS.map((kind) => [
        kind,
        safePublicManifestLabel(
          manifest.artifact_set?.[kind]?.artifact_kind,
          80,
          "redacted_artifact_kind"
        ),
      ])
    ),
    engine_mode_by_adapter: Object.fromEntries(
      ADAPTER_KINDS.map((kind) => [
        kind,
        safePublicManifestLabel(
          manifest.artifact_set?.[kind]?.engine_mode,
          80,
          "redacted_engine_mode"
        ),
      ])
    ),
    rendered_at_ms_by_adapter: Object.fromEntries(
      ADAPTER_KINDS.map((kind) => [
        kind,
        safeOptionalNumber(manifest.artifact_set?.[kind]?.rendered_at_ms),
      ])
    ),
    artifact_render_timestamp_present_by_adapter: Object.fromEntries(
      ADAPTER_KINDS.map((kind) => [
        kind,
        safeOptionalNumber(manifest.artifact_set?.[kind]?.rendered_at_ms) !== null,
      ])
    ),
    artifact_age_ms_by_adapter: Object.fromEntries(
      ADAPTER_KINDS.map((kind) => [kind, artifactFreshnessByAdapter[kind].ageMs])
    ),
    artifact_freshness_status_by_adapter: Object.fromEntries(
      ADAPTER_KINDS.map((kind) => [kind, artifactFreshnessByAdapter[kind].status])
    ),
    artifact_fresh_by_adapter: Object.fromEntries(
      ADAPTER_KINDS.map((kind) => [kind, artifactFreshnessByAdapter[kind].fresh])
    ),
    stale_artifact_rejected_for_obs_pickup_by_adapter: Object.fromEntries(
      ADAPTER_KINDS.map((kind) => [kind, artifactFreshnessByAdapter[kind].blocksPickup])
    ),
    max_artifact_render_skew_ms: maxArtifactRenderSkewMs,
    artifact_render_skew_ms: artifactRenderSync.skewMs,
    artifact_render_sync_status: artifactRenderSync.status,
    artifact_render_sync_ready: artifactRenderSync.ready,
    artifact_render_sync_rejected_for_obs_pickup: artifactRenderSync.blocksPickup,
    artifact_reference_safe_by_adapter: Object.fromEntries(
      ADAPTER_KINDS.map((kind) => [kind, artifactInfoByAdapter[kind].reference_safe])
    ),
    artifact_file_available_by_adapter: Object.fromEntries(
      ADAPTER_KINDS.map((kind) => [kind, artifactInfoByAdapter[kind].file_available])
    ),
    artifact_content_type_by_adapter: Object.fromEntries(
      ADAPTER_KINDS.map((kind) => [kind, artifactInfoByAdapter[kind].content_type])
    ),
    artifact_size_bytes_by_adapter: Object.fromEntries(
      ADAPTER_KINDS.map((kind) => [kind, artifactInfoByAdapter[kind].size_bytes])
    ),
    artifact_byte_hash_by_adapter: Object.fromEntries(
      ADAPTER_KINDS.map((kind) => [kind, artifactInfoByAdapter[kind].byte_hash])
    ),
    artifact_pickup_status_by_adapter: Object.fromEntries(
      ADAPTER_KINDS.map((kind) => [kind, artifactInfoByAdapter[kind].pickup_status])
    ),
    artifact_contract_status_by_adapter: Object.fromEntries(
      ADAPTER_KINDS.map((kind) => [kind, artifactInfoByAdapter[kind].contract_status])
    ),
    artifact_contract_valid_by_adapter: Object.fromEntries(
      ADAPTER_KINDS.map((kind) => [kind, artifactInfoByAdapter[kind].contract_valid])
    ),
    manifest_public_label_status: manifestPublicLabelStatus,
    artifact_public_label_status_by_adapter: artifactPublicLabelStatusByAdapter,
    unsafe_public_label_rejected_for_obs_pickup:
      manifestPublicLabelStatus !== "safe" ||
      Object.values(artifactPublicLabelStatusByAdapter).some((status) => status !== "safe"),
    boundary_policy: {
      summary_only: true,
      no_artifact_paths: true,
      no_raw_jobs: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_external_file_existence_probe: true,
      stale_manifest_guard_supported: true,
      stale_artifact_guard_supported: true,
      artifact_render_sync_guard_supported: true,
    },
    adapter_validation_required: true,
  };
  summary.all_artifact_references_safe = ADAPTER_KINDS.every(
    (kind) => summary.artifact_reference_safe_by_adapter[kind] === true
  );
  summary.all_artifact_files_available = ADAPTER_KINDS.every(
    (kind) => summary.artifact_file_available_by_adapter[kind] === true
  );
  summary.all_artifacts_fresh_for_pickup = ADAPTER_KINDS.every(
    (kind) => summary.stale_artifact_rejected_for_obs_pickup_by_adapter[kind] !== true
  );
  summary.all_artifact_render_timestamps_present = ADAPTER_KINDS.every(
    (kind) => summary.artifact_render_timestamp_present_by_adapter[kind] === true
  );
  summary.missing_artifact_render_timestamp_rejected_for_obs_pickup =
    summary.all_artifact_render_timestamps_present !== true;
  summary.all_artifacts_contract_valid_for_pickup = ADAPTER_KINDS.every(
    (kind) => summary.artifact_contract_valid_by_adapter[kind] === true
  );
  summary.all_public_labels_safe_for_pickup =
    summary.unsafe_public_label_rejected_for_obs_pickup !== true;
  summary.obs_pickup_ready =
    summary.complete === true &&
    summary.all_artifact_references_safe === true &&
    summary.all_artifact_files_available === true &&
    summary.all_artifact_render_timestamps_present === true &&
    summary.stale_manifest_rejected_for_obs_pickup !== true &&
    summary.all_artifacts_fresh_for_pickup === true &&
    summary.artifact_render_sync_rejected_for_obs_pickup !== true &&
    summary.all_artifacts_contract_valid_for_pickup === true &&
    summary.all_public_labels_safe_for_pickup === true;
  summary.obs_pickup_status = classifySummaryPickupStatus(summary);
  summary.obs_pickup_blocking_status_by_adapter =
    summarizeObsPickupBlockingStatusByAdapter(summary);
  summary.obs_pickup_blocking_adapter_kinds = ADAPTER_KINDS.filter(
    (kind) => summary.obs_pickup_blocking_status_by_adapter[kind] !== "ready"
  );
  summary.obs_pickup_blocking_adapter_count =
    summary.obs_pickup_blocking_adapter_kinds.length;
  summary.obs_handoff_readiness_status = classifyObsHandoffReadinessStatus(
    summary.obs_pickup_status
  );
  return summary;
}

function classifySummaryPickupStatus(summary) {
  if (summary.obs_pickup_ready === true) return "ready";
  if (
    Object.values(summary.artifact_pickup_status_by_adapter ?? {}).includes("invalid_artifact_kind")
  ) {
    return "invalid_artifact_kind";
  }
  if (summary.all_artifact_references_safe === false) return "unsafe_artifact_reference";
  if (summary.all_artifact_files_available === false) return "missing_artifact_files";
  if (summary.all_artifact_render_timestamps_present === false) {
    return "missing_artifact_render_timestamp";
  }
  if (summary.stale_manifest_rejected_for_obs_pickup === true) return "stale_manifest";
  if (summary.all_artifacts_fresh_for_pickup === false) return "stale_artifact";
  if (summary.all_artifacts_contract_valid_for_pickup === false) return "invalid_artifact";
  if (summary.all_public_labels_safe_for_pickup === false) return "unsafe_manifest_label";
  if (summary.artifact_render_sync_rejected_for_obs_pickup === true) {
    return "artifact_sync_skew";
  }
  return "missing_artifact_files";
}

function summarizeObsPickupBlockingStatusByAdapter(summary) {
  return Object.fromEntries(
    ADAPTER_KINDS.map((kind) => [
      kind,
      classifyAdapterObsPickupBlockingStatus(summary, kind),
    ])
  );
}

function classifyAdapterObsPickupBlockingStatus(summary, kind) {
  if (summary.artifact_pickup_status_by_adapter?.[kind] === "missing_manifest_item") {
    return "missing_manifest_item";
  }
  if (summary.artifact_pickup_status_by_adapter?.[kind] === "invalid_artifact_kind") {
    return "invalid_artifact_kind";
  }
  if (summary.artifact_reference_safe_by_adapter?.[kind] !== true) {
    return "unsafe_artifact_reference";
  }
  if (summary.artifact_file_available_by_adapter?.[kind] !== true) {
    return "missing_artifact_file";
  }
  if (summary.artifact_render_timestamp_present_by_adapter?.[kind] !== true) {
    return "missing_artifact_render_timestamp";
  }
  if (summary.stale_artifact_rejected_for_obs_pickup_by_adapter?.[kind] === true) {
    return "stale_artifact";
  }
  if (summary.artifact_contract_valid_by_adapter?.[kind] !== true) {
    return "invalid_artifact";
  }
  if (
    summary.manifest_public_label_status !== "safe" ||
    summary.artifact_public_label_status_by_adapter?.[kind] !== "safe"
  ) {
    return "unsafe_manifest_label";
  }
  if (summary.artifact_render_sync_rejected_for_obs_pickup === true) {
    return "artifact_sync_skew";
  }
  return "ready";
}

function maybeAttachLocalDebugPaths(report, { manifest, artifactDir, showLocalPaths }) {
  if (!showLocalPaths || !manifest) return;
  report.local_debug_paths = {
    artifact_dir: resolve(artifactDir),
    latest_manifest_file: resolve(artifactDir, "latest_event_render_manifest.json"),
    artifact_files_by_adapter: Object.fromEntries(
      ADAPTER_KINDS.map((kind) => [
        kind,
        safeDebugArtifactPath({
          artifactDir,
          relativePath: manifest.artifact_set?.[kind]?.artifact_path,
        }),
      ])
    ),
    unsafe_artifact_reference_by_adapter: Object.fromEntries(
      ADAPTER_KINDS.map((kind) => [
        kind,
        resolveArtifactPathWithinDir({
          artifactDir,
          relativePath: manifest.artifact_set?.[kind]?.artifact_path,
        }).safe !== true,
      ])
    ),
    explicitly_enabled: true,
  };
}

function safeDebugArtifactPath({ artifactDir, relativePath }) {
  const resolved = resolveArtifactPathWithinDir({ artifactDir, relativePath });
  return resolved.safe ? resolved.artifactPath : null;
}

function classifyObsPickupStatus({ manifest, errorKind, latestManifestSummary }) {
  if (errorKind) return "manifest_attention_required";
  if (!manifest) return "waiting_for_manifest";
  return latestManifestSummary?.obs_pickup_status ?? "missing_artifact_files";
}

function classifyObsHandoffReadinessStatus(obsPickupStatus) {
  if (obsPickupStatus === "ready") return "ready";
  if (obsPickupStatus === "waiting_for_manifest") return "waiting_for_manifest";
  if (
    obsPickupStatus === "missing_artifact_files" ||
    obsPickupStatus === "missing_artifact_render_timestamp"
  ) {
    return "waiting_for_complete_artifacts";
  }
  if (
    obsPickupStatus === "stale_manifest" ||
    obsPickupStatus === "stale_artifact" ||
    obsPickupStatus === "artifact_sync_skew"
  ) {
    return "waiting_for_fresh_render";
  }
  if (
    obsPickupStatus === "manifest_attention_required" ||
    obsPickupStatus === "unsafe_artifact_reference" ||
    obsPickupStatus === "invalid_artifact_kind" ||
    obsPickupStatus === "invalid_artifact" ||
    obsPickupStatus === "unsafe_manifest_label"
  ) {
    return "operator_action_required";
  }
  return "attention";
}

function assertObsPickupStatusSafe(status, context) {
  if (
    ![
      "ready",
      "waiting_for_manifest",
      "missing_artifact_files",
      "missing_artifact_render_timestamp",
      "stale_manifest",
      "stale_artifact",
      "artifact_sync_skew",
      "manifest_attention_required",
      "unsafe_artifact_reference",
      "invalid_artifact_kind",
      "invalid_artifact",
      "unsafe_manifest_label",
    ].includes(status)
  ) {
    throw new ContractError(`${context}: invalid OBS pickup status`, { status });
  }
}

function assertObsHandoffMatchesPickupStatus({ pickupStatus, handoffStatus, context }) {
  if (classifyObsHandoffReadinessStatus(pickupStatus) !== handoffStatus) {
    throw new ContractError(`${context}: OBS handoff readiness status mismatch`);
  }
}

function assertObsHandoffReadinessStatusSafe(status, context) {
  if (
    ![
      "ready",
      "waiting_for_manifest",
      "waiting_for_complete_artifacts",
      "waiting_for_fresh_render",
      "operator_action_required",
      "attention",
    ].includes(status)
  ) {
    throw new ContractError(`${context}: invalid OBS handoff readiness status`, { status });
  }
}

function assertManifestSummaryBoundaryPolicy(policy, context) {
  assertBoundaryPolicy(policy, [
    "summary_only",
    "no_artifact_paths",
    "no_raw_jobs",
    "no_text_payloads",
    "no_candidates",
    "no_commands",
    "no_endpoint_values",
    "no_secret_values",
    "no_external_file_existence_probe",
    "stale_manifest_guard_supported",
    "stale_artifact_guard_supported",
    "artifact_render_sync_guard_supported",
  ], context);
}

function assertBoundaryPolicy(policy, requiredFields, context, optionalFields = []) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const allowed = new Set([...requiredFields, ...optionalFields]);
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary policy field ${field}`);
    }
  }
  for (const field of requiredFields) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertObsPickupBlockingStatusByAdapterSafe(statuses, context) {
  if (!statuses || typeof statuses !== "object" || Array.isArray(statuses)) {
    throw new ContractError(`${context}: invalid OBS pickup blocking status map`);
  }
  for (const kind of ADAPTER_KINDS) {
    if (
      ![
        "ready",
        "missing_manifest_item",
        "unsafe_artifact_reference",
        "missing_artifact_file",
        "missing_artifact_render_timestamp",
        "stale_artifact",
        "artifact_sync_skew",
        "invalid_artifact_kind",
        "invalid_artifact",
        "unsafe_manifest_label",
      ].includes(statuses[kind])
    ) {
      throw new ContractError(`${context}: invalid OBS pickup blocking adapter status`, {
        adapter_kind: kind,
        status: statuses[kind],
      });
    }
  }
}

function assertObsPickupBlockingSummaryConsistent(summary, context) {
  if (!Array.isArray(summary.obs_pickup_blocking_adapter_kinds)) {
    throw new ContractError(`${context}: invalid OBS pickup blocking adapter list`);
  }
  const expectedBlockingKinds = ADAPTER_KINDS.filter(
    (kind) => summary.obs_pickup_blocking_status_by_adapter?.[kind] !== "ready"
  );
  if (
    summary.obs_pickup_blocking_adapter_count !== expectedBlockingKinds.length ||
    summary.obs_pickup_blocking_adapter_kinds.length !== expectedBlockingKinds.length ||
    !expectedBlockingKinds.every(
      (kind, index) => summary.obs_pickup_blocking_adapter_kinds[index] === kind
    )
  ) {
    throw new ContractError(`${context}: OBS pickup blocking summary mismatch`);
  }
  const expectedReady = expectedBlockingKinds.length === 0;
  if (summary.obs_pickup_ready === true && expectedReady !== true) {
    throw new ContractError(`${context}: OBS pickup ready mismatch`);
  }
}

function assertArtifactRenderTimestampSummarySafe(summary, context) {
  if (
    !summary.artifact_render_timestamp_present_by_adapter ||
    typeof summary.artifact_render_timestamp_present_by_adapter !== "object" ||
    Array.isArray(summary.artifact_render_timestamp_present_by_adapter)
  ) {
    throw new ContractError(`${context}: invalid artifact render timestamp map`);
  }
  const allPresent = ADAPTER_KINDS.every(
    (kind) => summary.artifact_render_timestamp_present_by_adapter[kind] === true
  );
  for (const kind of ADAPTER_KINDS) {
    if (typeof summary.artifact_render_timestamp_present_by_adapter[kind] !== "boolean") {
      throw new ContractError(`${context}: invalid artifact render timestamp flag`, {
        adapter_kind: kind,
      });
    }
  }
  if (
    summary.all_artifact_render_timestamps_present !== allPresent ||
    summary.missing_artifact_render_timestamp_rejected_for_obs_pickup !== !allPresent
  ) {
    throw new ContractError(`${context}: artifact render timestamp summary mismatch`);
  }
}

export function hasUnsafeLocalBridgeRenderManifestPublicLabels(manifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) return true;
  if (classifyManifestPublicLabelStatus(manifest) !== "safe") return true;
  return ADAPTER_KINDS.some(
    (kind) => classifyArtifactPublicLabelStatus(manifest.artifact_set?.[kind], kind) !== "safe"
  );
}

export function hasLocalBridgeRenderManifestArtifactSyncSkew(
  manifest,
  { maxArtifactRenderSkewMs = null } = {}
) {
  return (
    classifyArtifactRenderSync({
      manifest,
      maxArtifactRenderSkewMs: normalizeOptionalMaxArtifactRenderSkewMs(
        maxArtifactRenderSkewMs
      ),
    }).blocksPickup === true
  );
}

function summarizeArtifactForPickup({ artifactDir, artifact }) {
  const relativePath = safeText(artifact?.artifact_path, 260);
  const contentType = contentTypeForArtifact(artifact);
  if (
    artifact &&
    !isExpectedReportArtifactKind(artifact.adapter_kind, safeText(artifact.artifact_kind, 80))
  ) {
    return {
      reference_safe: false,
      file_available: false,
      content_type: contentType,
      size_bytes: null,
      contract_valid: false,
      contract_status: "invalid_artifact_kind",
      pickup_status: "invalid_artifact_kind",
    };
  }
  if (!artifactDir || !relativePath) {
    return {
      reference_safe: false,
      file_available: false,
      content_type: contentType,
      size_bytes: null,
      contract_valid: false,
      contract_status: "not_checked",
      pickup_status: "missing_manifest_item",
    };
  }
  const resolved = resolveArtifactPathWithinDir({ artifactDir, relativePath });
  if (!resolved.safe || !resolved.artifactPath) {
    return {
      reference_safe: false,
      file_available: false,
      content_type: contentType,
      size_bytes: null,
      contract_valid: false,
      contract_status: "not_checked",
      pickup_status: "unsafe_reference",
    };
  }
  try {
    if (!existsSync(resolved.artifactPath)) {
      return {
        reference_safe: true,
        file_available: false,
        content_type: contentType,
        size_bytes: null,
        contract_valid: false,
        contract_status: "not_checked",
        pickup_status: "missing_file",
      };
    }
    const stat = statSync(resolved.artifactPath);
    if (!stat.isFile()) {
      return {
        reference_safe: true,
        file_available: false,
        content_type: contentType,
        size_bytes: null,
        contract_valid: false,
        contract_status: "not_checked",
        pickup_status: "missing_file",
      };
    }
    const bytes = readFileSync(resolved.artifactPath);
    const contract = validateLocalRenderArtifactForPickup({
      adapterKind: artifact?.adapter_kind,
      artifact,
      contentType,
      bytes,
    });
    return {
      reference_safe: true,
      file_available: true,
      content_type: contentType,
      size_bytes: safeOptionalNumber(stat.size),
      byte_hash: createArtifactByteHash(bytes),
      contract_valid: contract.contract_valid,
      contract_status: contract.contract_status,
      pickup_status: contract.contract_valid ? "ready" : "invalid_artifact",
    };
  } catch {
    return {
      reference_safe: true,
      file_available: false,
      content_type: contentType,
      size_bytes: null,
      contract_valid: false,
      contract_status: "not_checked",
      pickup_status: "missing_file",
    };
  }
}

function createArtifactByteHash(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function isExpectedReportArtifactKind(adapterKind, artifactKind) {
  if (adapterKind === "tts") {
    return (
      artifactKind === "audio_wav" ||
      artifactKind === "audio_mpeg" ||
      artifactKind === "audio_mp4" ||
      artifactKind === "audio_aac" ||
      artifactKind === "audio_flac" ||
      artifactKind === "audio_ogg" ||
      artifactKind === "audio_opus" ||
      artifactKind === "audio_webm"
    );
  }
  if (adapterKind === "live2d") {
    return artifactKind === "live2d_cue_json" || artifactKind === "live2d_engine_cue_json";
  }
  if (adapterKind === "subtitle") return artifactKind === "subtitle_vtt" || artifactKind === "subtitle_srt";
  return false;
}

function resolveArtifactPathWithinDir({ artifactDir, relativePath }) {
  const safeRelativePath = safeText(relativePath, 260);
  if (!artifactDir || !safeRelativePath) return { safe: false, artifactPath: null };
  const artifactBase = resolve(artifactDir);
  const artifactPath = resolve(artifactDir, safeRelativePath);
  return {
    safe: artifactPath !== artifactBase && artifactPath.startsWith(`${artifactBase}${sep}`),
    artifactPath,
  };
}

function contentTypeForArtifact(artifact) {
  const artifactKind = safeText(artifact?.artifact_kind, 80);
  if (artifactKind === "audio_wav") return "audio/wav";
  if (artifactKind === "audio_mpeg") return "audio/mpeg";
  if (artifactKind === "audio_mp4") return "audio/mp4";
  if (artifactKind === "audio_aac") return "audio/aac";
  if (artifactKind === "audio_flac") return "audio/flac";
  if (artifactKind === "audio_ogg") return "audio/ogg";
  if (artifactKind === "audio_opus") return "audio/opus";
  if (artifactKind === "audio_webm") return "audio/webm";
  if (artifactKind === "subtitle_vtt") return "text/vtt; charset=utf-8";
  if (artifactKind === "subtitle_srt") return "application/x-subrip; charset=utf-8";
  if (artifactKind === "live2d_cue_json" || artifactKind === "live2d_engine_cue_json") {
    return "application/json; charset=utf-8";
  }
  const extension = extname(safeText(artifact?.artifact_path, 260)).toLowerCase();
  if (extension === ".wav") return "audio/wav";
  if (extension === ".mp3") return "audio/mpeg";
  if (extension === ".m4a" || extension === ".mp4") return "audio/mp4";
  if (extension === ".aac") return "audio/aac";
  if (extension === ".flac") return "audio/flac";
  if (extension === ".opus") return "audio/opus";
  if (extension === ".ogg") return "audio/ogg";
  if (extension === ".webm") return "audio/webm";
  if (extension === ".vtt") return "text/vtt; charset=utf-8";
  if (extension === ".srt") return "application/x-subrip; charset=utf-8";
  if (extension === ".json") return "application/json; charset=utf-8";
  return "application/octet-stream";
}

function computeAgeMs({ createdAtMs, nowMs }) {
  if (createdAtMs === null || createdAtMs === undefined || createdAtMs === "") return null;
  const created = Number(createdAtMs);
  const now = Number(nowMs);
  if (!Number.isFinite(created) || !Number.isFinite(now)) return null;
  return Math.max(0, Number((now - created).toFixed(4)));
}

function computeSignedAgeMs({ timestampMs, nowMs }) {
  if (timestampMs === null || timestampMs === undefined || timestampMs === "") return null;
  const timestamp = Number(timestampMs);
  const now = Number(nowMs);
  if (!Number.isFinite(timestamp) || !Number.isFinite(now)) return null;
  return Number((now - timestamp).toFixed(4));
}

function classifyManifestFreshness({ ageMs, maxManifestAgeMs }) {
  if (maxManifestAgeMs === null) {
    return {
      status: "not_enforced",
      fresh: null,
      blocksPickup: false,
    };
  }
  if (ageMs === null) {
    return {
      status: "unknown",
      fresh: false,
      blocksPickup: true,
    };
  }
  if (ageMs <= maxManifestAgeMs) {
    return {
      status: "fresh",
      fresh: true,
      blocksPickup: false,
    };
  }
  return {
    status: "stale",
    fresh: false,
    blocksPickup: true,
  };
}

function classifyArtifactFreshness({ ageMs, maxManifestAgeMs }) {
  if (maxManifestAgeMs === null) {
    return {
      ageMs,
      status: "not_enforced",
      fresh: null,
      blocksPickup: false,
    };
  }
  if (ageMs === null) {
    return {
      ageMs,
      status: "unknown",
      fresh: false,
      blocksPickup: true,
    };
  }
  if (ageMs < 0) {
    return {
      ageMs,
      status: "future_clock_skew",
      fresh: false,
      blocksPickup: true,
    };
  }
  if (ageMs <= maxManifestAgeMs) {
    return {
      ageMs,
      status: "fresh",
      fresh: true,
      blocksPickup: false,
    };
  }
  return {
    ageMs,
    status: "stale",
    fresh: false,
    blocksPickup: true,
  };
}

function classifyArtifactRenderSync({ manifest, maxArtifactRenderSkewMs }) {
  if (maxArtifactRenderSkewMs === null) {
    return {
      skewMs: null,
      status: "not_enforced",
      ready: true,
      blocksPickup: false,
    };
  }
  const renderedAtValues = ADAPTER_KINDS.map((kind) =>
    Number(manifest?.artifact_set?.[kind]?.rendered_at_ms)
  );
  if (renderedAtValues.some((value) => !Number.isFinite(value))) {
    return {
      skewMs: null,
      status: "unknown",
      ready: false,
      blocksPickup: true,
    };
  }
  const skewMs = Number(
    (Math.max(...renderedAtValues) - Math.min(...renderedAtValues)).toFixed(4)
  );
  if (skewMs <= maxArtifactRenderSkewMs) {
    return {
      skewMs,
      status: "synchronized",
      ready: true,
      blocksPickup: false,
    };
  }
  return {
    skewMs,
    status: "skewed",
    ready: false,
    blocksPickup: true,
  };
}

function normalizeOptionalMaxAgeMs(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  return Math.min(MAX_RENDER_MANIFEST_AGE_MS, Math.trunc(number));
}

function normalizeOptionalMaxArtifactRenderSkewMs(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  return Math.min(MAX_RENDER_ARTIFACT_SKEW_MS, Math.trunc(number));
}

function safeOptionalNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Number(number.toFixed(4));
}

function safeText(value, maxLength = 160) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function safePublicManifestLabel(value, maxLength = 160, fallback = "redacted_label") {
  const text = safeText(value, maxLength);
  return isSafePublicManifestLabel(text) ? text : fallback;
}

function classifyManifestPublicLabelStatus(manifest) {
  return isSafePublicManifestLabel(safeText(manifest?.manifest_id, 220)) &&
    isSafePublicManifestLabel(safeText(manifest?.event_id, 160))
    ? "safe"
    : "unsafe";
}

function classifyArtifactPublicLabelStatus(artifact, expectedKind) {
  if (!artifact || typeof artifact !== "object" || Array.isArray(artifact)) return "unsafe";
  return artifact.adapter_kind === expectedKind &&
    isSafePublicManifestLabel(safeText(artifact.artifact_kind, 80)) &&
    isSafePublicManifestLabel(safeText(artifact.engine_mode, 80))
    ? "safe"
    : "unsafe";
}

function isSafePublicManifestLabel(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    PUBLIC_MANIFEST_LABEL_PATTERN.test(value) &&
    !UNSAFE_PUBLIC_MANIFEST_LABEL_PATTERN.test(value)
  );
}

function assertPublicLabelSafetySummarySafe(summary, context) {
  if (!["safe", "unsafe"].includes(summary.manifest_public_label_status)) {
    throw new ContractError(`${context}: invalid manifest public label status`);
  }
  if (
    !summary.artifact_public_label_status_by_adapter ||
    typeof summary.artifact_public_label_status_by_adapter !== "object" ||
    Array.isArray(summary.artifact_public_label_status_by_adapter)
  ) {
    throw new ContractError(`${context}: invalid artifact public label status map`);
  }
  for (const kind of ADAPTER_KINDS) {
    if (!["safe", "unsafe"].includes(summary.artifact_public_label_status_by_adapter[kind])) {
      throw new ContractError(`${context}: invalid artifact public label status`);
    }
  }
  for (const field of [
    "unsafe_public_label_rejected_for_obs_pickup",
    "all_public_labels_safe_for_pickup",
    "artifact_render_sync_ready",
    "artifact_render_sync_rejected_for_obs_pickup",
    "all_artifact_render_timestamps_present",
    "missing_artifact_render_timestamp_rejected_for_obs_pickup",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid public label safety flag`);
    }
  }
  if (
    !["not_enforced", "synchronized", "skewed", "unknown"].includes(
      summary.artifact_render_sync_status
    )
  ) {
    throw new ContractError(`${context}: invalid artifact render sync status`);
  }
  if (
    summary.artifact_render_skew_ms !== null &&
    (!Number.isFinite(Number(summary.artifact_render_skew_ms)) ||
      Number(summary.artifact_render_skew_ms) < 0)
  ) {
    throw new ContractError(`${context}: invalid artifact render skew`);
  }
}

function assertNoUnsafeReportStringValues(value, context, path = "root") {
  if (typeof value === "string") {
    if (UNSAFE_REPORT_STRING_VALUE_PATTERN.test(value)) {
      throw new ContractError(`${context}: unsafe render manifest report value`, { path });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (path === "root.local_debug_paths") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoUnsafeReportStringValues(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoUnsafeReportStringValues(child, context, `${path}.${field}`);
  }
}

function assertNoForbiddenReportFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoForbiddenReportFields(item, context, `${path}[${index}]`));
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_RENDER_MANIFEST_REPORT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsafe render manifest report field`, { field, path });
    }
    assertNoForbiddenReportFields(child, context, `${path}.${field}`);
  }
}
