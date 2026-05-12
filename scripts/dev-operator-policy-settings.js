import { pathToFileURL } from "node:url";
import {
  assertOperatorPolicySettingsReportSafe,
  createOperatorPolicySettingsReport,
} from "../src/services/dev/operatorPolicySettings.js";

const OPERATOR_POLICY_SETTINGS_CLI_REPORT_FIELDS = new Set([
  "schema",
  "ok",
  "operator_policy_settings",
  "boundary_policy",
]);

export function createOperatorPolicySettingsCliReport({
  env = process.env,
  generatedAtMs = Date.now(),
} = {}) {
  const operatorPolicySettings = createOperatorPolicySettingsReport({
    env,
    generatedAtMs,
  });
  const report = {
    schema: "iris_operator_policy_settings_cli_v1",
    ok: true,
    operator_policy_settings: operatorPolicySettings,
    boundary_policy: {
      read_only_cli: true,
      env_names_only: true,
      fixed_policy_labels_only: true,
      no_policy_numeric_values: true,
      no_secret_values: true,
      no_endpoint_values: true,
      no_raw_viewer_messages: true,
      no_support_message_text: true,
      no_hidden_relationship_scores: true,
      no_candidates: true,
      no_commands: true,
      no_raw_frames: true,
      no_real_device_operation: true,
      no_game_or_os_input: true,
    },
  };
  assertOperatorPolicySettingsCliReportSafe(report);
  return report;
}

export function assertOperatorPolicySettingsCliReportSafe(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("operator policy settings CLI report must be an object");
  }
  if (report.schema !== "iris_operator_policy_settings_cli_v1") {
    throw new Error("invalid operator policy settings CLI schema");
  }
  for (const field of Object.keys(report)) {
    if (!OPERATOR_POLICY_SETTINGS_CLI_REPORT_FIELDS.has(field)) {
      throw new Error(`unexpected operator policy settings CLI field ${field}`);
    }
  }
  if (report.ok !== true) {
    throw new Error("operator policy settings CLI report must be ok");
  }
  for (const key of [
    "read_only_cli",
    "env_names_only",
    "fixed_policy_labels_only",
    "no_policy_numeric_values",
    "no_secret_values",
    "no_endpoint_values",
    "no_raw_viewer_messages",
    "no_support_message_text",
    "no_hidden_relationship_scores",
    "no_candidates",
    "no_commands",
    "no_raw_frames",
    "no_real_device_operation",
    "no_game_or_os_input",
  ]) {
    if (report.boundary_policy[key] !== true) {
      throw new Error(`operator policy settings CLI boundary ${key} must be true`);
    }
  }
  assertOperatorPolicySettingsReportSafe(report.operator_policy_settings);
}

if (isDirectExecution()) {
  const report = createOperatorPolicySettingsCliReport();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

function isDirectExecution() {
  if (!process.argv[1]) return false;
  return import.meta.url === pathToFileURL(process.argv[1]).href;
}
