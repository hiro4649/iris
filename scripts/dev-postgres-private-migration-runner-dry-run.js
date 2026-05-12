import {
  assertPostgresPrivateMigrationRunnerDryRunSafe,
  createPostgresPrivateMigrationRunnerDryRun,
} from "../src/services/dev/postgresPrivateMigrationRunnerDryRun.js";

const dryRun = createPostgresPrivateMigrationRunnerDryRun({
  operatorReviewApproved: process.env.IRIS_POSTGRES_MIGRATION_OPERATOR_REVIEW_APPROVED === "true",
});
assertPostgresPrivateMigrationRunnerDryRunSafe(
  dryRun,
  "postgres private migration runner dry-run CLI"
);

console.log(
  JSON.stringify(
    {
      ok: true,
      schema: "iris_postgres_private_migration_runner_dry_run_cli_v1",
      postgres_private_migration_runner_dry_run: dryRun,
      boundary_policy: {
        read_only_cli: true,
        dry_run_only: true,
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
        no_migration_applied: true,
        no_destructive_migration: true,
      },
    },
    null,
    2
  )
);
