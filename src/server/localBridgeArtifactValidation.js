const LIVE2D_ARTIFACT_SCHEMAS = new Set([
  "iris_local_live2d_cue_artifact_v1",
  "iris_local_live2d_engine_artifact_v1",
]);
const LIVE2D_ENGINE_CUE_SCHEMAS = new Set([
  "iris_live2d_renderer_cue_v1",
]);

const FORBIDDEN_ARTIFACT_FIELDS = new Set([
  "world_command",
  "input_action",
  "input_action_candidate",
  "approved_game_input_action",
  "execute",
  "commit",
  "write",
  "apply",
  "memory_write",
  "direct_memory_write",
  "commit_memory",
  "relationship_update_candidate",
  "memory_carryover_candidates",
  "community_memory_candidates",
  "approved_memory_record",
  "approved_relationship_record",
  "final_text",
  "text",
  "subtitle_text",
  "raw_packet",
  "job_payload",
  "endpoint",
  "url",
  "audio_url",
  "artifact_url",
  "authorization",
  "api_key",
  "apiKey",
  "token",
  "secret",
  "password",
]);

export function validateLocalRenderArtifactForPickup({
  adapterKind,
  artifact,
  contentType,
  bytes,
} = {}) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) {
    return invalidResult();
  }
  const safeAdapterKind = safeText(adapterKind, 40);
  if (safeAdapterKind === "tts") {
    return validateAudioArtifact({ artifact, contentType, bytes });
  }
  if (safeAdapterKind === "live2d") {
    return validateLive2dArtifact({ bytes });
  }
  if (safeAdapterKind === "subtitle") {
    return validateSubtitleArtifact({ artifact, contentType, bytes });
  }
  return invalidResult();
}

function validateAudioArtifact({ artifact, contentType, bytes }) {
  const artifactKind = safeText(artifact?.artifact_kind, 80);
  const safeContentType = normalizeContentType(contentType);
  if (artifactKind === "audio_wav" || safeContentType === "audio/wav" || safeContentType === "audio/x-wav") {
    return hasAscii(bytes, 0, "RIFF") && hasAscii(bytes, 8, "WAVE")
      ? validResult()
      : invalidResult();
  }
  if (artifactKind === "audio_ogg" || safeContentType === "audio/ogg") {
    return hasAscii(bytes, 0, "OggS") || isEbmlContainer(bytes) ? validResult() : invalidResult();
  }
  if (artifactKind === "audio_opus" || safeContentType === "audio/opus") {
    return hasAscii(bytes, 0, "OggS") || isEbmlContainer(bytes)
      ? validResult()
      : invalidResult();
  }
  if (
    artifactKind === "audio_webm" ||
    safeContentType === "audio/webm" ||
    safeContentType === "video/webm"
  ) {
    return isEbmlContainer(bytes) ? validResult() : invalidResult();
  }
  if (artifactKind === "audio_mp4" || safeContentType === "audio/mp4" || safeContentType === "audio/m4a" || safeContentType === "audio/x-m4a") {
    return isMp4Container(bytes) ? validResult() : invalidResult();
  }
  if (artifactKind === "audio_aac" || safeContentType === "audio/aac" || safeContentType === "audio/x-aac") {
    return isAacAdtsStream(bytes) ? validResult() : invalidResult();
  }
  if (artifactKind === "audio_flac" || safeContentType === "audio/flac" || safeContentType === "audio/x-flac") {
    return hasAscii(bytes, 0, "fLaC") ? validResult() : invalidResult();
  }
  if (
    artifactKind === "audio_mpeg" ||
    safeContentType === "audio/mpeg" ||
    safeContentType === "audio/mp3" ||
    safeContentType === "audio/mpeg3" ||
    safeContentType === "audio/x-mp3" ||
    safeContentType === "audio/x-mpeg" ||
    safeContentType === "audio/x-mpeg-3"
  ) {
    return hasAscii(bytes, 0, "ID3") || bytes[0] === 0xff ? validResult() : invalidResult();
  }
  return invalidResult();
}

function normalizeContentType(value) {
  return safeText(value, 80).toLowerCase().split(";", 1)[0].trim();
}

function validateLive2dArtifact({ bytes }) {
  try {
    const parsed = JSON.parse(bytes.toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return invalidResult();
    const schema = safeText(parsed.schema, 120);
    if (!LIVE2D_ARTIFACT_SCHEMAS.has(schema)) return invalidResult();
    if (hasForbiddenArtifactField(parsed)) return invalidResult();
    if (schema === "iris_local_live2d_engine_artifact_v1") {
      const cue = parsed.cue;
      if (!cue || typeof cue !== "object" || Array.isArray(cue)) return invalidResult();
      if (!LIVE2D_ENGINE_CUE_SCHEMAS.has(safeText(cue.schema, 120))) return invalidResult();
    }
    return validResult();
  } catch {
    return invalidResult();
  }
}

function validateSubtitleArtifact({ artifact, contentType, bytes }) {
  const artifactKind = safeText(artifact?.artifact_kind, 80);
  const safeContentType = normalizeContentType(contentType);
  const text = bytes.toString("utf8", 0, Math.min(bytes.length, 128)).replace(/^\uFEFF/, "");
  if (artifactKind === "subtitle_srt" || safeContentType === "application/x-subrip" || safeContentType === "text/srt") {
    return /^\d+\s*\r?\n\d{2}:\d{2}:\d{2}[,.]\d{3}\s+-->\s+\d{2}:\d{2}:\d{2}[,.]\d{3}/u.test(text)
      ? validResult()
      : invalidResult();
  }
  return text.startsWith("WEBVTT") ? validResult() : invalidResult();
}

function validResult() {
  return {
    contract_valid: true,
    contract_status: "valid",
  };
}

function invalidResult() {
  return {
    contract_valid: false,
    contract_status: "invalid_artifact",
  };
}

function hasAscii(bytes, offset, expected) {
  if (bytes.length < offset + expected.length) return false;
  return bytes.toString("ascii", offset, offset + expected.length) === expected;
}

function isEbmlContainer(bytes) {
  return bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
}

function isMp4Container(bytes) {
  return bytes.length >= 12 && hasAscii(bytes, 4, "ftyp");
}

function isAacAdtsStream(bytes) {
  return bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xf6) === 0xf0;
}

function hasForbiddenArtifactField(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => hasForbiddenArtifactField(item));
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_ARTIFACT_FIELDS.has(field)) return true;
    if (hasForbiddenArtifactField(child)) return true;
  }
  return false;
}

function safeText(value, maxLength = 160) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}
