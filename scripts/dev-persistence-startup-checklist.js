import "../src/config/loadIrisEnv.js";
import { createPersistenceStartupChecklist } from "../src/services/dev/persistenceStartupChecklist.js";

const checklist = createPersistenceStartupChecklist();

console.log(
  JSON.stringify(
    {
      ok: true,
      schema: "iris_persistence_startup_checklist_cli_v1",
      persistence_startup_checklist: checklist,
      boundary_policy: {
        env_names_only: true,
        script_names_only: true,
        no_secret_values: true,
        no_store_path_values: true,
        no_endpoint_values: true,
        no_memory_records: true,
        no_relationship_records: true,
        no_memory_summaries: true,
        no_candidates: true,
        no_commands: true,
        read_only_cli: true,
      },
    },
    null,
    2
  )
);
