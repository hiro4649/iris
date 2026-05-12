import { createRuntimeAdaptersFromEnv } from "../src/adapters/runtimeAdapters.js";
import { createHttpIngestScheduler } from "../src/runtime/httpIngestScheduler.js";
import { createIrisRuntime } from "../src/runtime/irisRuntime.js";
import { createRuntimeConfig } from "../src/runtime/runtimeConfig.js";
import { createStreamState } from "../src/runtime/streamState.js";

const intervalMs = Number(process.env.IRIS_HTTP_INGEST_INTERVAL_MS ?? 3000);
const limit = Number(process.env.IRIS_HTTP_INGEST_LIMIT ?? 10);
const continueOnSourceError = process.env.IRIS_HTTP_INGEST_CONTINUE_ON_SOURCE_ERROR !== "false";
const adapters = createRuntimeAdaptersFromEnv();
const runtime = createIrisRuntime({
  runtimeConfig: createRuntimeConfig(),
  ...adapters,
});
const streamState = createStreamState();

const sources = [
  { name: "live_chat", source: adapters.liveChatSource },
  { name: "game_observation", source: adapters.gameObservationSource },
  { name: "media_watch", source: adapters.mediaWatchSource },
  { name: "external_topic", source: adapters.externalTopicSource },
].filter((item) => item.source);

if (sources.length === 0) {
  console.log(
    JSON.stringify(
      {
        ok: true,
        processed_count: 0,
        reason: "no HTTP sources configured",
        required_env: [
          "IRIS_YOUTUBE_LIVE_CHAT_ENDPOINT",
          "IRIS_GAME_OBSERVATION_ENDPOINT",
          "IRIS_MEDIA_WATCH_ENDPOINT",
          "IRIS_EXTERNAL_TOPIC_ENDPOINT",
        ],
      },
      null,
      2
    )
  );
  process.exit(0);
}

const scheduler = createHttpIngestScheduler({
  runtime,
  streamState,
  sources,
  intervalMs,
  batchLimit: limit,
  continueOnSourceError,
  logger: { warn() {}, error() {} },
});
const tick = await scheduler.tickNow("manual_dev_http_ingest_once");
const status = scheduler.status();

console.log(
  JSON.stringify(
    {
      ok: tick.ok,
      processed_count: tick.processed_count,
      duplicate_count: tick.duplicate_count,
      source_error_count: tick.source_error_count,
      continue_on_source_error: continueOnSourceError,
      priority_summary: tick.status?.last_priority_summary ?? status.last_priority_summary,
      processed: tick.processed,
      skipped_duplicates: tick.skipped_duplicates,
      source_errors: tick.source_errors,
      source_statuses: status.source_statuses,
      boundary_policy: {
        uses_http_ingest_scheduler: true,
        counts_only_status: true,
        no_raw_payloads: true,
        no_text_payloads: true,
        no_candidates: true,
        no_commands: true,
        no_endpoint_values: true,
        no_secret_values: true,
      },
    },
    null,
    2
  )
);
