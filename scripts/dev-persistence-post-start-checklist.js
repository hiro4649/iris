import { createIrisRuntime } from "../src/runtime/irisRuntime.js";
import { createRuntimeConfig } from "../src/runtime/runtimeConfig.js";
import {
  assertPersistencePostStartChecklistSafe,
  createPersistencePostStartChecklist,
} from "../src/services/dev/persistencePostStartChecklist.js";

const env = process.env;
const runtime = createIrisRuntime({
  runtimeConfig: createRuntimeConfig(env),
  ttsAdapter() {
    return { spoken: true, adapter: "quiet_persistence_post_start_tts" };
  },
  live2dAdapter() {
    return { sent: true, adapter: "quiet_persistence_post_start_live2d" };
  },
  subtitleAdapter() {
    return { displayed: true, adapter: "quiet_persistence_post_start_subtitle" };
  },
  logger: { log() {}, error() {} },
});

const checklist = createPersistencePostStartChecklist({ env, runtime });
assertPersistencePostStartChecklistSafe(
  checklist,
  "persistence post-start checklist CLI"
);

console.log(
  JSON.stringify(
    {
      ok: true,
      schema: "iris_persistence_post_start_checklist_cli_v1",
      persistence_post_start_checklist: checklist,
      boundary_policy: {
        read_only_cli: true,
        script_names_only: true,
        ids_counts_and_fixed_statuses_only: true,
        no_secret_values: true,
        no_endpoint_values: true,
        no_store_paths: true,
        no_connection_values: true,
        no_sql_values: true,
        no_memory_records: true,
        no_relationship_records: true,
        no_memory_summaries: true,
        no_relationship_scores: true,
        no_viewer_ids: true,
        no_display_names: true,
        no_candidates: true,
        no_commands: true,
        no_real_db_connection_attempted: true,
        no_store_write_attempted: true,
        no_candidate_commit_attempted: true,
      },
    },
    null,
    2
  )
);
