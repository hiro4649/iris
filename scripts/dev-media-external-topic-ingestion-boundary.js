import { createMediaExternalTopicIngestionBoundaryReport } from "../src/services/dev/mediaExternalTopicIngestionBoundary.js";

const report = createMediaExternalTopicIngestionBoundaryReport();
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
