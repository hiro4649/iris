import { createVisionGameObservationReadOnlyBoundaryReport } from "../src/services/dev/visionGameObservationReadOnlyBoundary.js";

const report = createVisionGameObservationReadOnlyBoundaryReport();
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
