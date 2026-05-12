import {
  assertPersistenceEnvSetupPlanSafe,
  createPersistenceEnvSetupPlan,
} from "../src/services/dev/persistenceEnvSetupPlan.js";

const persistenceEnvSetupPlan = createPersistenceEnvSetupPlan();
assertPersistenceEnvSetupPlanSafe(
  persistenceEnvSetupPlan,
  "persistence env setup plan CLI"
);

console.log(
  JSON.stringify(
    {
      ok: true,
      schema: "iris_persistence_env_setup_plan_cli_v1",
      persistence_env_setup_plan: persistenceEnvSetupPlan,
      boundary_policy: {
        env_names_only: true,
        script_names_only: true,
        schema_names_only: true,
        fixed_ids_statuses_and_counts_only: true,
        no_secret_values: true,
        no_store_paths: true,
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
