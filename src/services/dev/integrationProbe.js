import { createHttpPostAdapter } from "../../adapters/httpPostAdapter.js";
import { ContractError } from "../../core/contracts.js";
import {
  summarizeLocalEndpointPolicyStatus,
  summarizeLocalEndpointScope,
} from "../../core/localEndpointPolicy.js";
import {
  assertLocalEngineHealthProbeReportSafe,
  createLocalEngineHealthProbeReport,
} from "../../server/localEngineHealthProbe.js";
import { createIntegrationFixtures } from "./integrationFixtures.js";

const PROBE_CONFIGS = [
  {
    integration: "tts_bridge",
    adapterKind: "tts",
    adapterEnv: "IRIS_TTS_ADAPTER",
    defaultMode: "console",
    endpointEnv: "IRIS_TTS_ENDPOINT",
    endpointAliasEnv: "IRIS_LOCAL_TTS_BRIDGE_ENDPOINT",
    apiKeyEnv: "IRIS_TTS_API_KEY",
    timeoutEnv: "IRIS_TTS_TIMEOUT_MS",
  },
  {
    integration: "live2d_bridge",
    adapterKind: "live2d",
    adapterEnv: "IRIS_LIVE2D_ADAPTER",
    defaultMode: "console",
    endpointEnv: "IRIS_LIVE2D_ENDPOINT",
    endpointAliasEnv: "IRIS_LOCAL_LIVE2D_BRIDGE_ENDPOINT",
    apiKeyEnv: "IRIS_LIVE2D_API_KEY",
    timeoutEnv: "IRIS_LIVE2D_TIMEOUT_MS",
  },
  {
    integration: "subtitle_bridge",
    adapterKind: "subtitle",
    adapterEnv: "IRIS_SUBTITLE_ADAPTER",
    defaultMode: "console",
    endpointEnv: "IRIS_SUBTITLE_ENDPOINT",
    endpointAliasEnv: "IRIS_LOCAL_SUBTITLE_BRIDGE_ENDPOINT",
    apiKeyEnv: "IRIS_SUBTITLE_API_KEY",
    timeoutEnv: "IRIS_SUBTITLE_TIMEOUT_MS",
  },
];

const FORBIDDEN_PROBE_FIELDS = new Set([
  "api_key",
  "apiKey",
  "oauth_token",
  "oauthToken",
  "token",
  "secret",
  "password",
  "credential",
  "credentials",
  "value",
  "endpoint",
  "url",
  "world_command",
  "input_action",
  "input_action_candidate",
  "approved_game_input_action",
  "relationship_update_candidate",
  "memory_carryover_candidates",
  "community_memory_candidates",
  "memory_candidate",
  "relationship_candidate",
  "approved_memory_record",
  "approved_relationship_record",
  "commit",
  "write",
  "execute",
  "apply",
]);
const READINESS_STATES = new Set([
  "ready",
  "configuration_waiting",
  "runtime_waiting",
  "real_device_waiting",
  "operator_review_required",
]);
const INTEGRATION_PROBE_REPORT_FIELDS = new Set([
  "schema",
  "generated_at_ms",
  "probe_mode",
  "fixture_event_id_present",
  "probes",
  "engine_worker",
  "engine_health",
  "summary",
  "next_readiness_state",
  "readiness_state_counts",
  "boundary_policy",
  "adapter_validation_required",
]);
const INTEGRATION_PROBE_ITEM_FIELDS = new Set([
  "integration",
  "adapter_kind",
  "mode",
  "status",
  "readiness_state",
  "configured_env",
  "missing_env",
  "auth_configured",
  "local_endpoint_policy",
  "local_endpoint_policy_status",
  "bridge_endpoint_scope",
  "bridge_endpoint_locality_ok",
  "fixture_event_id_present",
  "fixture_policy",
  "response_summary",
  "boundary_policy",
  "adapter_validation_required",
]);
const INTEGRATION_ENGINE_WORKER_PROBE_FIELDS = new Set([
  "schema",
  "status",
  "readiness_state",
  "configured_env",
  "missing_env",
  "tts_engine_mode",
  "live2d_engine_mode",
  "engine_mode_summary",
  "tts_engine_auth_configured",
  "live2d_engine_auth_configured",
  "verification_commands",
  "boundary_policy",
]);
const INTEGRATION_ENGINE_WORKER_MODE_SUMMARY_FIELDS = new Set([
  "schema",
  "tts_engine_real_http_configured",
  "live2d_engine_real_http_configured",
  "real_http_engine_count",
  "local_placeholder_engine_count",
  "health_check_configured_count",
  "all_real_http_engines_configured",
  "placeholder_mode_active",
  "production_engine_handoff_state",
  "boundary_policy",
]);
const INTEGRATION_ENGINE_WORKER_MODE_BOUNDARY_FIELDS = [
  "modes_and_counts_only",
  "no_endpoint_values",
  "no_secret_values",
  "no_raw_jobs",
  "no_raw_artifacts",
  "no_candidates",
  "no_commands",
];
const INTEGRATION_PROBE_REPORT_BOUNDARY_FIELDS = [
  "no_secret_values",
  "no_endpoint_values",
  "env_names_only",
  "synthetic_payload_only",
  "no_live_payloads",
  "no_raw_adapter_packets",
  "no_candidates",
  "no_commands",
  "read_only_probe_report",
];
const INTEGRATION_PROBE_ITEM_BOUNDARY_FIELDS = [
  "synthetic_payload_only",
  "no_secret_values",
  "no_endpoint_values",
  "no_live_payloads",
  "no_raw_packets",
  "no_candidates",
  "no_commands",
  "read_only",
];
const INTEGRATION_ENGINE_WORKER_PROBE_BOUNDARY_FIELDS = [
  "env_names_only",
  "no_secret_values",
  "no_endpoint_values",
  "no_raw_jobs",
  "no_raw_artifacts",
  "no_candidates",
  "no_commands",
  "read_only",
];

export async function createIntegrationProbeReport({
  env = process.env,
  mode = "dry_run",
  fetchImpl = globalThis.fetch,
  generatedAtMs = Date.now(),
} = {}) {
  const probeMode = mode === "fixture_post" ? "fixture_post" : "dry_run";
  const fixtures = createIntegrationFixtures({ generatedAtMs });
  const probes = [];
  const engineWorker = createEngineWorkerProbe({ env });
  const engineHealth = await createLocalEngineHealthProbeReport({
    env,
    fetchImpl,
    generatedAtMs,
  });
  for (const config of PROBE_CONFIGS) {
    probes.push(
      await createProbeItem({
        config,
        env,
        probeMode,
        fixturePacket: fixtures.adapter_packets[config.adapterKind],
        fetchImpl,
      })
    );
  }
  const readinessItems = [engineWorker, ...probes];
  const report = {
    schema: "iris_integration_probe_report_v1",
    generated_at_ms: generatedAtMs,
    probe_mode: probeMode,
    fixture_event_id_present: safeText(fixtures.adapter_packets.tts.event_id) !== "",
    probes,
    engine_worker: engineWorker,
    engine_health: engineHealth,
    summary: summarizeProbes(probes, engineHealth),
    next_readiness_state: firstReadinessState(readinessItems),
    readiness_state_counts: countReadinessStates(readinessItems),
    boundary_policy: {
      no_secret_values: true,
      no_endpoint_values: true,
      env_names_only: true,
      synthetic_payload_only: true,
      no_live_payloads: true,
      no_raw_adapter_packets: true,
      no_candidates: true,
      no_commands: true,
      read_only_probe_report: true,
    },
    adapter_validation_required: true,
  };
  assertIntegrationProbeReportSafe(report);
  return report;
}

export function assertIntegrationProbeReportSafe(report, context = "integration probe report") {
  if (!report || typeof report !== "object") {
    throw new ContractError(`${context}: missing report`);
  }
  assertNoForbiddenProbeFields(report, context);
  for (const field of Object.keys(report)) {
    if (!INTEGRATION_PROBE_REPORT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected report field`);
    }
  }
  if (report.schema !== "iris_integration_probe_report_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: report.schema });
  }
  if (!["dry_run", "fixture_post"].includes(report.probe_mode)) {
    throw new ContractError(`${context}: invalid probe mode`, { probe_mode: report.probe_mode });
  }
  if (!Array.isArray(report.probes) || report.probes.length !== PROBE_CONFIGS.length) {
    throw new ContractError(`${context}: probes are required`);
  }
  const expectedAdapterKinds = PROBE_CONFIGS.map((config) => config.adapterKind);
  if (
    JSON.stringify(report.probes.map((probe) => probe.adapter_kind)) !==
    JSON.stringify(expectedAdapterKinds)
  ) {
    throw new ContractError(`${context}: probe adapter kind order mismatch`);
  }
  for (const probe of report.probes) assertProbeItemSafe(probe, context);
  assertEngineWorkerProbeSafe(report.engine_worker, context);
  assertLocalEngineHealthProbeReportSafe(report.engine_health, context);
  assertIntegrationProbeSummarySafe(report.summary, report.probes, report.engine_health, context);
  assertReadinessStateCountsSafe(report.readiness_state_counts, context);
  if (
    report.next_readiness_state !==
    firstReadinessState([report.engine_worker, ...report.probes])
  ) {
    throw new ContractError(`${context}: invalid next readiness state`);
  }
  if (
    !sameReadinessStateCounts(
      report.readiness_state_counts,
      countReadinessStates([report.engine_worker, ...report.probes])
    )
  ) {
    throw new ContractError(`${context}: invalid readiness counts`);
  }
  assertBoundaryPolicy(
    report.boundary_policy,
    INTEGRATION_PROBE_REPORT_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
  if (report.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
}

function assertIntegrationProbeSummarySafe(summary, probes, engineHealth, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary is required`);
  }
  const expected = summarizeProbes(probes, engineHealth);
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (summary[field] !== expectedValue) {
      throw new ContractError(`${context}: summary ${field} mismatch`);
    }
  }
  for (const key of Object.keys(summary)) {
    if (!Object.hasOwn(expected, key)) {
      throw new ContractError(`${context}: unexpected summary field`);
    }
  }
}

function createEngineWorkerProbe({ env }) {
  const hasOutboxDir = Boolean(env.IRIS_LOCAL_BRIDGE_OUTBOX_DIR);
  const hasArtifactDir = Boolean(env.IRIS_LOCAL_BRIDGE_ARTIFACT_DIR);
  const hasTtsEngine = Boolean(env.IRIS_LOCAL_TTS_ENGINE_ENDPOINT);
  const hasLive2dEngine = Boolean(env.IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT);
  const ttsEngineMode = hasTtsEngine ? "http" : "local_placeholder";
  const live2dEngineMode = hasLive2dEngine ? "http" : "local_placeholder";
  const configuredEnv = [
    "IRIS_LOCAL_BRIDGE_OUTBOX_DIR",
    "IRIS_LOCAL_BRIDGE_ARTIFACT_DIR",
    "IRIS_LOCAL_TTS_ENGINE_ENDPOINT",
    "IRIS_LOCAL_TTS_ENGINE_HEALTH_ENDPOINT",
    "IRIS_LOCAL_TTS_ENGINE_API_KEY",
    "IRIS_LOCAL_LIVE2D_ENGINE_ENDPOINT",
    "IRIS_LOCAL_LIVE2D_ENGINE_HEALTH_ENDPOINT",
    "IRIS_LOCAL_LIVE2D_ENGINE_API_KEY",
    "IRIS_LOCAL_ENGINE_TIMEOUT_MS",
  ].filter((name) => Boolean(env[name]));
  const missingEnv = [];
  if ((hasTtsEngine || hasLive2dEngine) && !hasOutboxDir) {
    missingEnv.push("IRIS_LOCAL_BRIDGE_OUTBOX_DIR");
  }
  if ((hasTtsEngine || hasLive2dEngine) && !hasArtifactDir) {
    missingEnv.push("IRIS_LOCAL_BRIDGE_ARTIFACT_DIR");
  }
  let status = "not_configured";
  if (hasOutboxDir && hasArtifactDir && (hasTtsEngine || hasLive2dEngine)) {
    status = "ready_for_engine_probe";
  } else if ((hasTtsEngine || hasLive2dEngine) && missingEnv.length > 0) {
    status = "missing_worker_paths";
  } else if (hasOutboxDir && hasArtifactDir) {
    status = "local_artifact_worker_configured";
  } else if (hasOutboxDir || hasArtifactDir || hasTtsEngine || hasLive2dEngine) {
    status = "attention";
  }
  const probe = {
    schema: "iris_integration_engine_worker_probe_v1",
    status,
    readiness_state: summarizeEngineWorkerReadinessState(status),
    configured_env: configuredEnv,
    missing_env: missingEnv,
    tts_engine_mode: ttsEngineMode,
    live2d_engine_mode: live2dEngineMode,
    engine_mode_summary: summarizeEngineWorkerProbeModes({
      ttsEngineMode,
      live2dEngineMode,
      ttsHealthConfigured: Boolean(env.IRIS_LOCAL_TTS_ENGINE_HEALTH_ENDPOINT),
      live2dHealthConfigured: Boolean(env.IRIS_LOCAL_LIVE2D_ENGINE_HEALTH_ENDPOINT),
    }),
    tts_engine_auth_configured: Boolean(env.IRIS_LOCAL_TTS_ENGINE_API_KEY),
    live2d_engine_auth_configured: Boolean(env.IRIS_LOCAL_LIVE2D_ENGINE_API_KEY),
    verification_commands: [
      "npm run dev:bridge:worker",
      "npm run dev:bridge:engine-roundtrip",
      "npm run dev:bridge:artifact-roundtrip",
      "npm run dev:bridge:status-roundtrip",
      "npm run dev:engine:probe",
      "npm run dev:engine:invalid-audio-roundtrip",
      "npm run dev:engine:invalid-live2d-roundtrip",
      "npm run dev:engine:unsafe-roundtrip",
    ],
    boundary_policy: {
      env_names_only: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_raw_jobs: true,
      no_raw_artifacts: true,
      no_candidates: true,
      no_commands: true,
      read_only: true,
    },
  };
  assertEngineWorkerProbeSafe(probe, "integration engine worker probe");
  return probe;
}

function summarizeEngineWorkerProbeModes({
  ttsEngineMode,
  live2dEngineMode,
  ttsHealthConfigured,
  live2dHealthConfigured,
}) {
  const realHttpEngineCount = [ttsEngineMode, live2dEngineMode].filter(
    (mode) => mode === "http"
  ).length;
  const localPlaceholderEngineCount = [ttsEngineMode, live2dEngineMode].filter(
    (mode) => mode === "local_placeholder"
  ).length;
  return {
    schema: "iris_integration_engine_worker_mode_summary_v1",
    tts_engine_real_http_configured: ttsEngineMode === "http",
    live2d_engine_real_http_configured: live2dEngineMode === "http",
    real_http_engine_count: realHttpEngineCount,
    local_placeholder_engine_count: localPlaceholderEngineCount,
    health_check_configured_count:
      (ttsHealthConfigured ? 1 : 0) + (live2dHealthConfigured ? 1 : 0),
    all_real_http_engines_configured:
      ttsEngineMode === "http" && live2dEngineMode === "http",
    placeholder_mode_active: localPlaceholderEngineCount > 0,
    production_engine_handoff_state:
      ttsEngineMode === "http" && live2dEngineMode === "http"
        ? "real_tts_live2d_configured"
        : "local_placeholder_mode_active",
    boundary_policy: {
      modes_and_counts_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_raw_jobs: true,
      no_raw_artifacts: true,
      no_candidates: true,
      no_commands: true,
    },
  };
}

async function createProbeItem({ config, env, probeMode, fixturePacket, fetchImpl }) {
  const adapterMode = env[config.adapterEnv] ?? config.defaultMode;
  const endpointEnv = env[config.endpointEnv]
    ? config.endpointEnv
    : config.endpointAliasEnv;
  const endpoint = env[endpointEnv];
  const endpointScope = summarizeLocalEndpointScope(endpoint);
  const localEndpointPolicyStatus =
    adapterMode === "http"
      ? summarizeLocalEndpointPolicyStatus(endpointScope)
      : "not_applicable";
  const configuredEnv = [
    config.adapterEnv,
    ...(endpoint ? [endpointEnv] : []),
    ...(env[config.apiKeyEnv] ? [config.apiKeyEnv] : []),
    ...(env[config.timeoutEnv] ? [config.timeoutEnv] : []),
  ];
  const base = {
    integration: config.integration,
    adapter_kind: config.adapterKind,
    mode: safeMode(adapterMode),
    status: "local_or_disabled",
    readiness_state: "configuration_waiting",
    configured_env: configuredEnv,
    missing_env: [],
    auth_configured: Boolean(env[config.apiKeyEnv]),
    local_endpoint_policy:
      adapterMode === "http" ? "loopback_or_private_network_only" : "not_applicable",
    local_endpoint_policy_status: localEndpointPolicyStatus,
    bridge_endpoint_scope: adapterMode === "http" ? endpointScope.endpoint_scope : "not_configured",
    bridge_endpoint_locality_ok:
      adapterMode === "http" ? endpointScope.local_endpoint_allowed : false,
    fixture_event_id_present: safeText(fixturePacket?.event_id) !== "",
    fixture_policy: {
      synthetic_payload_only: true,
      not_from_live_viewer: true,
      not_from_memory: true,
      not_from_game_input: true,
    },
    response_summary: null,
    boundary_policy: itemBoundaryPolicy(),
    adapter_validation_required: true,
  };

  if (adapterMode !== "http") return base;
  if (!endpoint) {
    return {
      ...base,
      status: "missing_configuration",
      readiness_state: "configuration_waiting",
      missing_env: [endpointEnv],
    };
  }
  if (endpointScope.local_endpoint_allowed !== true) {
    return {
      ...base,
      status: "attention",
      readiness_state: "operator_review_required",
      missing_env: [],
      response_summary: {
        ok: false,
        response_kind: "blocked",
        bridge_status: "local_endpoint_policy_blocked",
      },
    };
  }
  if (probeMode === "dry_run") {
    return {
      ...base,
      status: "ready_for_fixture_probe",
      readiness_state: "runtime_waiting",
      missing_env: [],
    };
  }
  if (typeof fetchImpl !== "function") {
    return {
      ...base,
      status: "attention",
      readiness_state: "operator_review_required",
      response_summary: {
        ok: false,
        response_kind: "unavailable",
        bridge_status: "fetch_unavailable",
      },
    };
  }

  try {
    const adapter = createHttpPostAdapter({
      adapterKind: config.adapterKind,
      endpoint,
      apiKey: env[config.apiKeyEnv] ?? "",
      timeoutMs: Number(env[config.timeoutEnv] ?? 5000),
      fetchImpl,
    });
    const result = await adapter(fixturePacket);
    return {
      ...base,
      status: result.sent === true ? "pass" : "attention",
      readiness_state: result.sent === true ? "ready" : "operator_review_required",
      missing_env: [],
      response_summary: sanitizeProbeResponseSummary(result.response_summary),
    };
  } catch {
    return {
      ...base,
      status: "attention",
      readiness_state: "operator_review_required",
      missing_env: [],
      response_summary: {
        ok: false,
        response_kind: "error",
        bridge_status: "adapter_probe_failed",
      },
    };
  }
}

function sanitizeProbeResponseSummary(summary = {}) {
  return {
    status: safeOptionalNumber(summary.status),
    ok: summary.ok === true,
    response_kind: safeText(summary.response_kind),
    response_omitted: summary.response_omitted === true,
    error_kind: safeText(summary.error_kind),
    request_id_present: safeText(summary.request_id) !== "",
    bridge_status: safeText(summary.bridge_status),
    artifact_available:
      summary.artifact_available === true || safeText(summary.artifact_url) !== "",
    artifact_url_present: safeText(summary.artifact_url) !== "",
    duration_ms: safeOptionalNumber(summary.duration_ms),
    sample_rate_hz: safeOptionalNumber(summary.sample_rate_hz),
    viseme_count: safeOptionalNumber(summary.viseme_count) ?? 0,
  };
}

function summarizeProbes(probes, engineHealth) {
  const engineSummary = requireEngineHealthSummary(engineHealth);
  return {
    total: probes.length,
    pass: probes.filter((probe) => probe.status === "pass").length,
    attention: probes.filter((probe) => probe.status === "attention").length,
    ready_for_fixture_probe: probes.filter((probe) => probe.status === "ready_for_fixture_probe")
      .length,
    local_or_disabled: probes.filter((probe) => probe.status === "local_or_disabled").length,
    missing_configuration: probes.filter((probe) => probe.status === "missing_configuration")
      .length,
    engine_health_pass: engineSummary.pass,
    engine_health_attention: engineSummary.attention,
    engine_health_not_configured: engineSummary.not_configured,
    engine_health_missing_endpoint: engineSummary.health_endpoint_not_configured,
    engine_health_request_schema_compatible: engineSummary.request_schema_compatible,
    engine_health_request_schema_mismatch: engineSummary.request_schema_mismatch,
    engine_health_request_schema_not_declared: engineSummary.request_schema_not_declared,
    engine_health_engine_ready: engineSummary.engine_ready,
    engine_health_engine_attention: engineSummary.engine_attention,
    engine_health_engine_readiness_not_declared:
      engineSummary.engine_readiness_not_declared,
    engine_health_response_shape_compatible: engineSummary.response_shape_compatible,
    engine_health_response_shape_mismatch: engineSummary.response_shape_mismatch,
    engine_health_response_shape_not_declared: engineSummary.response_shape_not_declared,
    engine_health_output_format_compatible: engineSummary.output_format_compatible,
    engine_health_output_format_mismatch: engineSummary.output_format_mismatch,
    engine_health_output_format_not_declared: engineSummary.output_format_not_declared,
    engine_health_cue_schema_compatible: engineSummary.cue_schema_compatible,
    engine_health_cue_schema_mismatch: engineSummary.cue_schema_mismatch,
    engine_health_cue_schema_not_declared: engineSummary.cue_schema_not_declared,
    local_endpoint_policy_all_allowed: probes.filter(
      (probe) => probe.local_endpoint_policy_status === "all_allowed"
    ).length,
    local_endpoint_policy_not_configured: probes.filter(
      (probe) => probe.local_endpoint_policy_status === "not_configured"
    ).length,
    local_endpoint_policy_blocked: probes.filter(
      (probe) => probe.local_endpoint_policy_status === "blocked"
    ).length,
    local_endpoint_policy_not_applicable: probes.filter(
      (probe) => probe.local_endpoint_policy_status === "not_applicable"
    ).length,
  };
}

function requireEngineHealthSummary(engineHealth) {
  const summary = engineHealth?.summary;
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError("integration probe: engine health summary is required");
  }
  for (const field of [
    "pass",
    "attention",
    "not_configured",
    "health_endpoint_not_configured",
    "request_schema_compatible",
    "request_schema_mismatch",
    "request_schema_not_declared",
    "engine_ready",
    "engine_attention",
    "engine_readiness_not_declared",
    "response_shape_compatible",
    "response_shape_mismatch",
    "response_shape_not_declared",
    "output_format_compatible",
    "output_format_mismatch",
    "output_format_not_declared",
    "cue_schema_compatible",
    "cue_schema_mismatch",
    "cue_schema_not_declared",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`integration probe: invalid engine health ${field}`);
    }
  }
  return summary;
}

function summarizeEngineWorkerReadinessState(status) {
  if (status === "ready_for_engine_probe") return "real_device_waiting";
  if (status === "local_artifact_worker_configured") return "runtime_waiting";
  if (status === "attention") return "operator_review_required";
  return "configuration_waiting";
}

function countReadinessStates(items) {
  const counts = Object.fromEntries([...READINESS_STATES].map((state) => [state, 0]));
  for (const item of items) {
    counts[item.readiness_state] += 1;
  }
  return counts;
}

function firstReadinessState(items) {
  const firstNonReady = items.find((item) => item.readiness_state !== "ready");
  return firstNonReady?.readiness_state ?? "ready";
}

function assertReadinessStateCountsSafe(counts, context) {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) {
    throw new ContractError(`${context}: readiness counts required`);
  }
  for (const state of READINESS_STATES) {
    if (!Number.isInteger(counts[state]) || counts[state] < 0) {
      throw new ContractError(`${context}: invalid readiness ${state} count`);
    }
  }
  for (const key of Object.keys(counts)) {
    if (!READINESS_STATES.has(key)) {
      throw new ContractError(`${context}: invalid readiness count key`);
    }
  }
}

function sameReadinessStateCounts(left, right) {
  return [...READINESS_STATES].every((state) => left?.[state] === right?.[state]);
}

function itemBoundaryPolicy() {
  return {
    synthetic_payload_only: true,
    no_secret_values: true,
    no_endpoint_values: true,
    no_live_payloads: true,
    no_raw_packets: true,
    no_candidates: true,
    no_commands: true,
    read_only: true,
  };
}

function assertProbeItemSafe(probe, context) {
  if (!probe || typeof probe !== "object") {
    throw new ContractError(`${context}: invalid probe item`);
  }
  for (const field of Object.keys(probe)) {
    if (!INTEGRATION_PROBE_ITEM_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected probe field`);
    }
  }
  if (!["tts", "live2d", "subtitle"].includes(probe.adapter_kind)) {
    throw new ContractError(`${context}: invalid adapter kind`, {
      adapter_kind: probe.adapter_kind,
    });
  }
  if (
    ![
      "local_or_disabled",
      "missing_configuration",
      "ready_for_fixture_probe",
      "pass",
      "attention",
    ].includes(probe.status)
  ) {
    throw new ContractError(`${context}: invalid probe status`, { status: probe.status });
  }
  assertSafeReadinessState(probe.readiness_state, context);
  if (probe.status === "pass" && probe.readiness_state !== "ready") {
    throw new ContractError(`${context}: pass probe must be ready`);
  }
  if (probe.status === "missing_configuration" && probe.readiness_state !== "configuration_waiting") {
    throw new ContractError(`${context}: missing probe must be configuration waiting`);
  }
  if (!Array.isArray(probe.configured_env) || !Array.isArray(probe.missing_env)) {
    throw new ContractError(`${context}: env summaries must be arrays`);
  }
  assertUniqueStringArray(probe.configured_env, `${context}: configured env`);
  assertUniqueStringArray(probe.missing_env, `${context}: missing env`);
  if (
    !["all_allowed", "blocked", "not_configured", "not_applicable"].includes(
      probe.local_endpoint_policy_status
    )
  ) {
    throw new ContractError(`${context}: invalid local endpoint policy status`, {
      local_endpoint_policy_status: probe.local_endpoint_policy_status,
    });
  }
  if (
    !["not_configured", "invalid", "loopback", "private_network", "external"].includes(
      probe.bridge_endpoint_scope
    )
  ) {
    throw new ContractError(`${context}: invalid bridge endpoint scope`, {
      bridge_endpoint_scope: probe.bridge_endpoint_scope,
    });
  }
  if (typeof probe.bridge_endpoint_locality_ok !== "boolean") {
    throw new ContractError(`${context}: invalid bridge endpoint locality flag`);
  }
  assertBoundaryPolicy(
    probe.boundary_policy,
    INTEGRATION_PROBE_ITEM_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

function assertEngineWorkerProbeSafe(probe, context) {
  if (!probe || typeof probe !== "object") {
    throw new ContractError(`${context}: engine worker probe is required`);
  }
  for (const field of Object.keys(probe)) {
    if (!INTEGRATION_ENGINE_WORKER_PROBE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected engine worker field`);
    }
  }
  if (probe.schema !== "iris_integration_engine_worker_probe_v1") {
    throw new ContractError(`${context}: invalid engine worker probe schema`, {
      schema: probe.schema,
    });
  }
  if (
    ![
      "not_configured",
      "attention",
      "missing_worker_paths",
      "local_artifact_worker_configured",
      "ready_for_engine_probe",
    ].includes(probe.status)
  ) {
    throw new ContractError(`${context}: invalid engine worker status`, {
      status: probe.status,
    });
  }
  assertSafeReadinessState(probe.readiness_state, context);
  if (!Array.isArray(probe.configured_env) || !Array.isArray(probe.missing_env)) {
    throw new ContractError(`${context}: engine worker env summaries must be arrays`);
  }
  assertUniqueStringArray(probe.configured_env, `${context}: engine worker configured env`);
  assertUniqueStringArray(probe.missing_env, `${context}: engine worker missing env`);
  if (!["http", "local_placeholder"].includes(probe.tts_engine_mode)) {
    throw new ContractError(`${context}: invalid TTS engine mode`, {
      tts_engine_mode: probe.tts_engine_mode,
    });
  }
  if (!["http", "local_placeholder"].includes(probe.live2d_engine_mode)) {
    throw new ContractError(`${context}: invalid Live2D engine mode`, {
      live2d_engine_mode: probe.live2d_engine_mode,
    });
  }
  assertEngineWorkerModeSummarySafe(
    probe.engine_mode_summary,
    probe,
    `${context}: engine mode summary`
  );
  assertBoundaryPolicy(
    probe.boundary_policy,
    INTEGRATION_ENGINE_WORKER_PROBE_BOUNDARY_FIELDS,
    `${context}: boundary policy`
  );
}

function assertEngineWorkerModeSummarySafe(summary, probe, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  for (const field of Object.keys(summary)) {
    if (!INTEGRATION_ENGINE_WORKER_MODE_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected engine mode summary field`);
    }
  }
  if (summary.schema !== "iris_integration_engine_worker_mode_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of [
    "tts_engine_real_http_configured",
    "live2d_engine_real_http_configured",
    "all_real_http_engines_configured",
    "placeholder_mode_active",
  ]) {
    if (typeof summary[field] !== "boolean") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  for (const field of [
    "real_http_engine_count",
    "local_placeholder_engine_count",
    "health_check_configured_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (
    ![
      "real_tts_live2d_configured",
      "local_placeholder_mode_active",
    ].includes(summary.production_engine_handoff_state)
  ) {
    throw new ContractError(`${context}: invalid production handoff state`);
  }
  const expectedRealHttpEngineCount = [
    probe.tts_engine_mode,
    probe.live2d_engine_mode,
  ].filter((mode) => mode === "http").length;
  const expectedLocalPlaceholderEngineCount = 2 - expectedRealHttpEngineCount;
  if (
    summary.tts_engine_real_http_configured !==
      (probe.tts_engine_mode === "http") ||
    summary.live2d_engine_real_http_configured !==
      (probe.live2d_engine_mode === "http") ||
    summary.real_http_engine_count !== expectedRealHttpEngineCount ||
    summary.local_placeholder_engine_count !== expectedLocalPlaceholderEngineCount ||
    summary.all_real_http_engines_configured !==
      (expectedRealHttpEngineCount === 2) ||
    summary.placeholder_mode_active !== (expectedLocalPlaceholderEngineCount > 0)
  ) {
    throw new ContractError(`${context}: engine mode summary mismatch`);
  }
  const expectedHandoffState =
    expectedRealHttpEngineCount === 2
      ? "real_tts_live2d_configured"
      : "local_placeholder_mode_active";
  if (summary.production_engine_handoff_state !== expectedHandoffState) {
    throw new ContractError(`${context}: production handoff state mismatch`);
  }
  assertBoundaryPolicy(
    summary.boundary_policy,
    INTEGRATION_ENGINE_WORKER_MODE_BOUNDARY_FIELDS,
    `${context} boundary policy`
  );
}

function assertBoundaryPolicy(policy, requiredFields, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const allowed = new Set(requiredFields);
  for (const field of Object.keys(policy)) {
    if (!allowed.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const field of requiredFields) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertUniqueStringArray(values, context) {
  if (
    values.some((value) => typeof value !== "string" || value.length === 0)
  ) {
    throw new ContractError(`${context}: values must be non-empty strings`);
  }
  if (new Set(values).size !== values.length) {
    throw new ContractError(`${context}: duplicate values are not allowed`);
  }
}

function assertSafeReadinessState(state, context) {
  if (!READINESS_STATES.has(state)) {
    throw new ContractError(`${context}: invalid readiness state`);
  }
}

function assertNoForbiddenProbeFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoForbiddenProbeFields(item, context, `${path}[${index}]`));
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_PROBE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsafe probe field`, { field, path });
    }
    assertNoForbiddenProbeFields(child, context, `${path}.${field}`);
  }
}

function safeMode(value) {
  const normalized = String(value ?? "").trim();
  if (normalized === "console" || normalized === "http") return normalized;
  if (!normalized) return "unknown";
  return "custom_or_unsupported";
}

function safeText(value, maxLength = 160) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function safeOptionalNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Number(number.toFixed(4));
}
