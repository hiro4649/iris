import {
  assertFoundationStartupChecklistSafe,
  createFoundationStartupChecklist,
} from "../src/services/dev/foundationStartupChecklist.js";

const foundationStartupChecklist = createFoundationStartupChecklist();
assertFoundationStartupChecklistSafe(
  foundationStartupChecklist,
  "foundation startup checklist CLI"
);

console.log(
  JSON.stringify(
    {
      ok: true,
      schema: "iris_foundation_startup_checklist_cli_v1",
      foundation_startup_checklist: foundationStartupChecklist,
      boundary_policy: {
        safe_local_scripts_only: true,
        env_names_only: true,
        script_names_only: true,
        terminal_labels_only: true,
        no_secret_values: true,
        no_endpoint_values: true,
        no_payloads: true,
        no_candidates: true,
        no_commands: true,
        read_only_cli: true,
      },
    },
    null,
    2
  )
);
