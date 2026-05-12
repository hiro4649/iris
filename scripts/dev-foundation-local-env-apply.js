import {
  assertFoundationLocalEnvApplyPlanSafe,
  createFoundationLocalEnvApplyPlan,
} from "../src/services/dev/foundationLocalEnvApplyPlan.js";

const applyMode = process.argv.includes("--materialize") ? "materialize" : "dry_run";
const allowReplace = process.argv.includes("--replace-existing");
const plan = createFoundationLocalEnvApplyPlan({ applyMode, allowReplace });
assertFoundationLocalEnvApplyPlanSafe(plan, "foundation local env apply CLI");

console.log(
  JSON.stringify(
    {
      ok: true,
      schema: "iris_foundation_local_env_apply_plan_cli_v1",
      foundation_local_env_apply_plan: plan,
      boundary_policy: {
        env_names_only: true,
        env_counts_only: true,
        file_names_only: true,
        script_names_only: true,
        no_env_values: true,
        no_secret_values: true,
        no_endpoint_values: true,
        no_payloads: true,
        no_candidates: true,
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
