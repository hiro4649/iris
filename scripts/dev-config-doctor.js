import { createProductionConfigDoctor } from "../src/services/dev/productionConfigDoctor.js";

console.log(
  JSON.stringify(
    {
      ok: true,
      production_config_doctor: createProductionConfigDoctor({ env: process.env }),
    },
    null,
    2
  )
);
