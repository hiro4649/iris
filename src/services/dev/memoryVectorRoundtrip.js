import { createServer } from "node:http";
import { createHttpVectorMemorySearchAdapter } from "../../adapters/memory/httpVectorMemorySearchAdapter.js";
import { assertMemorySearchResultSafe } from "../memory/memorySearchIndex.js";

const MEMORY_VECTOR_ROUNDTRIP_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "request_count",
  "public_record_count_sent",
  "result_count",
  "accepted_hit_count",
  "private_record_filtered",
  "verification_scripts",
  "boundary_policy",
]);
const MEMORY_VECTOR_ROUNDTRIP_SAFE_SUMMARY_FIELDS = new Set([
  "schema",
  "roundtrip_status",
  "request_count",
  "public_record_count",
  "result_count",
  "accepted_hit_count",
  "private_record_filtered_count",
  "boundary_policy",
]);

export async function createMemoryVectorRoundtripReport() {
  const received = [];
  const server = createServer(async (request, response) => {
    let raw = "";
    request.setEncoding("utf8");
    for await (const chunk of request) raw += chunk;
    received.push(raw ? JSON.parse(raw) : {});
    response.writeHead(200, { "content-type": "application/json" });
    response.end(
      JSON.stringify({
        vector_provider: "fixture_vector_memory_bridge",
        hits: [{ memory_id: "memory-vector-game", score: 0.91 }],
      })
    );
  });
  const address = await listenOnLoopback(server);

  try {
    const adapter = createHttpVectorMemorySearchAdapter({
      endpoint: `http://${address.address}:${address.port}/memory-search`,
    });
    const result = await adapter(
      [
        {
          schema: "approved_memory_record",
          approved: true,
          event_id: "memory-vector-game",
          memory_id: "memory-vector-game",
          store: "experience_log",
          summary: "Hiro and IRIS cleared a difficult game escape together.",
          audit_status: "approved",
          commit_snapshot_id: "snapshot:memory-vector-game",
          rollback_pointer_id: "rollback:memory-vector-game",
          moderation_precheck_status: "allowed",
          memory_type: "game_experience",
          owner_scope: "shared_stream",
          committed_at_ms: 1000,
        },
        {
          schema: "approved_memory_record",
          approved: true,
          event_id: "memory-vector-private",
          memory_id: "memory-vector-private",
          store: "experience_log",
          summary: "Hiro shared a private address.",
          audit_status: "approved",
          commit_snapshot_id: "snapshot:memory-vector-private",
          rollback_pointer_id: "rollback:memory-vector-private",
          moderation_precheck_status: "allowed",
          memory_type: "viewer_profile",
          owner_scope: "viewer",
          committed_at_ms: 1001,
        },
      ],
      { query: "game escape", limit: 3, nowMs: 2000 }
    );
    assertMemorySearchResultSafe(result);
    const requestPayload = received[0] ?? {};
    const report = {
      ok: result.results.length === 1,
      schema: "iris_memory_vector_roundtrip_report_v1",
      request_count: received.length,
      public_record_count_sent: Array.isArray(requestPayload.records)
        ? requestPayload.records.length
        : 0,
      result_count: result.results.length,
      accepted_hit_count: result.result_count,
      private_record_filtered:
        !JSON.stringify(requestPayload).includes("private address"),
      verification_scripts: {
        vector_memory_bridge_script: "npm run dev:memory-vector:bridge",
        vector_memory_roundtrip_script: "npm run dev:memory-vector:roundtrip",
        persistence_preflight_script: "npm run dev:persistence:preflight",
      },
      boundary_policy: {
        approved_public_records_only: true,
        report_hides_memory_summaries: true,
        report_hides_endpoint_values: true,
        no_candidates: true,
        no_commands: true,
        read_only_search: true,
      },
    };
    assertMemoryVectorRoundtripReportSafe({ requestPayload, result, report });
    return report;
  } finally {
    await closeServer(server);
  }
}

export function createMemoryVectorRoundtripSafeSummary({ report } = {}) {
  const summary = {
    schema: "iris_memory_vector_roundtrip_safe_summary_v1",
    roundtrip_status: report?.ok === true ? "pass" : "fail",
    request_count: safeCount(report?.request_count),
    public_record_count: safeCount(report?.public_record_count_sent),
    result_count: safeCount(report?.result_count),
    accepted_hit_count: safeCount(report?.accepted_hit_count),
    private_record_filtered_count: report?.private_record_filtered === true ? 1 : 0,
    boundary_policy: {
      safe_status_and_counts_only: true,
      no_raw_memory: true,
      no_private_viewer_ids: true,
      no_vector_values: true,
      no_endpoint_values: true,
      no_candidates: true,
      no_commands: true,
    },
  };
  assertMemoryVectorRoundtripSafeSummary(summary);
  return summary;
}

export function assertMemoryVectorRoundtripSafeSummary(
  summary,
  context = "memory vector roundtrip safe summary"
) {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new Error(`${context} must be an object`);
  }
  for (const field of Object.keys(summary)) {
    if (!MEMORY_VECTOR_ROUNDTRIP_SAFE_SUMMARY_FIELDS.has(field)) {
      throw new Error(`${context} has unexpected field: ${field}`);
    }
  }
  if (summary.schema !== "iris_memory_vector_roundtrip_safe_summary_v1") {
    throw new Error(`${context} has invalid schema`);
  }
  if (!["pass", "fail"].includes(summary.roundtrip_status)) {
    throw new Error(`${context} has invalid status`);
  }
  for (const field of [
    "request_count",
    "public_record_count",
    "result_count",
    "accepted_hit_count",
    "private_record_filtered_count",
  ]) {
    if (!Number.isInteger(summary[field]) || summary[field] < 0) {
      throw new Error(`${context} has invalid count: ${field}`);
    }
  }
  const requiredBoundary = [
    "safe_status_and_counts_only",
    "no_raw_memory",
    "no_private_viewer_ids",
    "no_vector_values",
    "no_endpoint_values",
    "no_candidates",
    "no_commands",
  ];
  for (const field of requiredBoundary) {
    if (summary.boundary_policy?.[field] !== true) {
      throw new Error(`${context} missing boundary: ${field}`);
    }
  }
  assertNoUnsafeMemoryVectorSummaryMaterial(summary, context);
}

export function assertMemoryVectorRoundtripReportSafe({
  requestPayload = {},
  result = {},
  report,
}) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("vector memory roundtrip report must be an object");
  }
  if (report.schema !== "iris_memory_vector_roundtrip_report_v1") {
    throw new Error("vector memory roundtrip report has invalid schema");
  }
  for (const field of Object.keys(report)) {
    if (!MEMORY_VECTOR_ROUNDTRIP_REPORT_FIELDS.has(field)) {
      throw new Error(`vector memory roundtrip report has unexpected field: ${field}`);
    }
  }
  const reportText = JSON.stringify(report);
  const requestText = JSON.stringify(requestPayload);
  const resultText = JSON.stringify(result);
  const forbiddenEverywhere = [
    "private address",
    "input_action_candidate",
    "approved_game_input_action",
    "world_command",
    "relationship_update_candidate",
    "approved_relationship_record",
    "api_key",
    "token",
    "secret",
  ];
  const forbiddenInReport = ["Hiro and IRIS cleared"];
  const leakedEverywhere = forbiddenEverywhere.filter(
    (fragment) =>
      reportText.includes(fragment) ||
      requestText.includes(fragment) ||
      resultText.includes(fragment)
  );
  const leakedReport = forbiddenInReport.filter((fragment) =>
    reportText.includes(fragment)
  );
  const leaked = [...leakedEverywhere, ...leakedReport];
  if (leaked.length > 0) {
    throw new Error(
      `vector memory roundtrip leaked unsafe fragment(s): ${[
        ...new Set(leaked),
      ].join(", ")}`
    );
  }
}

function safeCount(value) {
  return Number.isInteger(value) && value > 0 ? value : 0;
}

function assertNoUnsafeMemoryVectorSummaryMaterial(value, context, path = "root") {
  if (typeof value === "string") {
    if (
      /\b(raw memory|raw_memory|private viewer|private_viewer|viewer_id|vector value|vector_value|embedding|endpoint|token|secret|input_action_candidate|approved_game_input_action|world_command)\b|https?:\/\//i.test(
        value
      )
    ) {
      throw new Error(`${context} leaked unsafe material at ${path}`);
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoUnsafeMemoryVectorSummaryMaterial(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    assertNoUnsafeMemoryVectorSummaryMaterial(child, context, `${path}.${field}`);
  }
}

function listenOnLoopback(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve(server.address());
    });
  });
}

function closeServer(target) {
  return new Promise((resolve, reject) => {
    target.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}
