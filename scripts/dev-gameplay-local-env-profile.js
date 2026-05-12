import {
  assertGameplayLocalEnvProfileSafe,
  createGameplayLocalEnvProfile,
  renderGameplayLocalEnvTemplate,
} from "../src/services/dev/gameplayLocalEnvProfile.js";

if (process.argv.includes("--print-env")) {
  process.stdout.write(renderGameplayLocalEnvTemplate());
} else {
  const profile = createGameplayLocalEnvProfile();
  assertGameplayLocalEnvProfileSafe(profile, "gameplay local env profile CLI");
  console.log(
    JSON.stringify(
      {
        ok: true,
        schema: "iris_gameplay_local_env_profile_cli_v1",
        gameplay_local_env_profile: profile,
        boundary_policy: {
          env_names_only: true,
          script_names_only: true,
          operator_labels_only: true,
          no_env_values: true,
          no_secret_values: true,
          no_endpoint_values: true,
          no_raw_frames: true,
          no_raw_ocr_text: true,
          no_vision_payloads: true,
          no_action_candidates: true,
          no_approved_actions: true,
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
