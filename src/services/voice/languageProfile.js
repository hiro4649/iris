import { ContractError, assertNoWorldCommand } from "../../core/contracts.js";

const FORBIDDEN_LANGUAGE_FIELDS = new Set([
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
  "selected_memory_ids",
  "raw_memory_ids",
  "memory_ids",
  "relationship_update_candidate",
  "raw_translation_prompt",
  "translation_prompt",
  "raw_translation_context",
  "vendor_token",
  "translation_vendor_token",
  "api_key",
  "token",
  "action_type",
  "intent",
  "emotion",
  "tone",
  "character_tag",
  "task_type",
  "conversation_state",
  "relation_score",
]);

const LANGUAGE_DEFINITIONS = [
  {
    code: "ja",
    label: "日本語",
    englishLabel: "Japanese",
    aliases: ["日本語", "Japanese", "にほんご"],
    script: "japanese",
    direction: "ltr",
    lineBreakMode: "ja_phrase",
    localeHint: "ja-JP",
    detection: /[\u3040-\u30ff]/u,
  },
  {
    code: "en",
    label: "英語",
    englishLabel: "English",
    aliases: ["英語", "English"],
    script: "latin",
    direction: "ltr",
    lineBreakMode: "word",
    localeHint: "en-US",
    detection: /\b(hello|thanks|thank you|please|english)\b/i,
  },
  {
    code: "de",
    label: "ドイツ語",
    englishLabel: "German",
    aliases: ["ドイツ語", "German", "Deutsch"],
    script: "latin",
    direction: "ltr",
    lineBreakMode: "word",
    localeHint: "de-DE",
    detection: /\b(hallo|danke|bitte|deutsch)\b|[äöüß]/i,
  },
  {
    code: "zh",
    label: "中国語",
    englishLabel: "Chinese",
    aliases: ["中国語", "中文", "Chinese"],
    script: "han",
    direction: "ltr",
    lineBreakMode: "cjk_phrase",
    localeHint: "zh-CN",
    detection: /[\u4e00-\u9fff]/u,
  },
  {
    code: "ru",
    label: "ロシア語",
    englishLabel: "Russian",
    aliases: ["ロシア語", "Russian", "русский"],
    script: "cyrillic",
    direction: "ltr",
    lineBreakMode: "word",
    localeHint: "ru-RU",
    detection: /[\u0400-\u04ff]/u,
  },
  {
    code: "es",
    label: "スペイン語",
    englishLabel: "Spanish",
    aliases: ["スペイン語", "Spanish", "español"],
    script: "latin",
    direction: "ltr",
    lineBreakMode: "word",
    localeHint: "es-ES",
    detection: /[¿¡]|\b(hola|gracias|por favor|español)\b/i,
  },
  {
    code: "fr",
    label: "フランス語",
    englishLabel: "French",
    aliases: ["フランス語", "French", "français"],
    script: "latin",
    direction: "ltr",
    lineBreakMode: "word",
    localeHint: "fr-FR",
    detection: /\b(bonjour|merci|français|s'il vous plait)\b|[çœ]/i,
  },
  {
    code: "pt",
    label: "ポルトガル語",
    englishLabel: "Portuguese",
    aliases: ["ポルトガル語", "Portuguese", "português"],
    script: "latin",
    direction: "ltr",
    lineBreakMode: "word",
    localeHint: "pt-BR",
    detection: /\b(olá|obrigad[ao]|você|português|não)\b/i,
  },
  {
    code: "ar",
    label: "アラビア語",
    englishLabel: "Arabic",
    aliases: ["アラビア語", "Arabic", "العربية"],
    script: "arabic",
    direction: "rtl",
    lineBreakMode: "rtl_word",
    localeHint: "ar",
    detection: /[\u0600-\u06ff]/u,
  },
  {
    code: "bn",
    label: "ベンガル語",
    englishLabel: "Bengali",
    aliases: ["ベンガル語", "Bengali", "বাংলা"],
    script: "bengali",
    direction: "ltr",
    lineBreakMode: "word",
    localeHint: "bn-BD",
    detection: /[\u0980-\u09ff]/u,
  },
  {
    code: "ur",
    label: "ウルドゥー語",
    englishLabel: "Urdu",
    aliases: ["ウルドゥー語", "Urdu", "اردو"],
    script: "arabic",
    direction: "rtl",
    lineBreakMode: "rtl_word",
    localeHint: "ur-PK",
    detection: /اردو|[\u0750-\u077f\u08a0-\u08ff]/u,
  },
  {
    code: "it",
    label: "イタリア語",
    englishLabel: "Italian",
    aliases: ["イタリア語", "Italian", "italiano"],
    script: "latin",
    direction: "ltr",
    lineBreakMode: "word",
    localeHint: "it-IT",
    detection: /\b(ciao|grazie|italiano|per favore)\b/i,
  },
  {
    code: "ko",
    label: "韓国語",
    englishLabel: "Korean",
    aliases: ["韓国語", "Korean", "한국어"],
    script: "hangul",
    direction: "ltr",
    lineBreakMode: "ko_phrase",
    localeHint: "ko-KR",
    detection: /[\uac00-\ud7af]/u,
  },
  {
    code: "vi",
    label: "ベトナム語",
    englishLabel: "Vietnamese",
    aliases: ["ベトナム語", "Vietnamese", "tiếng Việt"],
    script: "latin",
    direction: "ltr",
    lineBreakMode: "word",
    localeHint: "vi-VN",
    detection: /\b(xin chào|cảm ơn|tiếng việt)\b|[ăâđêôơư]/i,
  },
  {
    code: "th",
    label: "タイ語",
    englishLabel: "Thai",
    aliases: ["タイ語", "Thai", "ภาษาไทย"],
    script: "thai",
    direction: "ltr",
    lineBreakMode: "thai_phrase",
    localeHint: "th-TH",
    detection: /[\u0e00-\u0e7f]/u,
  },
  {
    code: "hi",
    label: "ヒンディー語",
    englishLabel: "Hindi",
    aliases: ["ヒンディー語", "Hindi", "हिन्दी"],
    script: "devanagari",
    direction: "ltr",
    lineBreakMode: "word",
    localeHint: "hi-IN",
    detection: /[\u0900-\u097f]/u,
  },
  {
    code: "ta",
    label: "タミル語",
    englishLabel: "Tamil",
    aliases: ["タミル語", "Tamil", "தமிழ்"],
    script: "tamil",
    direction: "ltr",
    lineBreakMode: "word",
    localeHint: "ta-IN",
    detection: /[\u0b80-\u0bff]/u,
  },
  {
    code: "tr",
    label: "トルコ語",
    englishLabel: "Turkish",
    aliases: ["トルコ語", "Turkish", "Türkçe"],
    script: "latin",
    direction: "ltr",
    lineBreakMode: "word",
    localeHint: "tr-TR",
    detection: /\b(merhaba|teşekkür|türkçe)\b|[çğıöşü]/i,
  },
  {
    code: "id",
    label: "インドネシア語",
    englishLabel: "Indonesian",
    aliases: ["インドネシア語", "Indonesian", "bahasa indonesia"],
    script: "latin",
    direction: "ltr",
    lineBreakMode: "word",
    localeHint: "id-ID",
    detection: /\b(halo|terima kasih|apa kabar|bahasa indonesia)\b/i,
  },
  {
    code: "jv",
    label: "ジャワ語",
    englishLabel: "Javanese",
    aliases: ["ジャワ語", "Javanese", "basa jawa"],
    script: "latin",
    direction: "ltr",
    lineBreakMode: "word",
    localeHint: "jv-ID",
    detection: /\b(sugeng|matur nuwun|basa jawa|javanese)\b|[\ua980-\ua9df]/iu,
  },
  {
    code: "pl",
    label: "ポーランド語",
    englishLabel: "Polish",
    aliases: ["ポーランド語", "Polish", "polski"],
    script: "latin",
    direction: "ltr",
    lineBreakMode: "word",
    localeHint: "pl-PL",
    detection: /\b(cześć|dziękuję|polski)\b|[ąćęłńóśźż]/i,
  },
];

export const SUPPORTED_LANGUAGE_CODES = Object.freeze(
  LANGUAGE_DEFINITIONS.map((language) => language.code)
);

export function createLanguageProfile({
  event = null,
  finalOutput = null,
  defaultLanguage = "ja",
} = {}) {
  assertNoWorldCommand(event, "Language profile event input");
  assertNoWorldCommand(finalOutput, "Language profile final output input");

  const sourceText = collectLanguageSourceText({ event, finalOutput });
  const requested = detectRequestedLanguage(sourceText);
  const detected = detectSpokenLanguage(
    String(event?.payload?.text ?? event?.payload?.message ?? sourceText ?? "")
  );
  const response = requested ?? detectSpokenLanguage(finalOutput?.final_text ?? "") ?? detected;
  const selected = getLanguageDefinition(response?.code ?? defaultLanguage) ?? getLanguageDefinition("ja");

  const profile = {
    schema: "iris_language_profile_v1",
    trace_id: finalOutput?.trace_id ?? event?.trace_id ?? null,
    event_id: finalOutput?.event_id ?? event?.event_id ?? null,
    internal_profile: true,
    detected_language: detected?.code ?? selected.code,
    requested_language: requested?.code ?? null,
    response_language: selected.code,
    response_language_label: selected.label,
    supported_language: true,
    mixed_language_allowed: selected.code !== (detected?.code ?? selected.code),
    pronunciation_profile: {
      pronunciation_profile_id: `pronunciation_${selected.code}_v1`,
      voice_locale_hint: selected.localeHint,
      natural_rhythm_hint: selected.lineBreakMode,
      avoid_extreme_slow: true,
    },
    script_profile: {
      script: selected.script,
      direction: selected.direction,
      line_break_mode: selected.lineBreakMode,
    },
    subtitle_language: selected.code,
    translation_policy: "preserve_meaning_with_safety_check",
    adapter_validation_required: true,
  };

  assertLanguageProfileSafe(profile);
  return profile;
}

export function assertLanguageProfileSafe(profile, context = "language profile") {
  if (!profile || typeof profile !== "object") {
    throw new ContractError(`${context}: missing language profile`);
  }
  assertNoWorldCommand(profile, context);
  assertNoForbiddenLanguageFields(profile, context);
  if (profile.schema !== "iris_language_profile_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: profile.schema });
  }
  if (profile.internal_profile !== true) {
    throw new ContractError(`${context}: internal_profile must be true`);
  }
  if (profile.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
  if (!SUPPORTED_LANGUAGE_CODES.includes(profile.response_language)) {
    throw new ContractError(`${context}: unsupported response language`, {
      response_language: profile.response_language,
    });
  }
  if (!["ltr", "rtl"].includes(profile.script_profile?.direction)) {
    throw new ContractError(`${context}: invalid script direction`, {
      direction: profile.script_profile?.direction,
    });
  }
}

export function sanitizeLanguageProfileForPublicState(profile) {
  if (!profile) return null;
  assertLanguageProfileSafe(profile, "Language profile public summary");
  return {
    schema: profile.schema,
    trace_id: profile.trace_id ?? null,
    event_id: profile.event_id ?? null,
    selected_language: profile.response_language,
    selected_language_label: profile.response_language_label,
    subtitle_language: profile.subtitle_language,
    subtitle_enabled: true,
    script_direction: profile.script_profile?.direction ?? null,
    line_break_mode: profile.script_profile?.line_break_mode ?? null,
    supported_language: profile.supported_language === true,
    mixed_language_allowed: profile.mixed_language_allowed === true,
    adapter_validation_required: true,
  };
}

export function getLanguageDefinition(code) {
  return LANGUAGE_DEFINITIONS.find((language) => language.code === code) ?? null;
}

export function getSupportedLanguageSummaries() {
  return LANGUAGE_DEFINITIONS.map((language) => ({
    code: language.code,
    label: language.label,
    english_label: language.englishLabel,
    script: language.script,
    direction: language.direction,
    line_break_mode: language.lineBreakMode,
    locale_hint: language.localeHint,
  }));
}

export function detectRequestedLanguageCode(sourceText) {
  return detectRequestedLanguage(sourceText)?.code ?? null;
}

export function detectSpokenLanguageCode(sourceText) {
  return detectSpokenLanguage(sourceText)?.code ?? null;
}

function collectLanguageSourceText({ event, finalOutput }) {
  return [
    event?.payload?.text,
    event?.payload?.message,
    event?.payload?.comment,
    event?.payload?.requested_language,
    finalOutput?.final_text,
  ]
    .filter(Boolean)
    .map(String)
    .join(" ");
}

function detectRequestedLanguage(sourceText) {
  const text = String(sourceText ?? "");
  const lower = text.toLowerCase();
  for (const language of LANGUAGE_DEFINITIONS) {
    for (const alias of language.aliases) {
      if (lower.includes(alias.toLowerCase())) return language;
    }
  }
  return null;
}

function detectSpokenLanguage(sourceText) {
  const text = String(sourceText ?? "").trim();
  if (!text) return null;
  const hasKana = /[\u3040-\u30ff]/u.test(text);
  if (hasKana) return getLanguageDefinition("ja");
  for (const language of LANGUAGE_DEFINITIONS) {
    if (language.code === "ja") continue;
    if (language.code === "zh" && hasKana) continue;
    if (language.detection.test(text)) return language;
  }
  return getLanguageDefinition("en");
}

function assertNoForbiddenLanguageFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenLanguageFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_LANGUAGE_FIELDS.has(field)) {
      throw new ContractError(`${context}: language profile must not define command or canonical fields`, {
        field,
        path,
      });
    }
    assertNoForbiddenLanguageFields(child, context, `${path}.${field}`);
  }
}
