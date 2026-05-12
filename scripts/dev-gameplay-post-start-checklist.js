import { createIrisRuntime } from "../src/runtime/irisRuntime.js";
import { createRuntimeConfig } from "../src/runtime/runtimeConfig.js";
import { createStreamState } from "../src/runtime/streamState.js";
import {
  assertGameplayPostStartChecklistSafe,
  createGameplayPostStartChecklist,
} from "../src/services/dev/gameplayPostStartChecklist.js";

const env = process.env;
const runtime = createIrisRuntime({
  runtimeConfig: createRuntimeConfig(env),
  ttsAdapter() {
    return { spoken: true, adapter: "quiet_gameplay_post_start_tts" };
  },
  live2dAdapter() {
    return { sent: true, adapter: "quiet_gameplay_post_start_live2d" };
  },
  subtitleAdapter() {
    return { displayed: true, adapter: "quiet_gameplay_post_start_subtitle" };
  },
  logger: { log() {}, error() {} },
});
const streamState = createStreamState();
const checklist = createGameplayPostStartChecklist({
  env,
  runtime,
  streamState,
});
assertGameplayPostStartChecklistSafe(checklist, "gameplay post-start checklist CLI");

console.log(
  JSON.stringify(
    {
      ok: true,
      schema: "iris_gameplay_post_start_checklist_cli_v1",
      gameplay_post_start_checklist: checklist,
      boundary_policy: {
        read_only_cli: true,
        script_names_only: true,
        ids_counts_and_fixed_statuses_only: true,
        no_secret_values: true,
        no_endpoint_values: true,
        no_raw_frames: true,
        no_raw_ocr_text: true,
        no_vision_payloads: true,
        no_action_candidates: true,
        no_approved_actions: true,
        no_commands: true,
        no_real_capture_request_attempted: true,
        no_real_game_or_os_input_attempted: true,
        no_action_candidate_forwarded: true,
        no_approved_action_executed: true,
      },
    },
    null,
    2
  )
);
