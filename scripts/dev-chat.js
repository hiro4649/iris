import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createRuntimeAdaptersFromEnv } from "../src/adapters/runtimeAdapters.js";
import { normalizeYouTubeComment } from "../src/adapters/youtube/commentAdapter.js";
import { createIrisRuntime } from "../src/runtime/irisRuntime.js";
import { createRuntimeConfig } from "../src/runtime/runtimeConfig.js";

const rl = readline.createInterface({ input, output });
const runtime = createIrisRuntime({
  runtimeConfig: createRuntimeConfig(),
  ...createRuntimeAdaptersFromEnv(),
});

console.log("IRIS dev chat. Type a comment and press Enter. Type /exit to quit.");

try {
  for (;;) {
    const text = await rl.question("> ");
    if (text.trim() === "/exit") break;
    if (!text.trim()) continue;

    const event = normalizeYouTubeComment({
      display_name: "local_viewer",
      text,
    });

    await runtime.processEvent(event);
  }
} finally {
  rl.close();
}
