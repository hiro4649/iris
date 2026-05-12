import { pathToFileURL } from "node:url";
import { createObsBridgeHealthProbeReport } from "../src/server/obsBridgeSetup.js";

const REQUIRED_OBS_ENV = [
  "IRIS_OBS_BRIDGE_ENDPOINT",
  "IRIS_OBS_BRIDGE_HEALTH_ENDPOINT",
  "IRIS_HTTP_ORIGIN",
  "IRIS_OBS_SOURCE_NAME",
  "IRIS_OBS_SCENE_NAME",
  "IRIS_OBS_SOURCE_WIDTH",
  "IRIS_OBS_SOURCE_HEIGHT",
  "IRIS_OBS_SOURCE_FPS",
  "IRIS_OBS_SHUTDOWN_SOURCE_WHEN_NOT_VISIBLE",
  "IRIS_OBS_REFRESH_BROWSER_WHEN_SCENE_BECOMES_ACTIVE",
  "IRIS_OBS_BRIDGE_API_KEY",
  "IRIS_OBS_BRIDGE_TIMEOUT_MS",
];
const EXPECTED_HANDOFF_SUMMARY_FIELDS = new Set([
  "schema",
  "obs_probe_report_only",
  "configured",
  "real_obs_operation_not_started_by_probe",
  "real_engine_processes_not_started_by_probe",
  "runtime_adapter_packets_not_exposed",
  "no_game_or_os_input",
  "endpoint_values_not_exposed",
  "secret_values_not_exposed",
  "raw_payloads_not_exposed",
  "required_env_count",
  "probe_status",
  "pass_count",
  "attention_count",
  "health_endpoint_not_configured_count",
  "not_configured_count",
  "next_check_script",
  "next_setup_script",
]);

if (isDirectExecution()) {
  const healthReport = await createObsBridgeHealthProbeReport();
  console.log(JSON.stringify(createObsProbePublicReport(healthReport), null, 2));
}

export function createObsProbePublicReport(healthReport) {
  const configured = healthReport.probe.status !== "not_configured";
  const report = {
    ok: healthReport.summary.pass === 1 || healthReport.probe.status === "not_configured",
    configured,
    ...(configured
      ? {}
      : {
          reason: "IRIS_OBS_BRIDGE_ENDPOINT is not set",
          required_env: REQUIRED_OBS_ENV,
        }),
    report: healthReport,
    production_handoff_summary: {
      schema: "iris_obs_probe_handoff_summary_v1",
      obs_probe_report_only: true,
      configured,
      real_obs_operation_not_started_by_probe: true,
      real_engine_processes_not_started_by_probe: true,
      runtime_adapter_packets_not_exposed: true,
      no_game_or_os_input: true,
      endpoint_values_not_exposed: true,
      secret_values_not_exposed: true,
      raw_payloads_not_exposed: true,
      required_env_count: configured ? 0 : REQUIRED_OBS_ENV.length,
      probe_status: healthReport.probe.status,
      pass_count: healthReport.summary.pass,
      attention_count: healthReport.summary.attention,
      health_endpoint_not_configured_count:
        healthReport.summary.health_endpoint_not_configured,
      not_configured_count: healthReport.summary.not_configured,
      next_check_script: "npm run dev:obs:probe",
      next_setup_script: "npm run dev:obs:setup",
    },
    boundary_policy: {
      health_probe_report_only: true,
      no_endpoint_values: true,
      no_secret_values: true,
      no_raw_payloads: true,
      no_live_payloads: true,
      no_candidates: true,
      no_commands: true,
      production_handoff_summary_counts_only: true,
    },
  };
  assertObsProbePublicReportSafe(report);
  return report;
}

export function assertObsProbePublicReportSafe(
  report,
  context = "OBS probe public report"
) {
  const summary = report?.production_handoff_summary;
  if (!summary || summary.schema !== "iris_obs_probe_handoff_summary_v1") {
    throw new Error(`${context}: handoff summary missing`);
  }
  for (const field of [
    "obs_probe_report_only",
    "real_obs_operation_not_started_by_probe",
    "real_engine_processes_not_started_by_probe",
    "runtime_adapter_packets_not_exposed",
    "no_game_or_os_input",
    "endpoint_values_not_exposed",
    "secret_values_not_exposed",
    "raw_payloads_not_exposed",
  ]) {
    if (summary[field] !== true) throw new Error(`${context}: flag failed ${field}`);
  }
  assertBoundaryPolicy(report.boundary_policy, [
    "health_probe_report_only",
    "no_endpoint_values",
    "no_secret_values",
    "no_raw_payloads",
    "no_live_payloads",
    "no_candidates",
    "no_commands",
    "production_handoff_summary_counts_only",
  ], context);
  for (const field of [
    "required_env_count",
    "pass_count",
    "attention_count",
    "health_endpoint_not_configured_count",
    "not_configured_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new Error(`${context}: invalid count ${field}`);
    }
  }
  if (
    summary.configured !== report.configured ||
    summary.probe_status !== report.report.probe.status ||
    summary.pass_count !== report.report.summary.pass ||
    summary.attention_count !== report.report.summary.attention ||
    summary.health_endpoint_not_configured_count !==
      report.report.summary.health_endpoint_not_configured ||
    summary.not_configured_count !== report.report.summary.not_configured
  ) {
    throw new Error(`${context}: handoff totals mismatch`);
  }
  for (const field of Object.keys(summary)) {
    if (!EXPECTED_HANDOFF_SUMMARY_FIELDS.has(field)) {
      throw new Error(`${context}: unexpected handoff field ${field}`);
    }
  }
  if (
    summary.next_check_script !== "npm run dev:obs:probe" ||
    summary.next_setup_script !== "npm run dev:obs:setup"
  ) {
    throw new Error(`${context}: handoff script mismatch`);
  }
  if (report.configured === false && summary.required_env_count !== REQUIRED_OBS_ENV.length) {
    throw new Error(`${context}: required env count mismatch`);
  }
  if (report.configured === true && summary.required_env_count !== 0) {
    throw new Error(`${context}: configured env count mismatch`);
  }
  assertNoUnsafeReportLeak(report, context);
}

function assertNoUnsafeReportLeak(report, context) {
  const serialized = JSON.stringify(report);
  const forbiddenFragments = [
    process.env.IRIS_OBS_BRIDGE_ENDPOINT,
    process.env.IRIS_OBS_BRIDGE_HEALTH_ENDPOINT,
    process.env.IRIS_OBS_BRIDGE_API_KEY,
    '"event_id"',
    '"trace_id"',
    '"subtitle_text"',
    '"input_action_candidate"',
  ].filter(Boolean);
  const leaked = forbiddenFragments.filter((fragment) => serialized.includes(fragment));
  if (leaked.length > 0) {
    throw new Error(`${context}: leaked unsafe fragment(s): ${leaked.join(", ")}`);
  }
}

function assertBoundaryPolicy(policy, requiredFields, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new Error(`${context}: boundary policy required`);
  }
  for (const field of requiredFields) {
    if (policy[field] !== true) {
      throw new Error(`${context}: ${field} boundary required`);
    }
  }
}

function isDirectExecution() {
  if (!process.argv[1]) return false;
  return import.meta.url === pathToFileURL(process.argv[1]).href;
}
