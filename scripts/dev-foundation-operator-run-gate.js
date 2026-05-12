import {
  assertFoundationOperatorRunGateSafe,
  createFoundationOperatorRunGate,
} from "../src/services/dev/foundationOperatorRunGate.js";

const gate = createFoundationOperatorRunGate({
  operatorRunApproved: process.env.IRIS_FOUNDATION_OPERATOR_RUN_APPROVED === "true",
});
assertFoundationOperatorRunGateSafe(gate, "foundation operator run gate CLI");

console.log(
  JSON.stringify(
    {
      ok: true,
      schema: "iris_foundation_operator_run_gate_cli_v1",
      foundation_operator_run_gate: gate,
      boundary_policy: {
        read_only_cli: true,
        operator_gate_only: true,
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
