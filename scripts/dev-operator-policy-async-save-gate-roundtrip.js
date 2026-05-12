import { pathToFileURL } from "node:url";
import {
  assertOperatorPolicyAsyncSaveGateRoundtripCliReportSafe,
  createOperatorPolicyAsyncSaveGateRoundtripCliReport,
} from "../src/services/dev/operatorPolicyAsyncSaveGateRoundtrip.js";

export {
  assertOperatorPolicyAsyncSaveGateRoundtripCliReportSafe,
  createOperatorPolicyAsyncSaveGateRoundtripCliReport,
};

if (isDirectExecution()) {
  const report = await createOperatorPolicyAsyncSaveGateRoundtripCliReport();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

function isDirectExecution() {
  if (!process.argv[1]) return false;
  return import.meta.url === pathToFileURL(process.argv[1]).href;
}
