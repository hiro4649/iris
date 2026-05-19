import { fileURLToPath } from "node:url";
import {
  assertMemoryRetentionArchiveDeleteGuardReportSafe,
  createMemoryRetentionArchiveDeleteGuardReport,
} from "../src/services/dev/memoryRetentionArchiveDeleteGuard.js";

export {
  assertMemoryRetentionArchiveDeleteGuardReportSafe,
  createMemoryRetentionArchiveDeleteGuardReport,
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = createMemoryRetentionArchiveDeleteGuardReport();
  assertMemoryRetentionArchiveDeleteGuardReportSafe(report);
  console.log(JSON.stringify(report, null, 2));

  if (!report.ok) {
    process.exitCode = 1;
  }
}
