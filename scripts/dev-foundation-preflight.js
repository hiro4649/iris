import {
  assertFoundationPreflightReportSafe,
  createFoundationPreflightReport,
} from "../src/services/dev/foundationPreflight.js";

const report = createFoundationPreflightReport();
assertFoundationPreflightReportSafe(report, "foundation preflight CLI");

console.log(
  JSON.stringify(
    {
      ok: true,
      foundation_preflight: report,
    },
    null,
    2
  )
);
