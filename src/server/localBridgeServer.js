import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import { assertAdapterPacketSafe } from "../adapters/adapterPackets.js";
import { ContractError } from "../core/contracts.js";
import {
  assertApprovedGameInputActionSafe,
  isApprovedGameInputActionExpired,
} from "../services/game/gameActionValidator.js";
import {
  createDisabledLocalBridgeOutboxStatus,
  createLocalBridgeOutbox,
} from "./localBridgeOutbox.js";
import {
  assertLocalBridgeEngineReceiptSafe,
  assertLocalBridgeEventRenderManifestSafe,
  createLocalBridgeEventRenderManifestStoreStatus,
} from "./localBridgeEngineWorker.js";
import {
  createLocalBridgeRenderManifestOperatorReport,
  hasLocalBridgeRenderManifestArtifactSyncSkew,
  hasUnsafeLocalBridgeRenderManifestPublicLabels,
} from "./localBridgeRenderManifestReport.js";
import { validateLocalRenderArtifactForPickup } from "./localBridgeArtifactValidation.js";

const ADAPTER_PATHS = new Map([
  ["/tts", "tts"],
  ["/live2d", "live2d"],
  ["/subtitle", "subtitle"],
]);

const REQUIRED_RENDER_ARTIFACT_KINDS = ["tts", "live2d", "subtitle"];
const ACCEPTED_ADAPTER_KINDS = Object.freeze(["tts", "live2d", "subtitle", "game_control"]);

export const LATEST_ARTIFACT_PATHS = new Map([
  ["/event-render-manifests/latest/artifact/tts", "tts"],
  ["/event-render-manifests/latest/artifact/live2d", "live2d"],
  ["/event-render-manifests/latest/artifact/subtitle", "subtitle"],
]);

const MAX_RENDER_MANIFEST_AGE_MS = 24 * 3_600_000;
const MAX_RENDER_ARTIFACT_SKEW_MS = 3_600_000;

const FORBIDDEN_LOCAL_BRIDGE_STATUS_FIELDS = new Set([
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
  "packet",
  "raw_packet",
  "outbox_payload",
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

const SAFE_LOCAL_BRIDGE_ERROR_KINDS = new Set([
  "auth_required",
  "invalid_json",
  "request_body_too_large",
  "unsafe_payload",
  "contract_error",
  "approved_action_expired",
  "local_bridge_error",
]);

const SAFE_LOCAL_ARTIFACT_ERROR_KINDS = new Set([
  "artifact_dir_not_configured",
  "manifest_not_found",
  "invalid_manifest",
  "incomplete_manifest",
  "missing_artifact",
  "missing_artifact_file",
  "missing_artifact_render_timestamp",
  "manifest_mismatch",
  "stale_manifest",
  "stale_artifact",
  "artifact_sync_skew",
  "invalid_artifact",
  "invalid_artifact_kind",
  "unsafe_artifact_reference",
  "unsafe_manifest_label",
  "artifact_delivery_error",
]);

export function createLocalBridgeState({
  historyLimit = 30,
  nowMs = () => Date.now(),
  outbox = null,
  gameControlSideEffectsEnabled = false,
} = {}) {
  const history = [];
  let totalReceived = 0;
  const perKind = {
    tts: emptyKindStatus(),
    live2d: emptyKindStatus(),
    subtitle: emptyKindStatus(),
  };
  let gameControl = emptyGameControlStatus();

  return {
    receivePacket(packet) {
      assertAdapterPacketSafe(packet, "Local bridge adapter packet");
      const now = nowMs();
      const outboxEnabled = typeof outbox?.writeJob === "function";
      const ack = createAdapterAck(packet, { nowMs: now, outboxEnabled });
      const outboxSummary = outbox?.writeJob?.(packet, ack) ?? null;
      const summary = createPacketSummary(packet, ack, { nowMs: now });
      if (outboxSummary) {
        summary.outbox_job_id_present = safeText(outboxSummary.job_id, 220) !== "";
      }
      totalReceived += 1;
      history.push(summary);
      while (history.length > historyLimit) history.shift();
      perKind[packet.adapter_kind] = updateKindStatus(perKind[packet.adapter_kind], summary, packet);
      return ack;
    },
    receiveGameControlAction(approvedAction) {
      assertApprovedGameInputActionSafe(approvedAction, "Local bridge game control action");
      const now = nowMs();
      const ack = {
        request_id: `local-game-control-${safeId(approvedAction.event_id)}-${now}`,
        bridge_status: gameControlSideEffectsEnabled ? "accepted_executed" : "accepted_simulated",
        executed: gameControlSideEffectsEnabled,
        simulated: !gameControlSideEffectsEnabled,
        reason: gameControlSideEffectsEnabled
          ? "local_bridge_accepts_approved_schema_with_side_effects"
          : "local_bridge_accepts_approved_schema_without_os_input",
      };
      totalReceived += 1;
      gameControl = {
        received_count: gameControl.received_count + 1,
        last_event_id: safeText(approvedAction.event_id, 160),
        last_event_id_present: safeText(approvedAction.event_id, 160) !== "",
        last_bridge_status: ack.bridge_status,
        last_action_kind: safeText(approvedAction.action_kind, 80),
        last_received_at_ms: now,
        executed: ack.executed,
        simulated: ack.simulated,
        side_effects_enabled: gameControlSideEffectsEnabled,
      };
      return ack;
    },
    status() {
      const status = {
        schema: "iris_local_bridge_status_v1",
        bridge_status: "ready",
        accepted_adapter_kinds: [...ACCEPTED_ADAPTER_KINDS],
        total_received: totalReceived,
        adapters: structuredClone(perKind),
        game_control: structuredClone(gameControl),
        outbox: outbox?.status?.() ?? createDisabledLocalBridgeOutboxStatus(),
        recent: history.slice(-10),
        boundary_policy: {
          read_only_status: true,
          no_raw_packets: true,
          no_text_payloads: true,
          no_endpoint_values: true,
          no_candidates: true,
          no_commands: true,
          no_secret_values: true,
        },
        adapter_validation_required: true,
      };
      for (const adapter of Object.values(status.adapters ?? {})) {
        adapter.last_event_id_present = safeText(adapter.last_event_id, 160) !== "";
        delete adapter.last_event_id;
      }
      for (const adapter of Object.values(status.outbox?.adapters ?? {})) {
        adapter.last_event_id_present = safeText(adapter.last_event_id, 160) !== "";
        delete adapter.last_event_id;
      }
      if (status.game_control) {
        status.game_control.last_event_id_present =
          safeText(status.game_control.last_event_id, 160) !== "";
        delete status.game_control.last_event_id;
      }
      assertLocalBridgeStatusSafe(status);
      return status;
    },
  };
}

export function createLocalBridgeServer({
  bridgeState = null,
  outboxDir = "",
  artifactDir = "",
  apiKey = "",
  maxRenderManifestAgeMs = null,
  maxArtifactRenderSkewMs = null,
  gameControlSideEffectsEnabled = false,
  nowMs = () => Date.now(),
  logger = console,
} = {}) {
  const safeMaxRenderManifestAgeMs = normalizeOptionalMaxAgeMs(maxRenderManifestAgeMs);
  const safeMaxArtifactRenderSkewMs =
    normalizeOptionalMaxArtifactRenderSkewMs(maxArtifactRenderSkewMs);
  const artifactDirConfigured = artifactDir !== "";
  const requiredApiKey = safeText(apiKey, 300);
  const activeBridgeState =
    bridgeState ??
    createLocalBridgeState({
      nowMs,
      outbox: outboxDir ? createLocalBridgeOutbox({ outboxDir }) : null,
      gameControlSideEffectsEnabled,
    });
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://127.0.0.1");
      if (request.method === "GET" && url.pathname === "/health") {
        return sendJson(response, 200, createLocalBridgeHealthReport({
          outboxDir,
          artifactDirConfigured,
          maxRenderManifestAgeMs: safeMaxRenderManifestAgeMs,
          maxArtifactRenderSkewMs: safeMaxArtifactRenderSkewMs,
        }));
      }
      if (request.method === "GET" && url.pathname === "/status") {
        return sendJson(response, 200, {
          ok: true,
          local_bridge_status: activeBridgeState.status(),
        });
      }
      if (request.method === "GET" && url.pathname === "/event-render-manifests/status") {
        const storeStatus = createLocalBridgeEventRenderManifestStoreStatus({
          artifactDir,
        });
        return sendJson(response, 200, {
          ok: true,
          event_render_manifest_store: createPublicLocalBridgeRenderManifestStoreStatus(
            storeStatus
          ),
        });
      }
      if (request.method === "GET" && url.pathname === "/event-render-manifests/latest") {
        const report = createLocalBridgeRenderManifestOperatorReport({
          artifactDir,
          showLocalPaths: false,
          maxManifestAgeMs: safeMaxRenderManifestAgeMs,
          maxArtifactRenderSkewMs: safeMaxArtifactRenderSkewMs,
          nowMs: nowMs(),
        });
        const publicReport = createPublicLocalBridgeRenderManifestReport(report);
        return sendJson(response, 200, {
          ok: report.ok,
          event_render_manifest_report: publicReport,
        });
      }
      const latestArtifactKind = LATEST_ARTIFACT_PATHS.get(url.pathname);
      if (
        request.method === "GET" &&
        url.pathname.startsWith("/event-render-manifests/latest/artifact/")
      ) {
        if (!latestArtifactKind) {
          return sendJson(
            response,
            getLocalArtifactErrorStatusCode("missing_artifact"),
            createLocalArtifactErrorResponse("missing_artifact")
          );
        }
      }
      if (request.method === "GET" && latestArtifactKind) {
        const artifact = readLatestRenderArtifact({
          artifactDir,
          adapterKind: latestArtifactKind,
          maxRenderManifestAgeMs: safeMaxRenderManifestAgeMs,
          maxArtifactRenderSkewMs: safeMaxArtifactRenderSkewMs,
          nowMs: nowMs(),
          expectedManifestId: url.searchParams.get("manifest_id") ?? "",
          allowPartialVisualArtifacts: url.searchParams.get("allow_partial_visual") === "true",
        });
        if (!artifact.ok) {
          return sendJson(
            response,
            getLocalArtifactErrorStatusCode(artifact.error_kind),
            createLocalArtifactErrorResponse(artifact.error_kind)
          );
        }
        return sendBytes(response, 200, artifact.bytes, {
          "content-type": artifact.content_type,
          "content-length": artifact.bytes.length,
          "x-iris-adapter-kind": artifact.adapter_kind,
          "x-iris-artifact-kind": artifact.artifact_kind,
          "x-iris-artifact-byte-hash": artifact.byte_hash,
          "x-iris-manifest-id": artifact.manifest_id,
          "x-iris-manifest-id-present":
            safeText(artifact.manifest_id, 220) !== "" ? "true" : "false",
          "x-iris-event-id": artifact.event_id,
          "x-iris-event-id-present":
            safeText(artifact.event_id, 160) !== "" ? "true" : "false",
          "x-iris-rendered-at-ms": artifact.rendered_at_ms,
          "cache-control": "no-store",
        });
      }
      if (request.method === "POST" && url.pathname === "/game-control") {
        if (!isAuthorizedLocalBridgeRequest(request, requiredApiKey)) {
          return sendJson(response, 401, createLocalBridgeErrorResponse("auth_required"));
        }
        const body = await readJson(request);
        assertApprovedGameInputActionSafe(body, "Local bridge game control action");
        if (isApprovedGameInputActionExpired(body, { nowMs })) {
          return sendJson(response, 409, createLocalBridgeErrorResponse("approved_action_expired"));
        }
        const ack = activeBridgeState.receiveGameControlAction(body);
        return sendJson(response, 200, ack);
      }
      const adapterKind = ADAPTER_PATHS.get(url.pathname);
      if (request.method === "POST" && adapterKind) {
        if (!isAuthorizedLocalBridgeRequest(request, requiredApiKey)) {
          return sendJson(response, 401, createLocalBridgeErrorResponse("auth_required"));
        }
        const body = await readJson(request);
        if (body?.adapter_kind !== adapterKind) {
          return sendJson(response, 400, {
            ok: false,
            error: "adapter_kind_path_mismatch",
            expected_adapter_kind: adapterKind,
          });
        }
        const ack = activeBridgeState.receivePacket(body);
        return sendJson(response, 200, ack);
      }
      return sendJson(response, 404, { ok: false, error: "not_found" });
    } catch (error) {
      const errorKind = classifyLocalBridgeRequestError(error);
      const statusCode = getLocalBridgeErrorStatusCode(errorKind);
      if (statusCode >= 500) logger.error?.(error);
      return sendJson(response, statusCode, createLocalBridgeErrorResponse(errorKind));
    }
  });
}

export function createLocalBridgeHealthReport({
  outboxDir = "",
  artifactDirConfigured = false,
  maxRenderManifestAgeMs = null,
  maxArtifactRenderSkewMs = null,
} = {}) {
  const safeMaxRenderManifestAgeMs = normalizeOptionalMaxAgeMs(maxRenderManifestAgeMs);
  const safeMaxArtifactRenderSkewMs =
    normalizeOptionalMaxArtifactRenderSkewMs(maxArtifactRenderSkewMs);
  const artifactStorageConfigured = artifactDirConfigured === true;
  const report = {
    ok: true,
    schema: "iris_local_bridge_health_v1",
    service: "iris-local-bridge",
    bridge_status: "ready",
    accepted_adapter_kinds: [...ACCEPTED_ADAPTER_KINDS],
    outbox_configured: safeText(outboxDir, 1_000) !== "",
    artifact_storage_configured: artifactStorageConfigured,
    render_manifest_routes_available: artifactStorageConfigured,
    latest_artifact_delivery_routes_available: artifactStorageConfigured,
    render_manifest_stale_guard_configured: safeMaxRenderManifestAgeMs !== null,
    render_artifact_sync_guard_configured: safeMaxArtifactRenderSkewMs !== null,
    local_route_paths: {
      status: "/status",
      event_render_manifest_status: "/event-render-manifests/status",
      latest_event_render_manifest_report: "/event-render-manifests/latest",
      latest_artifacts: {
        tts: "/event-render-manifests/latest/artifact/tts",
        live2d: "/event-render-manifests/latest/artifact/live2d",
        subtitle: "/event-render-manifests/latest/artifact/subtitle",
      },
    },
    boundary_policy: {
      read_only_health: true,
      route_paths_only: true,
      no_raw_packets: true,
      no_raw_jobs: true,
      no_artifact_paths: true,
      no_text_payloads: true,
      no_endpoint_values: true,
      no_candidates: true,
      no_commands: true,
      no_secret_values: true,
    },
    adapter_validation_required: true,
  };
  assertLocalBridgeHealthReportSafe(report);
  return report;
}

export function assertLocalBridgeHealthReportSafe(
  report,
  context = "local bridge health report"
) {
  if (!report || typeof report !== "object") {
    throw new ContractError(`${context}: missing report`);
  }
  assertNoForbiddenLocalBridgeStatusFields(report, context);
  if (report.schema !== "iris_local_bridge_health_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: report.schema });
  }
  if (report.bridge_status !== "ready") {
    throw new ContractError(`${context}: invalid bridge status`, {
      bridge_status: report.bridge_status,
    });
  }
  if (!Array.isArray(report.accepted_adapter_kinds)) {
    throw new ContractError(`${context}: accepted adapter kinds are required`);
  }
  if (JSON.stringify(report.accepted_adapter_kinds) !== JSON.stringify(ACCEPTED_ADAPTER_KINDS)) {
    throw new ContractError(`${context}: invalid accepted adapter kinds`);
  }
  if (
    typeof report.outbox_configured !== "boolean" ||
    typeof report.artifact_storage_configured !== "boolean" ||
    report.render_manifest_routes_available !== report.artifact_storage_configured ||
    report.latest_artifact_delivery_routes_available !== report.artifact_storage_configured ||
    typeof report.render_manifest_stale_guard_configured !== "boolean" ||
    typeof report.render_artifact_sync_guard_configured !== "boolean"
  ) {
    throw new ContractError(`${context}: invalid bridge readiness flags`);
  }
  assertLocalBridgeRoutePathsSafe(report.local_route_paths, context);
  assertBoundaryPolicy(report.boundary_policy, [
    "read_only_health",
    "route_paths_only",
    "no_raw_packets",
    "no_raw_jobs",
    "no_artifact_paths",
    "no_text_payloads",
    "no_endpoint_values",
    "no_candidates",
    "no_commands",
    "no_secret_values",
  ], context);
  if (report.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
}

function assertLocalBridgeRoutePathsSafe(paths, context) {
  if (!paths || typeof paths !== "object" || Array.isArray(paths)) {
    throw new ContractError(`${context}: route paths required`);
  }
  if (
    paths.status !== "/status" ||
    paths.event_render_manifest_status !== "/event-render-manifests/status" ||
    paths.latest_event_render_manifest_report !== "/event-render-manifests/latest" ||
    paths.latest_artifacts?.tts !== "/event-render-manifests/latest/artifact/tts" ||
    paths.latest_artifacts?.live2d !== "/event-render-manifests/latest/artifact/live2d" ||
    paths.latest_artifacts?.subtitle !== "/event-render-manifests/latest/artifact/subtitle"
  ) {
    throw new ContractError(`${context}: invalid route paths`);
  }
}

function assertBoundaryPolicy(policy, requiredFields, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const allowed = new Set(requiredFields);
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary flag ${field}`);
    }
  }
  for (const field of requiredFields) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary flag required ${field}`);
    }
  }
}

export function assertLocalBridgeStatusSafe(status, context = "local bridge status") {
  if (!status || typeof status !== "object") {
    throw new ContractError(`${context}: missing status`);
  }
  assertNoForbiddenLocalBridgeStatusFields(status, context);
  if (status.schema !== "iris_local_bridge_status_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: status.schema });
  }
  if (status.bridge_status !== "ready") {
    throw new ContractError(`${context}: invalid bridge status`);
  }
  if (JSON.stringify(status.accepted_adapter_kinds) !== JSON.stringify(ACCEPTED_ADAPTER_KINDS)) {
    throw new ContractError(`${context}: invalid accepted adapter kinds`);
  }
  for (const kind of REQUIRED_RENDER_ARTIFACT_KINDS) {
    assertLocalBridgeKindStatusSafe(status.adapters?.[kind], `${context}: ${kind}`);
  }
  assertLocalBridgeGameControlStatusSafe(status.game_control, `${context}: game control`);
  const adapterReceivedCount = REQUIRED_RENDER_ARTIFACT_KINDS.reduce(
    (sum, kind) => sum + status.adapters[kind].received_count,
    0
  );
  const expectedTotalReceived =
    adapterReceivedCount + status.game_control.received_count;
  if (status.total_received !== expectedTotalReceived) {
    throw new ContractError(`${context}: total received mismatch`);
  }
  if (!Array.isArray(status.recent) || status.recent.length > Math.min(10, status.total_received)) {
    throw new ContractError(`${context}: invalid recent summary`);
  }
  for (const recent of status.recent) {
    assertLocalBridgePacketSummarySafe(recent, `${context}: recent packet`);
  }
  assertBoundaryPolicy(status.boundary_policy, [
    "read_only_status",
    "no_raw_packets",
    "no_text_payloads",
    "no_endpoint_values",
    "no_candidates",
    "no_commands",
    "no_secret_values",
  ], context);
  if (status.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
}

function assertLocalBridgeKindStatusSafe(kindStatus, context) {
  if (!kindStatus || typeof kindStatus !== "object" || Array.isArray(kindStatus)) {
    throw new ContractError(`${context}: kind status required`);
  }
  if (!Number.isInteger(kindStatus.received_count) || kindStatus.received_count < 0) {
    throw new ContractError(`${context}: invalid received count`);
  }
  if (typeof kindStatus.last_event_id_present !== "boolean") {
    throw new ContractError(`${context}: invalid last_event_id_present`);
  }
  for (const field of ["last_bridge_status", "last_artifact_kind"]) {
    if (kindStatus[field] !== null && typeof kindStatus[field] !== "string") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (
    kindStatus.last_duration_ms !== null &&
    (!Number.isFinite(kindStatus.last_duration_ms) || kindStatus.last_duration_ms < 0)
  ) {
    throw new ContractError(`${context}: invalid duration`);
  }
  if (
    kindStatus.last_received_at_ms !== null &&
    (!Number.isFinite(kindStatus.last_received_at_ms) || kindStatus.last_received_at_ms < 0)
  ) {
    throw new ContractError(`${context}: invalid received timestamp`);
  }
}

function assertLocalBridgeGameControlStatusSafe(gameControl, context) {
  if (!gameControl || typeof gameControl !== "object" || Array.isArray(gameControl)) {
    throw new ContractError(`${context}: game control status required`);
  }
  assertLocalBridgeKindStatusSafe(
    {
      received_count: gameControl.received_count,
      last_event_id_present: gameControl.last_event_id_present,
      last_bridge_status: gameControl.last_bridge_status,
      last_artifact_kind: null,
      last_duration_ms: null,
      last_received_at_ms: gameControl.last_received_at_ms,
    },
    context
  );
  if (
    typeof gameControl.executed !== "boolean" ||
    typeof gameControl.simulated !== "boolean" ||
    typeof gameControl.side_effects_enabled !== "boolean"
  ) {
    throw new ContractError(`${context}: invalid effect flags`);
  }
  if (gameControl.received_count === 0) {
    if (
      gameControl.executed !== false ||
      gameControl.simulated !== false ||
      gameControl.side_effects_enabled !== false
    ) {
      throw new ContractError(`${context}: invalid idle effect flags`);
    }
  } else if (
    gameControl.executed === gameControl.simulated ||
    gameControl.side_effects_enabled !== gameControl.executed
  ) {
    throw new ContractError(`${context}: invalid active effect flags`);
  }
  if (gameControl.last_action_kind !== null && typeof gameControl.last_action_kind !== "string") {
    throw new ContractError(`${context}: invalid action kind`);
  }
}

function assertLocalBridgePacketSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: packet summary required`);
  }
  if (summary.schema !== "iris_local_bridge_packet_summary_v1") {
    throw new ContractError(`${context}: invalid packet summary schema`);
  }
  if (!REQUIRED_RENDER_ARTIFACT_KINDS.includes(summary.adapter_kind)) {
    throw new ContractError(`${context}: invalid adapter kind`);
  }
  if (
    typeof summary.event_id_present !== "boolean" ||
    typeof summary.trace_id_present !== "boolean" ||
    !Number.isFinite(summary.received_at_ms) ||
    summary.received_at_ms < 0 ||
    typeof summary.bridge_status !== "string" ||
    typeof summary.request_id_present !== "boolean" ||
    typeof summary.artifact_available !== "boolean" ||
    typeof summary.artifact_kind !== "string" ||
    summary.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid packet summary`);
  }
}

function createAdapterAck(packet, { nowMs, outboxEnabled = true }) {
  const requestId = `local-${packet.adapter_kind}-${safeId(packet.event_id)}-${nowMs}`;
  const requestIdPresent = safeText(requestId) !== "";
  if (!outboxEnabled) {
    return {
      request_id: requestId,
      request_id_present: requestIdPresent,
      artifact_url_present: false,
      event_id: safeId(packet.event_id),
      bridge_status: "outbox_not_configured",
      artifact_kind: "unavailable",
      duration_ms: 0,
    };
  }
  if (packet.adapter_kind === "tts") {
    return {
      request_id: requestId,
      request_id_present: requestIdPresent,
      artifact_url_present: false,
      event_id: safeId(packet.event_id),
      bridge_status: "accepted",
      duration_ms: safeDuration(packet.speech_cue?.estimated_duration_ms),
      sample_rate_hz: 48000,
    };
  }
  if (packet.adapter_kind === "live2d") {
    return {
      request_id: requestId,
      request_id_present: requestIdPresent,
      artifact_url_present: false,
      event_id: safeId(packet.event_id),
      bridge_status: "accepted",
      duration_ms: safeDuration(packet.performance_plan?.total_duration_ms),
    };
  }
  return {
    request_id: requestId,
    request_id_present: requestIdPresent,
    artifact_url_present: false,
    event_id: safeId(packet.event_id),
    bridge_status: "accepted",
    duration_ms: Math.max(
      1,
      safeDuration(Number(packet.display_end_ms ?? 0) - Number(packet.display_start_ms ?? 0))
    ),
  };
}

function createPacketSummary(packet, ack, { nowMs }) {
  const artifactKind = safeText(ack.artifact_kind, 80);
  const bridgeStatus = safeText(ack.bridge_status, 80);
  const artifactUrlPresent = safeText(ack.artifact_url, 220) !== "";
  const artifactAvailable =
    isBridgeAckArtifactReady(bridgeStatus) &&
    artifactUrlPresent &&
    isExpectedBridgeArtifactKind(packet.adapter_kind, artifactKind);
  const durationMs = safeOptionalNumber(ack.duration_ms);
  return {
    schema: "iris_local_bridge_packet_summary_v1",
    adapter_kind: packet.adapter_kind,
    event_id_present: safeText(packet.event_id) !== "",
    trace_id_present: safeText(packet.trace_id) !== "",
    received_at_ms: nowMs,
    bridge_status: bridgeStatus,
    request_id_present: safeText(ack.request_id) !== "",
    duration_ms: durationMs,
    artifact_available: artifactAvailable,
    artifact_url_present: artifactUrlPresent,
    artifact_kind: artifactAvailable ? artifactKind : "",
    sample_rate_hz: artifactAvailable ? safeOptionalNumber(ack.sample_rate_hz) : null,
    viseme_count: artifactAvailable && Array.isArray(ack.visemes) ? ack.visemes.length : 0,
    live2d_motion_style: safeText(packet.motion_cue?.motion_style, 80),
    live2d_expression_profile_id: safeText(packet.expression_profile?.expression_profile_id, 120),
    subtitle_language: safeText(packet.subtitle_language, 32),
    script_direction: safeText(packet.script_direction, 16),
    adapter_validation_required: true,
  };
}

function isBridgeAckArtifactReady(bridgeStatus) {
  return ["rendered", "displayed", "available", "ready"].includes(
    String(bridgeStatus ?? "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/gu, "_")
  );
}

function isExpectedBridgeArtifactKind(adapterKind, artifactKind) {
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

function emptyKindStatus() {
  return {
    received_count: 0,
    last_event_id: null,
    last_bridge_status: null,
    last_artifact_kind: null,
    last_duration_ms: null,
    last_received_at_ms: null,
  };
}

function emptyGameControlStatus() {
  return {
    received_count: 0,
    last_event_id: null,
    last_bridge_status: null,
    last_action_kind: null,
    last_received_at_ms: null,
    executed: false,
    simulated: false,
    side_effects_enabled: false,
  };
}

function updateKindStatus(previous, summary, packet) {
  const lastEventIdPresent = safeText(packet?.event_id, 160) !== "";
  return {
    received_count: Number(previous?.received_count ?? 0) + 1,
    last_event_id: lastEventIdPresent ? "present" : null,
    last_event_id_present: lastEventIdPresent,
    last_bridge_status: summary.bridge_status,
    last_artifact_kind: summary.artifact_available ? summary.artifact_kind || null : null,
    last_duration_ms: summary.duration_ms,
    last_received_at_ms: summary.received_at_ms,
  };
}

function createPublicLocalBridgeRenderManifestReport(report) {
  const storeStatus =
    report.store_status && typeof report.store_status === "object"
      ? createPublicLocalBridgeRenderManifestStoreStatus(report.store_status)
      : report.store_status;
  const latestManifestSummary =
    report.latest_manifest_summary && typeof report.latest_manifest_summary === "object"
      ? { ...report.latest_manifest_summary }
      : report.latest_manifest_summary;
  if (latestManifestSummary && typeof latestManifestSummary === "object") {
    latestManifestSummary.manifest_id_present =
      safeText(latestManifestSummary.manifest_id, 220) !== "";
    delete latestManifestSummary.manifest_id;
    delete latestManifestSummary.artifact_byte_hash_by_adapter;
  }
  return {
    ...report,
    store_status: storeStatus,
    latest_manifest_summary: latestManifestSummary,
  };
}

function createPublicLocalBridgeRenderManifestStoreStatus(status) {
  if (!status || typeof status !== "object" || Array.isArray(status)) return status;
  const publicStatus = { ...status };
  delete publicStatus.latest_manifest_id;
  return publicStatus;
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 256_000) {
        reject(new Error("request_body_too_large"));
        request.destroy();
      }
    });
    request.on("end", () => {
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("invalid_json"));
      }
    });
    request.on("error", reject);
  });
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(body));
}

function sendBytes(response, statusCode, bytes, headers) {
  response.writeHead(statusCode, headers);
  response.end(bytes);
}

function createLocalBridgeErrorResponse(errorKind) {
  const safeErrorKind = SAFE_LOCAL_BRIDGE_ERROR_KINDS.has(errorKind)
    ? errorKind
    : "local_bridge_error";
  const response = {
    ok: false,
    error: safeErrorKind,
    error_kind: safeErrorKind,
    boundary_policy: {
      no_raw_error_messages: true,
      no_raw_packets: true,
      no_text_payloads: true,
      no_endpoint_values: true,
      no_candidates: true,
      no_commands: true,
      no_secret_values: true,
    },
    adapter_validation_required: true,
  };
  assertLocalBridgeErrorResponseSafe(response, "local bridge error response");
  return response;
}

function isAuthorizedLocalBridgeRequest(request, requiredApiKey) {
  if (!requiredApiKey) return true;
  const authorization = String(request.headers.authorization ?? "");
  const bearerToken = authorization.match(/^Bearer\s+(.+)$/iu)?.[1] ?? "";
  const explicitApiKey = String(request.headers["x-api-key"] ?? "");
  return bearerToken === requiredApiKey || explicitApiKey === requiredApiKey;
}

export function createLocalArtifactErrorResponse(errorKind) {
  const safeErrorKind = SAFE_LOCAL_ARTIFACT_ERROR_KINDS.has(errorKind)
    ? errorKind
    : "artifact_delivery_error";
  const response = {
    ok: false,
    error: safeErrorKind,
    error_kind: safeErrorKind,
    artifact_delivery_readiness_status:
      classifyLocalArtifactDeliveryReadinessStatus(safeErrorKind),
    boundary_policy: {
      local_artifact_delivery: true,
      no_path_values: true,
      no_raw_manifest: true,
      no_raw_jobs: true,
      no_text_payloads: true,
      no_candidates: true,
      no_commands: true,
      no_secret_values: true,
    },
    adapter_validation_required: true,
  };
  assertLocalArtifactErrorResponseSafe(response, "local bridge artifact error response");
  return response;
}

export function assertLocalBridgeErrorResponseSafe(
  response,
  context = "local bridge error response"
) {
  if (!response || typeof response !== "object" || Array.isArray(response)) {
    throw new ContractError(`${context}: response object required`);
  }
  if (response.ok !== false) {
    throw new ContractError(`${context}: ok must be false`);
  }
  if (
    typeof response.error !== "string" ||
    response.error !== response.error_kind ||
    !SAFE_LOCAL_BRIDGE_ERROR_KINDS.has(response.error_kind)
  ) {
    throw new ContractError(`${context}: unsafe error kind`);
  }
  assertBoundaryPolicy(response.boundary_policy, [
    "no_raw_error_messages",
    "no_raw_packets",
    "no_text_payloads",
    "no_endpoint_values",
    "no_candidates",
    "no_commands",
    "no_secret_values",
  ], context);
  if (response.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
  assertNoForbiddenLocalBridgeStatusFields(response, context);
}

export function assertLocalArtifactErrorResponseSafe(
  response,
  context = "local bridge artifact error response"
) {
  if (!response || typeof response !== "object" || Array.isArray(response)) {
    throw new ContractError(`${context}: response object required`);
  }
  if (response.ok !== false) {
    throw new ContractError(`${context}: ok must be false`);
  }
  if (
    typeof response.error !== "string" ||
    response.error !== response.error_kind ||
    !SAFE_LOCAL_ARTIFACT_ERROR_KINDS.has(response.error_kind)
  ) {
    throw new ContractError(`${context}: unsafe artifact error kind`);
  }
  if (
    response.artifact_delivery_readiness_status !==
    classifyLocalArtifactDeliveryReadinessStatus(response.error_kind)
  ) {
    throw new ContractError(`${context}: readiness status mismatch`);
  }
  assertBoundaryPolicy(response.boundary_policy, [
    "local_artifact_delivery",
    "no_path_values",
    "no_raw_manifest",
    "no_raw_jobs",
    "no_text_payloads",
    "no_candidates",
    "no_commands",
    "no_secret_values",
  ], context);
  if (response.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
  assertNoForbiddenLocalBridgeStatusFields(response, context);
}

function classifyLocalArtifactDeliveryReadinessStatus(errorKind) {
  if (errorKind === "manifest_not_found") return "waiting_for_manifest";
  if (
    errorKind === "missing_artifact" ||
    errorKind === "missing_artifact_file" ||
    errorKind === "missing_artifact_render_timestamp" ||
    errorKind === "incomplete_manifest"
  ) {
    return "waiting_for_complete_artifacts";
  }
  if (
    errorKind === "stale_manifest" ||
    errorKind === "stale_artifact" ||
    errorKind === "artifact_sync_skew"
  ) {
    return "waiting_for_fresh_render";
  }
  if (errorKind === "manifest_mismatch") return "waiting_for_fresh_render";
  if (
    errorKind === "artifact_dir_not_configured" ||
    errorKind === "invalid_manifest" ||
    errorKind === "unsafe_artifact_reference" ||
    errorKind === "invalid_artifact" ||
    errorKind === "invalid_artifact_kind" ||
    errorKind === "unsafe_manifest_label"
  ) {
    return "operator_action_required";
  }
  return "attention";
}

function classifyLocalBridgeRequestError(error) {
  const message = String(error?.message ?? "");
  if (message === "invalid_json") return "invalid_json";
  if (message === "request_body_too_large") return "request_body_too_large";
  if (error instanceof ContractError) {
    const lowered = message.toLowerCase();
    if (
      lowered.includes("command") ||
      lowered.includes("candidate") ||
      lowered.includes("world_command") ||
      lowered.includes("direct memory")
    ) {
      return "unsafe_payload";
    }
    return "contract_error";
  }
  return "local_bridge_error";
}

function getLocalBridgeErrorStatusCode(errorKind) {
  if (
    errorKind === "invalid_json" ||
    errorKind === "request_body_too_large" ||
    errorKind === "unsafe_payload" ||
    errorKind === "contract_error"
  ) {
    return 400;
  }
  if (errorKind === "approved_action_expired") return 409;
  return 500;
}

export function getLocalArtifactErrorStatusCode(errorKind) {
  if (
    errorKind === "artifact_dir_not_configured" ||
    errorKind === "manifest_not_found" ||
    errorKind === "missing_artifact" ||
    errorKind === "missing_artifact_file" ||
    errorKind === "missing_artifact_render_timestamp"
  ) {
    return 404;
  }
  if (
    errorKind === "incomplete_manifest" ||
    errorKind === "manifest_mismatch" ||
    errorKind === "stale_manifest" ||
    errorKind === "stale_artifact" ||
    errorKind === "artifact_sync_skew" ||
    errorKind === "invalid_artifact" ||
    errorKind === "invalid_artifact_kind" ||
    errorKind === "unsafe_manifest_label"
  ) {
    return 409;
  }
  if (errorKind === "invalid_manifest" || errorKind === "unsafe_artifact_reference") return 409;
  return 500;
}

export function readLatestRenderArtifact({
  artifactDir,
  adapterKind,
  maxRenderManifestAgeMs = null,
  maxArtifactRenderSkewMs = null,
  nowMs = Date.now(),
  expectedManifestId = "",
  allowPartialVisualArtifacts = false,
}) {
  if (!artifactDir) {
    return { ok: false, error_kind: "artifact_dir_not_configured" };
  }
  try {
    const manifestPath = join(artifactDir, "latest_event_render_manifest.json");
    if (!existsSync(manifestPath)) {
      if (shouldAllowPartialVisualArtifactDelivery(adapterKind, allowPartialVisualArtifacts)) {
        return readLatestPartialVisualArtifactFromReceipt({
          artifactDir,
          adapterKind,
          maxRenderManifestAgeMs,
          nowMs,
        });
      }
      return { ok: false, error_kind: "manifest_not_found" };
    }
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    assertLocalBridgeEventRenderManifestSafe(
      manifest,
      "local bridge artifact delivery manifest"
    );
    const requestedManifestId = safeText(expectedManifestId, 220);
    if (
      requestedManifestId &&
      requestedManifestId !==
        safePublicHeaderLabel(manifest.manifest_id, 220, "redacted_manifest_id")
    ) {
      return { ok: false, error_kind: "manifest_mismatch" };
    }
    if (manifestIsStale({ manifest, maxRenderManifestAgeMs, nowMs })) {
      return { ok: false, error_kind: "stale_manifest" };
    }
    const artifact = manifest.artifact_set?.[adapterKind] ?? null;
    const relativePath = safeText(artifact?.artifact_path, 260);
    if (!artifact || !relativePath) {
      if (shouldAllowPartialVisualArtifactDelivery(adapterKind, allowPartialVisualArtifacts)) {
        return readLatestPartialVisualArtifactFromReceipt({
          artifactDir,
          adapterKind,
          maxRenderManifestAgeMs,
          nowMs,
        });
      }
      return { ok: false, error_kind: "missing_artifact" };
    }
    if (!isExpectedBridgeArtifactKind(adapterKind, safeText(artifact?.artifact_kind, 80))) {
      return { ok: false, error_kind: "invalid_artifact_kind" };
    }
    if (artifactHasMissingRenderTimestamp(artifact)) {
      return { ok: false, error_kind: "missing_artifact_render_timestamp" };
    }
    if (
      shouldEnforceFullArtifactGroup(adapterKind, allowPartialVisualArtifacts) &&
      manifestHasMissingArtifactRenderTimestamp(manifest)
    ) {
      return { ok: false, error_kind: "missing_artifact_render_timestamp" };
    }
    if (
      maxRenderManifestAgeMs !== null &&
      artifactIsStale({ artifact, maxRenderManifestAgeMs, nowMs })
    ) {
      return { ok: false, error_kind: "stale_artifact" };
    }
    if (
      shouldEnforceFullArtifactGroup(adapterKind, allowPartialVisualArtifacts) &&
      manifestHasStaleArtifact({ manifest, maxRenderManifestAgeMs, nowMs })
    ) {
      return { ok: false, error_kind: "stale_artifact" };
    }
    if (hasUnsafeLocalBridgeRenderManifestPublicLabels(manifest)) {
      return { ok: false, error_kind: "unsafe_manifest_label" };
    }
    if (
      manifest.complete === true &&
      hasLocalBridgeRenderManifestArtifactSyncSkew(manifest, {
        maxArtifactRenderSkewMs,
      })
    ) {
      return { ok: false, error_kind: "artifact_sync_skew" };
    }
    if (!shouldAllowPartialVisualArtifactDelivery(adapterKind, allowPartialVisualArtifacts)) {
      const groupBlocker = findManifestArtifactGroupDeliveryBlocker({
        manifest,
        artifactDir,
      });
      if (groupBlocker) {
        return { ok: false, error_kind: groupBlocker };
      }
    }
    const artifactPath = resolve(artifactDir, relativePath);
    const artifactBase = resolve(artifactDir);
    if (artifactPath !== artifactBase && !artifactPath.startsWith(`${artifactBase}${sep}`)) {
      return { ok: false, error_kind: "unsafe_artifact_reference" };
    }
    if (!existsSync(artifactPath)) {
      return { ok: false, error_kind: "missing_artifact_file" };
    }
    const bytes = readFileSync(artifactPath);
    const validation = validateLocalRenderArtifactForPickup({
      adapterKind,
      artifact,
      contentType: contentTypeForArtifact(artifact),
      bytes,
    });
    if (validation.contract_valid !== true) {
      return { ok: false, error_kind: "invalid_artifact" };
    }
    const manifestIdPresent = safeText(manifest.manifest_id, 220) !== "";
    const eventIdPresent = safeText(manifest.event_id, 160) !== "";
    return {
      ok: true,
      adapter_kind: adapterKind,
      artifact_kind: safePublicHeaderLabel(artifact.artifact_kind, 80, "redacted_artifact_kind"),
      manifest_id: safePublicHeaderLabel(manifest.manifest_id, 220, "redacted_manifest_id"),
      manifest_id_present: manifestIdPresent,
      event_id: safePublicHeaderLabel(manifest.event_id, 160, "redacted_event_id"),
      event_id_present: eventIdPresent,
      rendered_at_ms: String(Number(artifact.rendered_at_ms)),
      content_type: contentTypeForArtifact(artifact),
      byte_hash: createArtifactByteHash(bytes),
      bytes,
    };
  } catch (error) {
    if (error instanceof ContractError || error instanceof SyntaxError) {
      return { ok: false, error_kind: "invalid_manifest" };
    }
    return { ok: false, error_kind: "artifact_delivery_error" };
  }
}

function shouldAllowPartialVisualArtifactDelivery(adapterKind, allowPartialVisualArtifacts) {
  return allowPartialVisualArtifacts === true && ["live2d", "subtitle"].includes(adapterKind);
}

function readLatestPartialVisualArtifactFromReceipt({
  artifactDir,
  adapterKind,
  maxRenderManifestAgeMs,
  nowMs,
}) {
  try {
    const receiptPath = join(artifactDir, adapterKind, "latest_receipt.json");
    if (!existsSync(receiptPath)) return { ok: false, error_kind: "manifest_not_found" };
    const receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
    assertLocalBridgeEngineReceiptSafe(receipt, "local bridge partial visual receipt");
    if (receipt.engine_status !== "rendered" || receipt.adapter_kind !== adapterKind) {
      return { ok: false, error_kind: "manifest_not_found" };
    }
    if (!isExpectedBridgeArtifactKind(adapterKind, safeText(receipt.artifact_kind, 80))) {
      return { ok: false, error_kind: "invalid_artifact_kind" };
    }
    if (artifactHasMissingRenderTimestamp(receipt)) {
      return { ok: false, error_kind: "missing_artifact_render_timestamp" };
    }
    if (
      maxRenderManifestAgeMs !== null &&
      artifactIsStale({ artifact: receipt, maxRenderManifestAgeMs, nowMs })
    ) {
      return { ok: false, error_kind: "stale_artifact" };
    }
    const relativePath = safeText(receipt.artifact_path, 260);
    const artifactPath = resolve(artifactDir, relativePath);
    const artifactBase = resolve(artifactDir);
    if (artifactPath !== artifactBase && !artifactPath.startsWith(`${artifactBase}${sep}`)) {
      return { ok: false, error_kind: "unsafe_artifact_reference" };
    }
    if (!existsSync(artifactPath)) return { ok: false, error_kind: "missing_artifact_file" };
    const artifact = {
      adapter_kind: adapterKind,
      artifact_kind: safeText(receipt.artifact_kind, 80),
      artifact_path: relativePath,
    };
    const bytes = readFileSync(artifactPath);
    const validation = validateLocalRenderArtifactForPickup({
      adapterKind,
      artifact,
      contentType: contentTypeForArtifact(artifact),
      bytes,
    });
    if (validation.contract_valid !== true) {
      return { ok: false, error_kind: "invalid_artifact" };
    }
    const partialManifestIdSource =
      safeText(receipt.event_id, 160) !== "" && safeText(receipt.rendered_at_ms, 80) !== ""
        ? `partial-${receipt.event_id}-${receipt.rendered_at_ms}`
        : "";
    const manifestId = safePublicHeaderLabel(
      partialManifestIdSource,
      220,
      "redacted_manifest_id"
    );
    const manifestIdPresent = safeText(partialManifestIdSource, 220) !== "";
    const eventIdPresent = safeText(receipt.event_id, 160) !== "";
    return {
      ok: true,
      adapter_kind: adapterKind,
      artifact_kind: safePublicHeaderLabel(receipt.artifact_kind, 80, "redacted_artifact_kind"),
      manifest_id: manifestId,
      manifest_id_present: manifestIdPresent,
      event_id: safePublicHeaderLabel(receipt.event_id, 160, "redacted_event_id"),
      event_id_present: eventIdPresent,
      rendered_at_ms: String(Number(receipt.rendered_at_ms)),
      content_type: contentTypeForArtifact(artifact),
      byte_hash: createArtifactByteHash(bytes),
      bytes,
    };
  } catch (error) {
    if (error instanceof ContractError || error instanceof SyntaxError) {
      return { ok: false, error_kind: "invalid_manifest" };
    }
    return { ok: false, error_kind: "artifact_delivery_error" };
  }
}

function createArtifactByteHash(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function shouldEnforceFullArtifactGroup(adapterKind, allowPartialVisualArtifacts) {
  return !shouldAllowPartialVisualArtifactDelivery(adapterKind, allowPartialVisualArtifacts);
}

function manifestIsStale({ manifest, maxRenderManifestAgeMs, nowMs }) {
  if (maxRenderManifestAgeMs === null) return false;
  if (
    manifest?.created_at_ms === null ||
    manifest?.created_at_ms === undefined ||
    manifest?.created_at_ms === ""
  ) {
    return true;
  }
  const createdAtMs = Number(manifest?.created_at_ms);
  const currentMs = Number(nowMs);
  if (!Number.isFinite(createdAtMs) || !Number.isFinite(currentMs)) return true;
  return Math.max(0, currentMs - createdAtMs) > maxRenderManifestAgeMs;
}

function manifestHasStaleArtifact({ manifest, maxRenderManifestAgeMs, nowMs }) {
  if (maxRenderManifestAgeMs === null) return false;
  return REQUIRED_RENDER_ARTIFACT_KINDS.some((kind) =>
    artifactIsStale({
      artifact: manifest?.artifact_set?.[kind],
      maxRenderManifestAgeMs,
      nowMs,
    })
  );
}

function manifestHasMissingArtifactRenderTimestamp(manifest) {
  return REQUIRED_RENDER_ARTIFACT_KINDS.some((kind) => {
    return artifactHasMissingRenderTimestamp(manifest?.artifact_set?.[kind]);
  });
}

function artifactHasMissingRenderTimestamp(artifact) {
  const value = artifact?.rendered_at_ms;
  if (value === null || value === undefined || value === "") return true;
  return !Number.isFinite(Number(value));
}

function artifactIsStale({ artifact, maxRenderManifestAgeMs, nowMs }) {
  if (
    artifact?.rendered_at_ms === null ||
    artifact?.rendered_at_ms === undefined ||
    artifact?.rendered_at_ms === ""
  ) {
    return true;
  }
  const renderedAtMs = Number(artifact?.rendered_at_ms);
  const currentMs = Number(nowMs);
  if (!Number.isFinite(renderedAtMs) || !Number.isFinite(currentMs)) return true;
  const ageMs = currentMs - renderedAtMs;
  if (ageMs < 0) return true;
  return ageMs > maxRenderManifestAgeMs;
}

function findManifestArtifactGroupDeliveryBlocker({ manifest, artifactDir }) {
  if (hasUnsafeLocalBridgeRenderManifestPublicLabels(manifest)) {
    return "unsafe_manifest_label";
  }
  for (const kind of REQUIRED_RENDER_ARTIFACT_KINDS) {
    const artifact = manifest?.artifact_set?.[kind] ?? null;
    const relativePath = safeText(artifact?.artifact_path, 260);
    if (!artifact || !relativePath) return "missing_artifact";
    if (!isExpectedBridgeArtifactKind(kind, safeText(artifact?.artifact_kind, 80))) {
      return "invalid_artifact_kind";
    }
    const artifactPath = resolve(artifactDir, relativePath);
    const artifactBase = resolve(artifactDir);
    if (artifactPath === artifactBase || !artifactPath.startsWith(`${artifactBase}${sep}`)) {
      return "unsafe_artifact_reference";
    }
    if (!existsSync(artifactPath)) return "missing_artifact_file";
    const bytes = readFileSync(artifactPath);
    const validation = validateLocalRenderArtifactForPickup({
      adapterKind: kind,
      artifact,
      contentType: contentTypeForArtifact(artifact),
      bytes,
    });
    if (validation.contract_valid !== true) return "invalid_artifact";
  }
  return null;
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

function assertNoForbiddenLocalBridgeStatusFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenLocalBridgeStatusFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_LOCAL_BRIDGE_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsafe local bridge status field`, { field, path });
    }
    assertNoForbiddenLocalBridgeStatusFields(child, context, `${path}.${field}`);
  }
}

function safeDuration(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 1;
  return Math.max(1, Math.trunc(number));
}

function safeOptionalNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Number(number.toFixed(4));
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

function safeId(value) {
  const text = safeText(value || "event", 80).replace(/[^a-zA-Z0-9_-]/g, "-");
  return text || "event";
}

function safeText(value, maxLength = 160) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function safeHeaderText(value, maxLength = 160) {
  return safeText(value, maxLength).replace(/[\r\n]/g, "");
}

function safePublicHeaderLabel(value, maxLength = 160, fallback = "redacted_label") {
  const label = safeHeaderText(value, maxLength);
  if (
    label &&
    /^[a-zA-Z0-9_.:-]+$/.test(label) &&
    !/(https?:\/\/|authorization|bearer|api[_-]?key|oauth|access[_-]?token|refresh[_-]?token|token|secret|password|endpoint|url|payload|text|input_action|input_action_candidate|approved_game_input_action|commit|memory_write|relationship_update_candidate|canonical_envelope)/i.test(
      label
    )
  ) {
    return label;
  }
  return fallback;
}

function safeVisemeShape(value) {
  const shape = safeText(value, 32).replace(/[^a-zA-Z0-9_-]/g, "_");
  return shape || "neutral";
}
