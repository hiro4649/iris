import {
  assertFoundationPostStartHealthChecklistSafe,
  createFoundationPostStartHealthChecklist,
} from "../src/services/dev/foundationPostStartHealthChecklist.js";

const checklist = createFoundationPostStartHealthChecklist({
  operatorRunApproved: process.env.IRIS_FOUNDATION_OPERATOR_RUN_APPROVED === "true",
});
assertFoundationPostStartHealthChecklistSafe(
  checklist,
  "foundation post-start health checklist CLI"
);

console.log(
  JSON.stringify(
    {
      ok: true,
      schema: "iris_foundation_post_start_health_checklist_cli_v1",
      foundation_post_start_health_checklist: checklist,
      boundary_policy: {
        read_only_cli: true,
        script_names_only: true,
        ids_and_counts_only: true,
        no_endpoint_values: true,
        no_secret_values: true,
        no_raw_payloads: true,
        no_candidate_payloads: true,
        no_commands: true,
        no_real_probe_executed: true,
        no_network_request_attempted: true,
        no_obs_operation: true,
      },
    },
    null,
    2
  )
);
