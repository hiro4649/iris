import { ContractError } from "../../core/contracts.js";
import {
  createAdminDashboard,
  createAdminGlobalDashboardSafeSummary,
} from "./adminDashboard.js";
import {
  assertAdminBackupExportRedactionSafe,
  createAdminBackupExportRedaction,
} from "./adminBackupExport.js";
import {
  assertAdminCandidateReviewCountSurfaceSafe,
  createAdminCandidateReviewCountSurface,
} from "./adminReviewQueue.js";
import {
  assertAdminAuditTrailSafeEntry,
  createAdminAuditTrailSafeEntry,
  createOperatorPolicyAuditEntry,
} from "../persistence/operatorPolicyAuditLog.js";
import {
  assertAdapterPreflightAdminPageSummarySafe,
  createAdapterPreflightAdminPageSummary,
} from "./adapterPreflightContractRegistry.js";
import {
  assertDbPreflightAdminPageSummarySafe,
  createDbPreflightAdminPageSummary,
} from "./postgresAdminSavePreflight.js";
import {
  assertGameControlPreflightAdminPageSummarySafe,
  createGameControlPreflightAdminPageSummary,
} from "./gameplayPreflight.js";
import {
  assertProductionBlockerAggregationAdminPageSafe,
  assertProductionPreflightAdminPageSummarySafe,
  createProductionBlockerAggregationAdminPage,
  createProductionPreflightAdminPageSummary,
} from "./productionLiveReadiness.js";
import {
  assertVoiceSubtitlePreflightAdminPageSummarySafe,
  createVoiceSubtitlePreflightAdminPageSummary,
} from "./adminCharacterVoiceSettings.js";
import {
  assertYouTubeIngestPreflightAdminPageSummarySafe,
  createYouTubeIngestPreflightAdminPageSummary,
} from "./youtubeIngestSourceStatus.js";
import {
  assertObsOverlayPreflightAdminPageSummarySafe,
  createObsOverlayPreflightAdminPageSummary,
} from "../../server/obsOverlayConfig.js";
import { renderDebugPage } from "../../server/debugPage.js";

const ADMIN_PREFLIGHT_REGRESSION_PACK_FIELDS = new Set([
  "schema",
  "pack_status",
  "fixture_count",
  "pass_count",
  "fixture_results",
  "boundary_policy",
]);
const ADMIN_PREFLIGHT_REGRESSION_FIXTURE_FIELDS = new Set([
  "schema",
  "fixture_id",
  "validation_status",
]);
const ADMIN_ROUTE_SAFE_OUTPUT_SCANNER_FIELDS = new Set([
  "schema",
  "scan_status",
  "route_count",
  "safe_route_labels",
  "violation_count",
  "violating_route_labels",
  "boundary_policy",
]);
const ADMIN_E2E_REGRESSION_PACK_FIELDS = new Set([
  "schema",
  "pack_status",
  "fixture_count",
  "pass_count",
  "fixture_results",
  "scanner_status",
  "scanner_route_count",
  "scanner_violation_count",
  "boundary_policy",
]);
const ADMIN_PREFLIGHT_FIXTURE_IDS = [
  "db_preflight_admin_page",
  "adapter_preflight_admin_page",
  "game_control_preflight_admin_page",
  "voice_subtitle_preflight_admin_page",
  "youtube_ingest_preflight_admin_page",
  "obs_overlay_preflight_admin_page",
  "admin_production_preflight_page",
  "admin_blocker_aggregation_page",
];
const ADMIN_E2E_FIXTURE_IDS = [
  "admin_dashboard_fixture",
  "admin_debug_fixture",
  "admin_backup_fixture",
  "admin_audit_fixture",
  "admin_candidate_fixture",
  "admin_preflight_fixture",
];
const FORBIDDEN_ADMIN_PREFLIGHT_REGRESSION_FIELDS = new Set([
  "raw_error",
  "rawError",
  "raw_job",
  "rawJob",
  "raw_payload",
  "rawPayload",
  "raw_comment",
  "rawComment",
  "raw_comments",
  "rawComments",
  "raw_memory",
  "rawMemory",
  "raw_diagnostics",
  "rawDiagnostics",
  "raw_response",
  "rawResponse",
  "endpoint",
  "url",
  "token",
  "secret",
  "password",
  "payload",
  "candidate",
  "candidate_payload",
  "candidatePayload",
  "world_command",
  "worldCommand",
  "input_action_candidate",
  "approved_game_input_action",
  "command",
]);
const ADMIN_ROUTE_SAFE_OUTPUT_SCANNER_BOUNDARY_FIELDS = [
  "admin_dev_debug_preflight_routes_scanned",
  "safe_route_labels_only",
  "counts_only",
  "raw_outputs_excluded",
  "forbidden_values_excluded",
  "no_raw_diagnostics",
  "no_raw_jobs",
  "no_raw_payloads",
  "no_raw_comments",
  "no_raw_memories",
  "no_endpoint_values",
  "no_secret_values",
  "no_candidates",
  "no_commands",
];
const ADMIN_E2E_REGRESSION_PACK_BOUNDARY_FIELDS = [
  "dashboard_debug_backup_audit_candidate_preflight_only",
  "fixture_ids_and_validation_status_only",
  "scanner_summary_only",
  "raw_outputs_excluded",
  "no_raw_diagnostics",
  "no_raw_jobs",
  "no_raw_payloads",
  "no_raw_comments",
  "no_raw_memories",
  "no_endpoint_values",
  "no_secret_values",
  "no_candidates",
  "no_commands",
];

export function createAdminPreflightFixtureRegressionPack() {
  assertDbPreflightAdminPageSummarySafe(createDbPreflightAdminPageSummary());
  assertAdapterPreflightAdminPageSummarySafe(
    createAdapterPreflightAdminPageSummary()
  );
  assertGameControlPreflightAdminPageSummarySafe(
    createGameControlPreflightAdminPageSummary()
  );
  assertVoiceSubtitlePreflightAdminPageSummarySafe(
    createVoiceSubtitlePreflightAdminPageSummary()
  );
  assertYouTubeIngestPreflightAdminPageSummarySafe(
    createYouTubeIngestPreflightAdminPageSummary()
  );
  assertObsOverlayPreflightAdminPageSummarySafe(
    createObsOverlayPreflightAdminPageSummary()
  );
  assertProductionPreflightAdminPageSummarySafe(
    createProductionPreflightAdminPageSummary()
  );
  assertProductionBlockerAggregationAdminPageSafe(
    createProductionBlockerAggregationAdminPage({
      blockers: ["worker_missing", "db_missing"],
    })
  );

  const fixtureResults = ADMIN_PREFLIGHT_FIXTURE_IDS.map((fixtureId) => ({
    schema: "iris_admin_preflight_regression_fixture_result_v1",
    fixture_id: fixtureId,
    validation_status: "pass",
  }));
  const pack = {
    schema: "iris_admin_preflight_fixture_regression_pack_v1",
    pack_status: "pass",
    fixture_count: fixtureResults.length,
    pass_count: fixtureResults.length,
    fixture_results: fixtureResults,
    boundary_policy: {
      fixture_ids_and_validation_status_only: true,
      no_raw_diagnostics: true,
      no_raw_error_values: true,
      no_raw_job_values: true,
      no_raw_payload_values: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_commands: true,
    },
  };
  assertAdminPreflightFixtureRegressionPackSafe(pack);
  return pack;
}

export function assertAdminPreflightFixtureRegressionPackSafe(
  pack,
  context = "admin preflight fixture regression pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: pack required`);
  }
  assertNoForbiddenAdminPreflightRegressionFields(pack, context);
  for (const field of Object.keys(pack)) {
    if (!ADMIN_PREFLIGHT_REGRESSION_PACK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected pack field`);
    }
  }
  if (pack.schema !== "iris_admin_preflight_fixture_regression_pack_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (pack.pack_status !== "pass") {
    throw new ContractError(`${context}: invalid pack status`);
  }
  if (!Array.isArray(pack.fixture_results)) {
    throw new ContractError(`${context}: fixture results required`);
  }
  const ids = pack.fixture_results.map((fixture) => fixture.fixture_id);
  if (JSON.stringify(ids) !== JSON.stringify(ADMIN_PREFLIGHT_FIXTURE_IDS)) {
    throw new ContractError(`${context}: fixture ids mismatch`);
  }
  for (const fixture of pack.fixture_results) {
    assertAdminPreflightRegressionFixtureSafe(fixture, context);
  }
  if (
    pack.fixture_count !== pack.fixture_results.length ||
    pack.pass_count !== pack.fixture_results.length
  ) {
    throw new ContractError(`${context}: fixture count mismatch`);
  }
  assertAdminPreflightRegressionBoundaryPolicy(pack.boundary_policy, context);
}

export function createAdminRouteSafeOutputScanner({ routeOutputs = [] } = {}) {
  if (!Array.isArray(routeOutputs)) {
    throw new ContractError("admin route safe output scanner: routes required");
  }
  const scannedRoutes = routeOutputs.map((route, index) => {
    const routeLabel = safeAdminRouteLabel(
      route?.route_id ?? route?.routeId ?? route?.label ?? `route_${index + 1}`
    );
    const output =
      route && typeof route === "object" && "output" in route
        ? route.output
        : route;
    return {
      routeLabel,
      hasViolation: hasForbiddenAdminRouteOutput(output),
    };
  });
  const violatingRouteLabels = scannedRoutes
    .filter((route) => route.hasViolation)
    .map((route) => route.routeLabel);
  const scanner = {
    schema: "iris_admin_route_safe_output_scanner_v1",
    scan_status: violatingRouteLabels.length > 0 ? "fail" : "pass",
    route_count: scannedRoutes.length,
    safe_route_labels: scannedRoutes.map((route) => route.routeLabel),
    violation_count: violatingRouteLabels.length,
    violating_route_labels: violatingRouteLabels,
    boundary_policy: Object.fromEntries(
      ADMIN_ROUTE_SAFE_OUTPUT_SCANNER_BOUNDARY_FIELDS.map((field) => [
        field,
        true,
      ])
    ),
  };
  assertAdminRouteSafeOutputScannerSafe(scanner);
  return scanner;
}

export function assertAdminRouteSafeOutputScannerSafe(
  scanner,
  context = "admin route safe output scanner"
) {
  if (!scanner || typeof scanner !== "object" || Array.isArray(scanner)) {
    throw new ContractError(`${context}: scanner required`);
  }
  assertNoForbiddenAdminPreflightRegressionFields(scanner, context);
  for (const field of Object.keys(scanner)) {
    if (!ADMIN_ROUTE_SAFE_OUTPUT_SCANNER_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected scanner field`);
    }
  }
  if (scanner.schema !== "iris_admin_route_safe_output_scanner_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (!["pass", "fail"].includes(scanner.scan_status)) {
    throw new ContractError(`${context}: invalid scan status`);
  }
  if (
    !Array.isArray(scanner.safe_route_labels) ||
    !Array.isArray(scanner.violating_route_labels)
  ) {
    throw new ContractError(`${context}: route labels required`);
  }
  if (
    !Number.isInteger(scanner.route_count) ||
    scanner.route_count !== scanner.safe_route_labels.length ||
    !Number.isInteger(scanner.violation_count) ||
    scanner.violation_count !== scanner.violating_route_labels.length ||
    scanner.violation_count > scanner.route_count
  ) {
    throw new ContractError(`${context}: scan count mismatch`);
  }
  if (
    scanner.safe_route_labels.some((label) => !isSafeAdminRouteLabel(label)) ||
    scanner.violating_route_labels.some(
      (label) =>
        !isSafeAdminRouteLabel(label) ||
        !scanner.safe_route_labels.includes(label)
    )
  ) {
    throw new ContractError(`${context}: unsafe route label`);
  }
  if (
    (scanner.scan_status === "pass" && scanner.violation_count !== 0) ||
    (scanner.scan_status === "fail" && scanner.violation_count < 1)
  ) {
    throw new ContractError(`${context}: scan status mismatch`);
  }
  assertAdminRouteSafeOutputScannerBoundaryPolicy(
    scanner.boundary_policy,
    context
  );
}

export async function createAdminE2EFixtureRegressionPack({
  generatedAtMs = 1,
} = {}) {
  const dashboard = await createAdminDashboard({ generatedAtMs });
  const dashboardSummary = createAdminGlobalDashboardSafeSummary(dashboard);
  const backupSummary = createAdminBackupExportRedaction({
    backup: {
      item_count: 1,
      secret: "redacted-before-summary",
      raw_payload: "redacted-before-summary",
    },
  });
  assertAdminBackupExportRedactionSafe(backupSummary);
  const auditEntry = createOperatorPolicyAuditEntry({
    eventId: "admin_e2e_audit_event",
    settingId: "admin_e2e_setting",
    settingGroup: "admin",
    policyDigest: "sha256:abcdef123456",
    decision: "validated",
    actorRole: "operator",
    ownerConfirmed: true,
    eventAtMs: generatedAtMs,
  });
  const auditSummary = createAdminAuditTrailSafeEntry(auditEntry);
  assertAdminAuditTrailSafeEntry(auditSummary);
  const candidateSummary = createAdminCandidateReviewCountSurface({
    reviewItems: [],
    generatedAtMs,
  });
  assertAdminCandidateReviewCountSurfaceSafe(candidateSummary);
  const preflightPack = createAdminPreflightFixtureRegressionPack();
  assertAdminPreflightFixtureRegressionPackSafe(preflightPack);
  const scanner = createAdminRouteSafeOutputScanner({
    routeOutputs: [
      { route_id: "admin_dashboard", output: dashboardSummary },
      { route_id: "admin_debug", output: { html: renderDebugPage() } },
      { route_id: "admin_backup", output: backupSummary },
      { route_id: "admin_audit", output: auditSummary },
      { route_id: "admin_candidate", output: candidateSummary },
      { route_id: "admin_preflight", output: preflightPack },
    ],
  });
  if (scanner.scan_status !== "pass") {
    throw new ContractError("admin E2E fixture regression pack: scanner failed");
  }
  const fixtureResults = ADMIN_E2E_FIXTURE_IDS.map((fixtureId) => ({
    schema: "iris_admin_preflight_regression_fixture_result_v1",
    fixture_id: fixtureId,
    validation_status: "pass",
  }));
  const pack = {
    schema: "iris_admin_e2e_fixture_regression_pack_v1",
    pack_status: "pass",
    fixture_count: fixtureResults.length,
    pass_count: fixtureResults.length,
    fixture_results: fixtureResults,
    scanner_status: scanner.scan_status,
    scanner_route_count: scanner.route_count,
    scanner_violation_count: scanner.violation_count,
    boundary_policy: Object.fromEntries(
      ADMIN_E2E_REGRESSION_PACK_BOUNDARY_FIELDS.map((field) => [field, true])
    ),
  };
  assertAdminE2EFixtureRegressionPackSafe(pack);
  return pack;
}

export function assertAdminE2EFixtureRegressionPackSafe(
  pack,
  context = "admin E2E fixture regression pack"
) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new ContractError(`${context}: pack required`);
  }
  assertNoForbiddenAdminPreflightRegressionFields(pack, context);
  for (const field of Object.keys(pack)) {
    if (!ADMIN_E2E_REGRESSION_PACK_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected pack field`);
    }
  }
  if (pack.schema !== "iris_admin_e2e_fixture_regression_pack_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  if (
    pack.pack_status !== "pass" ||
    pack.scanner_status !== "pass" ||
    pack.scanner_violation_count !== 0
  ) {
    throw new ContractError(`${context}: invalid pack status`);
  }
  if (!Array.isArray(pack.fixture_results)) {
    throw new ContractError(`${context}: fixture results required`);
  }
  const ids = pack.fixture_results.map((fixture) => fixture.fixture_id);
  if (JSON.stringify(ids) !== JSON.stringify(ADMIN_E2E_FIXTURE_IDS)) {
    throw new ContractError(`${context}: fixture ids mismatch`);
  }
  for (const fixture of pack.fixture_results) {
    assertAdminE2ERegressionFixtureSafe(fixture, context);
  }
  if (
    pack.fixture_count !== pack.fixture_results.length ||
    pack.pass_count !== pack.fixture_results.length ||
    pack.scanner_route_count !== pack.fixture_results.length
  ) {
    throw new ContractError(`${context}: fixture count mismatch`);
  }
  assertAdminE2ERegressionBoundaryPolicy(pack.boundary_policy, context);
}

function assertAdminPreflightRegressionFixtureSafe(fixture, context) {
  if (!fixture || typeof fixture !== "object" || Array.isArray(fixture)) {
    throw new ContractError(`${context}: fixture result required`);
  }
  for (const field of Object.keys(fixture)) {
    if (!ADMIN_PREFLIGHT_REGRESSION_FIXTURE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture field`);
    }
  }
  if (
    fixture.schema !== "iris_admin_preflight_regression_fixture_result_v1" ||
    !ADMIN_PREFLIGHT_FIXTURE_IDS.includes(fixture.fixture_id) ||
    fixture.validation_status !== "pass"
  ) {
    throw new ContractError(`${context}: invalid fixture result`);
  }
}

function assertAdminE2ERegressionFixtureSafe(fixture, context) {
  if (!fixture || typeof fixture !== "object" || Array.isArray(fixture)) {
    throw new ContractError(`${context}: fixture result required`);
  }
  for (const field of Object.keys(fixture)) {
    if (!ADMIN_PREFLIGHT_REGRESSION_FIXTURE_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected fixture field`);
    }
  }
  if (
    fixture.schema !== "iris_admin_preflight_regression_fixture_result_v1" ||
    !ADMIN_E2E_FIXTURE_IDS.includes(fixture.fixture_id) ||
    fixture.validation_status !== "pass"
  ) {
    throw new ContractError(`${context}: invalid fixture result`);
  }
}

function assertAdminPreflightRegressionBoundaryPolicy(policy, context) {
  const requiredFields = [
    "fixture_ids_and_validation_status_only",
    "no_raw_diagnostics",
    "no_raw_error_values",
    "no_raw_job_values",
    "no_raw_payload_values",
    "no_endpoint_values",
    "no_secret_values",
    "no_commands",
  ];
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!requiredFields.includes(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of requiredFields) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary field required`);
    }
  }
}

function assertAdminRouteSafeOutputScannerBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!ADMIN_ROUTE_SAFE_OUTPUT_SCANNER_BOUNDARY_FIELDS.includes(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of ADMIN_ROUTE_SAFE_OUTPUT_SCANNER_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary field required`);
    }
  }
}

function assertAdminE2ERegressionBoundaryPolicy(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy required`);
  }
  for (const field of Object.keys(policy)) {
    if (!ADMIN_E2E_REGRESSION_PACK_BOUNDARY_FIELDS.includes(field)) {
      throw new ContractError(`${context}: unexpected boundary field`);
    }
  }
  for (const field of ADMIN_E2E_REGRESSION_PACK_BOUNDARY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: boundary field required`);
    }
  }
}

function hasForbiddenAdminRouteOutput(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) {
    return value.some((item) => hasForbiddenAdminRouteOutput(item));
  }
  for (const [field, child] of Object.entries(value)) {
    if (
      FORBIDDEN_ADMIN_PREFLIGHT_REGRESSION_FIELDS.has(field) ||
      hasForbiddenAdminRouteOutput(child)
    ) {
      return true;
    }
  }
  return false;
}

function safeAdminRouteLabel(value) {
  const normalized = String(value ?? "admin_route")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
  return isSafeAdminRouteLabel(normalized) ? normalized : "admin_route";
}

function isSafeAdminRouteLabel(value) {
  return (
    typeof value === "string" &&
    /^[a-z0-9_]{1,80}$/.test(value) &&
    !/(^|_)(secret|token|endpoint|url|raw|payload|candidate|command|world_command)($|_)/i.test(
      value
    )
  );
}

function assertNoForbiddenAdminPreflightRegressionFields(
  value,
  context,
  path = "root"
) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenAdminPreflightRegressionFields(
        item,
        context,
        `${path}[${index}]`
      )
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (
      !path.endsWith(".boundary_policy") &&
      FORBIDDEN_ADMIN_PREFLIGHT_REGRESSION_FIELDS.has(field)
    ) {
      throw new ContractError(`${context}: forbidden field`, { path, field });
    }
    assertNoForbiddenAdminPreflightRegressionFields(
      child,
      context,
      `${path}.${field}`
    );
  }
}
