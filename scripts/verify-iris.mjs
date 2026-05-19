#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v0.6.5
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const script = "scripts/verify-iris.sh";

const bashCandidates = [
  process.env.GIT_BASH_PATH,
  "C:\\Program Files\\Git\\bin\\bash.exe",
  "C:\\Program Files\\Git\\usr\\bin\\bash.exe",
  "bash",
].filter(Boolean);

let lastError = null;
for (const bash of bashCandidates) {
  if (bash.includes("\\") && !existsSync(bash)) continue;
  const result = spawnSync(bash, [script], {
    cwd: root,
    stdio: "inherit",
    shell: false,
    env: process.env,
  });
  if (result.error) {
    lastError = result.error;
    continue;
  }
  process.exit(result.status ?? 1);
}

console.error("verify-iris wrapper: no usable bash executable found");
if (lastError) console.error(`verify-iris wrapper: last error ${lastError.code ?? lastError.message}`);
process.exit(1);
