import { createIrisRuntime } from "../src/runtime/irisRuntime.js";
import { createRuntimeConfig } from "../src/runtime/runtimeConfig.js";
import {
  assertPersistenceLiveReadinessReportSafe,
  createPersistenceLiveReadinessReport,
} from "../src/services/dev/persistenceLiveReadiness.js";

const env = process.env;
const runtime = createIrisRuntime({
  runtimeConfig: createRuntimeConfig(env),
  ttsAdapter() {
    return { spoken: true, adapter: "quiet_persistence_live_readiness_tts" };
  },
  live2dAdapter() {
    return { sent: true, adapter: "quiet_persistence_live_readiness_live2d" };
  },
  subtitleAdapter() {
    return { displayed: true, adapter: "quiet_persistence_live_readiness_subtitle" };
  },
  logger: { log() {}, error() {} },
});

const report = createPersistenceLiveReadinessReport({ env, runtime });
assertPersistenceLiveReadinessReportSafe(report, "persistence live readiness CLI");

console.log(
  JSON.stringify(
    {
      ok: true,
      schema: "iris_persistence_live_readiness_cli_v1",
      persistence_live_readiness: report,
      boundary_policy: {
        env_names_only: true,
        counts_statuses_booleans_and_policy_only: true,
        no_secret_values: true,
        no_store_paths: true,
        no_endpoint_values: true,
        no_memory_records: true,
        no_relationship_records: true,
        no_memory_summaries: true,
        no_relationship_scores: true,
        no_viewer_ids: true,
        no_display_names: true,
        no_candidates: true,
        no_commands: true,
        no_raw_runtime_state: true,
        read_only_cli: true,
      },
    },
    null,
    2
  )
);
