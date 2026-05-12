import "../src/config/loadIrisEnv.js";
import { createMemoryVectorSearchBridgeServer } from "../src/server/memoryVectorSearchBridge.js";
import { listen } from "../src/server/httpServer.js";

const host = process.env.IRIS_MEMORY_VECTOR_BRIDGE_HOST ?? "127.0.0.1";
const port = Number(process.env.IRIS_MEMORY_VECTOR_BRIDGE_PORT ?? 9109);

const server = createMemoryVectorSearchBridgeServer();
const address = await listen(server, { host, port });

console.log(
  JSON.stringify(
    {
      ok: true,
      schema: "iris_memory_vector_search_bridge_startup_v1",
      service: "memory_vector_search_bridge",
      listening: {
        status: "listening",
        host_env_name: "IRIS_MEMORY_VECTOR_BRIDGE_HOST",
        port_env_name: "IRIS_MEMORY_VECTOR_BRIDGE_PORT",
        health_path: "/health",
        memory_search_path: "/memory-search",
      },
      configure_iris_with: {
        memory_search_path: "/memory-search",
      },
      configured_env: [
        "IRIS_MEMORY_VECTOR_BRIDGE_HOST",
        "IRIS_MEMORY_VECTOR_BRIDGE_PORT",
        "IRIS_MEMORY_SEARCH_ADAPTER",
        "IRIS_MEMORY_SEARCH_ENDPOINT",
      ],
      bridge_target: {
        response_shape: "ids_and_scores_only",
        external_provider_required: false,
      },
      boundary_policy: {
        no_endpoint_values: true,
        no_secret_values: true,
        no_memory_records: true,
        no_memory_summaries: true,
        no_candidates: true,
        no_commands: true,
      },
    },
    null,
    2
  )
);
