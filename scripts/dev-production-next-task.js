import "../src/config/loadIrisEnv.js";
import { createProductionNextTaskReport } from "../src/services/dev/productionNextTask.js";

const report = createProductionNextTaskReport();

console.log(
  JSON.stringify(
    {
      ok: true,
      schema: "iris_production_next_task_cli_v1",
      production_next_task: report,
      boundary_policy: {
        env_names_only: true,
        script_names_only: true,
        no_secret_values: true,
        no_endpoint_values: true,
        no_live_payloads: true,
        no_text_payloads: true,
        no_memory_records: true,
        no_relationship_records: true,
        no_candidates: true,
        no_commands: true,
        no_raw_frames: true,
        read_only_cli: true,
      },
    },
    null,
    2
  )
);
