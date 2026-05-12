#!/usr/bin/env node
import { createFoundationLocalEnvReadinessRehearsal } from "../src/services/dev/foundationLocalEnvReadinessRehearsal.js";

const report = createFoundationLocalEnvReadinessRehearsal({
  cwd: process.cwd(),
});

console.log(JSON.stringify(report, null, 2));
