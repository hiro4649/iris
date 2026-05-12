#!/usr/bin/env node
import {
  assertGameplayReadinessRehearsalSafe,
  createGameplayReadinessRehearsal,
} from "../src/services/dev/gameplayReadinessRehearsal.js";

const report = createGameplayReadinessRehearsal();
assertGameplayReadinessRehearsalSafe(
  report,
  "gameplay readiness rehearsal CLI"
);

console.log(
  JSON.stringify(
    {
      ok: true,
      schema: "iris_gameplay_readiness_rehearsal_cli_v1",
      gameplay_readiness_rehearsal: report,
      boundary_policy: {
        env_names_only: true,
        script_names_only: true,
        booleans_counts_and_fixed_statuses_only: true,
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
        no_polling_side_effects: true,
        no_control_side_effects: true,
        read_only_cli: true,
      },
    },
    null,
    2
  )
);
