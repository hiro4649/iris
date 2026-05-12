import {
  assertPostgresHealthRollbackRehearsalSafe,
  createPostgresHealthRollbackRehearsal,
} from "../src/services/dev/postgresHealthRollbackRehearsal.js";

const rehearsal = createPostgresHealthRollbackRehearsal({
  operatorReviewApproved: process.env.IRIS_POSTGRES_MIGRATION_OPERATOR_REVIEW_APPROVED === "true",
});
assertPostgresHealthRollbackRehearsalSafe(
  rehearsal,
  "postgres health rollback rehearsal CLI"
);

console.log(
  JSON.stringify(
    {
      ok: true,
      schema: "iris_postgres_health_rollback_rehearsal_cli_v1",
      postgres_health_rollback_rehearsal: rehearsal,
      boundary_policy: {
        read_only_cli: true,
        ids_and_counts_only: true,
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
        no_migration_applied: true,
        no_rollback_executed: true,
        no_destructive_migration: true,
      },
    },
    null,
    2
  )
);
