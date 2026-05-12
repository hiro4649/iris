import { createProductionProbeReport } from "../src/services/dev/productionProbe.js";

const mode = process.argv.includes("--fixture-post") ? "fixture_post" : "dry_run";
const report = await createProductionProbeReport({ mode });

console.log(
  JSON.stringify(
    {
      ok:
        report.readiness_status === "ready_for_configured_production_probe" ||
        report.probe_mode === "dry_run",
      production_probe: report,
    },
    null,
    2
  )
);
