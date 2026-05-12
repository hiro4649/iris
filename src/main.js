import { createLocalCommentSource } from "./adapters/youtube/localCommentSource.js";
import { createRuntimeAdaptersFromEnv } from "./adapters/runtimeAdapters.js";
import { createIrisRuntime } from "./runtime/irisRuntime.js";
import { createRuntimeConfig } from "./runtime/runtimeConfig.js";

const adapters = createRuntimeAdaptersFromEnv();
const runtime = createIrisRuntime({
  runtimeConfig: createRuntimeConfig(),
  ...adapters,
});

const source =
  adapters.liveChatSource ??
  (process.env.IRIS_ALLOW_LOCAL_COMMENT_SOURCE === "true"
    ? createLocalCommentSource([
        "IRIS, that game moment was funny lol",
        "IRIS, hello",
      ])
    : null);

if (source) {
  for (;;) {
    const event = await source.next();
    if (!event) break;
    runtime.enqueue(event);
  }
}

await runtime.drain();
