import { createGameplayValidationGateRoundtripReport } from "../src/services/dev/gameplayValidationGateRoundtrip.js";

const report = await createGameplayValidationGateRoundtripReport({
  baseEnv: process.env,
});

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
