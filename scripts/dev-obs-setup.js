import "../src/config/loadIrisEnv.js";
import { postObsBridgeSetup } from "../src/server/obsBridgeSetup.js";

const endpoint = process.env.IRIS_OBS_BRIDGE_ENDPOINT ?? "";
const continueOnError = process.env.IRIS_OBS_SETUP_CONTINUE_ON_ERROR !== "false";
const OBS_SETUP_NOT_CONFIGURED_REPORT_FIELDS = new Set([
  "ok",
  "configured",
  "reason",
  "required_env",
  "boundary_policy",
]);
const OBS_SETUP_REPORT_FIELDS = new Set([
  "ok",
  "configured",
  "continue_on_error",
  "report",
]);

if (!endpoint) {
  const notConfiguredReport = {
    ok: true,
    configured: false,
    reason: "IRIS_OBS_BRIDGE_ENDPOINT is not set",
    required_env: [
      "IRIS_OBS_BRIDGE_ENDPOINT",
      "IRIS_OBS_BRIDGE_HEALTH_ENDPOINT",
      "IRIS_HTTP_ORIGIN",
      "IRIS_OBS_BRIDGE_API_KEY",
      "IRIS_OBS_BRIDGE_TIMEOUT_MS",
      "IRIS_OBS_SOURCE_NAME",
      "IRIS_OBS_SCENE_NAME",
      "IRIS_OBS_SOURCE_WIDTH",
      "IRIS_OBS_SOURCE_HEIGHT",
      "IRIS_OBS_SOURCE_FPS",
      "IRIS_OBS_SHUTDOWN_SOURCE_WHEN_NOT_VISIBLE",
      "IRIS_OBS_REFRESH_BROWSER_WHEN_SCENE_BECOMES_ACTIVE",
    ],
    boundary_policy: {
      operator_setup_only: true,
      no_live_payloads: true,
      no_runtime_expression_command: true,
      no_secret_values_in_report: true,
    },
  };
  assertReportFields(notConfiguredReport, OBS_SETUP_NOT_CONFIGURED_REPORT_FIELDS);
  assertNoUnsafeReportLeak(notConfiguredReport);
  console.log(JSON.stringify(notConfiguredReport, null, 2));
  process.exit(0);
}

const report = await postObsBridgeSetup({
  endpoint,
  apiKey:
    process.env.IRIS_OBS_BRIDGE_API_KEY ?? process.env.IRIS_LOCAL_BRIDGE_API_KEY ?? "",
  origin: process.env.IRIS_HTTP_ORIGIN ?? "http://127.0.0.1:8787",
  sourceName: process.env.IRIS_OBS_SOURCE_NAME ?? "IRIS Overlay",
  sceneName: process.env.IRIS_OBS_SCENE_NAME ?? "",
  width: Number(process.env.IRIS_OBS_SOURCE_WIDTH ?? 1280),
  height: Number(process.env.IRIS_OBS_SOURCE_HEIGHT ?? 720),
  fps: Number(process.env.IRIS_OBS_SOURCE_FPS ?? 30),
  shutdownSourceWhenNotVisible:
    process.env.IRIS_OBS_SHUTDOWN_SOURCE_WHEN_NOT_VISIBLE === "true",
  refreshBrowserWhenSceneBecomesActive:
    process.env.IRIS_OBS_REFRESH_BROWSER_WHEN_SCENE_BECOMES_ACTIVE === "true",
  timeoutMs: Number(process.env.IRIS_OBS_BRIDGE_TIMEOUT_MS ?? 5000),
  continueOnError,
});

const setupReport = {
  ok: report.bridge_status !== "attention",
  configured: true,
  continue_on_error: continueOnError,
  report,
};
assertReportFields(setupReport, OBS_SETUP_REPORT_FIELDS);
assertNoUnsafeReportLeak(setupReport);
console.log(JSON.stringify(setupReport, null, 2));

function assertReportFields(reportValue, expectedFields) {
  if (!reportValue || typeof reportValue !== "object" || Array.isArray(reportValue)) {
    throw new Error("OBS setup report missing");
  }
  for (const field of Object.keys(reportValue)) {
    if (!expectedFields.has(field)) {
      throw new Error(`OBS setup unexpected report field ${field}`);
    }
  }
}

function assertNoUnsafeReportLeak(reportValue) {
  const serialized = JSON.stringify(reportValue);
  const forbiddenFragments = [
    endpoint,
    process.env.IRIS_OBS_BRIDGE_API_KEY,
    process.env.IRIS_LOCAL_BRIDGE_API_KEY,
    '"event_id"',
    '"trace_id"',
    '"subtitle_text"',
    '"input_action_candidate"',
  ].filter(Boolean);
  const leaked = forbiddenFragments.filter((fragment) => serialized.includes(fragment));
  if (leaked.length > 0) {
    throw new Error(`OBS setup leaked unsafe fragment(s): ${leaked.join(", ")}`);
  }
}
