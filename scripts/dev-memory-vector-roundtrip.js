import { createMemoryVectorRoundtripReport } from "../src/services/dev/memoryVectorRoundtrip.js";

const report = await createMemoryVectorRoundtripReport();
console.log(JSON.stringify(report, null, 2));
