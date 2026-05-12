import { createProductionReadinessRunbook } from "../src/services/dev/productionReadinessRunbook.js";

console.log(
  JSON.stringify(
    {
      ok: true,
      production_readiness_runbook: createProductionReadinessRunbook({ env: process.env }),
    },
    null,
    2
  )
);
