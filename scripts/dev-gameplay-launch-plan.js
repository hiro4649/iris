import {
  assertGameplayLaunchPlanSafe,
  createGameplayLaunchPlan,
} from "../src/services/dev/gameplayLaunchPlan.js";

const plan = createGameplayLaunchPlan();
assertGameplayLaunchPlanSafe(plan, "gameplay launch plan CLI");

console.log(
  JSON.stringify(
    {
      ok: true,
      schema: "iris_gameplay_launch_plan_cli_v1",
      gameplay_launch_plan: plan,
      boundary_policy: {
        safe_local_scripts_only: true,
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
      },
    },
    null,
    2
  )
);
