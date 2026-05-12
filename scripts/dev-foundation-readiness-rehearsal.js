import {
  assertFoundationReadinessRehearsalSafe,
  createFoundationReadinessRehearsal,
} from "../src/services/dev/foundationReadinessRehearsal.js";

const report = await createFoundationReadinessRehearsal();
assertFoundationReadinessRehearsalSafe(report, "foundation readiness rehearsal CLI");

console.log(
  JSON.stringify(
    {
      ok: true,
      schema: "iris_foundation_readiness_rehearsal_cli_v1",
      foundation_readiness_rehearsal: report,
      boundary_policy: {
        env_names_only: true,
        script_names_only: true,
        booleans_counts_and_fixed_statuses_only: true,
        no_secret_values: true,
        no_endpoint_values: true,
        no_live_payloads: true,
        no_text_payloads: true,
        no_artifact_paths: true,
        no_raw_jobs: true,
        no_raw_packets: true,
        no_candidates: true,
        no_commands: true,
        no_engine_calls: true,
        no_obs_setup_side_effects: true,
        no_file_updates: true,
        dry_run_probe_only: true,
        read_only_cli: true,
      },
    },
    null,
    2
  )
);
