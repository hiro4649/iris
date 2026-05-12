import {
  assertFoundationLocalEnvRoundtripReportSafe,
  createFoundationLocalEnvRoundtripReport,
} from "../src/services/dev/foundationLocalEnvRoundtrip.js";

const report = createFoundationLocalEnvRoundtripReport();
assertFoundationLocalEnvRoundtripReportSafe(report, "foundation local env roundtrip CLI");

console.log(
  JSON.stringify(
    {
      ok: true,
      schema: "iris_foundation_local_env_roundtrip_cli_v1",
      foundation_local_env_roundtrip: report,
      boundary_policy: {
        env_names_only: true,
        env_counts_only: true,
        script_names_only: true,
        no_env_values: true,
        no_secret_values: true,
        no_endpoint_values: true,
        no_payloads: true,
        no_candidates: true,
        no_commands: true,
        no_template_text: true,
        read_only_cli: true,
      },
    },
    null,
    2
  )
);
