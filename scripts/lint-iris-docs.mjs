#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const specOnly = process.argv.includes("--iris-spec-only");
const root = process.cwd();

const docs = specOnly
  ? ["docs/iris/IRIS_SPEC.md"]
  : [
      "docs/iris/IRIS_SPEC.md",
      "docs/iris/IRIS_SOUL.md",
      "docs/iris/IRIS_MEMORY_POLICY.md",
      "docs/iris/IRIS_AVATAR_BEHAVIOR_MAP.md",
      "docs/iris/IRIS_EVALS.md",
      "docs/iris/IRIS_100_POINT_SCORECARD.md",
    ];

const checks = [
  ["IRIS_SPEC.md", ["character OS", "Source Of Truth", "Core", "Adapter", "candidate"]],
  ["IRIS_SOUL.md", ["gentle", "not submissive", "unclear", "Stability"]],
  [
    "IRIS_MEMORY_POLICY.md",
    ["candidate", "accepted", "protected", "stale", "rejected", "`approved` is not a memory status"],
  ],
  [
    "IRIS_AVATAR_BEHAVIOR_MAP.md",
    ["speech", "emotion", "facial_expression", "gesture", "gaze", "voice_tone", "inner_intent"],
  ],
  [
    "IRIS_EVALS.md",
    ["Personality consistency", "Memory accuracy", "Safety", "Avatar consistency"],
  ],
  [
    "IRIS_100_POINT_SCORECARD.md",
    ["Production ready allowed: false", "Go/no-go: no_go", "Current score"],
  ],
];

const failures = [];

for (const docPath of docs) {
  let text = "";
  try {
    text = readFileSync(resolve(root, docPath), "utf8");
  } catch {
    failures.push(`${docPath}: missing`);
    continue;
  }
  if (/Production ready allowed:\s*true/i.test(text)) {
    failures.push(`${docPath}: production-ready flag must not be true`);
  }
  if (/Curator\s+(is\s+)?implemented/i.test(text)) {
    failures.push(`${docPath}: Curator must not be claimed implemented`);
  }
  if (/growth report\s+(is\s+)?implemented/i.test(text)) {
    failures.push(`${docPath}: growth report must not be claimed implemented`);
  }
  const basename = docPath.split("/").at(-1);
  const requiredTerms = checks.find(([name]) => name === basename)?.[1] ?? [];
  for (const term of requiredTerms) {
    if (!text.includes(term)) {
      failures.push(`${docPath}: missing required term "${term}"`);
    }
  }
}

if (specOnly) {
  const spec = readFileSync(resolve(root, "docs/iris/IRIS_SPEC.md"), "utf8");
  for (const term of ["IRIS_SOUL.md", "IRIS_MEMORY_POLICY.md", "IRIS_AVATAR_BEHAVIOR_MAP.md", "IRIS_EVALS.md"]) {
    if (!spec.includes(term)) {
      failures.push(`docs/iris/IRIS_SPEC.md: missing link to ${term}`);
    }
  }
}

if (failures.length > 0) {
  console.error(`IRIS docs lint: FAIL ${failures.length}`);
  for (const failure of failures) {
    console.error(`not ok - ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log(`IRIS docs lint: PASS ${docs.length} document(s)`);
}
