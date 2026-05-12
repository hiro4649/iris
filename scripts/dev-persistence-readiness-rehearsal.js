#!/usr/bin/env node
import { createIrisRuntime } from "../src/runtime/irisRuntime.js";
import { createRuntimeConfig } from "../src/runtime/runtimeConfig.js";
import {
  assertPersistenceReadinessRehearsalSafe,
  createPersistenceReadinessRehearsal,
} from "../src/services/dev/persistenceReadinessRehearsal.js";

const env = process.env;
const runtime = createIrisRuntime({
  runtimeConfig: createRuntimeConfig(env),
  ttsAdapter() {
    return { spoken: true, adapter: "quiet_persistence_rehearsal_tts" };
  },
  live2dAdapter() {
    return { sent: true, adapter: "quiet_persistence_rehearsal_live2d" };
  },
  subtitleAdapter() {
    return { displayed: true, adapter: "quiet_persistence_rehearsal_subtitle" };
  },
  logger: { log() {}, error() {} },
});

const report = createPersistenceReadinessRehearsal({ env, runtime });
assertPersistenceReadinessRehearsalSafe(
  report,
  "persistence readiness rehearsal CLI"
);

console.log(
  JSON.stringify(
    {
      ok: true,
      schema: "iris_persistence_readiness_rehearsal_cli_v1",
      persistence_readiness_rehearsal: report,
      boundary_policy: {
        env_names_only: true,
        script_names_only: true,
        booleans_counts_and_fixed_statuses_only: true,
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
        no_commit_side_effects: true,
        read_only_cli: true,
      },
    },
    null,
    2
  )
);
