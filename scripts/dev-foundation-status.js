import {
  assertFoundationStatusReportSafe,
  createFoundationStatusReport,
} from "../src/services/dev/foundationStatus.js";

const FOUNDATION_STATUS_CLI_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "foundation_status",
  "boundary_policy",
]);
const FOUNDATION_STATUS_CLI_BOUNDARY_FIELDS = [
  "no_secret_values",
  "no_endpoint_values",
  "no_raw_packets",
  "no_job_payloads",
  "no_text_payloads",
  "no_artifact_paths",
  "no_candidates",
  "no_commands",
  "read_only_cli",
  "no_engine_calls",
  "no_obs_setup_side_effects",
];

const report = createFoundationStatusReport();
assertFoundationStatusReportSafe(report, "foundation status CLI");

const cliReport = {
  ok: true,
  schema: "iris_foundation_status_cli_v1",
  foundation_status: report,
  boundary_policy: {
    no_secret_values: true,
    no_endpoint_values: true,
    no_raw_packets: true,
    no_job_payloads: true,
    no_text_payloads: true,
    no_artifact_paths: true,
    no_candidates: true,
    no_commands: true,
    read_only_cli: true,
    no_engine_calls: true,
    no_obs_setup_side_effects: true,
  },
};
assertFoundationStatusCliReportSafe(cliReport);
assertNoUnsafeFoundationStatusCliLeak(cliReport);
console.log(JSON.stringify(cliReport, null, 2));

function assertFoundationStatusCliReportSafe(reportValue) {
  if (!reportValue || typeof reportValue !== "object" || Array.isArray(reportValue)) {
    throw new Error("foundation status CLI report missing");
  }
  for (const field of Object.keys(reportValue)) {
    if (!FOUNDATION_STATUS_CLI_REPORT_FIELDS.has(field)) {
      throw new Error(`foundation status CLI unexpected report field ${field}`);
    }
  }
  if (
    reportValue.ok !== true ||
    reportValue.schema !== "iris_foundation_status_cli_v1"
  ) {
    throw new Error("foundation status CLI status mismatch");
  }
  for (const field of FOUNDATION_STATUS_CLI_BOUNDARY_FIELDS) {
    if (reportValue.boundary_policy?.[field] !== true) {
      throw new Error(`foundation status CLI boundary flag failed: ${field}`);
    }
  }
}

function assertNoUnsafeFoundationStatusCliLeak(reportValue) {
  const serialized = JSON.stringify(reportValue);
  const forbiddenFragments = [
    '"latest_manifest_id"',
    '"manifest_id"',
    '"artifact_byte_hash_by_adapter"',
  ];
  const leaked = forbiddenFragments.filter((fragment) => serialized.includes(fragment));
  if (leaked.length > 0) {
    throw new Error(`foundation status CLI leaked unsafe fragment(s): ${leaked.join(", ")}`);
  }
}
