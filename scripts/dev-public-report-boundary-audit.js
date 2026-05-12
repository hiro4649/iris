import { fileURLToPath } from "node:url";
import {
  createPublicReportBoundaryAuditReport,
  verifyPublicReportBoundaryAuditReportSafe,
} from "../src/services/dev/publicReportBoundaryAudit.js";

export {
  createPublicReportBoundaryAuditReport,
  verifyPublicReportBoundaryAuditReportSafe,
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = createPublicReportBoundaryAuditReport();
  verifyPublicReportBoundaryAuditReportSafe(report);
  console.log(JSON.stringify(report, null, 2));

  if (!report.ok) {
    process.exitCode = 1;
  }
}
