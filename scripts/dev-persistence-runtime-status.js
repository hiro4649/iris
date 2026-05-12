import { createIrisRuntime } from "../src/runtime/irisRuntime.js";
import { createRuntimeConfig } from "../src/runtime/runtimeConfig.js";
import {
  assertPersistenceRuntimeStatusReportSafe,
  createPersistenceRuntimeStatusReport,
} from "../src/services/dev/persistenceRuntimeStatus.js";

const PERSISTENCE_RUNTIME_STATUS_CLI_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "persistence_runtime_status",
  "boundary_policy",
]);
const PERSISTENCE_RUNTIME_STATUS_CLI_BOUNDARY_FIELDS = [
  "env_names_only",
  "counts_only",
  "no_secret_values",
  "no_store_paths",
  "no_endpoint_values",
  "no_memory_records",
  "no_relationship_records",
  "no_candidates",
  "no_commands",
  "no_raw_runtime_state",
  "read_only_cli",
  "script_names_only",
  "production_handoff_summary_counts_only",
];

const env = process.env;
const runtime = createIrisRuntime({
  runtimeConfig: createRuntimeConfig(env),
  ttsAdapter() {
    return { spoken: true, adapter: "quiet_persistence_runtime_status_tts" };
  },
  live2dAdapter() {
    return { sent: true, adapter: "quiet_persistence_runtime_status_live2d" };
  },
  subtitleAdapter() {
    return { displayed: true, adapter: "quiet_persistence_runtime_status_subtitle" };
  },
  logger: { log() {}, error() {} },
});

const report = createPersistenceRuntimeStatusReport({ env, runtime });
assertPersistenceRuntimeStatusReportSafe(report, "persistence runtime status CLI");

const cliReport = {
  ok: true,
  schema: "iris_persistence_runtime_status_cli_v1",
  persistence_runtime_status: report,
  boundary_policy: {
    env_names_only: true,
    counts_only: true,
    no_secret_values: true,
    no_store_paths: true,
    no_endpoint_values: true,
    no_memory_records: true,
    no_relationship_records: true,
    no_candidates: true,
    no_commands: true,
    no_raw_runtime_state: true,
    read_only_cli: true,
    script_names_only: true,
    production_handoff_summary_counts_only: true,
  },
};
assertPersistenceRuntimeStatusCliReportSafe(cliReport);
console.log(JSON.stringify(cliReport, null, 2));

function assertPersistenceRuntimeStatusCliReportSafe(reportValue) {
  if (!reportValue || typeof reportValue !== "object" || Array.isArray(reportValue)) {
    throw new Error("persistence runtime status CLI report missing");
  }
  for (const field of Object.keys(reportValue)) {
    if (!PERSISTENCE_RUNTIME_STATUS_CLI_REPORT_FIELDS.has(field)) {
      throw new Error(`persistence runtime status CLI unexpected report field ${field}`);
    }
  }
  if (
    reportValue.ok !== true ||
    reportValue.schema !== "iris_persistence_runtime_status_cli_v1"
  ) {
    throw new Error("persistence runtime status CLI status mismatch");
  }
  for (const field of PERSISTENCE_RUNTIME_STATUS_CLI_BOUNDARY_FIELDS) {
    if (reportValue.boundary_policy?.[field] !== true) {
      throw new Error(`persistence runtime status CLI boundary flag failed: ${field}`);
    }
  }
}
