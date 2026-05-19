import { fileURLToPath } from "node:url";
import {
  assertMemoryOwnerScopePrivacyFilterReportSafe,
  createMemoryOwnerScopePrivacyFilterReport,
} from "../src/services/dev/memoryOwnerScopePrivacyFilter.js";

export {
  assertMemoryOwnerScopePrivacyFilterReportSafe,
  createMemoryOwnerScopePrivacyFilterReport,
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = createMemoryOwnerScopePrivacyFilterReport();
  assertMemoryOwnerScopePrivacyFilterReportSafe(report);
  console.log(JSON.stringify(report, null, 2));

  if (!report.ok) {
    process.exitCode = 1;
  }
}
