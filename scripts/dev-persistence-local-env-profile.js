import {
  assertPersistenceLocalEnvProfileSafe,
  createPersistenceLocalEnvProfile,
  renderPersistenceLocalEnvTemplate,
} from "../src/services/dev/persistenceLocalEnvProfile.js";

if (process.argv.includes("--print-env")) {
  process.stdout.write(renderPersistenceLocalEnvTemplate());
} else {
  const profile = createPersistenceLocalEnvProfile();
  assertPersistenceLocalEnvProfileSafe(profile, "persistence local env profile CLI");
  console.log(
    JSON.stringify(
      {
        ok: true,
        schema: "iris_persistence_local_env_profile_cli_v1",
        persistence_local_env_profile: profile,
        boundary_policy: {
          env_names_only: true,
          script_names_only: true,
          operator_labels_only: true,
          no_env_values: true,
          no_secret_values: true,
          no_store_paths: true,
          no_endpoint_values: true,
          no_memory_records: true,
          no_relationship_records: true,
          no_memory_summaries: true,
          no_relationship_scores: true,
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
