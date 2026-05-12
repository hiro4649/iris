import { ContractError } from "../core/contracts.js";
import {
  summarizeLocalEndpointPolicyStatus,
  summarizeLocalEndpointScope,
} from "../core/localEndpointPolicy.js";
import { createObsOverlayConfig } from "./obsOverlayConfig.js";

const FORBIDDEN_OBS_BRIDGE_FIELDS = new Set([
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
  "endpoint",
  "url",
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
const UNSAFE_OBS_PUBLIC_TEXT_PATTERN =
  /(https?:\/\/|authorization|bearer|api[_-]?key|oauth|access[_-]?token|refresh[_-]?token|token|secret|password|endpoint|input_action|input_action_candidate|approved_game_input_action|commit|memory_write|relationship_update_candidate|canonical_envelope)/i;

const REQUIRED_OBS_SETUP_SCHEMA = "iris_obs_bridge_setup_request_v1";
const REQUIRED_OBS_SETUP_ACK_SHAPE = {
  any_of: [
    ["bridge_status", "configured"],
    ["request_id", "bridge_status"],
  ],
};
const OBS_SETUP_PREFERENCE_ENVS = [
  "IRIS_HTTP_ORIGIN",
  "IRIS_OBS_SOURCE_NAME",
  "IRIS_OBS_SCENE_NAME",
  "IRIS_OBS_SOURCE_WIDTH",
  "IRIS_OBS_SOURCE_HEIGHT",
  "IRIS_OBS_SOURCE_FPS",
  "IRIS_OBS_SHUTDOWN_SOURCE_WHEN_NOT_VISIBLE",
  "IRIS_OBS_REFRESH_BROWSER_WHEN_SCENE_BECOMES_ACTIVE",
];

export function createObsBridgeSetupRequest({
  origin = "http://127.0.0.1:8787",
  sourceName = "IRIS Overlay",
  sceneName = "",
  width = 1280,
  height = 720,
  fps = 30,
  shutdownSourceWhenNotVisible = false,
  refreshBrowserWhenSceneBecomesActive = false,
  generatedAtMs = Date.now(),
} = {}) {
  const overlayConfig = createObsOverlayConfig({
    origin,
    sourceName,
    sceneName,
    width,
    height,
    fps,
    shutdownSourceWhenNotVisible,
    refreshBrowserWhenSceneBecomesActive,
    generatedAtMs,
  });
  const request = {
    schema: "iris_obs_bridge_setup_request_v1",
    generated_at_ms: generatedAtMs,
    setup_kind: "browser_source_overlay",
    obs_browser_source: overlayConfig.obs_browser_source,
    endpoints: overlayConfig.endpoints,
    local_bridge_handoff: overlayConfig.local_bridge_handoff,
    safe_area: overlayConfig.safe_area,
    class_hints: overlayConfig.class_hints,
    operator_setup_only: true,
    boundary_policy: {
      configuration_only: true,
      not_runtime_expression_command: true,
      no_live_payloads: true,
      no_raw_text: true,
      no_candidates: true,
      no_commands: true,
      no_secret_values: true,
    },
    adapter_validation_required: true,
  };
  assertObsBridgeSetupRequestSafe(request);
  return request;
}

export async function postObsBridgeSetup({
  endpoint,
  apiKey = "",
  origin = "http://127.0.0.1:8787",
  sourceName = "IRIS Overlay",
  sceneName = "",
  width = 1280,
  height = 720,
  fps = 30,
  shutdownSourceWhenNotVisible = false,
  refreshBrowserWhenSceneBecomesActive = false,
  timeoutMs = 5000,
  fetchImpl = globalThis.fetch,
  generatedAtMs = Date.now(),
  continueOnError = false,
} = {}) {
  if (!endpoint) throw new ContractError("OBS bridge setup endpoint is required");
  if (typeof fetchImpl !== "function") throw new ContractError("OBS bridge setup requires fetch");
  const request = createObsBridgeSetupRequest({
    origin,
    sourceName,
    sceneName,
    width,
    height,
    fps,
    shutdownSourceWhenNotVisible,
    refreshBrowserWhenSceneBecomesActive,
    generatedAtMs,
  });
  const endpointScope = summarizeLocalEndpointScope(endpoint);
  const originScope = summarizeLocalEndpointScope(origin);
  if (
    endpointScope.local_endpoint_allowed !== true ||
    originScope.local_endpoint_allowed !== true
  ) {
    const error = new ContractError("OBS bridge setup blocked by local endpoint policy");
    if (!continueOnError) throw error;
    return createObsBridgeSetupFailureReport({
      request,
      generatedAtMs,
      error,
    });
  }
  const controller = new AbortController();
  const safeTimeoutMs = clampInteger(timeoutMs, 100, 60_000, 5000);
  const timer = setTimeout(() => controller.abort(), safeTimeoutMs);
  try {
    return await postObsBridgeSetupOnce({
      endpoint,
      apiKey,
      request,
      fetchImpl,
      controller,
      generatedAtMs,
    });
  } catch (error) {
    if (!continueOnError) throw error;
    return createObsBridgeSetupFailureReport({
      request,
      generatedAtMs,
      error,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function createObsBridgeHealthProbeReport({
  env = process.env,
  fetchImpl = globalThis.fetch,
  generatedAtMs = Date.now(),
} = {}) {
  const probe = await probeObsBridgeHealth({ env, fetchImpl });
  const report = {
    schema: "iris_obs_bridge_health_probe_report_v1",
    generated_at_ms: generatedAtMs,
    probe,
    summary: summarizeObsBridgeHealthProbe(probe),
    boundary_policy: {
      env_names_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_raw_payloads: true,
      no_live_payloads: true,
      no_candidates: true,
      no_commands: true,
      read_only_health_probe: true,
    },
    adapter_validation_required: true,
  };
  assertObsBridgeHealthProbeReportSafe(report);
  return report;
}

export function assertObsBridgeHealthProbeReportSafe(
  report,
  context = "OBS bridge health probe report"
) {
  if (!report || typeof report !== "object") {
    throw new ContractError(`${context}: missing report`);
  }
  assertNoForbiddenObsBridgeFields(report, context);
  if (report.schema !== "iris_obs_bridge_health_probe_report_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: report.schema });
  }
  assertObsBridgeHealthProbeItemSafe(report.probe, context);
  assertObsBridgeHealthProbeSummarySafe(report.summary, report.probe, context);
  assertObsBridgeBoundaryPolicySafe(report.boundary_policy, context, [
    "env_names_only",
    "no_endpoint_values",
    "no_secret_values",
    "no_raw_payloads",
    "no_live_payloads",
    "no_candidates",
    "no_commands",
    "read_only_health_probe",
  ]);
  if (report.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required is required`);
  }
}

function summarizeObsBridgeHealthProbe(probe) {
  return {
    total: 1,
    pass: probe.status === "pass" ? 1 : 0,
    attention: probe.status === "attention" ? 1 : 0,
    health_endpoint_not_configured:
      probe.status === "health_endpoint_not_configured" ? 1 : 0,
    not_configured: probe.status === "not_configured" ? 1 : 0,
    setup_schema_compatible: probe.supports_setup_request_schema === true ? 1 : 0,
    setup_schema_mismatch: probe.supports_setup_request_schema === false ? 1 : 0,
    setup_schema_not_declared: probe.compatibility_status === "not_declared" ? 1 : 0,
    bridge_ready: probe.bridge_readiness_status === "ready" ? 1 : 0,
    bridge_attention: probe.bridge_reports_ready === false ? 1 : 0,
    bridge_readiness_not_declared:
      probe.bridge_readiness_status === "not_declared" ? 1 : 0,
    ack_shape_compatible: probe.supports_setup_ack_shape === true ? 1 : 0,
    ack_shape_mismatch: probe.supports_setup_ack_shape === false ? 1 : 0,
    ack_shape_not_declared: probe.response_compatibility_status === "not_declared" ? 1 : 0,
    local_endpoint_policy_all_allowed:
      probe.local_endpoint_policy_status === "all_allowed" ? 1 : 0,
    local_endpoint_policy_not_configured:
      probe.local_endpoint_policy_status === "not_configured" ? 1 : 0,
    local_endpoint_policy_blocked:
      probe.local_endpoint_policy_status === "blocked" ? 1 : 0,
  };
}

function assertObsBridgeHealthProbeSummarySafe(summary, probe, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary is required`);
  }
  const expected = summarizeObsBridgeHealthProbe(probe);
  const expectedKeys = new Set(Object.keys(expected));
  for (const [field, value] of Object.entries(expected)) {
    if (summary[field] !== value) {
      throw new ContractError(`${context}: summary count mismatch`, { field });
    }
  }
  for (const field of Object.keys(summary)) {
    if (!expectedKeys.has(field)) {
      throw new ContractError(`${context}: unexpected summary field`, { field });
    }
  }
}

async function postObsBridgeSetupOnce({
  endpoint,
  apiKey,
  request,
  fetchImpl,
  controller,
  generatedAtMs,
}) {
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify(request),
    signal: controller.signal,
  });
  if (!response.ok) {
    throw new ContractError("OBS bridge setup request failed", {
      status: response.status,
      reason: safeText(response.statusText || "http_error", 80),
    });
  }
  const responseText = await response.text();
  const ack = responseText.trim()
    ? parseJsonResponse(responseText)
    : {
        bridge_status: safeText(response.statusText || "accepted", 80),
        configured: true,
      };
  assertObsBridgeAckSafe(ack);
  assertObsBridgeAckConfigured(ack);
  const report = createObsBridgeSetupSuccessReport({ request, ack, generatedAtMs });
  assertObsBridgeSetupReportSafe(report);
  return report;
}

function assertObsBridgeAckConfigured(ack) {
  const bridgeStatus = safeText(ack.bridge_status ?? ack.status ?? "", 80)
    .toLowerCase()
    .replace(/[\s-]+/gu, "_");
  if (
    ack.ok === false ||
    ack.success === false ||
    ack.accepted === false ||
    ack.configured === false ||
    ["failed", "rejected", "error", "attention", "not_ready"].includes(bridgeStatus)
  ) {
    throw new ContractError("OBS bridge setup ack reported failure", {
      status: 200,
      reason: "obs_bridge_setup_ack_failed",
    });
  }
}

function createObsBridgeSetupSuccessReport({ request, ack, generatedAtMs }) {
  return {
    schema: "iris_obs_bridge_setup_report_v1",
    generated_at_ms: generatedAtMs,
    bridge_status: safeObsPublicText(ack.bridge_status ?? "accepted", {
      maxLength: 80,
      fallback: "bridge_status_omitted",
    }),
    request_id_present: safeText(ack.request_id, 160) !== "",
    configured: ack.configured !== false,
    source_name: request.obs_browser_source.source_name,
    scene_configured: request.obs_browser_source.scene_name !== "",
    source_dimensions: {
      width: request.obs_browser_source.width,
      height: request.obs_browser_source.height,
      fps: request.obs_browser_source.fps,
    },
    event_stream_enabled: true,
    boundary_policy: createObsBridgeSetupReportBoundaryPolicy(),
    adapter_validation_required: true,
  };
}

function createObsBridgeSetupFailureReport({ request, generatedAtMs, error }) {
  const report = {
    schema: "iris_obs_bridge_setup_report_v1",
    generated_at_ms: generatedAtMs,
    bridge_status: "attention",
    request_id_present: false,
    configured: false,
    source_name: request.obs_browser_source.source_name,
    scene_configured: request.obs_browser_source.scene_name !== "",
    source_dimensions: {
      width: request.obs_browser_source.width,
      height: request.obs_browser_source.height,
      fps: request.obs_browser_source.fps,
    },
    event_stream_enabled: false,
    setup_status: "bridge_setup_request_failed",
    failure_kind: classifyObsBridgeSetupFailure(error),
    http_status: safeHttpStatus(error),
    retryable: true,
    boundary_policy: {
      ...createObsBridgeSetupReportBoundaryPolicy(),
      failure_report_summary_only: true,
      no_raw_bridge_response_body: true,
    },
    adapter_validation_required: true,
  };
  assertObsBridgeSetupReportSafe(report);
  return report;
}

function createObsBridgeSetupReportBoundaryPolicy() {
  return {
    configuration_only: true,
    report_hides_endpoint_values: true,
    no_live_payloads: true,
    no_raw_text: true,
    no_candidates: true,
    no_commands: true,
    no_secret_values: true,
  };
}

export function assertObsBridgeSetupRequestSafe(
  request,
  context = "OBS bridge setup request"
) {
  if (!request || typeof request !== "object") throw new ContractError(`${context}: missing request`);
  assertNoForbiddenObsBridgeFields(request, context);
  if (request.schema !== "iris_obs_bridge_setup_request_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: request.schema });
  }
  if (request.operator_setup_only !== true) {
    throw new ContractError(`${context}: operator_setup_only is required`);
  }
  assertObsBridgeBoundaryPolicySafe(request.boundary_policy, context, [
    "configuration_only",
    "not_runtime_expression_command",
    "no_live_payloads",
    "no_raw_text",
    "no_candidates",
    "no_commands",
    "no_secret_values",
  ]);
  if (request.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required is required`);
  }
}

export function assertObsBridgeSetupReportSafe(
  report,
  context = "OBS bridge setup report"
) {
  if (!report || typeof report !== "object") throw new ContractError(`${context}: missing report`);
  assertNoForbiddenObsBridgeFields(report, context);
  if (report.schema !== "iris_obs_bridge_setup_report_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: report.schema });
  }
  if (
    report.bridge_status !==
    safeObsPublicText(report.bridge_status, {
      maxLength: 80,
      fallback: "bridge_status_omitted",
    })
  ) {
    throw new ContractError(`${context}: unsafe bridge status`);
  }
  if (typeof report.request_id_present !== "boolean") {
    throw new ContractError(`${context}: invalid request_id_present`);
  }
  for (const field of ["configured", "scene_configured", "event_stream_enabled"]) {
    if (typeof report[field] !== "boolean") {
      throw new ContractError(`${context}: invalid ${field}`);
    }
  }
  if (report.setup_status === undefined) {
    if (report.configured !== true || report.event_stream_enabled !== true) {
      throw new ContractError(`${context}: invalid success setup flags`);
    }
  }
  if (!report.source_dimensions || typeof report.source_dimensions !== "object") {
    throw new ContractError(`${context}: source dimensions are required`);
  }
  for (const field of ["width", "height", "fps"]) {
    if (!Number.isInteger(report.source_dimensions[field]) || report.source_dimensions[field] <= 0) {
      throw new ContractError(`${context}: invalid source dimension ${field}`);
    }
  }
  const requiredBoundaryFields = [
    "configuration_only",
    "report_hides_endpoint_values",
    "no_live_payloads",
    "no_raw_text",
    "no_candidates",
    "no_commands",
    "no_secret_values",
  ];
  if (report.setup_status !== undefined) {
    if (report.configured !== false || report.event_stream_enabled !== false) {
      throw new ContractError(`${context}: invalid failure setup flags`);
    }
    if (report.setup_status !== "bridge_setup_request_failed") {
      throw new ContractError(`${context}: invalid setup status`);
    }
    requiredBoundaryFields.push(
      "failure_report_summary_only",
      "no_raw_bridge_response_body",
    );
  }
  assertObsBridgeBoundaryPolicySafe(
    report.boundary_policy,
    context,
    requiredBoundaryFields
  );
  if (report.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required is required`);
  }
}

function assertObsBridgeAckSafe(ack, context = "OBS bridge ack") {
  if (!ack || typeof ack !== "object" || Array.isArray(ack)) {
    throw new ContractError(`${context}: ack must be object`);
  }
  assertNoForbiddenObsBridgeFields(ack, context);
}

async function probeObsBridgeHealth({ env, fetchImpl }) {
  const bridgeConfigured = (env.IRIS_OBS_BRIDGE_ENDPOINT ?? "") !== "";
  const healthConfigured = (env.IRIS_OBS_BRIDGE_HEALTH_ENDPOINT ?? "") !== "";
  const apiKey = env.IRIS_OBS_BRIDGE_API_KEY ?? env.IRIS_LOCAL_BRIDGE_API_KEY ?? "";
  const bridgeEndpointScope = summarizeLocalEndpointScope(env.IRIS_OBS_BRIDGE_ENDPOINT);
  const healthEndpointScope = summarizeLocalEndpointScope(env.IRIS_OBS_BRIDGE_HEALTH_ENDPOINT);
  const localEndpointPolicyStatus = summarizeObsLocalEndpointPolicyStatus({
    bridgeConfigured,
    healthConfigured,
    bridgeEndpointScope,
    healthEndpointScope,
  });
  const configuredEnv = [
    ...(bridgeConfigured ? ["IRIS_OBS_BRIDGE_ENDPOINT"] : []),
    ...(healthConfigured ? ["IRIS_OBS_BRIDGE_HEALTH_ENDPOINT"] : []),
    ...(env.IRIS_OBS_BRIDGE_API_KEY ? ["IRIS_OBS_BRIDGE_API_KEY"] : []),
    ...(env.IRIS_LOCAL_BRIDGE_API_KEY && !env.IRIS_OBS_BRIDGE_API_KEY
      ? ["IRIS_LOCAL_BRIDGE_API_KEY"]
      : []),
    ...(env.IRIS_OBS_BRIDGE_TIMEOUT_MS ? ["IRIS_OBS_BRIDGE_TIMEOUT_MS"] : []),
    ...OBS_SETUP_PREFERENCE_ENVS.filter((name) => (env[name] ?? "") !== ""),
  ];
  const base = {
    schema: "iris_obs_bridge_health_probe_item_v1",
    bridge_kind: "obs_setup_bridge",
    status: "not_configured",
    configured_env: configuredEnv,
    missing_env: bridgeConfigured
      ? healthConfigured
        ? []
        : ["IRIS_OBS_BRIDGE_HEALTH_ENDPOINT"]
      : ["IRIS_OBS_BRIDGE_ENDPOINT"],
    auth_configured: apiKey !== "",
    local_endpoint_policy: "loopback_or_private_network_only",
    local_endpoint_policy_status: localEndpointPolicyStatus,
    obs_setup_bridge_endpoint_scope: bridgeEndpointScope.endpoint_scope,
    obs_setup_bridge_endpoint_locality_ok: bridgeEndpointScope.local_endpoint_allowed,
    health_endpoint_scope: healthEndpointScope.endpoint_scope,
    health_endpoint_locality_ok: healthEndpointScope.local_endpoint_allowed,
    http_status: null,
    response_kind: "not_requested",
    bridge_status: "",
    bridge_readiness_status: "not_checked",
    bridge_reports_ready: null,
    compatibility_status: "not_checked",
    supports_setup_request_schema: null,
    response_compatibility_status: "not_checked",
    supports_setup_ack_shape: null,
    error_kind: "",
    boundary_policy: {
      env_names_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_raw_payloads: true,
      no_live_payloads: true,
      no_candidates: true,
      no_commands: true,
      read_only: true,
    },
    adapter_validation_required: true,
  };

  if (!bridgeConfigured) return base;
  if (localEndpointPolicyStatus === "blocked") {
    return {
      ...base,
      status: "attention",
      response_kind: "blocked",
      error_kind: "local_endpoint_policy_blocked",
    };
  }
  if (!healthConfigured) {
    return {
      ...base,
      status: "health_endpoint_not_configured",
      compatibility_status: "health_endpoint_missing",
    };
  }
  if (typeof fetchImpl !== "function") {
    return {
      ...base,
      status: "attention",
      response_kind: "unavailable",
      error_kind: "fetch_unavailable",
    };
  }

  const timeoutMs = clampInteger(env.IRIS_OBS_BRIDGE_TIMEOUT_MS ?? 5000, 100, 60_000, 5000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(env.IRIS_OBS_BRIDGE_HEALTH_ENDPOINT, {
      method: "GET",
      headers: {
        accept: "application/json",
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
      },
      signal: controller.signal,
    });
    const responseOk = response.ok === true;
    if (!responseOk) {
      const item = {
        ...base,
        status: "attention",
        missing_env: [],
        http_status: safeHttpStatus({ details: { status: response.status } }),
        response_kind: "omitted",
        bridge_readiness_status: "http_error",
        bridge_reports_ready: null,
        compatibility_status: "http_error",
        supports_setup_request_schema: null,
        response_compatibility_status: "http_error",
        supports_setup_ack_shape: null,
        error_kind: "http_status",
      };
      assertObsBridgeHealthProbeItemSafe(item, "OBS bridge health probe");
      return item;
    }
    const responseText = await response.text();
    const parsed = parseHealthJson(responseText);
    assertNoForbiddenObsBridgeFields(parsed, "OBS bridge health response");
    const readinessSupport = summarizeObsBridgeReadiness(parsed);
    const schemaSupport = summarizeObsBridgeSchemaSupport(parsed);
    const responseSupport = summarizeObsBridgeAckSupport(parsed);
    const item = {
      ...base,
      status:
        readinessSupport.bridge_reports_ready !== false &&
        schemaSupport.supports_setup_request_schema !== false &&
        responseSupport.supports_setup_ack_shape !== false
          ? "pass"
          : "attention",
      missing_env: [],
      http_status: safeHttpStatus({ details: { status: response.status } }),
      response_kind: responseText.trim() ? "json" : "empty",
      bridge_status: safeText(
        parsed.bridge_status ?? parsed.status ?? (responseOk ? "ready" : "attention"),
        80
      ),
      bridge_readiness_status: readinessSupport.bridge_readiness_status,
      bridge_reports_ready: readinessSupport.bridge_reports_ready,
      compatibility_status: schemaSupport.compatibility_status,
      supports_setup_request_schema: schemaSupport.supports_setup_request_schema,
      response_compatibility_status: responseSupport.response_compatibility_status,
      supports_setup_ack_shape: responseSupport.supports_setup_ack_shape,
      error_kind: "",
    };
    assertObsBridgeHealthProbeItemSafe(item, "OBS bridge health probe");
    return item;
  } catch (error) {
    const item = {
      ...base,
      status: "attention",
      missing_env: [],
      response_kind: "error",
      bridge_readiness_status: "not_checked",
      bridge_reports_ready: null,
      response_compatibility_status: "not_checked",
      error_kind: classifyObsBridgeHealthFailure(error),
    };
    assertObsBridgeHealthProbeItemSafe(item, "OBS bridge health probe failure");
    return item;
  } finally {
    clearTimeout(timer);
  }
}

function summarizeObsLocalEndpointPolicyStatus({
  bridgeConfigured,
  healthConfigured,
  bridgeEndpointScope,
  healthEndpointScope,
}) {
  if (!bridgeConfigured || !healthConfigured) return "not_configured";
  if (
    summarizeLocalEndpointPolicyStatus(bridgeEndpointScope) === "blocked" ||
    summarizeLocalEndpointPolicyStatus(healthEndpointScope) === "blocked"
  ) {
    return "blocked";
  }
  return "all_allowed";
}

function assertObsBridgeHealthProbeItemSafe(item, context) {
  if (!item || typeof item !== "object") {
    throw new ContractError(`${context}: invalid health probe item`);
  }
  assertNoForbiddenObsBridgeFields(item, context);
  if (item.schema !== "iris_obs_bridge_health_probe_item_v1") {
    throw new ContractError(`${context}: invalid item schema`, { schema: item.schema });
  }
  if (
    !["not_configured", "health_endpoint_not_configured", "pass", "attention"].includes(
      item.status
    )
  ) {
    throw new ContractError(`${context}: invalid status`, { status: item.status });
  }
  assertObsBridgeBoundaryPolicySafe(item.boundary_policy, context, [
    "env_names_only",
    "no_endpoint_values",
    "no_secret_values",
    "no_raw_payloads",
    "no_live_payloads",
    "no_candidates",
    "no_commands",
    "read_only",
  ]);
  assertObsLocalEndpointProbeFieldsSafe(item, context);
  if (
    ![
      "not_checked",
      "not_declared",
      "ready",
      "attention",
      "http_error",
    ].includes(item.bridge_readiness_status)
  ) {
    throw new ContractError(`${context}: invalid bridge readiness status`, {
      bridge_readiness_status: item.bridge_readiness_status,
    });
  }
  if (
    item.bridge_reports_ready !== null &&
    typeof item.bridge_reports_ready !== "boolean"
  ) {
    throw new ContractError(`${context}: invalid bridge readiness flag`, {
      bridge_reports_ready: item.bridge_reports_ready,
    });
  }
  if (
    ![
      "not_checked",
      "not_declared",
      "compatible",
      "response_shape_mismatch",
      "http_error",
    ].includes(item.response_compatibility_status)
  ) {
    throw new ContractError(`${context}: invalid response compatibility status`, {
      response_compatibility_status: item.response_compatibility_status,
    });
  }
  if (item.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required is required`);
  }
}

function assertObsBridgeBoundaryPolicySafe(policy, context, requiredFields) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  const allowedFields = new Set(requiredFields);
  for (const field of Object.keys(policy)) {
    if (!allowedFields.has(field)) {
      throw new ContractError(`${context}: unexpected boundary flag ${field}`);
    }
  }
  for (const field of requiredFields) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary flag required ${field}`);
    }
  }
}

function assertObsLocalEndpointProbeFieldsSafe(item, context) {
  if (
    !["all_allowed", "blocked", "not_configured"].includes(
      item.local_endpoint_policy_status
    )
  ) {
    throw new ContractError(`${context}: invalid local endpoint policy status`, {
      local_endpoint_policy_status: item.local_endpoint_policy_status,
    });
  }
  for (const field of ["obs_setup_bridge_endpoint_scope", "health_endpoint_scope"]) {
    if (
      !["not_configured", "invalid", "loopback", "private_network", "external"].includes(
        item[field]
      )
    ) {
      throw new ContractError(`${context}: invalid local endpoint scope`, {
        field,
        value: item[field],
      });
    }
  }
  for (const field of [
    "obs_setup_bridge_endpoint_locality_ok",
    "health_endpoint_locality_ok",
  ]) {
    if (typeof item[field] !== "boolean") {
      throw new ContractError(`${context}: invalid local endpoint locality flag`, {
        field,
      });
    }
  }
}

function parseJsonResponse(text) {
  try {
    return JSON.parse(String(text || "{}"));
  } catch {
    throw new ContractError("OBS bridge setup response must be JSON");
  }
}

function parseHealthJson(text) {
  const raw = String(text ?? "");
  if (!raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new ContractError("OBS bridge health response must be a JSON object");
    }
    return parsed;
  } catch (error) {
    if (error instanceof ContractError) throw error;
    throw new ContractError("OBS bridge health response requires JSON");
  }
}

function summarizeObsBridgeReadiness(payload) {
  if (typeof payload.ok === "boolean") {
    return {
      bridge_readiness_status: payload.ok ? "ready" : "attention",
      bridge_reports_ready: payload.ok,
    };
  }
  if (typeof payload.ready === "boolean") {
    return {
      bridge_readiness_status: payload.ready ? "ready" : "attention",
      bridge_reports_ready: payload.ready,
    };
  }
  const statusText = safeText(payload.bridge_status ?? payload.status, 80).toLowerCase();
  if (!statusText) {
    return {
      bridge_readiness_status: "not_declared",
      bridge_reports_ready: null,
    };
  }
  if (["ready", "healthy", "ok", "pass", "available", "running"].includes(statusText)) {
    return {
      bridge_readiness_status: "ready",
      bridge_reports_ready: true,
    };
  }
  if (
    [
      "attention",
      "not_ready",
      "unhealthy",
      "error",
      "failed",
      "offline",
      "starting",
      "degraded",
      "unavailable",
    ].includes(statusText)
  ) {
    return {
      bridge_readiness_status: "attention",
      bridge_reports_ready: false,
    };
  }
  return {
    bridge_readiness_status: "not_declared",
    bridge_reports_ready: null,
  };
}

function summarizeObsBridgeSchemaSupport(payload) {
  const schemas = [
    ...(Array.isArray(payload.supported_setup_schemas) ? payload.supported_setup_schemas : []),
    ...(Array.isArray(payload.supported_request_schemas)
      ? payload.supported_request_schemas
      : []),
    ...(Array.isArray(payload.schemas) ? payload.schemas : []),
  ].map((item) => safeText(item, 120));
  if (schemas.length === 0) {
    return {
      compatibility_status: "not_declared",
      supports_setup_request_schema: null,
    };
  }
  const supportsSetup = schemas.includes(REQUIRED_OBS_SETUP_SCHEMA);
  return {
    compatibility_status: supportsSetup ? "compatible" : "schema_mismatch",
    supports_setup_request_schema: supportsSetup,
  };
}

function summarizeObsBridgeAckSupport(payload) {
  const fields = [
    ...(Array.isArray(payload.supported_response_fields)
      ? payload.supported_response_fields
      : []),
    ...(Array.isArray(payload.response_fields) ? payload.response_fields : []),
    ...(Array.isArray(payload.supported_ack_fields) ? payload.supported_ack_fields : []),
    ...(Array.isArray(payload.ack_fields) ? payload.ack_fields : []),
    ...(Array.isArray(payload.response_schemas) ? payload.response_schemas : []),
  ].map((item) => safeText(item, 120));
  if (fields.length === 0) {
    return {
      response_compatibility_status: "not_declared",
      supports_setup_ack_shape: null,
    };
  }
  const fieldSet = new Set(fields);
  const supportsAck = REQUIRED_OBS_SETUP_ACK_SHAPE.any_of.some((requiredFields) =>
    requiredFields.every((field) => fieldSet.has(field))
  );
  return {
    response_compatibility_status: supportsAck ? "compatible" : "response_shape_mismatch",
    supports_setup_ack_shape: supportsAck,
  };
}

function classifyObsBridgeHealthFailure(error) {
  if (error?.name === "AbortError") return "timeout";
  if (error instanceof ContractError) {
    if (String(error.message ?? "").includes("requires JSON")) return "invalid_json";
    if (String(error.message ?? "").includes("must be a JSON object")) return "invalid_json";
    return "unsafe_response";
  }
  return "request_error";
}

function classifyObsBridgeSetupFailure(error) {
  if (error?.name === "AbortError") return "timeout";
  if (error instanceof ContractError) {
    if (typeof error.details?.status === "number") return "http_status";
    if (String(error.message ?? "").includes("local endpoint policy")) {
      return "local_endpoint_policy_blocked";
    }
    if (String(error.message ?? "").includes("response must be JSON")) return "invalid_json";
    if (String(error.message ?? "").includes("unsafe OBS bridge field")) return "unsafe_bridge_ack";
    return "contract_error";
  }
  return "request_error";
}

function safeHttpStatus(error) {
  const status = Number(error?.details?.status);
  if (!Number.isInteger(status) || status < 100 || status > 599) return null;
  return status;
}

function assertNoForbiddenObsBridgeFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenObsBridgeFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_OBS_BRIDGE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsafe OBS bridge field`, { field, path });
    }
    assertNoForbiddenObsBridgeFields(child, context, `${path}.${field}`);
  }
}

function safeText(value, maxLength = 160) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function safeObsPublicText(value, { maxLength = 160, fallback = "" } = {}) {
  const text = safeText(value, maxLength);
  if (!text) return fallback;
  if (UNSAFE_OBS_PUBLIC_TEXT_PATTERN.test(text)) return fallback;
  return text;
}

function clampInteger(value, min, max, fallback = min) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(number)));
}
