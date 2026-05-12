import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createJsonMemoryStore,
} from "../src/services/persistence/jsonMemoryStore.js";
import {
  createJsonRelationshipStore,
} from "../src/services/persistence/jsonRelationshipStore.js";
import {
  assertPersistenceStatusSafe,
  createPersistenceStatus,
} from "../src/services/dev/persistenceStatus.js";

const PERSISTENCE_BACKUP_ROUNDTRIP_REPORT_FIELDS = new Set([
  "ok",
  "schema",
  "fixture_storage",
  "recovered_counts",
  "durability",
  "persistence_status",
  "boundary_policy",
]);

const configuredBaseDir = process.env.IRIS_PERSISTENCE_BACKUP_ROUNDTRIP_DIR;
const baseDir = configuredBaseDir ?? mkdtempSync(join(tmpdir(), "iris-dev-persistence-backup-"));
mkdirSync(baseDir, { recursive: true });

const memoryPath = process.env.IRIS_MEMORY_STORE_PATH ?? join(baseDir, "memory.json");
const relationshipPath =
  process.env.IRIS_RELATIONSHIP_STORE_PATH ?? join(baseDir, "relationships.json");
const memoryStore = createJsonMemoryStore(memoryPath);
const relationshipStore = createJsonRelationshipStore(relationshipPath);

try {
  memoryStore.append({
    schema: "approved_memory_record",
    approved: true,
    event_id: "dev-persistence-backup-memory-1",
    source_phase: "phase26",
    source_candidate_kind: "memory_carryover_candidate",
    memory_type: "stream_experience",
    owner_scope: "shared_stream",
    summary: "IRIS backup roundtrip safe fixture memory.",
    committed_at_ms: Date.now(),
  });
  relationshipStore.upsertApproved({
    schema: "approved_relationship_record",
    approved: true,
    event_id: "dev-persistence-backup-relationship-1",
    linked_identity_id: "viewer:backup-roundtrip",
    display_name: "Backup Roundtrip Viewer",
    affinity_delta: 0.05,
    familiarity_delta: 0.05,
    topic_key: "backup_roundtrip",
    summary: "Backup roundtrip viewer safe fixture relationship.",
    committed_at_ms: Date.now(),
  });

  if (!existsSync(`${memoryPath}.bak`) || !existsSync(`${relationshipPath}.bak`)) {
    throw new Error("persistence backup roundtrip did not create sidecar backups");
  }

  writeFileSync(memoryPath, "{ broken primary memory json", "utf8");
  writeFileSync(relationshipPath, "{ broken primary relationship json", "utf8");

  const memoryRecords = memoryStore.list();
  const relationshipProfiles = relationshipStore.listProfiles();
  const memoryStoreStatus = memoryStore.status();
  const relationshipStoreStatus = relationshipStore.status();
  const persistenceStatus = createPersistenceStatus({
    capabilities: {
      persistence_enabled: true,
      candidate_persistence_enabled: true,
      relationship_memory_enabled: true,
      replay_log_enabled: false,
    },
    memoryRecordCount: memoryRecords.length,
    relationshipProfileCount: relationshipProfiles.length,
    memoryStoreStatus,
    relationshipStoreStatus,
  });
  assertPersistenceStatusSafe(persistenceStatus, "dev persistence backup roundtrip status");

  const report = {
    ok:
      memoryRecords.length === 1 &&
      relationshipProfiles.length === 1 &&
      memoryStoreStatus.durability.recovered_from_backup === true &&
      relationshipStoreStatus.durability.recovered_from_backup === true,
    schema: "iris_persistence_backup_roundtrip_report_v1",
    fixture_storage: !configuredBaseDir,
    recovered_counts: {
      memory_record_count: memoryRecords.length,
      relationship_profile_count: relationshipProfiles.length,
    },
    durability: {
      memory: {
        backup_available: existsSync(`${memoryPath}.bak`),
        recovered_from_backup: memoryStoreStatus.durability.recovered_from_backup === true,
        primary_error_kind: memoryStoreStatus.durability.primary_error_kind,
      },
      relationship: {
        backup_available: existsSync(`${relationshipPath}.bak`),
        recovered_from_backup:
          relationshipStoreStatus.durability.recovered_from_backup === true,
        primary_error_kind: relationshipStoreStatus.durability.primary_error_kind,
      },
    },
    persistence_status: persistenceStatus,
    boundary_policy: {
      counts_only: true,
      no_record_payloads: true,
      no_profile_payloads: true,
      no_store_paths: true,
      no_error_messages: true,
      no_live_text: true,
    },
  };

  assertPersistenceBackupRoundtripReportSafe(report);
  assertNoUnsafeReportLeak(report);
  if (!report.ok) {
    throw new Error("persistence backup roundtrip did not recover both stores");
  }

  console.log(JSON.stringify(report, null, 2));
} finally {
  if (!configuredBaseDir && process.env.IRIS_KEEP_DEV_ARTIFACTS !== "true") {
    rmSync(baseDir, { recursive: true, force: true });
  }
}

function assertPersistenceBackupRoundtripReportSafe(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("persistence backup roundtrip report missing");
  }
  for (const field of Object.keys(report)) {
    if (!PERSISTENCE_BACKUP_ROUNDTRIP_REPORT_FIELDS.has(field)) {
      throw new Error(`persistence backup roundtrip unexpected report field ${field}`);
    }
  }
  if (report.ok !== true || report.schema !== "iris_persistence_backup_roundtrip_report_v1") {
    throw new Error("persistence backup roundtrip status mismatch");
  }
  for (const field of [
    "counts_only",
    "no_record_payloads",
    "no_profile_payloads",
    "no_store_paths",
    "no_error_messages",
    "no_live_text",
  ]) {
    if (report.boundary_policy[field] !== true) {
      throw new Error(`persistence backup roundtrip boundary flag failed: ${field}`);
    }
  }
}

function assertNoUnsafeReportLeak(report) {
  const serialized = JSON.stringify(report);
  const forbiddenFragments = [
    baseDir,
    memoryPath,
    relationshipPath,
    "IRIS backup roundtrip",
    "Backup Roundtrip Viewer",
    "broken primary",
    "approved_memory_record",
    "approved_relationship_record",
    "relationship_update_candidate",
    "memory_carryover_candidates",
    "input_action_candidate",
    '"summary"',
    "filePath",
    '"store_path"',
  ];
  const leaked = forbiddenFragments.filter((fragment) => serialized.includes(fragment));
  if (leaked.length > 0) {
    throw new Error(`persistence backup roundtrip leaked unsafe fragment(s): ${leaked.join(", ")}`);
  }
}
