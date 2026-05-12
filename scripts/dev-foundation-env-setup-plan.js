import {
  assertFoundationEnvSetupPlanSafe,
  createFoundationEnvSetupPlan,
} from "../src/services/dev/foundationEnvSetupPlan.js";

const foundationEnvSetupPlan = createFoundationEnvSetupPlan();
assertFoundationEnvSetupPlanSafe(
  foundationEnvSetupPlan,
  "foundation env setup plan CLI"
);

console.log(
  JSON.stringify(
    {
      ok: true,
      schema: "iris_foundation_env_setup_plan_cli_v1",
      foundation_env_setup_plan: foundationEnvSetupPlan,
      boundary_policy: {
        env_names_only: true,
        script_names_only: true,
        schema_names_only: true,
        fixed_ids_statuses_and_counts_only: true,
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
