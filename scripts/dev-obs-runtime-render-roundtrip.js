import { createObsRuntimeRenderRoundtripReport } from "../src/services/dev/obsRuntimeRenderRoundtrip.js";

const report = await createObsRuntimeRenderRoundtripReport({
  baseEnv: process.env,
});

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
