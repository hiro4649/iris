import { createMemoryVectorBackendEvidenceBoundaryReport } from "../src/services/dev/memoryVectorBackendEvidenceBoundary.js";

const report = createMemoryVectorBackendEvidenceBoundaryReport();
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
