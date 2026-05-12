import { ContractError, assertNoWorldCommand } from "../../core/contracts.js";
import { SUPPORTED_LANGUAGE_CODES } from "./languageProfile.js";

const FORBIDDEN_TWISTER_FIELDS = new Set([
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
  "relationship_update_candidate",
  "action_type",
  "intent",
  "emotion",
  "tone",
  "character_tag",
  "task_type",
  "conversation_state",
  "relation_score",
]);

const TONGUE_TWISTER_REQUEST_PATTERN =
  /早口言葉|早口ことば|tongue\s*twister|zungenbrecher|trabalenguas|virelangue|trava[-\s]?língua|scioglilingua|скороговор|скороговорка|빠른말|ลิ้นพัน|விரைவு சொல்|زبان کی گرہ|لسان سريع/i;

const TONGUE_TWISTER_LINES = {
  ja: {
    setup_text: "短めでいくね。",
    phrase_text: "きらきらキリコが、きりっと霧を切る。",
    recovery_text: "言えた、たぶん今のは言えた。",
  },
  en: {
    setup_text: "Short one, here I go.",
    phrase_text: "Tiny tidy tea cups tip together.",
    recovery_text: "Okay, that almost tied my tongue.",
  },
  de: {
    setup_text: "Kurz und schnell, los.",
    phrase_text: "Kleine klare Katzen klatschen kaum.",
    recovery_text: "Uff, das war knapp sauber.",
  },
  zh: {
    setup_text: "来一个短的。",
    phrase_text: "小星星轻轻笑，小熊慢慢学。",
    recovery_text: "好，舌头还在。",
  },
  ru: {
    setup_text: "Коротко и быстро.",
    phrase_text: "Мила Мира мерно мыла миску.",
    recovery_text: "Уф, почти не споткнулась.",
  },
  es: {
    setup_text: "Uno cortito, voy.",
    phrase_text: "Luna lava la lana ligera.",
    recovery_text: "Uf, mi lengua sobrevivió.",
  },
  fr: {
    setup_text: "Un petit, je tente.",
    phrase_text: "Lina lit le livre lisse lentement.",
    recovery_text: "Ouf, c'était presque propre.",
  },
  pt: {
    setup_text: "Um curtinho, vamos.",
    phrase_text: "Lia lava lã leve.",
    recovery_text: "Nossa, quase enrolei.",
  },
  ar: {
    setup_text: "واحدة قصيرة، سأحاول.",
    phrase_text: "سلمى سمعت سمسما سريعا.",
    recovery_text: "حسنا، لم أتعثر كثيرا.",
  },
  bn: {
    setup_text: "ছোট করে বলছি।",
    phrase_text: "মিঠু মিষ্টি মেঘে মুগ্ধ।",
    recovery_text: "উফ, জিভটা বেঁচে গেল।",
  },
  ur: {
    setup_text: "ایک مختصر سی کوشش۔",
    phrase_text: "سارہ نے سات نرم ستارے سنبھالے۔",
    recovery_text: "اف، زبان ذرا سی پھسل گئی۔",
  },
  it: {
    setup_text: "Corto e veloce, ci provo.",
    phrase_text: "Lina lava la lana lilla.",
    recovery_text: "Ok, quasi perfetto.",
  },
  ko: {
    setup_text: "짧게 가볼게.",
    phrase_text: "라라가 라임 라떼를 랄랄라 마셔.",
    recovery_text: "오케이, 혀가 살짝 꼬였어.",
  },
  vi: {
    setup_text: "Một câu ngắn nhé.",
    phrase_text: "Linh lặng lẽ lật lá lúa.",
    recovery_text: "Phù, suýt líu lưỡi.",
  },
  th: {
    setup_text: "ขอสั้นๆ นะ",
    phrase_text: "ลาล่าเล่าเรื่องลมแล้ง",
    recovery_text: "โอเค ลิ้นยังไม่พันมาก",
  },
  hi: {
    setup_text: "एक छोटी कोशिश।",
    phrase_text: "रीना रोज रंगीन रिबन रखती है।",
    recovery_text: "उफ, जीभ लगभग उलझ गई।",
  },
  ta: {
    setup_text: "சிறியதாக முயற்சி செய்கிறேன்.",
    phrase_text: "லலிதா லேசாக லட்டு உருட்டினாள்.",
    recovery_text: "அஃப், நாக்கு கொஞ்சம் சிக்கியது.",
  },
  tr: {
    setup_text: "Kısa bir tane deniyorum.",
    phrase_text: "Leyla lale ile lila lamba aldı.",
    recovery_text: "Of, az kalsın dilim dolaşıyordu.",
  },
  id: {
    setup_text: "Yang pendek dulu.",
    phrase_text: "Lala lari lalu lihat lilin lucu.",
    recovery_text: "Hampir saja lidahku kepeleset.",
  },
  jv: {
    setup_text: "Sing cendhak wae.",
    phrase_text: "Lala lunga liwat lurung alon.",
    recovery_text: "Wah, ilatku meh kesleo.",
  },
  pl: {
    setup_text: "Krótko i szybko.",
    phrase_text: "Lila liczy lekkie listy.",
    recovery_text: "Uff, prawie się zaplątałam.",
  },
};

export function isTongueTwisterRequest(sourceText) {
  return TONGUE_TWISTER_REQUEST_PATTERN.test(String(sourceText ?? ""));
}

export function getTongueTwisterLine(languageCode = "en") {
  const code = TONGUE_TWISTER_LINES[languageCode] ? languageCode : "en";
  const source = TONGUE_TWISTER_LINES[code];
  const line = {
    schema: "iris_tongue_twister_line_v1",
    language: code,
    setup_text: source.setup_text,
    phrase_text: source.phrase_text,
    recovery_text: source.recovery_text,
    phrase_source: "iris_original_short_safe_phrase",
    rights_guard: "no_long_dialogue_lyrics_or_subtitles",
    max_attempt_duration_ms: 4200,
    retry_policy: "one_retry_then_normal_conversation",
    adapter_validation_required: true,
  };
  assertTongueTwisterLineSafe(line);
  return line;
}

export function getSupportedTongueTwisterSummaries() {
  return SUPPORTED_LANGUAGE_CODES.map((code) => {
    const line = getTongueTwisterLine(code);
    return {
      language: line.language,
      phrase_source: line.phrase_source,
      phrase_length: [...line.phrase_text].length,
      max_attempt_duration_ms: line.max_attempt_duration_ms,
      rights_guard: line.rights_guard,
    };
  });
}

export function assertTongueTwisterLineSafe(line, context = "tongue twister line") {
  if (!line || typeof line !== "object") {
    throw new ContractError(`${context}: missing tongue twister line`);
  }
  assertNoWorldCommand(line, context);
  assertNoForbiddenTongueTwisterFields(line, context);
  if (line.schema !== "iris_tongue_twister_line_v1") {
    throw new ContractError(`${context}: invalid schema`, { schema: line.schema });
  }
  if (!SUPPORTED_LANGUAGE_CODES.includes(line.language)) {
    throw new ContractError(`${context}: unsupported language`, { language: line.language });
  }
  if (line.adapter_validation_required !== true) {
    throw new ContractError(`${context}: adapter_validation_required must be true`);
  }
  if (line.phrase_source !== "iris_original_short_safe_phrase") {
    throw new ContractError(`${context}: phrase source must be local and safe`);
  }
  if (line.rights_guard !== "no_long_dialogue_lyrics_or_subtitles") {
    throw new ContractError(`${context}: invalid rights guard`);
  }
  if ([...String(line.phrase_text ?? "")].length > 80) {
    throw new ContractError(`${context}: phrase is too long for bounded mode`);
  }
}

function assertNoForbiddenTongueTwisterFields(value, context, path = "root") {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenTongueTwisterFields(item, context, `${path}[${index}]`)
    );
    return;
  }
  for (const [field, child] of Object.entries(value)) {
    if (FORBIDDEN_TWISTER_FIELDS.has(field)) {
      throw new ContractError(`${context}: tongue twister must not define command or canonical fields`, {
        field,
        path,
      });
    }
    assertNoForbiddenTongueTwisterFields(child, context, `${path}.${field}`);
  }
}
