import { fileURLToPath } from "node:url";
import { ContractError } from "../src/core/contracts.js";
import {
  createFoundationRuntimeStatusReport,
} from "../src/services/dev/foundationRuntimeStatus.js";

const CLI_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "foundation_runtime_summary",
  "boundary_policy",
]);

const BOUNDARY_POLICY_FIELDS = new Set([
  "counts_statuses_booleans_and_script_names_only",
  "no_child_reports",
  "no_secret_values",
  "no_endpoint_values",
  "no_live_payloads",
  "no_text_payloads",
  "no_artifact_paths",
  "no_candidates",
  "no_commands",
  "no_raw_stream_state",
  "no_raw_overlay_events",
  "read_only_cli",
  "no_engine_calls",
  "no_obs_setup_side_effects",
]);

const FORBIDDEN_FIELDS = new Set([
  "world_command",
  "input_action",
  "input_action_candidate",
  "approved_game_input_action",
  "candidate",
  "payload",
  "text",
  "secret",
  "token",
  "password",
  "authorization",
  "endpoint",
  "url",
]);

const UNSAFE_VALUE_PATTERN = /https?:\/\/|[A-Za-z]:[\\/]|\\\\|raw |secret|token|password|authorization/i;

export function createFoundationRuntimeSummaryCliReport({
  env = process.env,
  streamState = null,
  overlayEventBus = null,
  generatedAtMs = Date.now(),
} = {}) {
  const statusReport = createFoundationRuntimeStatusReport({
    env,
    streamState,
    overlayEventBus,
    generatedAtMs,
  });
  const report = {
    ok: true,
    schema: "iris_foundation_runtime_summary_cli_v1",
    foundation_runtime_summary: statusReport.production_handoff_summary,
    boundary_policy: {
      counts_statuses_booleans_and_script_names_only: true,
      no_child_reports: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_live_payloads: true,
      no_text_payloads: true,
      no_artifact_paths: true,
      no_candidates: true,
      no_commands: true,
      no_raw_stream_state: true,
      no_raw_overlay_events: true,
      read_only_cli: true,
      no_engine_calls: true,
      no_obs_setup_side_effects: true,
    },
  };
  assertFoundationRuntimeSummaryCliReportSafe(report);
  return report;
}

export function assertFoundationRuntimeSummaryCliReportSafe(
  report,
  context = "foundation runtime summary CLI report"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new ContractError(`${context}: report is required`);
  }
  for (const field of Object.keys(report)) {
    if (!CLI_REPORT_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected field`);
    }
  }
  if (report.ok !== true) {
    throw new ContractError(`${context}: ok must be true`);
  }
  if (report.schema !== "iris_foundation_runtime_summary_cli_v1") {
    throw new ContractError(`${context}: invalid schema`);
  }
  assertSummarySafe(report.foundation_runtime_summary, context);
  assertBoundaryPolicySafe(report.boundary_policy, context);
  assertNoForbiddenFields(report, context);
  assertNoUnsafeStringValues(report, context);
}

function assertSummarySafe(summary, context) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new ContractError(`${context}: summary is required`);
  }
  if (summary.schema !== "iris_foundation_runtime_status_handoff_summary_v1") {
    throw new ContractError(`${context}: invalid summary schema`);
  }
  for (const field of [
    "runtime_status_report_only",
    "real_processes_not_started_by_report",
    "real_engine_calls_not_started_by_report",
    "real_obs_operation_not_started_by_report",
    "runtime_adapter_packets_not_exposed",
    "raw_stream_state_not_exposed",
    "raw_overlay_events_not_exposed",
    "text_payloads_not_exposed",
    "artifact_paths_not_exposed",
    "endpoint_values_not_exposed",
    "secret_values_not_exposed",
    "commands_not_exposed",
    "candidates_not_exposed",
  ]) {
    if (summary[field] !== true) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertBoundaryPolicySafe(policy, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy is required`);
  }
  for (const field of Object.keys(policy)) {
    if (!BOUNDARY_POLICY_FIELDS.has(field)) {
      throw new ContractError(`${context}: unexpected boundary policy field`);
    }
  }
  for (const field of BOUNDARY_POLICY_FIELDS) {
    if (policy[field] !== true) {
      throw new ContractError(`${context}: ${field} boundary required`);
    }
  }
}

function assertNoForbiddenFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const field of Object.keys(value)) {
    if (FORBIDDEN_FIELDS.has(field)) {
      throw new ContractError(`${context}: forbidden field`, { path, field });
    }
    assertNoForbiddenFields(value[field], context, `${path}.${field}`);
  }
}

function assertNoUnsafeStringValues(value, context, path = "root") {
  if (typeof value === "string") {
    if (UNSAFE_VALUE_PATTERN.test(value)) {
      throw new ContractError(`${context}: unsafe value exposed`, { path });
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoUnsafeStringValues(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const field of Object.keys(value)) {
    assertNoUnsafeStringValues(value[field], context, `${path}.${field}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = createFoundationRuntimeSummaryCliReport();
  console.log(JSON.stringify(report, null, 2));
}
