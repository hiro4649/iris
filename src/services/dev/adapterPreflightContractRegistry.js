import { ContractError } from "../../core/contracts.js";

const REGISTRY_SCHEMA = "iris_adapter_preflight_contract_registry_v1";
const CONTRACT_SCHEMA = "iris_adapter_preflight_contract_v1";
const ADAPTER_LABELS = new Set([
  "tts",
  "live2d",
  "obs",
  "overlay",
  "game",
  "youtube",
  "db",
]);
const REGISTRY_FIELDS = new Set([
  "schema",
  "registry_status",
  "adapter_count",
  "adapter_contracts",
  "boundary_policy",
]);
const CONTRACT_FIELDS = new Set([
  "schema",
  "adapter_label",
  "preflight_required",
  "safe_manifest_required",
  "required_status_fields",
  "forbidden_public_fields",
]);
const DEPENDENCY_CLASSIFIER_FIELDS = new Set([
  "schema",
  "dependency_status",
  "missing_component_count",
  "components",
  "boundary_policy",
]);
const DEPENDENCY_COMPONENT_FIELDS = new Set([
  "component_label",
  "component_status",
]);
const FIXTURE_MODE_SPLIT_FIELDS = new Set([
  "schema",
  "adapter_label",
  "fixture_pass",
  "real_ready",
  "preflight_status",
  "boundary_policy",
]);
const ROUTE_LABEL_VALIDATION_FIELDS = new Set([
  "schema",
  "route_label",
  "route_status",
  "execution_shortcut_allowed",
  "boundary_policy",
]);
const STALE_PACKET_VALIDATION_FIELDS = new Set([
  "schema",
  "packet_status",
  "age_bucket",
  "execution_candidate_allowed",
  "boundary_policy",
]);
const TRACE_ID_VALIDATION_FIELDS = new Set([
  "schema",
  "trace_id",
  "event_id",
  "trace_status",
  "boundary_policy",
]);
const SAFE_ERROR_CATALOG_FIELDS = new Set([
  "schema",
  "component_label",
  "error_code",
  "error_status",
  "boundary_policy",
]);
const PUBLIC_DIAGNOSTIC_FIELDS = new Set([
  "schema",
  "component_label",
  "diagnostic_status",
  "safe_error_code",
  "boundary_policy",
]);
const ADMIN_DIAGNOSTIC_FIELDS = new Set([
  "schema",
  "view_role",
  "component_label",
  "diagnostic_status",
  "safe_error_code",
  "owner_only_available",
  "boundary_policy",
]);
const ADMIN_PAGE_SUMMARY_FIELDS = new Set([
  "schema",
  "page_status",
  "adapter_count",
  "ready_adapter_count",
  "attention_adapter_count",
  "adapter_statuses",
  "boundary_policy",
  "adapter_validation_required",
]);
const ADMIN_PAGE_ADAPTER_STATUS_FIELDS = new Set([
  "schema",
  "adapter_label",
  "status",
]);
const UNSAFE_PACKET_FIELD_PATTERN =
  /(^|_)(secret|token|endpoint|raw_payload|candidate|commit)($|_)/i;
const BOUNDARY_FIELDS = new Set([
  "safe_manifest_only",
  "adapter_labels_only",
  "no_endpoint_values",
  "no_token_values",
  "no_raw_payloads",
  "no_candidate_payloads",
  "no_commit_payloads",
]);
const DEPENDENCY_BOUNDARY_FIELDS = new Set([
  "component_labels_only",
  "status_only",
  "no_path_values",
  "no_network_values",
  "no_credential_values",
]);
const FIXTURE_MODE_BOUNDARY_FIELDS = new Set([
  "fixture_and_real_split",
  "fixture_pass_not_real_ready",
  "no_ready_sweetening",
  "status_only",
]);
const ROUTE_LABEL_BOUNDARY_FIELDS = new Set([
  "route_labels_only",
  "review_route_not_execution",
  "no_execution_shortcut",
  "status_only",
]);
const STALE_PACKET_BOUNDARY_FIELDS = new Set([
  "stale_not_ready",
  "stale_not_execution_candidate",
  "age_bucket_only",
  "status_only",
]);
const TRACE_ID_BOUNDARY_FIELDS = new Set([
  "trace_id_required",
  "event_id_required",
  "handoff_without_trace_rejected",
  "status_only",
]);
const SAFE_ERROR_BOUNDARY_FIELDS = new Set([
  "fixed_error_code_only",
  "summary_only",
  "no_raw_vendor_response",
  "no_renderer_job",
]);
const PUBLIC_DIAGNOSTIC_BOUNDARY_FIELDS = new Set([
  "safe_summary_only",
  "no_raw_packet",
  "no_world_command",
  "no_secret",
  "no_candidate",
]);
const ADMIN_DIAGNOSTIC_BOUNDARY_FIELDS = new Set([
  "ordinary_safe_summary_only",
  "owner_only_role_gated",
  "no_secret",
  "no_endpoint",
  "no_raw_diagnostics",
]);
const ADMIN_PAGE_BOUNDARY_FIELDS = new Set([
  "adapter_status_only",
  "fixed_adapter_labels_only",
  "no_endpoint_values",
  "no_token_values",
  "no_raw_packets",
  "no_raw_payloads",
  "no_candidate_payloads",
  "no_commit_payloads",
]);
const REQUIRED_STATUS_FIELDS = [
  "adapter_label",
  "preflight_status",
  "fixture_pass",
  "real_ready",
];
const FORBIDDEN_PUBLIC_FIELDS = [
  "secret",
  "token",
  "endpoint",
  "raw_payload",
  "candidate",
  "commit",
];
const ROUTE_LABELS = new Set(["normal", "review", "adapter", "public", "admin"]);
const ADMIN_VIEW_ROLES = new Set(["ordinary", "owner", "operator"]);
const SAFE_ERROR_CODES = new Set([
  "dependency_missing",
  "unsupported_schema",
  "stale_packet",
  "trace_missing",
  "unsafe_field_rejected",
  "adapter_attention_required",
]);
const ADMIN_PAGE_ADAPTER_LABELS = ["tts", "live2d", "obs", "game", "youtube"];
const UNSAFE_TEXT_PATTERN =
  /\b(secret|token|endpoint|raw[_-]?payload|candidate|commit|world_command)\s*[:=]|https?:\/\/|postgres:\/\//i;

export function createAdapterPreflightContractRegistry({
  adapters = [...ADAPTER_LABELS],
} = {}) {
  const contracts = [...new Set((Array.isArray(adapters) ? adapters : [])
    .map((adapter) => safeAdapterLabel(adapter))
    .filter(Boolean))]
    .sort()
    .map((adapterLabel) => createAdapterPreflightContract(adapterLabel));
  const registry = {
    schema: REGISTRY_SCHEMA,
    registry_status: "adapter_preflight_contracts_ready",
    adapter_count: contracts.length,
    adapter_contracts: contracts,
    boundary_policy: {
      safe_manifest_only: true,
      adapter_labels_only: true,
      no_endpoint_values: true,
      no_token_values: true,
      no_raw_payloads: true,
      no_candidate_payloads: true,
      no_commit_payloads: true,
    },
  };
  assertAdapterPreflightContractRegistrySafe(registry);
  return registry;
}

export function assertAdapterPreflightContractRegistrySafe(
  registry,
  context = "adapter preflight contract registry"
) {
  if (!registry || typeof registry !== "object" || Array.isArray(registry)) {
    throw new ContractError(`${context}: registry required`);
  }
  if (registry.schema !== REGISTRY_SCHEMA) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(registry)) {
    if (!REGISTRY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected registry field`);
    }
  }
  if (registry.registry_status !== "adapter_preflight_contracts_ready") {
    throw new ContractError(`${context}: invalid registry status`);
  }
  if (!Array.isArray(registry.adapter_contracts)) {
    throw new ContractError(`${context}: adapter contracts required`);
  }
  if (registry.adapter_count !== registry.adapter_contracts.length) {
    throw new ContractError(`${context}: adapter count mismatch`);
  }
  const seen = new Set();
  for (const contract of registry.adapter_contracts) {
    assertAdapterPreflightContractSafe(contract, context);
    if (seen.has(contract.adapter_label)) {
      throw new ContractError(`${context}: duplicate adapter label`);
    }
    seen.add(contract.adapter_label);
  }
  for (const adapterLabel of ADAPTER_LABELS) {
    if (!seen.has(adapterLabel)) {
      throw new ContractError(`${context}: missing adapter contract`);
    }
  }
  assertBoundaryPolicy(registry.boundary_policy, context);
  assertNoUnsafeText(registry, context);
}

export function createAdapterPreflightMissingDependencyClassifier({
  dependencies = [],
} = {}) {
  const components = (Array.isArray(dependencies) ? dependencies : [])
    .map((dependency) => safeDependencyComponent(dependency))
    .filter(Boolean)
    .sort((a, b) => a.component_label.localeCompare(b.component_label));
  const missingCount = components.filter(
    (component) => component.component_status === "missing"
  ).length;
  const classifier = {
    schema: "iris_adapter_preflight_missing_dependency_classifier_v1",
    dependency_status: missingCount > 0 ? "missing" : "available",
    missing_component_count: missingCount,
    components,
    boundary_policy: {
      component_labels_only: true,
      status_only: true,
      no_path_values: true,
      no_network_values: true,
      no_credential_values: true,
    },
  };
  assertAdapterPreflightMissingDependencyClassifierSafe(classifier);
  return classifier;
}

export function assertAdapterPreflightMissingDependencyClassifierSafe(
  classifier,
  context = "adapter preflight missing dependency classifier"
) {
  if (!classifier || typeof classifier !== "object" || Array.isArray(classifier)) {
    throw new ContractError(`${context}: classifier required`);
  }
  if (
    classifier.schema !==
    "iris_adapter_preflight_missing_dependency_classifier_v1"
  ) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(classifier)) {
    if (!DEPENDENCY_CLASSIFIER_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected classifier field`);
    }
  }
  if (!["available", "missing"].includes(classifier.dependency_status)) {
    throw new ContractError(`${context}: invalid dependency status`);
  }
  if (!Array.isArray(classifier.components)) {
    throw new ContractError(`${context}: components required`);
  }
  const seen = new Set();
  let missingCount = 0;
  for (const component of classifier.components) {
    assertDependencyComponentSafe(component, context);
    if (seen.has(component.component_label)) {
      throw new ContractError(`${context}: duplicate component label`);
    }
    seen.add(component.component_label);
    if (component.component_status === "missing") missingCount += 1;
  }
  if (classifier.missing_component_count !== missingCount) {
    throw new ContractError(`${context}: missing component count mismatch`);
  }
  const expectedStatus = missingCount > 0 ? "missing" : "available";
  if (classifier.dependency_status !== expectedStatus) {
    throw new ContractError(`${context}: invalid status aggregate`);
  }
  assertDependencyBoundaryPolicy(classifier.boundary_policy, context);
  assertNoUnsafeText(classifier, context);
}

export function createAdapterPreflightFixtureModeSplit({
  adapter = "tts",
  fixturePass = false,
  realReady = false,
} = {}) {
  const adapterLabel = safeAdapterLabel(adapter) ?? "tts";
  const fixturePassed = fixturePass === true;
  const realAdapterReady = realReady === true;
  const split = {
    schema: "iris_adapter_preflight_fixture_mode_split_v1",
    adapter_label: adapterLabel,
    fixture_pass: fixturePassed,
    real_ready: realAdapterReady,
    preflight_status: realAdapterReady
      ? "real_ready"
      : fixturePassed
        ? "fixture_pass_real_blocked"
        : "fixture_waiting",
    boundary_policy: {
      fixture_and_real_split: true,
      fixture_pass_not_real_ready: true,
      no_ready_sweetening: true,
      status_only: true,
    },
  };
  assertAdapterPreflightFixtureModeSplitSafe(split);
  return split;
}

export function assertAdapterPreflightFixtureModeSplitSafe(
  split,
  context = "adapter preflight fixture mode split"
) {
  if (!split || typeof split !== "object" || Array.isArray(split)) {
    throw new ContractError(`${context}: split required`);
  }
  if (split.schema !== "iris_adapter_preflight_fixture_mode_split_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(split)) {
    if (!FIXTURE_MODE_SPLIT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected split field`);
    }
  }
  if (!ADAPTER_LABELS.has(split.adapter_label)) {
    throw new ContractError(`${context}: invalid adapter label`);
  }
  if (typeof split.fixture_pass !== "boolean" || typeof split.real_ready !== "boolean") {
    throw new ContractError(`${context}: invalid fixture split boolean`);
  }
  const expectedStatus = split.real_ready
    ? "real_ready"
    : split.fixture_pass
      ? "fixture_pass_real_blocked"
      : "fixture_waiting";
  if (split.preflight_status !== expectedStatus) {
    throw new ContractError(`${context}: fixture status must not sweeten ready`);
  }
  assertFixtureModeBoundaryPolicy(split.boundary_policy, context);
  assertNoUnsafeText(split, context);
}

export function assertAdapterPreflightPacketSafe(
  packet,
  context = "adapter preflight packet"
) {
  if (!packet || typeof packet !== "object" || Array.isArray(packet)) {
    throw new ContractError(`${context}: packet required`);
  }
  assertNoUnsafePacketFields(packet, context);
  assertNoUnsafeText(packet, context);
}

export function createAdapterPreflightRouteLabelValidation({
  route = "normal",
} = {}) {
  const routeLabel = safeRouteLabel(route);
  const validation = {
    schema: "iris_adapter_preflight_route_label_validation_v1",
    route_label: routeLabel,
    route_status:
      routeLabel === "review" ? "review_requires_validation" : "route_label_valid",
    execution_shortcut_allowed: routeLabel !== "review",
    boundary_policy: {
      route_labels_only: true,
      review_route_not_execution: true,
      no_execution_shortcut: true,
      status_only: true,
    },
  };
  assertAdapterPreflightRouteLabelValidationSafe(validation);
  return validation;
}

export function assertAdapterPreflightRouteLabelValidationSafe(
  validation,
  context = "adapter preflight route label validation"
) {
  if (!validation || typeof validation !== "object" || Array.isArray(validation)) {
    throw new ContractError(`${context}: validation required`);
  }
  if (validation.schema !== "iris_adapter_preflight_route_label_validation_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(validation)) {
    if (!ROUTE_LABEL_VALIDATION_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected validation field`);
    }
  }
  if (!ROUTE_LABELS.has(validation.route_label)) {
    throw new ContractError(`${context}: invalid route label`);
  }
  if (
    !["route_label_valid", "review_requires_validation"].includes(
      validation.route_status
    )
  ) {
    throw new ContractError(`${context}: invalid route status`);
  }
  if (typeof validation.execution_shortcut_allowed !== "boolean") {
    throw new ContractError(`${context}: invalid execution shortcut flag`);
  }
  if (
    validation.route_label === "review" &&
    (validation.route_status !== "review_requires_validation" ||
      validation.execution_shortcut_allowed)
  ) {
    throw new ContractError(`${context}: review route cannot be execution shortcut`);
  }
  if (
    validation.route_label !== "review" &&
    validation.route_status !== "route_label_valid"
  ) {
    throw new ContractError(`${context}: invalid non-review route status`);
  }
  assertRouteLabelBoundaryPolicy(validation.boundary_policy, context);
  assertNoUnsafeText(validation, context);
}

export function createAdapterPreflightStalePacketValidation({
  packetAgeMs = Number.POSITIVE_INFINITY,
  staleAfterMs = 30000,
} = {}) {
  const stale = !Number.isFinite(packetAgeMs) || packetAgeMs > staleAfterMs;
  const validation = {
    schema: "iris_adapter_preflight_stale_packet_validation_v1",
    packet_status: stale ? "stale_degraded" : "fresh_valid",
    age_bucket: stale ? "stale" : "fresh",
    execution_candidate_allowed: !stale,
    boundary_policy: {
      stale_not_ready: true,
      stale_not_execution_candidate: true,
      age_bucket_only: true,
      status_only: true,
    },
  };
  assertAdapterPreflightStalePacketValidationSafe(validation);
  return validation;
}

export function assertAdapterPreflightStalePacketValidationSafe(
  validation,
  context = "adapter preflight stale packet validation"
) {
  if (!validation || typeof validation !== "object" || Array.isArray(validation)) {
    throw new ContractError(`${context}: validation required`);
  }
  if (validation.schema !== "iris_adapter_preflight_stale_packet_validation_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(validation)) {
    if (!STALE_PACKET_VALIDATION_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected validation field`);
    }
  }
  if (!["fresh_valid", "stale_degraded"].includes(validation.packet_status)) {
    throw new ContractError(`${context}: invalid packet status`);
  }
  if (!["fresh", "stale"].includes(validation.age_bucket)) {
    throw new ContractError(`${context}: invalid age bucket`);
  }
  if (typeof validation.execution_candidate_allowed !== "boolean") {
    throw new ContractError(`${context}: invalid execution candidate flag`);
  }
  if (
    validation.age_bucket === "stale" &&
    (validation.packet_status !== "stale_degraded" ||
      validation.execution_candidate_allowed)
  ) {
    throw new ContractError(`${context}: stale packet cannot be ready or execution candidate`);
  }
  if (
    validation.age_bucket === "fresh" &&
    (validation.packet_status !== "fresh_valid" ||
      !validation.execution_candidate_allowed)
  ) {
    throw new ContractError(`${context}: fresh packet status mismatch`);
  }
  assertStalePacketBoundaryPolicy(validation.boundary_policy, context);
  assertNoUnsafeText(validation, context);
}

export function createAdapterPreflightTraceIdValidation({
  traceId,
  eventId,
} = {}) {
  const validation = {
    schema: "iris_adapter_preflight_trace_id_validation_v1",
    trace_id: safeTraceId(traceId),
    event_id: safeTraceId(eventId),
    trace_status: "trace_valid",
    boundary_policy: {
      trace_id_required: true,
      event_id_required: true,
      handoff_without_trace_rejected: true,
      status_only: true,
    },
  };
  assertAdapterPreflightTraceIdValidationSafe(validation);
  return validation;
}

export function assertAdapterPreflightTraceIdValidationSafe(
  validation,
  context = "adapter preflight trace id validation"
) {
  if (!validation || typeof validation !== "object" || Array.isArray(validation)) {
    throw new ContractError(`${context}: validation required`);
  }
  if (validation.schema !== "iris_adapter_preflight_trace_id_validation_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(validation)) {
    if (!TRACE_ID_VALIDATION_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected validation field`);
    }
  }
  if (!isSafeTraceId(validation.trace_id)) {
    throw new ContractError(`${context}: trace_id required`);
  }
  if (!isSafeTraceId(validation.event_id)) {
    throw new ContractError(`${context}: event_id required`);
  }
  if (validation.trace_status !== "trace_valid") {
    throw new ContractError(`${context}: invalid trace status`);
  }
  assertTraceIdBoundaryPolicy(validation.boundary_policy, context);
  assertNoUnsafeText(validation, context);
}

export function createAdapterPreflightSafeErrorCatalog({
  component = "tts",
  errorCode = "adapter_attention_required",
} = {}) {
  const catalog = {
    schema: "iris_adapter_preflight_safe_error_catalog_v1",
    component_label: safeAdapterLabel(component) ?? "tts",
    error_code: safeErrorCode(errorCode),
    error_status: "attention_required",
    boundary_policy: {
      fixed_error_code_only: true,
      summary_only: true,
      no_raw_vendor_response: true,
      no_renderer_job: true,
    },
  };
  assertAdapterPreflightSafeErrorCatalogSafe(catalog);
  return catalog;
}

export function assertAdapterPreflightSafeErrorCatalogSafe(
  catalog,
  context = "adapter preflight safe error catalog"
) {
  if (!catalog || typeof catalog !== "object" || Array.isArray(catalog)) {
    throw new ContractError(`${context}: catalog required`);
  }
  if (catalog.schema !== "iris_adapter_preflight_safe_error_catalog_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(catalog)) {
    if (!SAFE_ERROR_CATALOG_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected catalog field`);
    }
  }
  if (!ADAPTER_LABELS.has(catalog.component_label)) {
    throw new ContractError(`${context}: invalid component label`);
  }
  if (!SAFE_ERROR_CODES.has(catalog.error_code)) {
    throw new ContractError(`${context}: invalid error code`);
  }
  if (catalog.error_status !== "attention_required") {
    throw new ContractError(`${context}: invalid error status`);
  }
  assertSafeErrorBoundaryPolicy(catalog.boundary_policy, context);
  assertNoUnsafeText(catalog, context);
}

export function createAdapterPreflightPublicDiagnostic({
  component = "tts",
  safeErrorCode = "adapter_attention_required",
  status = "attention_required",
} = {}) {
  const diagnostic = {
    schema: "iris_adapter_preflight_public_diagnostic_v1",
    component_label: safeAdapterLabel(component) ?? "tts",
    diagnostic_status: safeDiagnosticStatus(status),
    safe_error_code: safeErrorCodeValue(safeErrorCode),
    boundary_policy: {
      safe_summary_only: true,
      no_raw_packet: true,
      no_world_command: true,
      no_secret: true,
      no_candidate: true,
    },
  };
  assertAdapterPreflightPublicDiagnosticSafe(diagnostic);
  return diagnostic;
}

export function assertAdapterPreflightPublicDiagnosticSafe(
  diagnostic,
  context = "adapter preflight public diagnostic"
) {
  if (!diagnostic || typeof diagnostic !== "object" || Array.isArray(diagnostic)) {
    throw new ContractError(`${context}: diagnostic required`);
  }
  if (diagnostic.schema !== "iris_adapter_preflight_public_diagnostic_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(diagnostic)) {
    if (!PUBLIC_DIAGNOSTIC_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected diagnostic field`);
    }
  }
  if (!ADAPTER_LABELS.has(diagnostic.component_label)) {
    throw new ContractError(`${context}: invalid component label`);
  }
  if (!["ok", "attention_required", "blocked", "degraded"].includes(diagnostic.diagnostic_status)) {
    throw new ContractError(`${context}: invalid diagnostic status`);
  }
  if (!SAFE_ERROR_CODES.has(diagnostic.safe_error_code)) {
    throw new ContractError(`${context}: invalid safe error code`);
  }
  assertPublicDiagnosticBoundaryPolicy(diagnostic.boundary_policy, context);
  assertNoUnsafeText(diagnostic, context);
}

export function createAdapterPreflightAdminDiagnostic({
  viewRole = "ordinary",
  component = "tts",
  safeErrorCode = "adapter_attention_required",
  status = "attention_required",
} = {}) {
  const role = safeAdminViewRole(viewRole);
  const diagnostic = {
    schema: "iris_adapter_preflight_admin_diagnostic_v1",
    view_role: role,
    component_label: safeAdapterLabel(component) ?? "tts",
    diagnostic_status: safeDiagnosticStatus(status),
    safe_error_code: safeErrorCodeValue(safeErrorCode),
    owner_only_available: role === "owner" || role === "operator",
    boundary_policy: {
      ordinary_safe_summary_only: true,
      owner_only_role_gated: true,
      no_secret: true,
      no_endpoint: true,
      no_raw_diagnostics: true,
    },
  };
  assertAdapterPreflightAdminDiagnosticSafe(diagnostic);
  return diagnostic;
}

export function assertAdapterPreflightAdminDiagnosticSafe(
  diagnostic,
  context = "adapter preflight admin diagnostic"
) {
  if (!diagnostic || typeof diagnostic !== "object" || Array.isArray(diagnostic)) {
    throw new ContractError(`${context}: diagnostic required`);
  }
  if (diagnostic.schema !== "iris_adapter_preflight_admin_diagnostic_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(diagnostic)) {
    if (!ADMIN_DIAGNOSTIC_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected diagnostic field`);
    }
  }
  if (!ADMIN_VIEW_ROLES.has(diagnostic.view_role)) {
    throw new ContractError(`${context}: invalid view role`);
  }
  if (!ADAPTER_LABELS.has(diagnostic.component_label)) {
    throw new ContractError(`${context}: invalid component label`);
  }
  if (!["ok", "attention_required", "blocked", "degraded"].includes(diagnostic.diagnostic_status)) {
    throw new ContractError(`${context}: invalid diagnostic status`);
  }
  if (!SAFE_ERROR_CODES.has(diagnostic.safe_error_code)) {
    throw new ContractError(`${context}: invalid safe error code`);
  }
  if (typeof diagnostic.owner_only_available !== "boolean") {
    throw new ContractError(`${context}: invalid owner-only gate`);
  }
  if (diagnostic.view_role === "ordinary" && diagnostic.owner_only_available) {
    throw new ContractError(`${context}: ordinary view cannot expose owner-only fields`);
  }
  assertAdminDiagnosticBoundaryPolicy(diagnostic.boundary_policy, context);
  assertNoUnsafeText(diagnostic, context);
}

export function createAdapterPreflightAdminPageSummary({
  statuses = {},
} = {}) {
  const adapterStatuses = ADMIN_PAGE_ADAPTER_LABELS.map((adapterLabel) => ({
    schema: "iris_adapter_preflight_admin_page_adapter_status_v1",
    adapter_label: adapterLabel,
    status: safeDiagnosticStatus(
      typeof statuses?.[adapterLabel] === "string"
        ? statuses[adapterLabel]
        : statuses?.[adapterLabel]?.status
    ),
  }));
  const readyCount = adapterStatuses.filter((item) => item.status === "ok").length;
  const summary = {
    schema: "iris_adapter_preflight_admin_page_summary_v1",
    page_status: readyCount === adapterStatuses.length ? "ready" : "attention",
    adapter_count: adapterStatuses.length,
    ready_adapter_count: readyCount,
    attention_adapter_count: adapterStatuses.length - readyCount,
    adapter_statuses: adapterStatuses,
    boundary_policy: Object.fromEntries(
      [...ADMIN_PAGE_BOUNDARY_FIELDS].map((field) => [field, true])
    ),
    adapter_validation_required: true,
  };
  assertAdapterPreflightAdminPageSummarySafe(summary);
  return summary;
}

export function assertAdapterPreflightAdminPageSummarySafe(
  summary,
  context = "adapter preflight admin page summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  if (summary.schema !== "iris_adapter_preflight_admin_page_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!ADMIN_PAGE_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected summary field`);
    }
  }
  if (!["ready", "attention"].includes(summary.page_status)) {
    throw new ContractError(`${context}: invalid page status`);
  }
  if (!Array.isArray(summary.adapter_statuses)) {
    throw new ContractError(`${context}: adapter statuses required`);
  }
  const labels = summary.adapter_statuses.map((item) => item.adapter_label);
  if (JSON.stringify(labels) !== JSON.stringify(ADMIN_PAGE_ADAPTER_LABELS)) {
    throw new ContractError(`${context}: adapter labels must match admin page scope`);
  }
  let readyCount = 0;
  for (const adapterStatus of summary.adapter_statuses) {
    assertAdapterPreflightAdminPageAdapterStatusSafe(adapterStatus, context);
    if (adapterStatus.status === "ok") readyCount += 1;
  }
  if (
    summary.adapter_count !== summary.adapter_statuses.length ||
    summary.ready_adapter_count !== readyCount ||
    summary.attention_adapter_count !== summary.adapter_statuses.length - readyCount
  ) {
    throw new ContractError(`${context}: adapter status count mismatch`);
  }
  if (
    summary.page_status !==
    (readyCount === summary.adapter_statuses.length ? "ready" : "attention")
  ) {
    throw new ContractError(`${context}: invalid page aggregate status`);
  }
  assertAdminPageBoundaryPolicy(summary.boundary_policy, context);
  if (summary.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation flag required`);
  }
  assertNoUnsafeText(summary, context);
}

function assertAdapterPreflightAdminPageAdapterStatusSafe(
  adapterStatus,
  context
) {
  if (!adapterStatus || typeof adapterStatus !== "object" || Array.isArray(adapterStatus)) {
    throw new ContractError(`${context}: adapter status required`);
  }
  if (
    adapterStatus.schema !==
    "iris_adapter_preflight_admin_page_adapter_status_v1"
  ) {
    throw new ContractError(`${context}: invalid adapter status schema`);
  }
  for (const field of Object.keys(adapterStatus)) {
    if (!ADMIN_PAGE_ADAPTER_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected adapter status field`);
    }
  }
  if (!ADMIN_PAGE_ADAPTER_LABELS.includes(adapterStatus.adapter_label)) {
    throw new ContractError(`${context}: invalid adapter label`);
  }
  if (!["ok", "attention_required", "blocked", "degraded"].includes(adapterStatus.status)) {
    throw new ContractError(`${context}: invalid adapter status`);
  }
}

function createAdapterPreflightContract(adapterLabel) {
  return {
    schema: CONTRACT_SCHEMA,
    adapter_label: adapterLabel,
    preflight_required: true,
    safe_manifest_required: true,
    required_status_fields: [...REQUIRED_STATUS_FIELDS],
    forbidden_public_fields: [...FORBIDDEN_PUBLIC_FIELDS],
  };
}

function assertAdapterPreflightContractSafe(contract, context) {
  if (!contract || typeof contract !== "object" || Array.isArray(contract)) {
    throw new ContractError(`${context}: adapter contract required`);
  }
  if (contract.schema !== CONTRACT_SCHEMA) {
    throw new ContractError(`${context}: invalid contract schema`);
  }
  for (const field of Object.keys(contract)) {
    if (!CONTRACT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected contract field`);
    }
  }
  if (!ADAPTER_LABELS.has(contract.adapter_label)) {
    throw new ContractError(`${context}: invalid adapter label`);
  }
  if (
    contract.preflight_required !== true ||
    contract.safe_manifest_required !== true
  ) {
    throw new ContractError(`${context}: preflight manifest required`);
  }
  assertExactStringList(
    contract.required_status_fields,
    REQUIRED_STATUS_FIELDS,
    context
  );
  assertExactStringList(
    contract.forbidden_public_fields,
    FORBIDDEN_PUBLIC_FIELDS,
    context
  );
}

function safeDependencyComponent(dependency) {
  const componentLabel = safeAdapterLabel(
    typeof dependency === "string"
      ? dependency
      : dependency?.component_label ?? dependency?.component ?? dependency?.adapter
  );
  if (!componentLabel) return null;
  const rawStatus =
    typeof dependency === "string"
      ? "missing"
      : String(dependency?.component_status ?? dependency?.status ?? "missing")
          .trim()
          .toLowerCase();
  const componentStatus = rawStatus === "available" ? "available" : "missing";
  return {
    component_label: componentLabel,
    component_status: componentStatus,
  };
}

function assertDependencyComponentSafe(component, context) {
  if (!component || typeof component !== "object" || Array.isArray(component)) {
    throw new ContractError(`${context}: dependency component required`);
  }
  for (const field of Object.keys(component)) {
    if (!DEPENDENCY_COMPONENT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected component field`);
    }
  }
  if (!ADAPTER_LABELS.has(component.component_label)) {
    throw new ContractError(`${context}: invalid component label`);
  }
  if (!["available", "missing"].includes(component.component_status)) {
    throw new ContractError(`${context}: invalid component status`);
  }
}

function assertExactStringList(actual, expected, context) {
  if (!Array.isArray(actual) || actual.length !== expected.length) {
    throw new ContractError(`${context}: invalid field list`);
  }
  for (let index = 0; index < expected.length; index += 1) {
    if (actual[index] !== expected[index]) {
      throw new ContractError(`${context}: invalid field list`);
    }
  }
}

function assertNoUnsafePacketFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoUnsafePacketFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (UNSAFE_PACKET_FIELD_PATTERN.test(field)) {
      throw new ContractError(`${context}: unsafe packet field`, { path });
    }
    assertNoUnsafePacketFields(child, context, `${path}.${field}`);
  }
}

function assertFixtureModeBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!FIXTURE_MODE_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of FIXTURE_MODE_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertRouteLabelBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!ROUTE_LABEL_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of ROUTE_LABEL_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertStalePacketBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!STALE_PACKET_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of STALE_PACKET_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertTraceIdBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!TRACE_ID_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of TRACE_ID_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertSafeErrorBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!SAFE_ERROR_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of SAFE_ERROR_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertPublicDiagnosticBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!PUBLIC_DIAGNOSTIC_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of PUBLIC_DIAGNOSTIC_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertAdminDiagnosticBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!ADMIN_DIAGNOSTIC_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of ADMIN_DIAGNOSTIC_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertAdminPageBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!ADMIN_PAGE_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of ADMIN_PAGE_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertDependencyBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!DEPENDENCY_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of DEPENDENCY_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function safeAdapterLabel(adapter) {
  const label = String(adapter ?? "").trim().toLowerCase();
  return ADAPTER_LABELS.has(label) ? label : null;
}

function safeRouteLabel(route) {
  const label = String(route ?? "").trim().toLowerCase();
  return ROUTE_LABELS.has(label) ? label : "review";
}

function safeTraceId(value) {
  const id = String(value ?? "").trim();
  if (!isSafeTraceId(id)) {
    throw new ContractError("adapter preflight trace id validation: trace_id/event_id required");
  }
  return id;
}

function isSafeTraceId(value) {
  return typeof value === "string" && /^[A-Za-z0-9_.:-]{1,96}$/.test(value);
}

function safeErrorCode(value) {
  const code = String(value ?? "").trim().toLowerCase();
  return SAFE_ERROR_CODES.has(code) ? code : "adapter_attention_required";
}

function safeErrorCodeValue(value) {
  return safeErrorCode(value);
}

function safeDiagnosticStatus(value) {
  const status = String(value ?? "").trim().toLowerCase();
  return ["ok", "attention_required", "blocked", "degraded"].includes(status)
    ? status
    : "attention_required";
}

function safeAdminViewRole(value) {
  const role = String(value ?? "").trim().toLowerCase();
  return ADMIN_VIEW_ROLES.has(role) ? role : "ordinary";
}

function assertNoUnsafeText(value, context) {
  const serialized = JSON.stringify(value);
  if (UNSAFE_TEXT_PATTERN.test(serialized)) {
    throw new ContractError(`${context}: unsafe adapter preflight material`);
  }
}
