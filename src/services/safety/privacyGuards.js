const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /authorization/i,
  /bearer/i,
  /api[_-]?key/i,
  /oauth/i,
  /access[_-]?token/i,
  /refresh[_-]?token/i,
  /\btoken\b/i,
  /\bendpoint\b/i,
  /\burl\b/i,
  /https?:\/\//i,
  /world_command/i,
  /input_action_candidate/i,
  /approved_game_input_action/i,
  /direct_memory_write/i,
  /commit_memory/i,
  /address/i,
  /phone/i,
  /email/i,
  /medical/i,
  /diagnosis/i,
  /real[- ]?name/i,
  /住所/,
  /電話/,
  /メール/,
  /病気/,
  /診断/,
  /本名/,
  /秘密/,
];

const PRIVATE_PATTERNS = [/private/i, /personal/i, /個人/, /内緒/];
const PUBLIC_PATTERNS = [/meme/i, /community/i, /public/i, /共有/, /みんな/];

export function inferSensitivityLevel(text) {
  const value = String(text ?? "");
  if (SENSITIVE_PATTERNS.some((pattern) => pattern.test(value))) return "sensitive";
  if (PRIVATE_PATTERNS.some((pattern) => pattern.test(value))) return "private";
  if (PUBLIC_PATTERNS.some((pattern) => pattern.test(value))) return "public";
  return "low";
}

export function redactSensitiveText(text, { maxLength = 220 } = {}) {
  let value = String(text ?? "");
  for (const pattern of [...SENSITIVE_PATTERNS, ...PRIVATE_PATTERNS]) {
    value = value.replace(pattern, "[redacted]");
  }
  return value.slice(0, maxLength);
}

export function containsPrivateSignal(text) {
  const level = inferSensitivityLevel(text);
  return level === "sensitive" || level === "private";
}
