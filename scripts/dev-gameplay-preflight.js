import {
  assertGameplayPreflightReportSafe,
  createGameplayPreflightReport,
} from "../src/services/dev/gameplayPreflight.js";

const report = createGameplayPreflightReport();
assertGameplayPreflightReportSafe(report, "gameplay preflight CLI");

console.log(
  JSON.stringify(
    {
      ok: true,
      gameplay_preflight: report,
    },
    null,
    2
  )
);
