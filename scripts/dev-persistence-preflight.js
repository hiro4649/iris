import {
  assertPersistencePreflightReportSafe,
  createPersistencePreflightReport,
} from "../src/services/dev/persistencePreflight.js";

const report = createPersistencePreflightReport();
assertPersistencePreflightReportSafe(report, "persistence preflight CLI");

console.log(
  JSON.stringify(
    {
      ok: true,
      persistence_preflight: report,
    },
    null,
    2
  )
);
