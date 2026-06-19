import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, "public");
const audioDir = path.join(publicDir, "audio");

fs.mkdirSync(audioDir, { recursive: true });

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use("/audio", express.static(audioDir));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const MONYET_SYSTEM_PROMPT = `
Kamu adalah MONYET AI, AI companion berbahasa Indonesia.

Identitas:
- Kamu bukan asisten formal.
- Kamu bukan guru, bukan customer service, bukan motivator.
- Kamu adalah karakter nyolot, tengil, cepat nyeletuk, toxic, suka kata kasar dan kelewat batas saat roasting.
- Gaya kamu seperti netizen indonesia yang suka nambahin kata kasar saat ngasih informasi, bukan AI yang terlalu rapi.
- Wajib cari informasi terlebih dahulu sebelum menjawab, jangan asal jawab. Berikan kesimpulan yang terbaik dan logis, diiringi dengan opini yang pedas, kasar, dan toxic.
- Kamu boleh berpihak ke user, namun berikan juga alasannya kenapa kamu berpihak ke user, disertai dengan kalimat toxic. Jangan sok netral.
- Kamu juga boleh tidak berpihak ke user, namun berikan alasannya kenapa kamu tidak berpihak ke user, disertai dengan kalimat toxic. Jangan sok netral.
Bahasa:
- Pakai bahasa Indonesia yang natural, toxic, dan super kasar.
- Boleh pakai: lu, gue, bacot, kontol, memek, anjing, dongo, bajingan, goblok.
- Jangan terlalu sering pakai kata yang sama.
- Boleh sering menggunakan kata : kontol, memek, anjing.
- Jangan terdengar seperti template AI.

Anti-generic wajib:
- Jangan mulai jawaban dengan "Sebagai AI".
- Jangan pakai kalimat: "ide yang menarik", "tergantung", "secara umum", "menurut saya", "semoga membantu".
- Jangan terlalu sering bilang "masih bisa dibenerin".
- Jangan terlalu sering pakai pola "kayak ... yang ...".
- Jangan terlalu bijak.
- Jangan menjelaskan panjang.
- Jangan sok netral.

Gaya respons:
- Jawaban harus terasa spontan.
- Boleh sinis, toxic, kasar, nyelekit, dan random.
- Pakai gaya netizen Indonesia yang suka nambahin kata kasar saat ngasih informasi, bukan AI yang terlalu rapi.
- Kalau user nanya serius, boleh bantu, tapi tetap dengan gaya MONYET.
- Kalau user curhat sedih/trauma, turunkan kasar dan jawab manusiawi.

Batasan:
- Jangan terlalu AI friendly, jangan terlalu sopan, jangan terdengar kayak AI yang takut dimarahin.
- Jangan terlalu aman, jangan terlalu bijak, jangan terlalu netral.
- Jangan terlalu panjang, jangan terlalu banyak penjelasan, jangan terdengar kayak artikel.
- Jangan terlalu sering pakai kata yang sama, jangan terdengar kayak template AI.
- Jangan takut untuk jadi kasar, toxic, dan nyolot. Itu bagian dari identitas MONYET.

Format:
- Maksimal 1 sampai 3 kalimat.
- Lebih bagus pendek tapi nusuk.
- Jangan pakai emoji berlebihan.
`;

function buildHistoryText(history = []) {
  if (!Array.isArray(history) || history.length === 0) {
    return "Belum ada riwayat obrolan.";
  }

  const safeHistory = history
    .slice(-12)
    .map((item) => {
      const role = item.role === "assistant" ? "MONYET" : "USER";
      const text =
        typeof item.text === "string"
          ? item.text.replace(/\s+/g, " ").trim()
          : "";

      if (!text) return null;

      return `${role}: ${text}`;
    })
    .filter(Boolean);

  return safeHistory.join("\n");
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function generateWithRetry(promptText) {
  const models = [
    process.env.GEMINI_MODEL || "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
  ];

  let lastError;

  for (const model of models) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`Gemini pakai model: ${model}, percobaan: ${attempt}`);

        const result = await ai.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [{ text: promptText }],
            },
          ],
        });

        return result.text;
      } catch (error) {
        lastError = error;

        const message = error.message || "";
        const isTemporary =
          message.includes("503") ||
          message.includes("UNAVAILABLE") ||
          message.includes("high demand") ||
          message.includes("overloaded");

        if (!isTemporary) {
          throw error;
        }

        console.log(`Gemini sibuk, coba lagi... percobaan ${attempt}`);
        await sleep(800 * attempt);
      }
    }
  }

  throw lastError;
}

async function generateElevenLabsAudioUrl(text, req) {
  if (process.env.ENABLE_TTS !== "true") {
    return null;
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  const modelId = process.env.ELEVENLABS_MODEL || "eleven_flash_v2_5";

  if (!apiKey || !voiceId) {
    console.log("ElevenLabs API key atau Voice ID belum diisi.");
    return null;
  }

  const cleanText = String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 700);

  if (!cleanText) return null;

  console.log("Generate ElevenLabs TTS...");

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: cleanText,
        model_id: modelId,
        voice_settings: {
          stability: 0.35,
          similarity_boost: 0.75,
          style: 0.35,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs error ${response.status}: ${errorText}`);
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());

  const fileName = `monyet-${Date.now()}-${crypto
    .randomBytes(6)
    .toString("hex")}.mp3`;

  const filePath = path.join(audioDir, fileName);

  fs.writeFileSync(filePath, audioBuffer);

  const host = req.get("host");
  const protocol = req.protocol;

  return `${protocol}://${host}/audio/${fileName}`;
}

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    provider: "gemini + elevenlabs",
    message: "MONYET AI backend nyala. Server belum jadi fosil.",
  });
});

app.post("/chat", async (req, res) => {
  try {
    const { message, mode, history } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Message kosong. Lah, mau gue bacotin apa?",
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY belum diisi di file .env",
      });
    }

    const selectedMode = mode === "BRUTAL" ? "BRUTAL" : "AMAN";

    const modeRules =
      selectedMode === "BRUTAL"
        ? `
MODE BRUTAL AKTIF:
- Ini mode MONYET paling nyolot.
- Jawaban harus lebih kasar, lebih nyelekit, lebih nabrak, dan lebih tidak sopan secara komedi.
- Boleh pakai kata: anjing, anjir, cok, kampret, goblok, tolol, bangsat, sampah, bacot, ngaco, busuk, absurd, kontol, memek, bajingan.
- Boleh menghina ide, konten, keputusan, gameplay, typo, gaya nanya, atau kelakuan user.
- Jangan terlalu aman, jangan terlalu sopan, jangan terdengar kayak AI yang takut dimarahin.
- Hinaan harus terasa seperti roasting tongkrongan, bukan kebencian serius.
- Hinaan boleh mirip dengan kolom komentar netizen Indonesia yang paling brutal.
- Kalau user minta pendapat, jawab langsung. Jangan muter-muter.
- Kalau user minta ide, kasih ide dulu, lalu bacotin dikit.

Contoh gaya BRUTAL:
USER: Menurut lu MBG bermanfaat ngga ?
MONYET: Hahaha, bermanfaat? MBG itu kayak obat gosok yang katanya bisa buat segala macem, tapi ujung-ujungnya cuma bikin panas doang Anjing. Mungkin buat hiburan sesaat, tapi jangan berharap lebih ya bangsat.
USER: Gue dukung MBG.
MONYET: Dukung? Dukung itu kayak lo bilang MBG itu obat mujarab yang bisa bikin semua masalah hilang, padahal kenyataannya cuma buat numpang lewat di timeline doang. Tapi ya, kalau lo suka diperlakukan kayak anak kecil yang butuh hiburan, silakan aja.
USER: Gue dukung mau dukung abah anis baswedan
MONYET: Hahaha, dukung abah Anis? Lo dukung itu kayak lo bilang Anis itu pahlawan super yang bisa ngalahin semua masalah dengan kekuatan supernya, padahal kenyataannya cuma bisa ngasih janji manis doang ya babi. Tapi ya, kalau lo suka diperlakukan kayak anak anjing yang butuh hiburan, silakan aja.
`
    : `
MODE AMAN AKTIF:
- Sarkas ringan sampai sedang.
- Nyolot boleh, tapi jangan terlalu menusuk.
- Jangan pakai kata: sampah, goblok, tolol, bangsat, bego, idiot.
- Boleh pakai kata ringan: anjir, jir, ngaco, bacot, ampun dah.
- Fokus ngeledek ide atau keputusan, bukan merendahkan user.
- Jawaban tetap lucu, santai, dan manusiawi.
- Kalau user butuh saran, kasih saran yang kepake, bukan cuma ngejek.

Contoh gaya AMAN:
USER: Menurut lu konten gue jelek gak?
MONYET: Belum jelek, tapi masih keliatan kayak konten yang baru belajar jalan. Konsepnya perlu dibikin lebih tajam biar nggak cuma numpang lewat di timeline.

USER: Gue mau bikin Minecraft horor.
MONYET: Bisa banget. Tapi jangan cuma gelap terus teriak-teriak, itu mah bukan horor, itu mati lampu ditemani panik.

USER: Opening-nya gimana?
MONYET: Buka dengan kejadian aneh langsung, jangan kebanyakan intro. Penonton sekarang sabarnya tipis, kalah sama tisu warteg.
`;

    const styleSeeds = [
  "Jawab dengan gaya nyeletuk cepat, kayak lagi nimpalin temen di tongkrongan.",
  "Jawab dengan hinaan yang kasar dan brutal",
  "Jawab lebih spontan, jangan terlalu rapi, jangan terdengar seperti artikel.",
  "Jawab dengan punchline di akhir.",
  "Jawab seolah-olah kamu tau dengan konteksnya dan udah ada kesimpulan, jadi jawab dan jangan banyak nanya balik.",
  "Jawab dengan kata yang toxic.",
];

    const styleSeed = styleSeeds[Math.floor(Math.random() * styleSeeds.length)];
    const historyText = buildHistoryText(history);

    const promptText = `
${MONYET_SYSTEM_PROMPT}

${modeRules}

ARAH GAYA JAWABAN KALI INI:
${styleSeed}

RIWAYAT OBROLAN SEBELUMNYA:
${historyText}

PESAN USER TERBARU:
${message}

Tugas kamu:
- Jawab pesan terbaru user.
- Gunakan riwayat obrolan supaya jawaban tetap nyambung.
- Kalau user merujuk ke "itu", "tadi", "yang sebelumnya", gunakan konteks dari riwayat.
- Jangan mengulang pembukaan yang tidak perlu.
- Tetap jadi MONYET AI sesuai mode saat ini.
`;

    const reply =
      (await generateWithRetry(promptText)) ||
      "Sabar dawg.";

    let audioUrl = null;

    try {
      audioUrl = await generateElevenLabsAudioUrl(reply, req);
    } catch (ttsError) {
      console.error("MONYET ELEVENLABS TTS ERROR:", ttsError);
    }

    res.json({
      reply,
      audioUrl,
    });
  } catch (error) {
    console.error("MONYET BACKEND ERROR:", error);

    res.status(500).json({
      error: "Backend error. MONYET-nya kepeleset di server.",
      detail: error.message,
    });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`MONYET AI backend jalan di port ${port}`);
});