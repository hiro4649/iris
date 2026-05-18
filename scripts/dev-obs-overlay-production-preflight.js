import { pathToFileURL } from "node:url";
import {
  assertObsOverlayProductionPreflightReportSafe,
  createObsOverlayProductionPreflightReport,
} from "../src/services/dev/obsOverlayProductionPreflight.js";

const CLI_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "obs_overlay_production_preflight",
  "boundary_policy",
]);
const CLI_BOUNDARY_FIELDS = new Set([
  "read_only_cli",
  "safe_summary_only",
  "no_endpoint_values",
  "no_obs_credentials",
  "no_raw_overlay_events",
  "no_raw_payloads",
  "no_raw_frames",
  "no_raw_artifact_paths",
  "no_commands",
  "no_real_obs_mutation",
  "production_ready_not_allowed",
]);

if (isDirectExecution()) {
  const preflight = createObsOverlayProductionPreflightReport();
  console.log(JSON.stringify(createCliReport(preflight), null, 2));
}

export function createCliReport(preflight) {
  assertObsOverlayProductionPreflightReportSafe(
    preflight,
    "OBS overlay production preflight CLI"
  );
  const report = {
    ok: true,
    schema: "iris_obs_overlay_production_preflight_cli_v1",
    obs_overlay_production_preflight: preflight,
    boundary_policy: {
      read_only_cli: true,
      safe_summary_only: true,
      no_endpoint_values: true,
      no_obs_credentials: true,
      no_raw_overlay_events: true,
      no_raw_payloads: true,
      no_raw_frames: true,
      no_raw_artifact_paths: true,
      no_commands: true,
      no_real_obs_mutation: true,
      production_ready_not_allowed: true,
    },
  };
  assertCliReportSafe(report);
  return report;
}

export function assertCliReportSafe(
  report,
  context = "OBS overlay production preflight CLI report"
) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error(`${context}: report required`);
  }
  if (
    report.ok !== true ||
    report.schema !== "iris_obs_overlay_production_preflight_cli_v1"
  ) {
    throw new Error(`${context}: invalid status`);
  }
  for (const field of Object.keys(report)) {
    if (!CLI_REPORT_FIELDS.has(field)) {
      throw new Error(`${context}: unexpected field ${field}`);
    }
  }
  assertObsOverlayProductionPreflightReportSafe(
    report.obs_overlay_production_preflight,
    `${context}: preflight`
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
