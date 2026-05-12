import { ContractError } from "../../core/contracts.js";
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
const FORBIDDEN_ADMIN_PREFLIGHT_REGRESSION_FIELDS = new Set([
  "raw_error",
  "rawError",
  "raw_job",
  "rawJob",
  "raw_payload",
  "rawPayload",
  "raw_diagnostics",
  "rawDiagnostics",
  "endpoint",
  "url",
  "token",
  "secret",
  "password",
  "payload",
  "command",
]);

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
