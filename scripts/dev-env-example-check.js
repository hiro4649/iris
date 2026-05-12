import { readFileSync } from "node:fs";
import { listProductionConfigEnvNames } from "../src/services/dev/productionConfigDoctor.js";

const envExampleText = readFileSync(".env.example", "utf8");
const configuredNames = new Set(
  envExampleText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split("=")[0])
    .filter(Boolean)
);
const requiredNames = listProductionConfigEnvNames();
const missingEnv = requiredNames.filter((name) => !configuredNames.has(name));
const report = {
  ok: missingEnv.length === 0,
  schema: "iris_env_example_coverage_report_v1",
  checked_env_count: requiredNames.length,
  example_env_count: configuredNames.size,
  missing_env: missingEnv,
  boundary_policy: {
    env_names_only: true,
    no_secret_values: true,
    no_endpoint_values: true,
    no_live_payloads: true,
    read_only_check: true,
  },
};

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
