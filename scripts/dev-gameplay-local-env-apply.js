import {
  assertGameplayLocalEnvApplyPlanSafe,
  createGameplayLocalEnvApplyPlan,
} from "../src/services/dev/gameplayLocalEnvApplyPlan.js";

const applyMode = process.argv.includes("--materialize") ? "materialize" : "dry_run";
const plan = createGameplayLocalEnvApplyPlan({ applyMode });
assertGameplayLocalEnvApplyPlanSafe(plan, "gameplay local env apply CLI");

console.log(
  JSON.stringify(
    {
      ok: true,
      schema: "iris_gameplay_local_env_apply_plan_cli_v1",
      gameplay_local_env_apply_plan: plan,
      boundary_policy: {
        env_names_only: true,
        env_counts_only: true,
        file_names_only: true,
        script_names_only: true,
        no_env_values: true,
        no_secret_values: true,
        no_endpoint_values: true,
        no_raw_frames: true,
        no_raw_ocr_text: true,
        no_vision_payloads: true,
        no_action_candidates: true,
        no_approved_actions: true,
        no_commands: true,
        no_template_text: true,
        materialization_requires_explicit_cli_flag: true,
        read_only_when_dry_run: applyMode === "dry_run",
      },
    },
    null,
    2
  )
);
