import { fileURLToPath } from "node:url";
import {
  assertCommunityMemoryOpennessGuardReportSafe,
  createCommunityMemoryOpennessGuardReport,
} from "../src/services/dev/communityMemoryOpennessGuard.js";

export {
  assertCommunityMemoryOpennessGuardReportSafe,
  createCommunityMemoryOpennessGuardReport,
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = createCommunityMemoryOpennessGuardReport();
  assertCommunityMemoryOpennessGuardReportSafe(report);
  console.log(JSON.stringify(report, null, 2));

  if (!report.ok) {
    process.exitCode = 1;
  }
}
