import {
  assertPostgresPersistenceMigrationPlanSafe,
  createPostgresPersistenceMigrationPlan,
} from "../src/services/dev/postgresPersistenceMigrationPlan.js";

const plan = createPostgresPersistenceMigrationPlan();
assertPostgresPersistenceMigrationPlanSafe(plan, "postgres migration plan CLI");

console.log(
  JSON.stringify(
    {
      ok: true,
      schema: "iris_postgres_persistence_migration_plan_cli_v1",
      postgres_persistence_migration_plan: plan,
      boundary_policy: {
        read_only_cli: true,
        env_names_only: true,
        script_names_only: true,
        no_connection_values: true,
        no_endpoint_values: true,
        no_secret_values: true,
        no_viewer_text: true,
        no_support_messages: true,
        no_candidate_payloads: true,
        no_commands: true,
        no_sql_statements: true,
        no_db_connection_attempted: true,
      },
    },
    null,
    2
  )
);
