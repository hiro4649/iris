import "../config/loadIrisEnv.js";
import { createJsonMemoryStore } from "../services/persistence/jsonMemoryStore.js";
import { createJsonRelationshipStore } from "../services/persistence/jsonRelationshipStore.js";
import { createMockPostgresPersistenceStores } from "../services/persistence/mockPostgresPersistenceAdapter.js";
import { resolvePostgresPoolClassFromModule } from "../services/persistence/postgresPgModuleResolver.js";
import { createPostgresPoolFactoryPlan } from "../services/persistence/postgresPoolFactoryPlan.js";
import { createPostgresRuntimePersistenceStores } from "../services/persistence/postgresRuntimePersistenceFactory.js";
import { createAffectState } from "../services/personality/affectState.js";
import { createInMemoryCandidateReviewQueue } from "../services/dev/candidateReviewQueue.js";
import { createJsonlReplayLog } from "../services/dev/replayLog.js";
import { createPersonaProfile } from "../services/personality/irisPersonaProfile.js";
import { createResponseGeneratorFromEnv } from "../services/response/responseGenerator.js";

const GAME_ACTION_KINDS = new Set([
  "wait",
  "move_axis",
  "press_key",
  "click",
  "open_menu",
  "select_item",
]);

export function createRuntimeConfig(env = process.env, privateRuntime = {}) {
  const memoryPath = env.IRIS_MEMORY_STORE_PATH ?? "data/memory_store.json";
  const memoryMaxRecords = Number(env.IRIS_MEMORY_STORE_MAX_RECORDS ?? 5000);
  const relationshipPath = env.IRIS_RELATIONSHIP_STORE_PATH ?? "data/relationship_store.json";
  const relationshipMaxProfiles = Number(env.IRIS_RELATIONSHIP_STORE_MAX_PROFILES ?? 5000);
  const relationshipRecentSummaryLimit = Number(
    env.IRIS_RELATIONSHIP_RECENT_SUMMARY_LIMIT ?? 5
  );
  const replayLogPath = env.IRIS_REPLAY_LOG_PATH ?? "data/replay_log.jsonl";
  const enablePersistence = env.IRIS_ENABLE_PERSISTENCE === "true";
  const enableCandidatePersistence = env.IRIS_ENABLE_CANDIDATE_PERSISTENCE === "true";
  const enableRelationshipMemory = env.IRIS_ENABLE_RELATIONSHIP_MEMORY === "true";
  const enableReplayLog = env.IRIS_ENABLE_REPLAY_LOG === "true";
  const enableGameControl = env.IRIS_ENABLE_GAME_CONTROL === "true";
  const persistenceBackend = normalizePersistenceBackend(env.IRIS_PERSISTENCE_BACKEND);
  const postgresMockAdapterEnabled =
    env.IRIS_POSTGRES_MOCK_ADAPTER_ENABLED === "true";
  const postgresRealAdapterEnabled =
    env.IRIS_POSTGRES_REAL_ADAPTER_ENABLED === "true";
  const postgresRealAdapterGate = createPostgresRealAdapterGate({
    env,
    persistenceBackend,
    postgresMockAdapterEnabled,
    postgresRealAdapterEnabled,
  });
  const injectedPostgresPoolClass =
    typeof privateRuntime.postgresPoolClass === "function"
      ? privateRuntime.postgresPoolClass
      : null;
  const postgresPgModuleResolver =
    !injectedPostgresPoolClass && privateRuntime.postgresModule
      ? resolvePostgresPoolClassFromModule({
          pgModule: privateRuntime.postgresModule,
          generatedAtMs: privateRuntime.generatedAtMs ?? Date.now,
        })
      : null;
  const postgresPoolClass =
    injectedPostgresPoolClass ?? postgresPgModuleResolver?.PoolClass ?? null;
  const postgresRuntimeFactory =
    persistenceBackend === "postgresql" &&
    postgresMockAdapterEnabled !== true &&
    postgresRealAdapterEnabled === true &&
    typeof postgresPoolClass === "function"
      ? createPostgresRuntimePersistenceStores({
          env,
          PoolClass: postgresPoolClass,
          generatedAtMs: privateRuntime.generatedAtMs ?? Date.now,
          allowPoolCreation: privateRuntime.allowPostgresPoolCreation === true,
        })
      : null;
  const jsonPersistenceStores = {
    schema: "iris_json_persistence_stores_v1",
    persistence_backend: "json_store",
    postgres_adapter_mode: "disabled",
    real_database_connected: false,
    db_connection_attempted: false,
    memoryStore: createJsonMemoryStore(memoryPath, {
      maxRecords: memoryMaxRecords,
      dedupeByMemoryKey: env.IRIS_MEMORY_STORE_DEDUPE !== "false",
    }),
    relationshipStore: createJsonRelationshipStore(relationshipPath, {
      maxProfiles: relationshipMaxProfiles,
      recentSummaryLimit: relationshipRecentSummaryLimit,
    }),
  };
  const persistenceStores =
    postgresRuntimeFactory?.stores
      ? postgresRuntimeFactory.stores
      : persistenceBackend === "postgresql" && postgresMockAdapterEnabled
      ? createMockPostgresPersistenceStores({
          recentSummaryLimit: relationshipRecentSummaryLimit,
        })
      : jsonPersistenceStores;
  const effectivePostgresRealAdapterGate = postgresRuntimeFactory?.stores
    ? {
        ...postgresRealAdapterGate,
        gate_status: "real_adapter_injected",
        adapter_mode: "real",
        real_database_connected: true,
        db_connection_attempted_by_runtime: true,
        json_fallback_active: false,
        fallback_reason: null,
      }
    : postgresRealAdapterGate;

  return {
    environment: env,
    hasOpened: env.IRIS_HAS_OPENED !== "false",
    enablePersistence,
    enableCandidatePersistence,
    enableRelationshipMemory,
    enableReplayLog,
    enableGameControl,
    persistenceBackend: persistenceStores.persistence_backend,
    requestedPersistenceBackend: persistenceBackend,
    postgresAdapterMode:
      postgresRuntimeFactory?.stores
        ? "real"
        : persistenceBackend === "postgresql" && postgresMockAdapterEnabled !== true
        ? effectivePostgresRealAdapterGate.adapter_mode
        : persistenceStores.postgres_adapter_mode,
    postgresRealAdapterGate: effectivePostgresRealAdapterGate,
    postgresPgModuleResolverResult: postgresPgModuleResolver?.result ?? null,
    postgresRuntimeFactoryResult: postgresRuntimeFactory?.result ?? null,
    persistenceRealDatabaseConnected: persistenceStores.real_database_connected,
    persistenceDbConnectionAttempted: persistenceStores.db_connection_attempted,
    availableGameActions: parseAvailableGameActions(env.IRIS_AVAILABLE_GAME_ACTIONS),
    memoryStore: persistenceStores.memoryStore,
    relationshipStore: persistenceStores.relationshipStore,
    replayLog: enableReplayLog ? createJsonlReplayLog(replayLogPath) : null,
    candidateReviewQueue: createInMemoryCandidateReviewQueue(),
    personaProfile: createPersonaProfile({
      profileId: env.IRIS_CHARACTER_PROFILE_ID ?? "iris_default_mvp",
    }),
    affectState: createAffectState(),
    gameControlMinIntervalMs: clampInteger(
      env.IRIS_GAME_CONTROL_MIN_INTERVAL_MS ?? 0,
      0,
      3_600_000,
      0
    ),
    gameControlMaxObservationAgeMs: clampInteger(
      env.IRIS_GAME_CONTROL_MAX_OBSERVATION_AGE_MS ?? 5000,
      0,
      24 * 3_600_000,
      5000
    ),
    responseGenerator: createResponseGeneratorFromEnv(env),
  };
}

function normalizePersistenceBackend(value) {
  return value === "postgresql" ? "postgresql" : "json_store";
}

function createPostgresRealAdapterGate({
  env,
  persistenceBackend,
  postgresMockAdapterEnabled,
  postgresRealAdapterEnabled,
}) {
  if (persistenceBackend !== "postgresql") {
    return {
      schema: "iris_postgres_real_adapter_runtime_gate_v1",
      gate_status: "not_requested",
      adapter_mode: "disabled",
      requested_backend_postgresql: false,
      mock_adapter_enabled: false,
      real_adapter_enabled: false,
      connection_configured: false,
      pool_creation_allowed_by_plan: false,
      real_database_connected: false,
      db_connection_attempted_by_runtime: false,
      json_fallback_active: false,
      boundary_policy: createPostgresRuntimeGateBoundaryPolicy(),
    };
  }
  if (postgresMockAdapterEnabled === true) {
    return {
      schema: "iris_postgres_real_adapter_runtime_gate_v1",
      gate_status: "mock_adapter_selected",
      adapter_mode: "mock",
      requested_backend_postgresql: true,
      mock_adapter_enabled: true,
      real_adapter_enabled: false,
      connection_configured: Boolean(env.IRIS_POSTGRES_CONNECTION_STRING),
      pool_creation_allowed_by_plan: false,
      real_database_connected: false,
      db_connection_attempted_by_runtime: false,
      json_fallback_active: false,
      boundary_policy: createPostgresRuntimeGateBoundaryPolicy(),
    };
  }
  const poolPlan = createPostgresPoolFactoryPlan({ env });
  const realAdapterAllowed =
    postgresRealAdapterEnabled === true &&
    poolPlan.real_pool_creation_allowed_by_plan === true;
  return {
    schema: "iris_postgres_real_adapter_runtime_gate_v1",
    gate_status: realAdapterAllowed
      ? "real_adapter_ready_for_private_factory"
      : "real_adapter_blocked",
    adapter_mode: realAdapterAllowed ? "real_adapter_pending" : "real_adapter_blocked",
    requested_backend_postgresql: true,
    mock_adapter_enabled: false,
    real_adapter_enabled: postgresRealAdapterEnabled === true,
    connection_configured: poolPlan.connection_configured,
    pool_creation_allowed_by_plan: poolPlan.real_pool_creation_allowed_by_plan,
    real_database_connected: false,
    db_connection_attempted_by_runtime: false,
    json_fallback_active: true,
    fallback_reason: realAdapterAllowed
      ? "private_pool_factory_not_injected"
      : "operator_or_configuration_required",
    boundary_policy: createPostgresRuntimeGateBoundaryPolicy(),
  };
}

function createPostgresRuntimeGateBoundaryPolicy() {
  return {
    env_names_only: true,
    no_secret_values: true,
    no_connection_values: true,
    no_endpoint_values: true,
    no_sql_statements: true,
    no_public_parameter_values: true,
    no_record_payloads: true,
    no_candidate_payloads: true,
    no_commands: true,
    no_db_connection_attempted: true,
  };
}

function parseAvailableGameActions(value) {
  if (!value) return [];
  return [
    ...new Set(
      String(value)
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter((item) => GAME_ACTION_KINDS.has(item))
    ),
  ];
}

function clampInteger(value, min, max, fallback = min) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(number)));
}
