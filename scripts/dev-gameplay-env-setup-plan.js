import {
  assertGameplayEnvSetupPlanSafe,
  createGameplayEnvSetupPlan,
} from "../src/services/dev/gameplayEnvSetupPlan.js";

const gameplayEnvSetupPlan = createGameplayEnvSetupPlan();
assertGameplayEnvSetupPlanSafe(gameplayEnvSetupPlan, "gameplay env setup plan CLI");

console.log(
  JSON.stringify(
    {
      ok: true,
      schema: "iris_gameplay_env_setup_plan_cli_v1",
      gameplay_env_setup_plan: gameplayEnvSetupPlan,
      boundary_policy: {
        env_names_only: true,
        script_names_only: true,
        schema_names_only: true,
        fixed_ids_statuses_and_counts_only: true,
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
