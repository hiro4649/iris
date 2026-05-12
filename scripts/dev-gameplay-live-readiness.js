import {
  assertGameplayLiveReadinessReportSafe,
  createGameplayLiveReadinessReport,
} from "../src/services/dev/gameplayLiveReadiness.js";

const report = createGameplayLiveReadinessReport();
assertGameplayLiveReadinessReportSafe(report, "gameplay live readiness CLI");

console.log(
  JSON.stringify(
    {
      ok: true,
      schema: "iris_gameplay_live_readiness_cli_v1",
      gameplay_live_readiness: report,
      boundary_policy: {
        env_names_only: true,
        counts_statuses_booleans_and_policy_only: true,
        no_secret_values: true,
        no_endpoint_values: true,
        no_live_payloads: true,
        no_raw_frames: true,
        no_raw_ocr_text: true,
        no_vision_payloads: true,
        no_action_candidates: true,
        no_approved_actions: true,
        no_commands: true,
        no_raw_stream_state: true,
        no_raw_scheduler_results: true,
        read_only_cli: true,
        no_polling_side_effects: true,
        no_control_side_effects: true,
      },
    },
    null,
    2
  )
);
