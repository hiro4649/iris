import {
  assertGameplayStartupChecklistSafe,
  createGameplayStartupChecklist,
} from "../src/services/dev/gameplayStartupChecklist.js";

const checklist = createGameplayStartupChecklist();
assertGameplayStartupChecklistSafe(checklist, "gameplay startup checklist CLI");

console.log(
  JSON.stringify(
    {
      ok: true,
      schema: "iris_gameplay_startup_checklist_cli_v1",
      gameplay_startup_checklist: checklist,
      boundary_policy: {
        env_names_only: true,
        script_names_only: true,
        no_secret_values: true,
        no_endpoint_values: true,
        no_raw_frames: true,
        no_raw_ocr_text: true,
        no_vision_payloads: true,
        no_action_candidates: true,
        no_approved_actions: true,
        no_commands: true,
        read_only_cli: true,
        no_control_side_effects: true,
      },
    },
    null,
    2
  )
);
