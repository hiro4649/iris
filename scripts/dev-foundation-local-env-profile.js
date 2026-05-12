import {
  assertFoundationLocalEnvProfileSafe,
  createFoundationLocalEnvProfile,
  renderFoundationLocalEnvTemplate,
} from "../src/services/dev/foundationLocalEnvProfile.js";

if (process.argv.includes("--print-env")) {
  process.stdout.write(renderFoundationLocalEnvTemplate());
} else {
  const foundationLocalEnvProfile = createFoundationLocalEnvProfile();
  assertFoundationLocalEnvProfileSafe(
    foundationLocalEnvProfile,
    "foundation local env profile CLI"
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        schema: "iris_foundation_local_env_profile_cli_v1",
        foundation_local_env_profile: foundationLocalEnvProfile,
        boundary_policy: {
          env_names_only: true,
          script_names_only: true,
          route_paths_only: true,
          operator_labels_only: true,
          no_secret_values: true,
          no_endpoint_values: true,
          no_payloads: true,
          no_candidates: true,
          no_commands: true,
          read_only_cli: true,
          print_env_requires_explicit_cli_flag: true,
        },
      },
      null,
      2
    )
  );
}
