import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { ContractError } from "../../core/contracts.js";
import { classifyStoreReadError } from "../../services/persistence/storeStatusErrors.js";

const STORE_SCHEMA = "iris_youtube_live_chat_cursor_store_v1";
const STATUS_SCHEMA = "iris_youtube_live_chat_cursor_store_status_v1";
const CURSOR_STORE_STATUS_BOUNDARY_POLICY = {
  no_page_token: true,
  no_live_chat_id: true,
  no_video_id: true,
  no_store_path: true,
  no_backup_path: true,
  no_secret_values: true,
  no_endpoint_values: true,
  counts_only: true,
};

const FORBIDDEN_CURSOR_STATUS_FIELDS = new Set([
  "next_page_token",
  "page_token",
  "live_chat_id",
  "video_id",
  "endpoint",
  "url",
  "filePath",
  "file_path",
  "store_path",
  "api_key",
  "apiKey",
  "oauth_token",
  "oauthToken",
  "access_token",
  "refresh_token",
  "token",
  "secret",
  "password",
  "authorization",
]);

export function createJsonYouTubeLiveChatCursorStore(
  filePath,
  { nowMs = () => Date.now() } = {}
) {
  if (!filePath) {
    throw new ContractError("YouTube live chat cursor store requires filePath");
  }

  const counters = {
    read_count: 0,
    write_count: 0,
    last_read_at_ms: null,
    last_write_at_ms: null,
    last_error_kind: null,
    last_read_error_kind: null,
    read_error: false,
    write_error: false,
    recovered_from_backup: false,
    backup_write_error: false,
    backup_error_kind: null,
    backup_write_attempt_count: 0,
    backup_write_success_count: 0,
    backup_write_error_count: 0,
    last_backup_write_at_ms: null,
  };

  return {
    readInitialPageToken() {
      counters.read_count += 1;
      counters.last_read_at_ms = nowMs();
      try {
        const result = readCursorStateWithBackup(filePath);
        const state = result.state;
        counters.recovered_from_backup = result.recovered_from_backup;
        counters.read_error = result.recovered_from_backup;
        counters.last_read_error_kind = result.primary_error_kind;
        counters.last_error_kind = result.primary_error_kind;
        return safeOptionalText(state.next_page_token, 512);
      } catch (error) {
        counters.read_error = true;
        counters.recovered_from_backup = false;
        counters.last_read_error_kind = classifyStoreReadError(error);
        counters.last_error_kind = counters.last_read_error_kind;
        return "";
      }
    },
    writeNextPageToken(pageToken) {
      const nextPageToken = safeOptionalText(pageToken, 512);
      if (!nextPageToken) {
        return createCursorWriteResult({
          written: false,
          reason: "empty_page_token",
          counters,
        });
      }
      counters.write_count += 1;
      counters.last_write_at_ms = nowMs();
      try {
        const durability = writeCursorStateWithBackup(filePath, {
          schema: STORE_SCHEMA,
          updated_at_ms: counters.last_write_at_ms,
          next_page_token: nextPageToken,
        });
        counters.backup_write_attempt_count += 1;
        counters.last_backup_write_at_ms = counters.last_write_at_ms;
        counters.write_error = false;
        counters.backup_write_error = durability.backup_write_error;
        counters.backup_error_kind = durability.backup_error_kind;
        if (durability.backup_write_error) {
          counters.backup_write_error_count += 1;
        } else {
          counters.backup_write_success_count += 1;
        }
        counters.last_error_kind = null;
        return createCursorWriteResult({ written: true, reason: "", counters });
      } catch (error) {
        counters.write_error = true;
        counters.last_error_kind = classifyStoreReadError(error);
        return createCursorWriteResult({
          written: false,
          reason: "cursor_store_write_failed",
          counters,
        });
      }
    },
    status() {
      let state = null;
      let readErrorKind = null;
      let recoveredFromBackup = false;
      try {
        const result = readCursorStateWithBackup(filePath);
        state = result.state;
        recoveredFromBackup = result.recovered_from_backup;
        readErrorKind = result.primary_error_kind;
      } catch (error) {
        readErrorKind = classifyStoreReadError(error);
      }
      const validStoreState = state?.schema === STORE_SCHEMA;
      const status = {
        schema: STATUS_SCHEMA,
        configured: true,
        health:
          readErrorKind || counters.read_error || counters.write_error || counters.backup_write_error
            ? "attention"
            : "ready",
        store_available: validStoreState && (!readErrorKind || recoveredFromBackup),
        read_error: readErrorKind !== null || counters.read_error === true,
        write_error: counters.write_error === true,
        error_kind: readErrorKind ?? counters.last_read_error_kind ?? counters.last_error_kind,
        has_persisted_page_token: safeOptionalText(state?.next_page_token, 512) !== "",
        read_count: counters.read_count,
        write_count: counters.write_count,
        last_read_at_ms: counters.last_read_at_ms,
        last_write_at_ms: counters.last_write_at_ms,
        durability: {
          sidecar_backup_enabled: true,
          backup_available: existsSync(backupPathFor(filePath)),
          recovered_from_backup: recoveredFromBackup || counters.recovered_from_backup === true,
          backup_write_health: summarizeBackupWriteHealth(counters),
          backup_write_error: counters.backup_write_error === true,
          backup_error_kind: counters.backup_error_kind,
          backup_write_attempt_count: counters.backup_write_attempt_count,
          backup_write_success_count: counters.backup_write_success_count,
          backup_write_error_count: counters.backup_write_error_count,
          last_backup_write_at_ms: counters.last_backup_write_at_ms,
          no_backup_path: true,
        },
        boundary_policy: { ...CURSOR_STORE_STATUS_BOUNDARY_POLICY },
        adapter_validation_required: true,
      };
      assertYouTubeLiveChatCursorStoreStatusSafe(status);
      return status;
    },
  };
}

export function assertYouTubeLiveChatCursorStoreStatusSafe(
  status,
  context = "YouTube live chat cursor store status"
) {
  if (!status || typeof status !== "object" || Array.isArray(status)) {
    throw new ContractError(`${context}: missing status`);
  }
  assertNoForbiddenCursorStatusFields(status, context);
  if (status.schema !== STATUS_SCHEMA) {
    throw new ContractError(`${context}: invalid schema`, { schema: status.schema });
  }
  if (!["ready", "attention"].includes(status.health)) {
    throw new ContractError(`${context}: invalid health`, { health: status.health });
  }
  assertExactBoundaryPolicy(status.boundary_policy, CURSOR_STORE_STATUS_BOUNDARY_POLICY, context);
  if (status.boundary_policy.no_page_token !== true) {
    throw new ContractError(`${context}: page token must not be public`);
  }
  if (status.boundary_policy.no_store_path !== true) {
    throw new ContractError(`${context}: store path must not be public`);
  }
  if (status.boundary_policy.no_backup_path !== true) {
    throw new ContractError(`${context}: backup path must not be public`);
  }
  if (status.durability?.no_backup_path !== true) {
    throw new ContractError(`${context}: durability backup path must not be public`);
  }
  if (
    !["idle", "ready", "attention"].includes(
      status.durability?.backup_write_health ?? "idle"
    )
  ) {
    throw new ContractError(`${context}: invalid backup write health`, {
      backup_write_health: status.durability?.backup_write_health,
    });
  }
  for (const field of [
    "backup_write_attempt_count",
    "backup_write_success_count",
    "backup_write_error_count",
  ]) {
    const value = status.durability?.[field] ?? 0;
    if (!Number.isInteger(value) || value < 0) {
      throw new ContractError(`${context}: invalid backup write counter`, { field, value });
    }
  }
  if (status.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter validation flag required`);
  }
}

function summarizeBackupWriteHealth(counters) {
  if (counters.backup_write_error === true) return "attention";
  if (counters.backup_write_success_count > 0) return "ready";
  return "idle";
}

function createCursorWriteResult({ written, reason, counters }) {
  const result = {
    schema: "iris_youtube_live_chat_cursor_write_result_v1",
    written: written === true,
    reason: reason || null,
    write_count: counters.write_count,
    write_error: counters.write_error === true,
    error_kind: counters.last_error_kind,
    boundary_policy: {
      no_page_token: true,
      no_store_path: true,
      no_backup_path: true,
      no_secret_values: true,
      summary_only: true,
    },
    adapter_validation_required: true,
  };
  assertNoForbiddenCursorStatusFields(result, "YouTube live chat cursor write result");
  return result;
}

function readCursorState(filePath) {
  if (!existsSync(filePath)) return { schema: STORE_SCHEMA, next_page_token: "" };
  const raw = readFileSync(filePath, "utf8");
  if (!raw.trim()) return { schema: STORE_SCHEMA, next_page_token: "" };
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new ContractError("YouTube live chat cursor store must contain an object");
  }
  if (parsed.schema !== STORE_SCHEMA) {
    throw new ContractError("YouTube live chat cursor store has invalid schema");
  }
  return {
    schema: STORE_SCHEMA,
    updated_at_ms: safeOptionalNumber(parsed.updated_at_ms),
    next_page_token: safeOptionalText(parsed.next_page_token, 512),
  };
}

function readCursorStateWithBackup(filePath) {
  try {
    return {
      state: readCursorState(filePath),
      recovered_from_backup: false,
      primary_error_kind: null,
    };
  } catch (error) {
    const primaryErrorKind = classifyStoreReadError(error);
    const backupPath = backupPathFor(filePath);
    if (!existsSync(backupPath)) throw error;
    return {
      state: readCursorState(backupPath),
      recovered_from_backup: true,
      primary_error_kind: primaryErrorKind,
    };
  }
}

function writeCursorStateWithBackup(filePath, state) {
  writeCursorState(filePath, state);
  try {
    writeCursorState(backupPathFor(filePath), state);
    return {
      backup_write_error: false,
      backup_error_kind: null,
    };
  } catch (error) {
    return {
      backup_write_error: true,
      backup_error_kind: classifyStoreReadError(error),
    };
  }
}

function writeCursorState(filePath, state) {
  mkdirSync(dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  writeFileSync(tempPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  renameSync(tempPath, filePath);
}

function backupPathFor(filePath) {
  return `${filePath}.bak`;
}

function assertNoForbiddenCursorStatusFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenCursorStatusFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_CURSOR_STATUS_FIELDS.has(field)) {
      throw new ContractError(`${context}: unsafe cursor status field`, { field, path });
    }
    assertNoForbiddenCursorStatusFields(child, context, `${path}.${field}`);
  }
}

function assertExactBoundaryPolicy(policy, expected, context) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    throw new ContractError(`${context}: boundary policy is missing`);
  }
  for (const field of Object.keys(policy)) {
    if (!Object.hasOwn(expected, field)) {
      throw new ContractError(`${context}: unexpected boundary policy ${field}`);
    }
  }
}

function safeOptionalText(value, maxLength = 160) {
  if (value === undefined || value === null || value === "") return "";
  return safeText(value, maxLength);
}

function safeText(value, maxLength = 160) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function safeOptionalNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Number(number.toFixed(4));
}
