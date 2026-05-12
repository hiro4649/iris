import {
  assertPostgresMigrationReviewGateSafe,
  createPostgresMigrationReviewGate,
} from "../src/services/dev/postgresMigrationReviewGate.js";

const gate = createPostgresMigrationReviewGate({
  operatorReviewApproved: process.env.IRIS_POSTGRES_MIGRATION_OPERATOR_REVIEW_APPROVED === "true",
});
assertPostgresMigrationReviewGateSafe(gate, "postgres migration review gate CLI");

console.log(
  JSON.stringify(
    {
      ok: true,
      schema: "iris_postgres_migration_review_gate_cli_v1",
      postgres_migration_review_gate: gate,
      boundary_policy: {
        read_only_cli: true,
        env_names_only: true,
        ids_only: true,
        no_connection_values: true,
        no_endpoint_values: true,
        no_secret_values: true,
        no_viewer_text: true,
        no_support_messages: true,
        no_candidate_payloads: true,
        no_commands: true,
        no_sql_statements: true,
        no_db_connection_attempted: true,
        no_destructive_migration: true,
      },
    },
    null,
    2
  )
);
