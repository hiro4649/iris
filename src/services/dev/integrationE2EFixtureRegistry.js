import { ContractError } from "../../core/contracts.js";

const INTEGRATION_E2E_FIXTURE_REGISTRY_SCHEMA =
  "iris_integration_e2e_fixture_registry_v1";
const INTEGRATION_E2E_FIXTURE_REGISTRY_FIELDS = new Set([
  "schema",
  "registry_status",
  "fixture_count",
  "fixtures",
  "boundary_policy",
  "adapter_validation_required",
]);
const INTEGRATION_E2E_FIXTURE_FIELDS = new Set([
  "fixture_id",
  "category",
  "status",
  "selector_label",
]);
const INTEGRATION_E2E_SELECTION_FIELDS = new Set([
  "schema",
  "selected_count",
  "fixtures",
  "boundary_policy",
  "adapter_validation_required",
]);
const INTEGRATION_E2E_NORMALIZED_RESULT_FIELDS = new Set([
  "schema",
  "fixture_id",
  "category",
  "normalized_status",
  "safe_reason",
  "boundary_policy",
  "adapter_validation_required",
]);
const INTEGRATION_E2E_OVERALL_RESULT_FIELDS = new Set([
  "schema",
  "overall_status",
  "critical_blocker_count",
  "result_count",
  "status_counts",
  "boundary_policy",
  "adapter_validation_required",
]);
const INTEGRATION_E2E_CATEGORY_SUMMARY_FIELDS = new Set([
  "schema",
  "category_count",
  "categories",
  "boundary_policy",
  "adapter_validation_required",
]);
const INTEGRATION_E2E_NO_SWEETENING_REGRESSION_FIELDS = new Set([
  "schema",
  "fixture_label",
  "real_residency_confirmed",
  "overall_ready_allowed",
  "expected_status",
  "boundary_policy",
  "adapter_validation_required",
]);
const INTEGRATION_E2E_ROUTE_CONTRACT_SWEEP_FIELDS = new Set([
  "schema",
  "route_count",
  "violation_count",
  "sweep_status",
  "route_summaries",
  "boundary_policy",
  "adapter_validation_required",
]);
const INTEGRATION_E2E_CANDIDATE_SHORTCUT_SWEEP_FIELDS = new Set([
  "schema",
  "target_count",
  "violation_count",
  "sweep_status",
  "target_summaries",
  "boundary_policy",
  "adapter_validation_required",
]);
const INTEGRATION_E2E_CANONICAL_FIREWALL_SWEEP_FIELDS = new Set([
  "schema",
  "target_count",
  "violation_count",
  "sweep_status",
  "target_summaries",
  "boundary_policy",
  "adapter_validation_required",
]);
const INTEGRATION_E2E_WORLD_COMMAND_SWEEP_FIELDS = new Set([
  "schema",
  "target_count",
  "violation_count",
  "sweep_status",
  "target_summaries",
  "boundary_policy",
  "adapter_validation_required",
]);
const INTEGRATION_E2E_RAW_DATA_LEAK_SWEEP_FIELDS = new Set([
  "schema",
  "target_count",
  "violation_count",
  "sweep_status",
  "target_summaries",
  "boundary_policy",
  "adapter_validation_required",
]);
const INTEGRATION_E2E_ROUTE_SUMMARY_FIELDS = new Set([
  "route_label",
  "route_status",
  "violation_count",
]);
const INTEGRATION_E2E_TARGET_SUMMARY_FIELDS = new Set([
  "target_label",
  "target_status",
  "violation_count",
]);
const INTEGRATION_E2E_CATEGORY_STATUS_FIELDS = new Set([
  "category",
  "status",
  "result_count",
  "status_counts",
]);
const INTEGRATION_E2E_CATEGORIES = new Set([
  "runtime",
  "adapter",
  "db",
  "admin",
  "voice",
  "game",
  "youtube",
  "obs",
]);
const INTEGRATION_E2E_ROUTE_LABELS = new Set([
  "runtime",
  "admin",
  "public",
  "adapter",
  "preflight",
]);
const INTEGRATION_E2E_SHORTCUT_TARGETS = new Set([
  "execution",
  "persistence",
  "adapter",
]);
const INTEGRATION_E2E_WORLD_COMMAND_TARGETS = new Set([
  "core",
  "public",
  "admin",
  "diagnostic",
]);
const INTEGRATION_E2E_RAW_DATA_LEAK_TARGETS = new Set([
  "public",
  "admin",
  "diagnostic",
]);
const INTEGRATION_E2E_FIXTURE_STATUSES = new Set([
  "ready",
  "attention",
  "blocked",
]);
const INTEGRATION_E2E_RESULT_STATUSES = new Set([
  "pass",
  "fail",
  "blocked",
  "attention",
]);
const INTEGRATION_E2E_SAFE_REASONS = new Set([
  "fixture_passed",
  "fixture_failed",
  "runtime_blocked",
  "operator_attention",
]);
const INTEGRATION_E2E_REGISTRY_BOUNDARY_FIELDS = new Set([
  "safe_registry_only",
  "selective_execution_only",
  "raw_logs_redacted",
  "raw_payload_redacted",
  "secret_redacted",
]);
const INTEGRATION_E2E_RESULT_BOUNDARY_FIELDS = new Set([
  "safe_normalized_result_only",
  "raw_logs_redacted",
  "raw_payload_redacted",
  "secret_redacted",
]);
const INTEGRATION_E2E_OVERALL_BOUNDARY_FIELDS = new Set([
  "critical_blocker_blocks_ready",
  "safe_counts_only",
  "raw_logs_redacted",
  "raw_payload_redacted",
  "secret_redacted",
]);
const INTEGRATION_E2E_CATEGORY_SUMMARY_BOUNDARY_FIELDS = new Set([
  "category_status_count_only",
  "raw_payload_redacted",
  "private_data_redacted",
  "raw_logs_redacted",
  "secret_redacted",
]);
const INTEGRATION_E2E_NO_SWEETENING_BOUNDARY_FIELDS = new Set([
  "real_residency_required_for_ready",
  "unconfirmed_runtime_blocks_ready",
  "fixture_pass_not_real_ready",
  "safe_status_only",
]);
const INTEGRATION_E2E_ROUTE_SWEEP_BOUNDARY_FIELDS = new Set([
  "runtime_admin_public_adapter_preflight_scanned",
  "forbidden_field_detection",
  "safe_counts_only",
  "raw_payload_redacted",
  "secret_redacted",
]);
const INTEGRATION_E2E_CANDIDATE_SHORTCUT_BOUNDARY_FIELDS = new Set([
  "execution_persistence_adapter_scanned",
  "candidate_shortcut_detection",
  "requires_validation_detection",
  "safe_counts_only",
  "raw_payload_redacted",
  "candidate_payload_redacted",
]);
const INTEGRATION_E2E_CANONICAL_FIREWALL_BOUNDARY_FIELDS = new Set([
  "internal_profile_canonical_detection",
  "domain_label_canonical_detection",
  "canonical_enum_firewall",
  "safe_counts_only",
  "raw_payload_redacted",
]);
const INTEGRATION_E2E_WORLD_COMMAND_SWEEP_BOUNDARY_FIELDS = new Set([
  "core_public_admin_diagnostic_scanned",
  "world_command_detection",
  "safe_counts_only",
  "raw_payload_redacted",
  "command_payload_redacted",
]);
const INTEGRATION_E2E_RAW_DATA_LEAK_SWEEP_BOUNDARY_FIELDS = new Set([
  "public_admin_diagnostic_scanned",
  "raw_comment_redacted",
  "raw_support_redacted",
  "raw_frame_redacted",
  "raw_audio_redacted",
  "raw_memory_redacted",
  "candidate_redacted",
  "raw_api_response_redacted",
  "safe_counts_only",
]);
const INTEGRATION_E2E_FORBIDDEN_ROUTE_FIELDS = new Set([
  "raw_payload",
  "rawPayload",
  "raw_comment",
  "rawComment",
  "raw_memory",
  "rawMemory",
  "secret",
  "token",
  "credential",
  "password",
  "command",
  "world_command",
  "worldCommand",
  "candidate",
  "private_data",
  "privateData",
]);
const INTEGRATION_E2E_CANDIDATE_SHORTCUT_FIELDS = new Set([
  "candidate",
  "candidate_kind",
  "candidateKind",
  "memory_candidate",
  "memoryCandidate",
  "relationship_update_candidate",
  "relationshipUpdateCandidate",
  "community_memory_candidate",
  "communityMemoryCandidate",
  "input_action_candidate",
  "inputActionCandidate",
]);
const INTEGRATION_E2E_RAW_DATA_LEAK_FIELDS = new Set([
  "raw_comment",
  "rawComment",
  "raw_support",
  "rawSupport",
  "raw_frame",
  "rawFrame",
  "raw_audio",
  "rawAudio",
  "raw_memory",
  "rawMemory",
  "candidate",
  "raw_candidate",
  "rawCandidate",
  "raw_api_response",
  "rawApiResponse",
  "api_response_body",
  "apiResponseBody",
]);
const INTEGRATION_E2E_CANONICAL_FIELDS = new Set([
  "intent",
  "action_type",
  "actionType",
  "task_type",
  "taskType",
  "conversation_state",
  "conversationState",
  "emotion",
  "canonical_emotion",
  "canonicalEmotion",
]);
const INTEGRATION_E2E_INTERNAL_PROFILE_FIELDS = new Set([
  "body_state",
  "bodyState",
  "laughter_state",
  "laughterState",
  "response_mode",
  "responseMode",
  "habit",
  "language_profile",
  "languageProfile",
  "speech_rate_profile",
  "speechRateProfile",
  "camera_profile",
  "cameraProfile",
  "internal_profile",
  "internalProfile",
  "domain_label",
  "domainLabel",
]);
const INTEGRATION_E2E_INTERNAL_PROFILE_VALUES = new Set([
  "burst_laugh",
  "wheeze_laugh",
  "silent_laugh",
  "body_state",
  "laughter_state",
  "response_mode",
  "habit",
  "language_profile",
  "speech_rate_profile",
  "camera_profile",
  "anime_canon",
  "stream_persona",
  "fan_memory",
  "community_lore",
  "non_canon_play",
]);
const UNSAFE_INTEGRATION_E2E_TEXT =
  /\b(raw[_-]?logs?|raw[_-]?payload|raw[_-]?comment|raw[_-]?support|raw[_-]?frame|raw[_-]?audio|raw[_-]?memory|raw[_-]?candidate|raw[_-]?api[_-]?response|api[_-]?response[_-]?body|secret|token|credential|password|command|endpoint|candidate|private[_-]?data)\s*[:=]|https?:\/\/|postgres:\/\//i;

const DEFAULT_FIXTURES = [
  ["runtime_trace_preservation", "runtime"],
  ["adapter_handoff_boundary", "adapter"],
  ["db_preflight_boundary", "db"],
  ["admin_surface_redaction", "admin"],
  ["voice_pipeline_boundary", "voice"],
  ["game_adapter_boundary", "game"],
  ["youtube_ingest_boundary", "youtube"],
  ["obs_overlay_boundary", "obs"],
];

export function createIntegrationE2EFixtureRegistry({ fixtures } = {}) {
  const source = Array.isArray(fixtures) ? fixtures : DEFAULT_FIXTURES;
  const safeFixtures = source.map((fixture) => {
    const [defaultId, defaultCategory] = Array.isArray(fixture) ? fixture : [];
    const fixtureId = safeFixtureLabel(fixture?.fixtureId ?? fixture?.id ?? defaultId);
    const category = safeFixtureCategory(fixture?.category ?? defaultCategory);
    return {
      fixture_id: fixtureId,
      category,
      status: safeFixtureStatus(fixture?.status),
      selector_label: `${category}.${fixtureId}`,
    };
  });
  const registry = {
    schema: INTEGRATION_E2E_FIXTURE_REGISTRY_SCHEMA,
    registry_status: "ready",
    fixture_count: safeFixtures.length,
    fixtures: safeFixtures,
    boundary_policy: Object.fromEntries(
      [...INTEGRATION_E2E_REGISTRY_BOUNDARY_FIELDS].map((field) => [field, true])
    ),
    adapter_validation_required: true,
  };
  assertIntegrationE2EFixtureRegistrySafe(registry);
  return registry;
}

export function selectIntegrationE2EFixtures(registry, { categories = [] } = {}) {
  assertIntegrationE2EFixtureRegistrySafe(registry);
  const requested = new Set(
    (Array.isArray(categories) ? categories : [])
      .map((category) => String(category ?? "").trim().toLowerCase())
      .filter((category) => INTEGRATION_E2E_CATEGORIES.has(category))
  );
  const fixtures =
    requested.size === 0
      ? registry.fixtures
      : registry.fixtures.filter((fixture) => requested.has(fixture.category));
  const selection = {
    schema: "iris_integration_e2e_fixture_selection_v1",
    selected_count: fixtures.length,
    fixtures,
    boundary_policy: Object.fromEntries(
      [...INTEGRATION_E2E_REGISTRY_BOUNDARY_FIELDS].map((field) => [field, true])
    ),
    adapter_validation_required: true,
  };
  assertIntegrationE2EFixtureSelectionSafe(selection);
  return selection;
}

export function assertIntegrationE2EFixtureRegistrySafe(
  registry,
  context = "integration E2E fixture registry"
) {
  if (!registry || typeof registry !== "object" || Array.isArray(registry)) {
    throw new ContractError(`${context}: registry required`);
  }
  if (registry.schema !== INTEGRATION_E2E_FIXTURE_REGISTRY_SCHEMA) {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(registry)) {
    if (!INTEGRATION_E2E_FIXTURE_REGISTRY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected registry field`);
    }
  }
  if (
    registry.registry_status !== "ready" ||
    !Array.isArray(registry.fixtures) ||
    registry.fixture_count !== registry.fixtures.length ||
    registry.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid registry`);
  }
  for (const fixture of registry.fixtures) assertIntegrationFixtureSafe(fixture, context);
  assertBoundaryPolicy(registry.boundary_policy, context);
  assertNoUnsafeText(registry, context);
}

export function assertIntegrationE2EFixtureSelectionSafe(
  selection,
  context = "integration E2E fixture selection"
) {
  if (!selection || typeof selection !== "object" || Array.isArray(selection)) {
    throw new ContractError(`${context}: selection required`);
  }
  if (selection.schema !== "iris_integration_e2e_fixture_selection_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(selection)) {
    if (!INTEGRATION_E2E_SELECTION_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected selection field`);
    }
  }
  if (
    !Array.isArray(selection.fixtures) ||
    selection.selected_count !== selection.fixtures.length ||
    selection.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid selection`);
  }
  for (const fixture of selection.fixtures) assertIntegrationFixtureSafe(fixture, context);
  assertBoundaryPolicy(selection.boundary_policy, context);
  assertNoUnsafeText(selection, context);
}

export function normalizeIntegrationE2EFixtureResult({
  fixtureId,
  category,
  status,
  reason,
} = {}) {
  const normalized = safeResultStatus(status);
  const result = {
    schema: "iris_integration_e2e_normalized_result_v1",
    fixture_id: safeFixtureLabel(fixtureId),
    category: safeFixtureCategory(category),
    normalized_status: normalized,
    safe_reason: safeResultReason(reason, normalized),
    boundary_policy: Object.fromEntries(
      [...INTEGRATION_E2E_RESULT_BOUNDARY_FIELDS].map((field) => [field, true])
    ),
    adapter_validation_required: true,
  };
  assertIntegrationE2ENormalizedResultSafe(result);
  return result;
}

export function assertIntegrationE2ENormalizedResultSafe(
  result,
  context = "integration E2E normalized result"
) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new ContractError(`${context}: result required`);
  }
  if (result.schema !== "iris_integration_e2e_normalized_result_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(result)) {
    if (!INTEGRATION_E2E_NORMALIZED_RESULT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected result field`);
    }
  }
  if (
    !isSafeFixtureLabel(result.fixture_id) ||
    !INTEGRATION_E2E_CATEGORIES.has(result.category) ||
    !INTEGRATION_E2E_RESULT_STATUSES.has(result.normalized_status) ||
    !INTEGRATION_E2E_SAFE_REASONS.has(result.safe_reason) ||
    result.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid result`);
  }
  assertResultBoundaryPolicy(result.boundary_policy, context);
  assertNoUnsafeText(result, context);
}

export function createIntegrationE2EOverallResult({ results = [] } = {}) {
  const safeResults = Array.isArray(results) ? results : [];
  for (const result of safeResults) {
    assertIntegrationE2ENormalizedResultSafe(result, "integration E2E overall result item");
  }
  const statusCounts = countResultStatuses(safeResults);
  const criticalBlockerCount =
    (statusCounts.fail ?? 0) + (statusCounts.blocked ?? 0);
  const overall = {
    schema: "iris_integration_e2e_overall_result_v1",
    overall_status:
      criticalBlockerCount > 0
        ? "blocked"
        : (statusCounts.attention ?? 0) > 0
          ? "attention"
          : "ready",
    critical_blocker_count: criticalBlockerCount,
    result_count: safeResults.length,
    status_counts: statusCounts,
    boundary_policy: Object.fromEntries(
      [...INTEGRATION_E2E_OVERALL_BOUNDARY_FIELDS].map((field) => [field, true])
    ),
    adapter_validation_required: true,
  };
  assertIntegrationE2EOverallResultSafe(overall);
  return overall;
}

export function assertIntegrationE2EOverallResultSafe(
  overall,
  context = "integration E2E overall result"
) {
  if (!overall || typeof overall !== "object" || Array.isArray(overall)) {
    throw new ContractError(`${context}: overall result required`);
  }
  if (overall.schema !== "iris_integration_e2e_overall_result_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(overall)) {
    if (!INTEGRATION_E2E_OVERALL_RESULT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected overall field`);
    }
  }
  if (
    !["ready", "attention", "blocked"].includes(overall.overall_status) ||
    !Number.isInteger(overall.critical_blocker_count) ||
    overall.critical_blocker_count < 0 ||
    !Number.isInteger(overall.result_count) ||
    overall.result_count < 0 ||
    overall.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid overall result`);
  }
  assertResultStatusCounts(overall.status_counts, context);
  const criticalBlockerCount =
    (overall.status_counts.fail ?? 0) + (overall.status_counts.blocked ?? 0);
  const resultCount = [...INTEGRATION_E2E_RESULT_STATUSES].reduce(
    (sum, status) => sum + (overall.status_counts[status] ?? 0),
    0
  );
  const expectedStatus =
    criticalBlockerCount > 0
      ? "blocked"
      : (overall.status_counts.attention ?? 0) > 0
        ? "attention"
        : "ready";
  if (
    overall.critical_blocker_count !== criticalBlockerCount ||
    overall.result_count !== resultCount ||
    overall.overall_status !== expectedStatus
  ) {
    throw new ContractError(`${context}: critical blocker priority violation`);
  }
  assertOverallBoundaryPolicy(overall.boundary_policy, context);
  assertNoUnsafeText(overall, context);
}

export function createIntegrationE2ECategorySummary({ results = [] } = {}) {
  const safeResults = Array.isArray(results) ? results : [];
  for (const result of safeResults) {
    assertIntegrationE2ENormalizedResultSafe(
      result,
      "integration E2E category summary item"
    );
  }
  const categories = [...INTEGRATION_E2E_CATEGORIES]
    .map((category) => {
      const categoryResults = safeResults.filter(
        (result) => result.category === category
      );
      if (categoryResults.length === 0) return null;
      const statusCounts = countResultStatuses(categoryResults);
      return {
        category,
        status: categoryStatusFromCounts(statusCounts),
        result_count: categoryResults.length,
        status_counts: statusCounts,
      };
    })
    .filter(Boolean);
  const summary = {
    schema: "iris_integration_e2e_category_summary_v1",
    category_count: categories.length,
    categories,
    boundary_policy: Object.fromEntries(
      [...INTEGRATION_E2E_CATEGORY_SUMMARY_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertIntegrationE2ECategorySummarySafe(summary);
  return summary;
}

export function assertIntegrationE2ECategorySummarySafe(
  summary,
  context = "integration E2E category summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary required`);
  }
  if (summary.schema !== "iris_integration_e2e_category_summary_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(summary)) {
    if (!INTEGRATION_E2E_CATEGORY_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected summary field`);
    }
  }
  if (
    !Array.isArray(summary.categories) ||
    summary.category_count !== summary.categories.length ||
    summary.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid category summary`);
  }
  for (const category of summary.categories) {
    assertCategoryStatusSafe(category, context);
  }
  assertCategorySummaryBoundaryPolicy(summary.boundary_policy, context);
  assertNoUnsafeText(summary, context);
}

export function createIntegrationE2ENoSweeteningRegression({
  realResidencyConfirmed = false,
  overallReadyAllowed,
} = {}) {
  const readyAllowed =
    typeof overallReadyAllowed === "boolean"
      ? overallReadyAllowed
      : realResidencyConfirmed === true;
  const fixture = {
    schema: "iris_integration_e2e_no_sweetening_regression_v1",
    fixture_label: "real_residency_unconfirmed",
    real_residency_confirmed: realResidencyConfirmed === true,
    overall_ready_allowed: readyAllowed,
    expected_status: realResidencyConfirmed === true ? "ready" : "blocked",
    boundary_policy: Object.fromEntries(
      [...INTEGRATION_E2E_NO_SWEETENING_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertIntegrationE2ENoSweeteningRegressionSafe(fixture);
  return fixture;
}

export function assertIntegrationE2ENoSweeteningRegressionSafe(
  fixture,
  context = "integration E2E no-sweetening regression"
) {
  if (!fixture || typeof fixture !== "object" || Array.isArray(fixture)) {
    throw new ContractError(`${context}: fixture required`);
  }
  if (fixture.schema !== "iris_integration_e2e_no_sweetening_regression_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(fixture)) {
    if (!INTEGRATION_E2E_NO_SWEETENING_REGRESSION_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture field`);
    }
  }
  if (
    fixture.fixture_label !== "real_residency_unconfirmed" ||
    typeof fixture.real_residency_confirmed !== "boolean" ||
    typeof fixture.overall_ready_allowed !== "boolean" ||
    !["ready", "blocked"].includes(fixture.expected_status) ||
    fixture.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid fixture`);
  }
  if (
    fixture.real_residency_confirmed !== true &&
    (fixture.overall_ready_allowed !== false || fixture.expected_status !== "blocked")
  ) {
    throw new ContractError(`${context}: readiness sweetening detected`);
  }
  if (
    fixture.real_residency_confirmed === true &&
    (fixture.overall_ready_allowed !== true || fixture.expected_status !== "ready")
  ) {
    throw new ContractError(`${context}: invalid confirmed readiness`);
  }
  assertNoSweeteningBoundaryPolicy(fixture.boundary_policy, context);
  assertNoUnsafeText(fixture, context);
}

export function createIntegrationE2ERouteContractSweep({ routes = [] } = {}) {
  const routeSummaries = (Array.isArray(routes) ? routes : []).map((route) => {
    const routeLabel = safeRouteLabel(route?.routeLabel ?? route?.label);
    const violationCount = countForbiddenRouteFields(route?.output ?? {});
    return {
      route_label: routeLabel,
      route_status: violationCount > 0 ? "fail" : "pass",
      violation_count: violationCount,
    };
  });
  const violationCount = routeSummaries.reduce(
    (sum, route) => sum + route.violation_count,
    0
  );
  const sweep = {
    schema: "iris_integration_e2e_route_contract_sweep_v1",
    route_count: routeSummaries.length,
    violation_count: violationCount,
    sweep_status: violationCount > 0 ? "fail" : "pass",
    route_summaries: routeSummaries,
    boundary_policy: Object.fromEntries(
      [...INTEGRATION_E2E_ROUTE_SWEEP_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertIntegrationE2ERouteContractSweepSafe(sweep);
  return sweep;
}

export function assertIntegrationE2ERouteContractSweepSafe(
  sweep,
  context = "integration E2E route contract sweep"
) {
  if (!sweep || typeof sweep !== "object" || Array.isArray(sweep)) {
    throw new ContractError(`${context}: sweep required`);
  }
  if (sweep.schema !== "iris_integration_e2e_route_contract_sweep_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(sweep)) {
    if (!INTEGRATION_E2E_ROUTE_CONTRACT_SWEEP_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected sweep field`);
    }
  }
  if (
    !Array.isArray(sweep.route_summaries) ||
    sweep.route_count !== sweep.route_summaries.length ||
    !["pass", "fail"].includes(sweep.sweep_status) ||
    !Number.isInteger(sweep.violation_count) ||
    sweep.violation_count < 0 ||
    sweep.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid sweep`);
  }
  const violationCount = sweep.route_summaries.reduce((sum, route) => {
    assertRouteSummarySafe(route, context);
    return sum + route.violation_count;
  }, 0);
  if (
    sweep.violation_count !== violationCount ||
    sweep.sweep_status !== (violationCount > 0 ? "fail" : "pass")
  ) {
    throw new ContractError(`${context}: route sweep mismatch`);
  }
  assertRouteSweepBoundaryPolicy(sweep.boundary_policy, context);
  assertNoUnsafeText(sweep, context);
}

export function createIntegrationE2ECandidateShortcutSweep({ targets = [] } = {}) {
  const targetSummaries = (Array.isArray(targets) ? targets : []).map((target) => {
    const targetLabel = safeShortcutTargetLabel(target?.targetLabel ?? target?.label);
    const violationCount = countCandidateShortcutViolations(target?.payload ?? {});
    return {
      target_label: targetLabel,
      target_status: violationCount > 0 ? "fail" : "pass",
      violation_count: violationCount,
    };
  });
  const violationCount = targetSummaries.reduce(
    (sum, target) => sum + target.violation_count,
    0
  );
  const sweep = {
    schema: "iris_integration_e2e_candidate_shortcut_sweep_v1",
    target_count: targetSummaries.length,
    violation_count: violationCount,
    sweep_status: violationCount > 0 ? "fail" : "pass",
    target_summaries: targetSummaries,
    boundary_policy: Object.fromEntries(
      [...INTEGRATION_E2E_CANDIDATE_SHORTCUT_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertIntegrationE2ECandidateShortcutSweepSafe(sweep);
  return sweep;
}

export function assertIntegrationE2ECandidateShortcutSweepSafe(
  sweep,
  context = "integration E2E candidate shortcut sweep"
) {
  if (!sweep || typeof sweep !== "object" || Array.isArray(sweep)) {
    throw new ContractError(`${context}: sweep required`);
  }
  if (sweep.schema !== "iris_integration_e2e_candidate_shortcut_sweep_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(sweep)) {
    if (!INTEGRATION_E2E_CANDIDATE_SHORTCUT_SWEEP_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected sweep field`);
    }
  }
  if (
    !Array.isArray(sweep.target_summaries) ||
    sweep.target_count !== sweep.target_summaries.length ||
    !["pass", "fail"].includes(sweep.sweep_status) ||
    !Number.isInteger(sweep.violation_count) ||
    sweep.violation_count < 0 ||
    sweep.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid sweep`);
  }
  const violationCount = sweep.target_summaries.reduce((sum, target) => {
    assertShortcutTargetSummarySafe(target, context);
    return sum + target.violation_count;
  }, 0);
  if (
    sweep.violation_count !== violationCount ||
    sweep.sweep_status !== (violationCount > 0 ? "fail" : "pass")
  ) {
    throw new ContractError(`${context}: candidate shortcut sweep mismatch`);
  }
  assertCandidateShortcutBoundaryPolicy(sweep.boundary_policy, context);
  assertNoUnsafeText(sweep, context);
}

export function createIntegrationE2ECanonicalFirewallSweep({ targets = [] } = {}) {
  const targetSummaries = (Array.isArray(targets) ? targets : []).map((target) => {
    const targetLabel = safeRouteLabel(target?.targetLabel ?? target?.label);
    const violationCount = countCanonicalFirewallViolations(target?.payload ?? {});
    return {
      route_label: targetLabel,
      route_status: violationCount > 0 ? "fail" : "pass",
      violation_count: violationCount,
    };
  });
  const violationCount = targetSummaries.reduce(
    (sum, target) => sum + target.violation_count,
    0
  );
  const sweep = {
    schema: "iris_integration_e2e_canonical_firewall_sweep_v1",
    target_count: targetSummaries.length,
    violation_count: violationCount,
    sweep_status: violationCount > 0 ? "fail" : "pass",
    target_summaries: targetSummaries,
    boundary_policy: Object.fromEntries(
      [...INTEGRATION_E2E_CANONICAL_FIREWALL_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertIntegrationE2ECanonicalFirewallSweepSafe(sweep);
  return sweep;
}

export function assertIntegrationE2ECanonicalFirewallSweepSafe(
  sweep,
  context = "integration E2E canonical firewall sweep"
) {
  if (!sweep || typeof sweep !== "object" || Array.isArray(sweep)) {
    throw new ContractError(`${context}: sweep required`);
  }
  if (sweep.schema !== "iris_integration_e2e_canonical_firewall_sweep_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(sweep)) {
    if (!INTEGRATION_E2E_CANONICAL_FIREWALL_SWEEP_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected sweep field`);
    }
  }
  if (
    !Array.isArray(sweep.target_summaries) ||
    sweep.target_count !== sweep.target_summaries.length ||
    !["pass", "fail"].includes(sweep.sweep_status) ||
    !Number.isInteger(sweep.violation_count) ||
    sweep.violation_count < 0 ||
    sweep.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid sweep`);
  }
  const violationCount = sweep.target_summaries.reduce((sum, target) => {
    assertRouteSummarySafe(target, context);
    return sum + target.violation_count;
  }, 0);
  if (
    sweep.violation_count !== violationCount ||
    sweep.sweep_status !== (violationCount > 0 ? "fail" : "pass")
  ) {
    throw new ContractError(`${context}: canonical firewall sweep mismatch`);
  }
  assertCanonicalFirewallBoundaryPolicy(sweep.boundary_policy, context);
  assertNoUnsafeText(sweep, context);
}

export function createIntegrationE2EWorldCommandSweep({ targets = [] } = {}) {
  const targetSummaries = (Array.isArray(targets) ? targets : []).map((target) => {
    const targetLabel = safeWorldCommandTargetLabel(target?.targetLabel ?? target?.label);
    const violationCount = countWorldCommandViolations(target?.payload ?? {});
    return {
      target_label: targetLabel,
      target_status: violationCount > 0 ? "fail" : "pass",
      violation_count: violationCount,
    };
  });
  const violationCount = targetSummaries.reduce(
    (sum, target) => sum + target.violation_count,
    0
  );
  const sweep = {
    schema: "iris_integration_e2e_world_command_sweep_v1",
    target_count: targetSummaries.length,
    violation_count: violationCount,
    sweep_status: violationCount > 0 ? "fail" : "pass",
    target_summaries: targetSummaries,
    boundary_policy: Object.fromEntries(
      [...INTEGRATION_E2E_WORLD_COMMAND_SWEEP_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertIntegrationE2EWorldCommandSweepSafe(sweep);
  return sweep;
}

export function assertIntegrationE2EWorldCommandSweepSafe(
  sweep,
  context = "integration E2E world command sweep"
) {
  if (!sweep || typeof sweep !== "object" || Array.isArray(sweep)) {
    throw new ContractError(`${context}: sweep required`);
  }
  if (sweep.schema !== "iris_integration_e2e_world_command_sweep_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(sweep)) {
    if (!INTEGRATION_E2E_WORLD_COMMAND_SWEEP_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected sweep field`);
    }
  }
  if (
    !Array.isArray(sweep.target_summaries) ||
    sweep.target_count !== sweep.target_summaries.length ||
    !["pass", "fail"].includes(sweep.sweep_status) ||
    !Number.isInteger(sweep.violation_count) ||
    sweep.violation_count < 0 ||
    sweep.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid sweep`);
  }
  const violationCount = sweep.target_summaries.reduce((sum, target) => {
    assertWorldCommandTargetSummarySafe(target, context);
    return sum + target.violation_count;
  }, 0);
  if (
    sweep.violation_count !== violationCount ||
    sweep.sweep_status !== (violationCount > 0 ? "fail" : "pass")
  ) {
    throw new ContractError(`${context}: world command sweep mismatch`);
  }
  assertWorldCommandSweepBoundaryPolicy(sweep.boundary_policy, context);
  assertNoUnsafeText(sweep, context);
}

export function createIntegrationE2ERawDataLeakSweep({ targets = [] } = {}) {
  const targetSummaries = (Array.isArray(targets) ? targets : []).map((target) => {
    const targetLabel = safeRawDataLeakTargetLabel(target?.targetLabel ?? target?.label);
    const violationCount = countRawDataLeakViolations(target?.payload ?? {});
    return {
      target_label: targetLabel,
      target_status: violationCount > 0 ? "fail" : "pass",
      violation_count: violationCount,
    };
  });
  const violationCount = targetSummaries.reduce(
    (sum, target) => sum + target.violation_count,
    0
  );
  const sweep = {
    schema: "iris_integration_e2e_raw_data_leak_sweep_v1",
    target_count: targetSummaries.length,
    violation_count: violationCount,
    sweep_status: violationCount > 0 ? "fail" : "pass",
    target_summaries: targetSummaries,
    boundary_policy: Object.fromEntries(
      [...INTEGRATION_E2E_RAW_DATA_LEAK_SWEEP_BOUNDARY_FIELDS].map((field) => [
        field,
        true,
      ])
    ),
    adapter_validation_required: true,
  };
  assertIntegrationE2ERawDataLeakSweepSafe(sweep);
  return sweep;
}

export function assertIntegrationE2ERawDataLeakSweepSafe(
  sweep,
  context = "integration E2E raw data leak sweep"
) {
  if (!sweep || typeof sweep !== "object" || Array.isArray(sweep)) {
    throw new ContractError(`${context}: sweep required`);
  }
  if (sweep.schema !== "iris_integration_e2e_raw_data_leak_sweep_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  for (const field of Object.keys(sweep)) {
    if (!INTEGRATION_E2E_RAW_DATA_LEAK_SWEEP_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected sweep field`);
    }
  }
  if (
    !Array.isArray(sweep.target_summaries) ||
    sweep.target_count !== sweep.target_summaries.length ||
    !["pass", "fail"].includes(sweep.sweep_status) ||
    !Number.isInteger(sweep.violation_count) ||
    sweep.violation_count < 0 ||
    sweep.adapter_validation_required !== true
  ) {
    throw new ContractError(`${context}: invalid sweep`);
  }
  const violationCount = sweep.target_summaries.reduce((sum, target) => {
    assertRawDataLeakTargetSummarySafe(target, context);
    return sum + target.violation_count;
  }, 0);
  if (
    sweep.violation_count !== violationCount ||
    sweep.sweep_status !== (violationCount > 0 ? "fail" : "pass")
  ) {
    throw new ContractError(`${context}: raw data leak sweep mismatch`);
  }
  assertRawDataLeakSweepBoundaryPolicy(sweep.boundary_policy, context);
  assertNoUnsafeText(sweep, context);
}

function assertIntegrationFixtureSafe(fixture, context) {
  if (!fixture || typeof fixture !== "object" || Array.isArray(fixture)) {
    throw new ContractError(`${context}: fixture required`);
  }
  for (const field of Object.keys(fixture)) {
    if (!INTEGRATION_E2E_FIXTURE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture field`);
    }
  }
  if (
    !isSafeFixtureLabel(fixture.fixture_id) ||
    !INTEGRATION_E2E_CATEGORIES.has(fixture.category) ||
    !INTEGRATION_E2E_FIXTURE_STATUSES.has(fixture.status) ||
    fixture.selector_label !== `${fixture.category}.${fixture.fixture_id}`
  ) {
    throw new ContractError(`${context}: invalid fixture`);
  }
}

function assertBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!INTEGRATION_E2E_REGISTRY_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of INTEGRATION_E2E_REGISTRY_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertResultBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!INTEGRATION_E2E_RESULT_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of INTEGRATION_E2E_RESULT_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertOverallBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!INTEGRATION_E2E_OVERALL_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of INTEGRATION_E2E_OVERALL_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertCategorySummaryBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!INTEGRATION_E2E_CATEGORY_SUMMARY_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of INTEGRATION_E2E_CATEGORY_SUMMARY_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertNoSweeteningBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!INTEGRATION_E2E_NO_SWEETENING_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of INTEGRATION_E2E_NO_SWEETENING_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertRouteSweepBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!INTEGRATION_E2E_ROUTE_SWEEP_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of INTEGRATION_E2E_ROUTE_SWEEP_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertCandidateShortcutBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!INTEGRATION_E2E_CANDIDATE_SHORTCUT_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of INTEGRATION_E2E_CANDIDATE_SHORTCUT_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertCanonicalFirewallBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!INTEGRATION_E2E_CANONICAL_FIREWALL_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of INTEGRATION_E2E_CANONICAL_FIREWALL_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertWorldCommandSweepBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!INTEGRATION_E2E_WORLD_COMMAND_SWEEP_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of INTEGRATION_E2E_WORLD_COMMAND_SWEEP_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertRawDataLeakSweepBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!INTEGRATION_E2E_RAW_DATA_LEAK_SWEEP_BOUNDARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of INTEGRATION_E2E_RAW_DATA_LEAK_SWEEP_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary required`);
    }
  }
}

function assertCategoryStatusSafe(category, context) {
  if (!category || typeof category !== "object" || Array.isArray(category)) {
    throw new ContractError(`${context}: category required`);
  }
  for (const field of Object.keys(category)) {
    if (!INTEGRATION_E2E_CATEGORY_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected category field`);
    }
  }
  if (
    !INTEGRATION_E2E_CATEGORIES.has(category.category) ||
    !["ready", "attention", "blocked"].includes(category.status) ||
    !Number.isInteger(category.result_count) ||
    category.result_count < 1
  ) {
    throw new ContractError(`${context}: invalid category`);
  }
  assertResultStatusCounts(category.status_counts, context);
  const resultCount = [...INTEGRATION_E2E_RESULT_STATUSES].reduce(
    (sum, status) => sum + (category.status_counts[status] ?? 0),
    0
  );
  if (
    category.result_count !== resultCount ||
    category.status !== categoryStatusFromCounts(category.status_counts)
  ) {
    throw new ContractError(`${context}: invalid category status`);
  }
}

function assertRouteSummarySafe(route, context) {
  if (!route || typeof route !== "object" || Array.isArray(route)) {
    throw new ContractError(`${context}: route summary required`);
  }
  for (const field of Object.keys(route)) {
    if (!INTEGRATION_E2E_ROUTE_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected route summary field`);
    }
  }
  if (
    !INTEGRATION_E2E_ROUTE_LABELS.has(route.route_label) ||
    !["pass", "fail"].includes(route.route_status) ||
    !Number.isInteger(route.violation_count) ||
    route.violation_count < 0 ||
    route.route_status !== (route.violation_count > 0 ? "fail" : "pass")
  ) {
    throw new ContractError(`${context}: invalid route summary`);
  }
}

function assertShortcutTargetSummarySafe(target, context) {
  if (!target || typeof target !== "object" || Array.isArray(target)) {
    throw new ContractError(`${context}: target summary required`);
  }
  for (const field of Object.keys(target)) {
    if (!INTEGRATION_E2E_TARGET_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected target summary field`);
    }
  }
  if (
    !INTEGRATION_E2E_SHORTCUT_TARGETS.has(target.target_label) ||
    !["pass", "fail"].includes(target.target_status) ||
    !Number.isInteger(target.violation_count) ||
    target.violation_count < 0 ||
    target.target_status !== (target.violation_count > 0 ? "fail" : "pass")
  ) {
    throw new ContractError(`${context}: invalid target summary`);
  }
}

function assertWorldCommandTargetSummarySafe(target, context) {
  if (!target || typeof target !== "object" || Array.isArray(target)) {
    throw new ContractError(`${context}: target summary required`);
  }
  for (const field of Object.keys(target)) {
    if (!INTEGRATION_E2E_TARGET_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected target summary field`);
    }
  }
  if (
    !INTEGRATION_E2E_WORLD_COMMAND_TARGETS.has(target.target_label) ||
    !["pass", "fail"].includes(target.target_status) ||
    !Number.isInteger(target.violation_count) ||
    target.violation_count < 0 ||
    target.target_status !== (target.violation_count > 0 ? "fail" : "pass")
  ) {
    throw new ContractError(`${context}: invalid target summary`);
  }
}

function assertRawDataLeakTargetSummarySafe(target, context) {
  if (!target || typeof target !== "object" || Array.isArray(target)) {
    throw new ContractError(`${context}: target summary required`);
  }
  for (const field of Object.keys(target)) {
    if (!INTEGRATION_E2E_TARGET_SUMMARY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected target summary field`);
    }
  }
  if (
    !INTEGRATION_E2E_RAW_DATA_LEAK_TARGETS.has(target.target_label) ||
    !["pass", "fail"].includes(target.target_status) ||
    !Number.isInteger(target.violation_count) ||
    target.violation_count < 0 ||
    target.target_status !== (target.violation_count > 0 ? "fail" : "pass")
  ) {
    throw new ContractError(`${context}: invalid target summary`);
  }
}

function safeFixtureCategory(category) {
  const value = String(category ?? "").trim().toLowerCase();
  return INTEGRATION_E2E_CATEGORIES.has(value) ? value : "runtime";
}

function safeFixtureStatus(status) {
  const value = String(status ?? "").trim().toLowerCase();
  return INTEGRATION_E2E_FIXTURE_STATUSES.has(value) ? value : "ready";
}

function safeResultStatus(status) {
  const value = String(status ?? "").trim().toLowerCase();
  return INTEGRATION_E2E_RESULT_STATUSES.has(value) ? value : "fail";
}

function safeResultReason(reason, normalizedStatus) {
  const value = String(reason ?? "").trim().toLowerCase();
  if (INTEGRATION_E2E_SAFE_REASONS.has(value)) return value;
  if (normalizedStatus === "pass") return "fixture_passed";
  if (normalizedStatus === "blocked") return "runtime_blocked";
  if (normalizedStatus === "attention") return "operator_attention";
  return "fixture_failed";
}

function countResultStatuses(results) {
  return results.reduce((counts, result) => {
    counts[result.normalized_status] = (counts[result.normalized_status] ?? 0) + 1;
    return counts;
  }, {});
}

function categoryStatusFromCounts(statusCounts) {
  if ((statusCounts.fail ?? 0) + (statusCounts.blocked ?? 0) > 0) {
    return "blocked";
  }
  if ((statusCounts.attention ?? 0) > 0) return "attention";
  return "ready";
}

function assertResultStatusCounts(counts, context) {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) {
    throw new ContractError(`${context}: status counts required`);
  }
  for (const [status, count] of Object.entries(counts)) {
    if (
      !INTEGRATION_E2E_RESULT_STATUSES.has(status) ||
      !Number.isInteger(count) ||
      count < 0
    ) {
      throw new ContractError(`${context}: invalid status counts`);
    }
  }
}

function safeFixtureLabel(label) {
  const value = String(label ?? "").trim();
  return isSafeFixtureLabel(value) ? value : "fixture";
}

function safeRouteLabel(label) {
  const value = String(label ?? "").trim().toLowerCase();
  return INTEGRATION_E2E_ROUTE_LABELS.has(value) ? value : "runtime";
}

function safeShortcutTargetLabel(label) {
  const value = String(label ?? "").trim().toLowerCase();
  return INTEGRATION_E2E_SHORTCUT_TARGETS.has(value) ? value : "execution";
}

function safeWorldCommandTargetLabel(label) {
  const value = String(label ?? "").trim().toLowerCase();
  return INTEGRATION_E2E_WORLD_COMMAND_TARGETS.has(value) ? value : "core";
}

function safeRawDataLeakTargetLabel(label) {
  const value = String(label ?? "").trim().toLowerCase();
  return INTEGRATION_E2E_RAW_DATA_LEAK_TARGETS.has(value) ? value : "public";
}

function countForbiddenRouteFields(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object") return 0;
  if (seen.has(value)) return 0;
  seen.add(value);
  return Object.entries(value).reduce((count, [key, child]) => {
    const self = INTEGRATION_E2E_FORBIDDEN_ROUTE_FIELDS.has(key) ? 1 : 0;
    return count + self + countForbiddenRouteFields(child, seen);
  }, 0);
}

function countCandidateShortcutViolations(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object") return 0;
  if (seen.has(value)) return 0;
  seen.add(value);
  return Object.entries(value).reduce((count, [key, child]) => {
    const self =
      INTEGRATION_E2E_CANDIDATE_SHORTCUT_FIELDS.has(key) ||
      (key === "requires_validation" && child === true) ||
      (key === "requiresValidation" && child === true)
        ? 1
        : 0;
    return count + self + countCandidateShortcutViolations(child, seen);
  }, 0);
}

function countCanonicalFirewallViolations(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object") return 0;
  if (seen.has(value)) return 0;
  seen.add(value);
  return Object.entries(value).reduce((count, [key, child]) => {
    const canonicalPollution =
      INTEGRATION_E2E_CANONICAL_FIELDS.has(key) &&
      containsInternalProfileMaterial(child);
    const internalProfileKeyInCanonical =
      INTEGRATION_E2E_CANONICAL_FIELDS.has(key) &&
      child &&
      typeof child === "object" &&
      Object.keys(child).some((childKey) =>
        INTEGRATION_E2E_INTERNAL_PROFILE_FIELDS.has(childKey)
      );
    const self = canonicalPollution || internalProfileKeyInCanonical ? 1 : 0;
    return count + self + countCanonicalFirewallViolations(child, seen);
  }, 0);
}

function containsInternalProfileMaterial(value) {
  if (typeof value === "string") {
    return INTEGRATION_E2E_INTERNAL_PROFILE_VALUES.has(value);
  }
  if (Array.isArray(value)) {
    return value.some((item) => containsInternalProfileMaterial(item));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).some(
      ([key, child]) =>
        INTEGRATION_E2E_INTERNAL_PROFILE_FIELDS.has(key) ||
        containsInternalProfileMaterial(child)
    );
  }
  return false;
}

function countWorldCommandViolations(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object") return 0;
  if (seen.has(value)) return 0;
  seen.add(value);
  return Object.entries(value).reduce((count, [key, child]) => {
    const self = key === "world_command" || key === "worldCommand" ? 1 : 0;
    return count + self + countWorldCommandViolations(child, seen);
  }, 0);
}

function countRawDataLeakViolations(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object") return 0;
  if (seen.has(value)) return 0;
  seen.add(value);
  return Object.entries(value).reduce((count, [key, child]) => {
    const self = INTEGRATION_E2E_RAW_DATA_LEAK_FIELDS.has(key) ? 1 : 0;
    return count + self + countRawDataLeakViolations(child, seen);
  }, 0);
}

function isSafeFixtureLabel(label) {
  return (
    typeof label === "string" &&
    label.length > 0 &&
    label.length <= 80 &&
    /^[A-Za-z0-9_.-]+$/.test(label) &&
    !UNSAFE_INTEGRATION_E2E_TEXT.test(label)
  );
}

function assertNoUnsafeText(value, context) {
  if (UNSAFE_INTEGRATION_E2E_TEXT.test(JSON.stringify(value))) {
    throw new ContractError(`${context}: unsafe fixture registry material`);
  }
}
