import {
  assertFoundationProcessHandoffDryRunSafe,
  createFoundationProcessHandoffDryRun,
} from "../src/services/dev/foundationProcessHandoffDryRun.js";

const dryRun = createFoundationProcessHandoffDryRun({
  operatorRunApproved: process.env.IRIS_FOUNDATION_OPERATOR_RUN_APPROVED === "true",
});
assertFoundationProcessHandoffDryRunSafe(
  dryRun,
  "foundation process handoff dry-run CLI"
);

console.log(
  JSON.stringify(
    {
      ok: true,
      schema: "iris_foundation_process_handoff_dry_run_cli_v1",
      foundation_process_handoff_dry_run: dryRun,
      boundary_policy: {
        read_only_cli: true,
        dry_run_only: true,
        script_names_only: true,
        ids_and_counts_only: true,
        no_endpoint_values: true,
        no_secret_values: true,
        no_raw_payloads: true,
        no_candidate_payloads: true,
        no_commands: true,
        no_real_process_started: true,
        no_network_request_attempted: true,
        no_obs_operation: true,
      },
    },
    null,
    2
  )
);
