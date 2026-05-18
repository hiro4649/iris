import { pathToFileURL } from "node:url";
import {
  assertLive2dTtsBridgeReadinessReportSafe,
  createLive2dTtsBridgeReadinessReport,
} from "../src/services/dev/live2dTtsBridgeReadiness.js";

const CLI_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "live2d_tts_bridge_readiness",
  "boundary_policy",
]);
const CLI_BOUNDARY_FIELDS = new Set([
  "read_only_cli",
  "safe_summary_only",
  "no_endpoint_values",
  "no_api_key_values",
  "no_tokens",
  "no_raw_audio",
  "no_raw_voice_samples",
  "no_raw_renderer_payloads",
  "no_raw_motion_commands",
  "no_dataset_paths",
  "no_internal_model_paths",
  "no_real_tts_operation",
  "no_real_live2d_operation",
  "production_ready_not_allowed",
]);

if (isDirectExecution()) {
  const readiness = createLive2dTtsBridgeReadinessReport();
  console.log(JSON.stringify(createCliReport(readiness), null, 2));
}

export function createCliReport(readiness) {
  assertLive2dTtsBridgeReadinessReportSafe(
    readiness,
    "Live2D/TTS bridge readiness CLI"
  );
  const report = {
    ok: true,
    schema: "iris_live2d_tts_bridge_readiness_cli_v1",
    live2d_tts_bridge_readiness: readiness,
    boundary_policy: {
      read_only_cli: true,
      safe_summary_only: true,
      no_endpoint_values: true,
      no_api_key_values: true,
      no_tokens: true,
      no_raw_audio: true,
      no_raw_voice_samples: true,
      no_raw_renderer_payloads: true,
      no_raw_motion_commands: true,
      no_dataset_paths: true,
      no_internal_model_paths: true,
      no_real_tts_operation: true,
      no_real_live2d_operation: true,
      production_ready_not_allowed: true,
    },
  };
  assertCliReportSafe(report);
  return report;
}

export function assertCliReportSafe(
  report,
  context = "Live2D/TTS bridge readiness CLI report"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error(`${context}: report required`);
  }
  if (report.ok !== true || report.schema !== "iris_live2d_tts_bridge_readiness_cli_v1") {
    throw new Error(`${context}: invalid status`);
  }
  for (const field of Object.keys(report)) {
    if (!CLI_REPORT_FIELDS.has(field)) {
      throw new Error(`${context}: unexpected field ${field}`);
    }
  }
  assertLive2dTtsBridgeReadinessReportSafe(
    report.live2d_tts_bridge_readiness,
    `${context}: readiness`
  );
  for (const field of Object.keys(report.boundary_policy ?? {})) {
    if (!CLI_BOUNDARY_FIELDS.has(field)) {
      throw new Error(`${context}: unexpected boundary field ${field}`);
    }
  }
  for (const field of CLI_BOUNDARY_FIELDS) {
    if (report.boundary_policy?.[field] !== true) {
      throw new Error(`${context}: boundary flag failed ${field}`);
    }
  }
}

function isDirectExecution() {
  if (!process.argv[1]) return false;
  return import.meta.url === pathToFileURL(process.argv[1]).href;
}
