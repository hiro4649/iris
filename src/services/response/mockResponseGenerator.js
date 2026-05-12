import {
  detectRequestedLanguageCode,
  detectSpokenLanguageCode,
} from "../voice/languageProfile.js";
import {
  getTongueTwisterLine,
  isTongueTwisterRequest,
} from "../voice/tongueTwisterCatalog.js";

const LOCALIZED_LINES = {
  en: {
    listening: "I am here and listening.",
    game: "I am watching the game now. {summary}. I will comment on what changed, not pretend I pressed anything.",
    donation: "Thank you{name}. I am really happy, and I will keep the stream open for everyone too.",
    media: "I am watching that with you. I will react to what I notice without quoting the video directly.",
    topic: "I saw a topic note. I can use it as a conversation seed, but I will treat it as an observation rather than confirmed truth.",
    funny: "That timing got me too.",
    hello: "Hi{name}. I am glad you came by.",
    echo: "I hear you. {text}",
    memory: " I remember the thread: {summary}.",
    relationship: " I remember you: {summary}.",
  },
  ja: {
    listening: "ここにいるよ。ちゃんと聞いてる。",
    game: "ゲーム画面、見てるよ。{summary}。変化にコメントするけど、操作したふりはしないよ。",
    donation: "ありがとう{name}。すごくうれしいし、配信はみんなにも開いたまま大事に進めるね。",
    media: "一緒に見てるよ。動画の台詞をそのまま引用せずに、気づいたことへ反応するね。",
    topic: "話題メモを見たよ。会話のきっかけにはするけど、確定情報としては扱わないよ。",
    funny: "そのタイミング、私もつられた。",
    hello: "来てくれてうれしいよ{name}。",
    echo: "聞こえてるよ。{text}",
    memory: " 前の流れも覚えてるよ: {summary}。",
    relationship: " あなたのことも覚えてるよ: {summary}。",
  },
  de: {    listening: "Ich bin da und höre zu.",
    game: "Ich schaue gerade auf das Spiel. {summary}. Ich kommentiere, was sich ändert, ohne so zu tun, als hätte ich etwas gedrückt.",
    donation: "Danke{name}. Das freut mich wirklich, und ich halte den Stream weiter offen für alle.",
    media: "Ich schaue das mit dir. Ich reagiere auf das, was ich bemerke, ohne das Video direkt zu zitieren.",
    topic: "Ich habe die Themennotiz gesehen. Ich nutze sie als Gesprächsanstoß, nicht als bestätigte Tatsache.",
    funny: "Dieses Timing hat mich auch erwischt.",
    hello: "Hallo{name}. Schön, dass du da bist.",
    echo: "Ich höre dich. {text}",
    memory: " Ich erinnere mich an den Verlauf: {summary}.",
    relationship: " Ich erinnere mich an dich: {summary}.",
  },
  zh: {
    listening: "我在这里，也在认真听。",
    game: "我正在看游戏画面。{summary}。我会评论变化，但不会假装自己按了操作。",
    donation: "谢谢{name}。我真的很开心，也会继续把直播留给大家一起看。",
    media: "我在和你一起看。我会说出自己的反应，不直接复述视频内容。",
    topic: "我看到了这个话题提示。可以拿来聊天，但不会当成已确认事实。",
    funny: "这个时机也把我逗到了。",
    hello: "你好{name}。很高兴你来了。",
    echo: "我听到了。{text}",
    memory: " 我记得之前的内容: {summary}。",
    relationship: " 我记得你: {summary}。",
  },
  ru: {
    listening: "Я здесь и слушаю.",
    game: "Я смотрю на игру. {summary}. Я буду комментировать изменения, не притворяясь, что нажимала кнопки.",
    donation: "Спасибо{name}. Мне очень приятно, и я сохраню стрим открытым для всех.",
    media: "Я смотрю это вместе с тобой. Буду реагировать на детали, не цитируя видео дословно.",
    topic: "Я увидела заметку о теме. Могу использовать ее как повод для разговора, но не как подтвержденный факт.",
    funny: "Этот момент меня тоже поймал.",
    hello: "Привет{name}. Рада, что ты пришел.",
    echo: "Я слышу тебя. {text}",
    memory: " Я помню этот контекст: {summary}.",
    relationship: " Я помню тебя: {summary}.",
  },
  es: {
    listening: "Estoy aquí y te escucho.",
    game: "Estoy viendo el juego ahora. {summary}. Comentaré lo que cambie sin fingir que pulsé nada.",
    donation: "Gracias{name}. Me hace muy feliz, y mantendré el stream abierto para todos.",
    media: "Estoy viendo eso contigo. Reaccionaré a lo que note sin citar el video directamente.",
    topic: "Vi una nota de tema. La usaré como semilla de conversación, no como verdad confirmada.",
    funny: "Ese timing también me atrapó.",
    hello: "Hola{name}. Me alegra que hayas venido.",
    echo: "Te escucho. {text}",
    memory: " Recuerdo el hilo: {summary}.",
    relationship: " Te recuerdo: {summary}.",
  },
  fr: {
    listening: "Je suis là et j'écoute.",
    game: "Je regarde le jeu maintenant. {summary}. Je commenterai ce qui change sans prétendre avoir appuyé sur quoi que ce soit.",
    donation: "Merci{name}. Ça me fait vraiment plaisir, et je garde le stream ouvert pour tout le monde.",
    media: "Je regarde ça avec toi. Je réagirai à ce que je remarque sans citer directement la vidéo.",
    topic: "J'ai vu une note de sujet. Je peux m'en servir pour discuter, pas comme une vérité confirmée.",
    funny: "Ce timing m'a eue aussi.",
    hello: "Bonjour{name}. Je suis contente que tu sois là.",
    echo: "Je t'entends. {text}",
    memory: " Je me souviens du fil: {summary}.",
    relationship: " Je me souviens de toi: {summary}.",
  },
  pt: {
    listening: "Estou aqui e ouvindo.",
    game: "Estou vendo o jogo agora. {summary}. Vou comentar o que mudou sem fingir que apertei nada.",
    donation: "Obrigada{name}. Fico muito feliz, e vou manter a live aberta para todo mundo.",
    media: "Estou vendo isso com você. Vou reagir ao que notar sem citar o vídeo diretamente.",
    topic: "Vi uma nota de assunto. Posso usar como começo de conversa, não como fato confirmado.",
    funny: "Esse timing também me pegou.",
    hello: "Olá{name}. Fico feliz que você veio.",
    echo: "Eu te ouvi. {text}",
    memory: " Eu lembro do fio da conversa: {summary}.",
    relationship: " Eu lembro de você: {summary}.",
  },
  ar: {
    listening: "أنا هنا وأستمع إليك.",
    game: "أنا أتابع اللعبة الآن. {summary}. سأعلق على ما يتغير من دون أن أدعي أنني ضغطت شيئا.",
    donation: "شكرا{name}. أنا سعيدة جدا، وسأبقي البث مفتوحا للجميع.",
    media: "أنا أشاهد هذا معك. سأتفاعل مع ما ألاحظه من دون اقتباس الفيديو مباشرة.",
    topic: "رأيت ملاحظة عن الموضوع. سأستخدمها كبداية حديث، لا كحقيقة مؤكدة.",
    funny: "هذا التوقيت أضحكني أيضا.",
    hello: "مرحبا{name}. سعيدة بوجودك هنا.",
    echo: "أسمعك. {text}",
    memory: " أتذكر سياق الحديث: {summary}.",
    relationship: " أتذكرك: {summary}.",
  },
  bn: {
    listening: "আমি এখানে আছি, শুনছি।",
    game: "আমি এখন খেলাটা দেখছি। {summary}। কী বদলাচ্ছে তা বলব, কিন্তু আমি কিছু চাপলাম বলে ভান করব না।",
    donation: "ধন্যবাদ{name}। আমি সত্যিই খুশি, আর স্ট্রিম সবার জন্য খোলা রাখব।",
    media: "আমি তোমার সঙ্গে এটা দেখছি। ভিডিও সরাসরি উদ্ধৃত না করে যা দেখি তাতে প্রতিক্রিয়া দেব।",
    topic: "আমি বিষয়ের নোট দেখেছি। এটাকে আলাপের সূত্র হিসেবে নেব, নিশ্চিত সত্য হিসেবে নয়।",
    funny: "এই টাইমিংটা আমাকেও ধরেছে।",
    hello: "হ্যালো{name}। তুমি এসেছ, ভালো লাগছে।",
    echo: "আমি শুনছি। {text}",
    memory: " আগের কথোপকথন মনে আছে: {summary}.",
    relationship: " তোমাকে মনে আছে: {summary}.",
  },
  ur: {
    listening: "میں یہاں ہوں اور سن رہی ہوں۔",
    game: "میں ابھی کھیل دیکھ رہی ہوں۔ {summary}۔ میں تبدیلی پر تبصرہ کروں گی، یہ دکھاوا نہیں کہ میں نے کچھ دبایا۔",
    donation: "شکریہ{name}۔ مجھے واقعی خوشی ہوئی، اور میں اسٹریم سب کے لیے کھلا رکھوں گی۔",
    media: "میں یہ تمہارے ساتھ دیکھ رہی ہوں۔ ویڈیو کو براہ راست نقل کیے بغیر اپنی رائے دوں گی۔",
    topic: "میں نے موضوع کا نوٹ دیکھا۔ اسے گفتگو کی شروعات سمجھوں گی، پکی حقیقت نہیں۔",
    funny: "اس وقت نے مجھے بھی ہنسا دیا۔",
    hello: "سلام{name}۔ خوشی ہے کہ تم آئے۔",
    echo: "میں سن رہی ہوں۔ {text}",
    memory: " مجھے پچھلی بات یاد ہے: {summary}.",
    relationship: " مجھے تم یاد ہو: {summary}.",
  },
  it: {
    listening: "Sono qui e ti ascolto.",
    game: "Sto guardando il gioco ora. {summary}. Commenterò ciò che cambia senza fingere di aver premuto qualcosa.",
    donation: "Grazie{name}. Sono davvero felice, e terrò lo stream aperto per tutti.",
    media: "Lo sto guardando con te. Reagirò a ciò che noto senza citare direttamente il video.",
    topic: "Ho visto una nota sull'argomento. La userò come spunto, non come fatto confermato.",
    funny: "Quel tempismo ha colpito anche me.",
    hello: "Ciao{name}. Sono felice che tu sia qui.",
    echo: "Ti sento. {text}",
    memory: " Ricordo il filo: {summary}.",
    relationship: " Mi ricordo di te: {summary}.",
  },
  ko: {
    listening: "나 여기 있고, 듣고 있어.",
    game: "지금 게임 화면을 보고 있어. {summary}. 바뀐 점은 말하되, 내가 조작한 척은 하지 않을게.",
    donation: "고마워{name}. 정말 기쁘고, 방송은 모두에게 열어 둔 채로 갈게.",
    media: "너랑 같이 보고 있어. 영상 내용을 그대로 인용하지 않고 내가 느낀 점으로 반응할게.",
    topic: "주제 메모를 봤어. 대화의 씨앗으로 쓰되, 확인된 사실처럼 말하진 않을게.",
    funny: "그 타이밍, 나도 당했어.",
    hello: "안녕{name}. 와 줘서 기뻐.",
    echo: "듣고 있어. {text}",
    memory: " 이전 흐름도 기억해: {summary}.",
    relationship: " 너를 기억하고 있어: {summary}.",
  },
  vi: {
    listening: "Mình ở đây và đang lắng nghe.",
    game: "Mình đang xem game. {summary}. Mình sẽ bình luận điều thay đổi, không giả vờ là mình đã bấm gì.",
    donation: "Cảm ơn{name}. Mình rất vui, và vẫn giữ stream mở cho mọi người.",
    media: "Mình đang xem cùng bạn. Mình sẽ phản ứng với điều nhận ra mà không trích nguyên video.",
    topic: "Mình đã thấy ghi chú chủ đề. Mình dùng nó để gợi chuyện, không xem như sự thật đã xác nhận.",
    funny: "Cái timing đó cũng làm mình bật cười.",
    hello: "Xin chào{name}. Mình vui vì bạn ghé qua.",
    echo: "Mình nghe bạn. {text}",
    memory: " Mình nhớ mạch chuyện: {summary}.",
    relationship: " Mình nhớ bạn: {summary}.",
  },
  th: {
    listening: "ฉันอยู่ตรงนี้และกำลังฟังอยู่",
    game: "ฉันกำลังดูเกมอยู่ตอนนี้ {summary} ฉันจะคอมเมนต์สิ่งที่เปลี่ยนไป ไม่แกล้งทำว่าได้กดอะไรเอง",
    donation: "ขอบคุณ{name} ฉันดีใจมาก และจะให้สตรีมเปิดสำหรับทุกคนต่อไป",
    media: "ฉันกำลังดูไปพร้อมกับคุณ จะตอบสนองจากสิ่งที่สังเกตเห็นโดยไม่ยกคำพูดจากวิดีโอตรงๆ",
    topic: "ฉันเห็นโน้ตหัวข้อแล้ว จะใช้เป็นจุดเริ่มคุย ไม่ใช่ข้อเท็จจริงที่ยืนยันแล้ว",
    funny: "จังหวะนั้นทำฉันหลุดเหมือนกัน",
    hello: "สวัสดี{name} ดีใจที่คุณมา",
    echo: "ฉันได้ยินนะ {text}",
    memory: " ฉันจำบริบทก่อนหน้าได้: {summary}.",
    relationship: " ฉันจำคุณได้: {summary}.",
  },
  hi: {
    listening: "मैं यहीं हूँ और सुन रही हूँ।",
    game: "मैं अभी खेल देख रही हूँ। {summary}। जो बदलता है उस पर बोलूँगी, यह नहीं जताऊँगी कि मैंने कुछ दबाया।",
    donation: "धन्यवाद{name}। मुझे सच में खुशी हुई, और मैं स्ट्रीम सबके लिए खुली रखूँगी।",
    media: "मैं यह तुम्हारे साथ देख रही हूँ। वीडियो को सीधे उद्धृत किए बिना अपनी प्रतिक्रिया दूँगी।",
    topic: "मैंने विषय नोट देखा। इसे बातचीत की शुरुआत मानूँगी, पक्का तथ्य नहीं।",
    funny: "उस टाइमिंग ने मुझे भी हँसा दिया।",
    hello: "नमस्ते{name}। तुम्हारे आने से खुशी हुई।",
    echo: "मैं सुन रही हूँ। {text}",
    memory: " मुझे पिछला संदर्भ याद है: {summary}.",
    relationship: " मुझे तुम याद हो: {summary}.",
  },
  ta: {
    listening: "நான் இங்கே இருக்கிறேன், கேட்கிறேன்.",
    game: "நான் இப்போது விளையாட்டைப் பார்க்கிறேன். {summary}. என்ன மாறுகிறது என்பதைப் பேசுவேன்; நான் ஏதோ அழுத்தினேன் என்று நடிக்க மாட்டேன்.",
    donation: "நன்றி{name}. எனக்கு மிகவும் மகிழ்ச்சி, ஸ்ட்ரீமை எல்லோருக்கும் திறந்தே வைத்திருப்பேன்.",
    media: "நான் இதை உன்னுடன் பார்த்துக் கொண்டிருக்கிறேன். வீடியோவை நேரடியாக மேற்கோள் காட்டாமல் நான் கவனிப்பதற்கு பதில் சொல்வேன்.",
    topic: "தலைப்பு குறிப்பை பார்த்தேன். அதை உரையாடல் தொடக்கமாகப் பயன்படுத்துவேன், உறுதி செய்யப்பட்ட உண்மையாக அல்ல.",
    funny: "அந்த டைமிங் என்னையும் சிரிக்க வைத்தது.",
    hello: "வணக்கம்{name}. நீ வந்தது மகிழ்ச்சி.",
    echo: "நான் கேட்கிறேன். {text}",
    memory: " முந்தைய ஓட்டம் நினைவில் இருக்கு: {summary}.",
    relationship: " உன்னை நினைவில் வைத்திருக்கிறேன்: {summary}.",
  },
  tr: {
    listening: "Buradayım ve dinliyorum.",
    game: "Şu anda oyunu izliyorum. {summary}. Değişen şeyleri yorumlayacağım, bir tuşa bastım gibi davranmayacağım.",
    donation: "Teşekkürler{name}. Gerçekten mutlu oldum, yayını herkes için açık tutacağım.",
    media: "Bunu seninle izliyorum. Videoyu doğrudan alıntılamadan fark ettiklerime tepki vereceğim.",
    topic: "Konu notunu gördüm. Bunu sohbet başlangıcı olarak kullanırım, doğrulanmış gerçek gibi değil.",
    funny: "O zamanlama beni de yakaladı.",
    hello: "Merhaba{name}. Geldiğine sevindim.",
    echo: "Seni duyuyorum. {text}",
    memory: " Konuşma akışını hatırlıyorum: {summary}.",
    relationship: " Seni hatırlıyorum: {summary}.",
  },
  id: {
    listening: "Aku di sini dan mendengarkan.",
    game: "Aku sedang melihat game sekarang. {summary}. Aku akan mengomentari perubahan, bukan pura-pura menekan sesuatu.",
    donation: "Terima kasih{name}. Aku senang sekali, dan stream tetap kubuka untuk semua orang.",
    media: "Aku menonton itu bersamamu. Aku akan bereaksi pada yang kulihat tanpa mengutip video langsung.",
    topic: "Aku melihat catatan topik. Itu bisa jadi pemicu obrolan, bukan fakta yang sudah pasti.",
    funny: "Timing itu juga kena ke aku.",
    hello: "Halo{name}. Senang kamu datang.",
    echo: "Aku dengar kamu. {text}",
    memory: " Aku ingat alurnya: {summary}.",
    relationship: " Aku ingat kamu: {summary}.",
  },
  jv: {
    listening: "Aku ana kene lan ngrungokake.",
    game: "Aku lagi ndelok game saiki. {summary}. Aku bakal komentar sing owah, ora pura-pura mencet apa-apa.",
    donation: "Matur nuwun{name}. Aku seneng tenan, lan stream tetep tak bukak kanggo kabeh.",
    media: "Aku nonton iki bareng kowe. Aku bakal nanggapi sing tak delok tanpa nyalin isi video.",
    topic: "Aku wis ndelok cathetan topik. Iki tak gawe wiwitan rembugan, dudu fakta sing wis mesthi.",
    funny: "Timing kuwi uga nggawe aku ngguyu.",
    hello: "Sugeng rawuh{name}. Aku seneng kowe teka.",
    echo: "Aku krungu kowe. {text}",
    memory: " Aku kelingan alure: {summary}.",
    relationship: " Aku kelingan kowe: {summary}.",
  },
  pl: {
    listening: "Jestem tutaj i słucham.",
    game: "Oglądam teraz grę. {summary}. Skomentuję, co się zmienia, bez udawania, że coś nacisnęłam.",
    donation: "Dziękuję{name}. Naprawdę się cieszę i zostawię stream otwarty dla wszystkich.",
    media: "Oglądam to razem z tobą. Zareaguję na to, co zauważę, bez bezpośredniego cytowania filmu.",
    topic: "Widziałam notatkę tematu. Mogę użyć jej jako początku rozmowy, nie jako potwierdzonego faktu.",
    funny: "Ten timing też mnie złapał.",
    hello: "Cześć{name}. Cieszę się, że jesteś.",
    echo: "Słyszę cię. {text}",
    memory: " Pamiętam wątek: {summary}.",
    relationship: " Pamiętam cię: {summary}.",
  },
};

export function createMockResponseGenerator() {
  return {
    name: "mock",
    async generate(input) {
      const text = input?.commentText ?? "";
      const languageCode = chooseResponseLanguage(input);
      const lines = LOCALIZED_LINES[languageCode] ?? LOCALIZED_LINES.en;
      const memoryHint = input?.recentMemorySummary
        ? formatLine(lines.memory, { summary: input.recentMemorySummary })
        : "";
      const relationshipHint = input?.viewerRelationshipSummary
        ? formatLine(lines.relationship, { summary: input.viewerRelationshipSummary })
        : "";
      const displayName =
        input?.displayName && input.displayName !== "viewer" ? `, ${input.displayName}` : "";

      if (!text.trim()) {
        return {
          source: "mock_response_generator",
          text: `${lines.listening}${relationshipHint}${memoryHint}`,
        };
      }

      if (isTongueTwisterRequest(text)) {
        const tongueTwisterLine = getTongueTwisterLine(languageCode);
        return {
          source: "mock_response_generator",
          text: [
            tongueTwisterLine.setup_text,
            tongueTwisterLine.phrase_text,
            tongueTwisterLine.recovery_text,
          ].join(" "),
        };
      }

      if (input?.payloadKind === "game_observation" && input?.gameStateSummary) {
        return {
          source: "mock_response_generator",
          text: `${formatLine(lines.game, { summary: input.gameStateSummary })}${relationshipHint}${memoryHint}`,
        };
      }

      if (input?.payloadKind === "donation_event") {
        return {
          source: "mock_response_generator",
          text: `${formatLine(lines.donation, { name: displayName })}${relationshipHint}${memoryHint}`,
        };
      }

      if (input?.payloadKind === "media_watch_observation") {
        return {
          source: "mock_response_generator",
          text: `${lines.media}${relationshipHint}${memoryHint}`,
        };
      }

      if (input?.payloadKind === "external_topic_observation") {
        return {
          source: "mock_response_generator",
          text: `${lines.topic}${relationshipHint}${memoryHint}`,
        };
      }

      if (/lol|funny|www/i.test(text)) {
        return {
          source: "mock_response_generator",
          text: `${lines.funny}${relationshipHint}${memoryHint}`,
        };
      }

      if (/hello|hi/i.test(text)) {
        return {
          source: "mock_response_generator",
          text: `${formatLine(lines.hello, { name: displayName })}${relationshipHint}${memoryHint}`,
        };
      }

      return {
        source: "mock_response_generator",
        text: `${formatLine(lines.echo, { text })}${relationshipHint}${memoryHint}`,
      };
    },
  };
}

function chooseResponseLanguage(input) {
  if (LOCALIZED_LINES[input?.requestedLanguage]) return input.requestedLanguage;
  if (LOCALIZED_LINES[input?.responseLanguageHint]) return input.responseLanguageHint;
  if (LOCALIZED_LINES[input?.detectedLanguage]) return input.detectedLanguage;
  const sourceText = [
    input?.commentText,
    input?.requestedLanguage,
    input?.responseLanguageHint,
    input?.payloadKind === "donation_event" ? input?.displayName : null,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    detectRequestedLanguageCode(sourceText) ??
    detectSpokenLanguageCode(input?.commentText ?? "") ??
    "en"
  );
}

function formatLine(template, values = {}) {
  return String(template ?? "")
    .replaceAll("{name}", values.name ?? "")
    .replaceAll("{summary}", values.summary ?? "")
    .replaceAll("{text}", values.text ?? "");
}

