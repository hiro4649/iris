import {
  assertPersistenceLaunchPlanSafe,
  createPersistenceLaunchPlan,
} from "../src/services/dev/persistenceLaunchPlan.js";

const plan = createPersistenceLaunchPlan();
assertPersistenceLaunchPlanSafe(plan, "persistence launch plan CLI");

console.log(
  JSON.stringify(
    {
      ok: true,
      schema: "iris_persistence_launch_plan_cli_v1",
      persistence_launch_plan: plan,
      boundary_policy: {
        safe_local_scripts_only: true,
        env_names_only: true,
        script_names_only: true,
        no_secret_values: true,
        no_store_paths: true,
        no_endpoint_values: true,
        no_memory_records: true,
        no_relationship_records: true,
        no_candidates: true,
        no_commands: true,
        read_only_cli: true,
      },
    },
    null,
    2
  )
);
