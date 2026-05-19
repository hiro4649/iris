import { fileURLToPath } from "node:url";
import {
  assertAiTransparencyPublicSummaryReportSafe,
  createAiTransparencyPublicSummaryReport,
} from "../src/services/dev/aiTransparencyPublicSummary.js";

export {
  assertAiTransparencyPublicSummaryReportSafe,
  createAiTransparencyPublicSummaryReport,
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = createAiTransparencyPublicSummaryReport();
  assertAiTransparencyPublicSummaryReportSafe(report);
  console.log(JSON.stringify(report, null, 2));

  if (!report.ok) {
    process.exitCode = 1;
  }
}
