import {
  assertObsOverlayConfigSafe,
  createObsOverlayConfigFromEnv,
} from "../src/server/obsOverlayConfig.js";

const OBS_BROWSER_SOURCE_CONFIG_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "manual_browser_source_ready",
  "obs_overlay_config",
  "setup_bridge_optional",
  "boundary_policy",
]);

const config = createObsOverlayConfigFromEnv(process.env);
assertObsOverlayConfigSafe(config, "dev OBS browser source config");

const report = {
  ok: true,
  schema: "iris_obs_browser_source_config_report_v1",
  manual_browser_source_ready: Boolean(process.env.IRIS_HTTP_ORIGIN),
  obs_overlay_config: config,
  setup_bridge_optional: true,
  boundary_policy: {
    configuration_only: true,
    no_live_payloads: true,
    no_raw_text: true,
    no_candidates: true,
    no_commands: true,
    no_secret_values: true,
  },
};

assertObsBrowserSourceConfigReportSafe(report);
assertNoUnsafeReportLeak(report);
console.log(JSON.stringify(report, null, 2));

function assertObsBrowserSourceConfigReportSafe(reportValue) {
  if (!reportValue || typeof reportValue !== "object" || Array.isArray(reportValue)) {
    throw new Error("OBS browser source config report missing");
  }
  for (const field of Object.keys(reportValue)) {
    if (!OBS_BROWSER_SOURCE_CONFIG_REPORT_FIELDS.has(field)) {
      throw new Error(`OBS browser source config unexpected report field ${field}`);
    }
  }
  if (
    reportValue.ok !== true ||
    reportValue.schema !== "iris_obs_browser_source_config_report_v1" ||
    reportValue.setup_bridge_optional !== true
  ) {
    throw new Error("OBS browser source config report status mismatch");
  }
  for (const field of [
    "configuration_only",
    "no_live_payloads",
    "no_raw_text",
    "no_candidates",
    "no_commands",
    "no_secret_values",
  ]) {
    if (reportValue.boundary_policy[field] !== true) {
      throw new Error(`OBS browser source config boundary flag failed: ${field}`);
    }
  }
}

function assertNoUnsafeReportLeak(reportValue) {
  const serialized = JSON.stringify(reportValue);
  const forbiddenFragments = [
    process.env.IRIS_OBS_BRIDGE_API_KEY,
    process.env.IRIS_YOUTUBE_DATA_API_KEY,
    process.env.IRIS_YOUTUBE_OAUTH_TOKEN,
    process.env.IRIS_YOUTUBE_OAUTH_REFRESH_TOKEN,
    process.env.IRIS_TTS_API_KEY,
    process.env.IRIS_LIVE2D_API_KEY,
    '"subtitle_text"',
    '"final_text"',
    '"input_action_candidate"',
    '"approved_game_input_action"',
    '"event_id"',
    '"trace_id"',
  ].filter(Boolean);
  const leaked = forbiddenFragments.filter((fragment) => serialized.includes(fragment));
  if (leaked.length > 0) {
    throw new Error(`OBS browser source config leaked unsafe fragment(s): ${leaked.join(", ")}`);
  }
}
