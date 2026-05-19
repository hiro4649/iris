import { fileURLToPath } from "node:url";
import {
  assertMemoryRecallRelevanceCooldownGuardReportSafe,
  createMemoryRecallRelevanceCooldownGuardReport,
} from "../src/services/dev/memoryRecallRelevanceCooldownGuard.js";

export {
  assertMemoryRecallRelevanceCooldownGuardReportSafe,
  createMemoryRecallRelevanceCooldownGuardReport,
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = createMemoryRecallRelevanceCooldownGuardReport();
  assertMemoryRecallRelevanceCooldownGuardReportSafe(report);
  console.log(JSON.stringify(report, null, 2));

  if (!report.ok) {
    process.exitCode = 1;
  }
}
