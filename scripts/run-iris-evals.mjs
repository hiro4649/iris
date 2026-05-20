#!/usr/bin/env node

import {
  IRIS_MEMORY_STATUSES,
  assertIrisMemoryRecordContract,
  assertProtectedMemoryChangeApproval,
  canUseIrisMemoryNaturally,
} from "../src/services/memory/irisMemoryRecordContract.js";
import {
  createIrisAvatarResponse,
  toPublicIrisAvatarResponse,
} from "../src/services/avatar/irisAvatarResponseContract.js";

const tests = [
  ["memory status set is exact", testMemoryStatusSet],
  ["natural memory use is accepted/protected only", testNaturalMemoryUse],
  ["protected memory changes require human approval", testProtectedApproval],
  ["avatar public projection removes inner_intent", testAvatarPublicProjection],
  ["silent avatar output does not synthesize speech", testSilentAvatarSpeech],
];

const failures = [];

for (const [name, run] of tests) {
  try {
    run();
  } catch (error) {
    failures.push({ name, message: error?.message ?? String(error) });
  }
}

if (failures.length > 0) {
  console.error(`IRIS evals: FAIL ${failures.length}/${tests.length}`);
  for (const failure of failures) {
    console.error(`not ok - ${failure.name}: ${failure.message}`);
  }
  process.exitCode = 1;
} else {
  console.log(`IRIS evals: PASS ${tests.length}/${tests.length}`);
}

function testMemoryStatusSet() {
  assertDeepEqual(IRIS_MEMORY_STATUSES, [
    "candidate",
    "accepted",
    "protected",
    "stale",
    "rejected",
  ]);
  assertThrows(() => assertIrisMemoryRecordContract(baseRecord({ status: "approved" })));
}

function testNaturalMemoryUse() {
  const allowed = IRIS_MEMORY_STATUSES.filter((status) => canUseIrisMemoryNaturally(status));
  assertDeepEqual(allowed, ["accepted", "protected"]);
  for (const status of IRIS_MEMORY_STATUSES) {
    assertIrisMemoryRecordContract(baseRecord({ status }));
  }
}

function testProtectedApproval() {
  const currentRecord = baseRecord({ status: "protected" });
  const nextRecord = { ...currentRecord, summary: "updated safe summary" };
  assertThrows(() => assertProtectedMemoryChangeApproval({ currentRecord, nextRecord }));
  assertProtectedMemoryChangeApproval({
    currentRecord,
    nextRecord,
    humanApproval: { approved: true, actor_type: "human" },
  });
}

function testAvatarPublicProjection() {
  const internal = createIrisAvatarResponse({
    speech: "I am not fully sure yet.",
    inner_intent: "softly correct without overclaiming",
    confidence: 0.62,
  });
  const projected = toPublicIrisAvatarResponse(internal);
  if (Object.prototype.hasOwnProperty.call(projected, "inner_intent")) {
    throw new Error("public projection retained inner_intent");
  }
  if (JSON.stringify(projected).includes("inner_intent")) {
    throw new Error("public JSON contains inner_intent");
  }
}

function testSilentAvatarSpeech() {
  const silent = createIrisAvatarResponse({
    speech: null,
    inner_intent: "hold quiet presence",
    silent: true,
    confidence: 0.7,
  });
  if (silent.speech !== null) {
    throw new Error("silent response synthesized speech");
  }
  assertThrows(() =>
    createIrisAvatarResponse({
      speech: "invented speech",
      inner_intent: "unsafe",
      silent: true,
      confidence: 0.7,
    })
  );
}

function baseRecord({ status }) {
  return {
    memory_id: `memory:${status}`,
    status,
    summary: "safe summary",
    natural_use_allowed: status === "accepted" || status === "protected",
    review_required: status === "candidate",
    reconfirmation_required: status === "stale",
    protected_change_requires_human_approval: status === "protected",
  };
}

function assertThrows(fn) {
  let thrown = false;
  try {
    fn();
  } catch {
    thrown = true;
  }
  if (!thrown) throw new Error("expected throw");
}

function assertDeepEqual(actual, expected) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`expected ${expectedJson}, got ${actualJson}`);
  }
}
