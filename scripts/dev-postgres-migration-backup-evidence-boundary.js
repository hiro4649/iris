import { createPostgresMigrationBackupEvidenceBoundaryReport } from "../src/services/dev/postgresMigrationBackupEvidenceBoundary.js";

const report = createPostgresMigrationBackupEvidenceBoundaryReport();
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
