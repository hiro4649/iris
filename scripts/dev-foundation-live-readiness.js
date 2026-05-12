import {
  assertFoundationLiveReadinessReportSafe,
  createFoundationLiveReadinessReport,
} from "../src/services/dev/foundationLiveReadiness.js";

const FOUNDATION_LIVE_READINESS_CLI_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "foundation_live_readiness",
  "boundary_policy",
]);
const FOUNDATION_LIVE_READINESS_CLI_BOUNDARY_FIELDS = [
  "env_names_only",
  "no_secret_values",
  "no_endpoint_values",
  "no_live_payloads",
  "no_text_payloads",
  "no_artifact_paths",
  "no_candidates",
  "no_commands",
  "read_only_cli",
  "synthetic_fixture_post_only",
];

const probeMode = process.argv.includes("--fixture-post") ? "fixture_post" : "dry_run";
const report = await createFoundationLiveReadinessReport({ probeMode });
assertFoundationLiveReadinessReportSafe(report, "foundation live readiness CLI");

const cliReport = {
  ok:
    report.live_readiness_status === "ready_for_live_obs_operation" ||
    probeMode === "dry_run",
  schema: "iris_foundation_live_readiness_cli_v1",
  foundation_live_readiness: report,
  boundary_policy: {
    env_names_only: true,
    no_secret_values: true,
    no_endpoint_values: true,
    no_live_payloads: true,
    no_text_payloads: true,
    no_artifact_paths: true,
    no_candidates: true,
    no_commands: true,
    read_only_cli: true,
    synthetic_fixture_post_only: true,
  },
};
assertFoundationLiveReadinessCliReportSafe(cliReport);
console.log(JSON.stringify(cliReport, null, 2));

function assertFoundationLiveReadinessCliReportSafe(reportValue) {
  if (!reportValue || typeof reportValue !== "object" || Array.isArray(reportValue)) {
    throw new Error("foundation live readiness CLI report missing");
  }
  for (const field of Object.keys(reportValue)) {
    if (!FOUNDATION_LIVE_READINESS_CLI_REPORT_FIELDS.has(field)) {
      throw new Error(`foundation live readiness CLI unexpected report field ${field}`);
    }
  }
  if (
    reportValue.schema !== "iris_foundation_live_readiness_cli_v1" ||
    typeof reportValue.ok !== "boolean"
  ) {
    throw new Error("foundation live readiness CLI status mismatch");
  }
  for (const field of FOUNDATION_LIVE_READINESS_CLI_BOUNDARY_FIELDS) {
    if (reportValue.boundary_policy?.[field] !== true) {
      throw new Error(`foundation live readiness CLI boundary flag failed: ${field}`);
    }
  }
}
