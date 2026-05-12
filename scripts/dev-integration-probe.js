import { createIntegrationProbeReport } from "../src/services/dev/integrationProbe.js";

const mode = process.argv.includes("--fixture-post") ? "fixture_post" : "dry_run";
const report = await createIntegrationProbeReport({ mode });

console.log(
  JSON.stringify(
    {
      ok: true,
      integration_probe: report,
    },
    null,
    2
  )
);
