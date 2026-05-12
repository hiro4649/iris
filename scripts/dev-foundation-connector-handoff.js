import {
  assertFoundationConnectorHandoffSafe,
  createFoundationConnectorHandoff,
} from "../src/services/dev/foundationConnectorHandoff.js";

const foundationConnectorHandoff = createFoundationConnectorHandoff();
assertFoundationConnectorHandoffSafe(
  foundationConnectorHandoff,
  "foundation connector handoff CLI"
);

console.log(
  JSON.stringify(
    {
      ok: true,
      schema: "iris_foundation_connector_handoff_cli_v1",
      foundation_connector_handoff: foundationConnectorHandoff,
      boundary_policy: {
        env_names_only: true,
        script_names_only: true,
        schema_names_only: true,
        route_paths_only: true,
        no_secret_values: true,
        no_endpoint_values: true,
        no_payloads: true,
        no_candidates: true,
        no_commands: true,
        no_raw_packets: true,
        no_job_payloads: true,
        read_only_cli: true,
      },
    },
    null,
    2
  )
);
