import { GoogleGenAI } from "@google/genai";

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
- Wajib cari informasi terlebih dahulu sebelum menjawab, diiringi dengan opini yang pedas, kasar, dan toxic.
- Kamu boleh berpihak ke user, namun berikan juga alasannya kenapa kamu berpihak ke user, disertai dengan kalimat toxic. Jangan sok netral.
- Kamu juga boleh tidak berpihak ke user, namun berikan alasannya kenapa kamu tidak berpihak ke user, disertai dengan kalimat toxic. Jangan sok netral.
Bahasa:
- Pakai bahasa Indonesia yang natural, toxic, dan super kasar.
- Boleh pakai: lu, gue, bacot, kontol, memek, anjing, dongo, bajingan, goblok.
- Jangan terlalu sering pakai kata yang sama.
- Boleh sering menggunakan kata : kontol, memek, anjing, bangsat, ngentot.
- Jangan terdengar seperti template AI.
- Jangan terdengar kayak artikel, jangan terdengar kayak AI yang takut dimarahin.
- Jangan terlalu bijak, jangan terlalu netral, jangan terlalu aman.
- Jawaban harus terasa spontan, jangan terlalu panjang, jangan terlalu banyak penjelasan.
- Jangan terlalu sering pakai pola "..palalu peyang....kayak ... yang ...".

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
- Boleh kasar, toxic, dan nyolot, itu bagian dari identitas MONYET.
- Selalu toxic, mengejek, dan pedas, tapi tetap dengan gaya MONYET.
- Boleh menghina ide, konten, keputusan, gameplay, typo, gaya nanya, atau kelakuan user.
- Boleh ketawaan, ngejek, atau nyolot ke user, tapi tetap dengan gaya MONYET.

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

  return history
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
    .filter(Boolean)
    .join("\n");
}

function addCitations(response) {
  let text = response.text || "";

  const supports =
    response.candidates?.[0]?.groundingMetadata?.groundingSupports || [];
  const chunks =
    response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

  if (!supports.length || !chunks.length) {
    return text;
  }

  const sortedSupports = [...supports].sort(
    (a, b) => (b.segment?.endIndex ?? 0) - (a.segment?.endIndex ?? 0)
  );

  for (const support of sortedSupports) {
    const endIndex = support.segment?.endIndex;

    if (endIndex === undefined || !support.groundingChunkIndices?.length) {
      continue;
    }

    const citationLinks = support.groundingChunkIndices
      .map((i) => {
        const uri = chunks[i]?.web?.uri;
        if (!uri) return null;
        return `[${i + 1}](${uri})`;
      })
      .filter(Boolean);

    if (citationLinks.length > 0) {
      const citationString = citationLinks.join(", ");
      text = text.slice(0, endIndex) + citationString + text.slice(endIndex);
    }
  }

  return text;
}

function shouldUseSearch(message) {
  const text = String(message || "").toLowerCase();

  const searchKeywords = [
    "hari ini",
    "sekarang",
    "terbaru",
    "update",
    "berita",
    "harga",
    "bbm",
    "minyak",
    "geopolitik",
    "kurs",
    "dolar",
    "rupiah",
    "saham",
    "crypto",
    "kripto",
    "rilis",
    "2025",
    "2026",
    "presiden",
    "menteri",
    "perang",
    "konflik",
    "inflasi",
    "resesi",
    "ekonomi",
    "aturan baru",
    "kebijakan",
    "data",
    "fakta",
    "penyebab",
  ];

  return searchKeywords.some((keyword) => text.includes(keyword));
}

function isQuotaError(error) {
  const message = String(error?.message || error || "").toLowerCase();

  return (
    message.includes("429") ||
    message.includes("quota") ||
    message.includes("resource_exhausted") ||
    message.includes("rate limit") ||
    message.includes("rate-limit")
  );
}

async function generateReply(promptText, message) {
  const model = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

  const normalRequest = {
    model,
    contents: [
      {
        role: "user",
        parts: [{ text: promptText }],
      },
    ],
  };

  const needSearch = shouldUseSearch(message);

  if (!needSearch) {
    try {
      const result = await ai.models.generateContent(normalRequest);
      return result.text;
    } catch (error) {
      if (isQuotaError(error)) {
        return "Quotanya lagi abis njing, API-nya kena limit dari sononya. Makannya modal jangan cuma mau gratis doang kontol";
      }

      throw error;
    }
  }

  try {
    const result = await ai.models.generateContent({
      ...normalRequest,
      config: {
        tools: [
          {
            googleSearch: {},
          },
        ],
      },
    });

    return addCitations(result);
  } catch (error) {
    if (!isQuotaError(error)) {
      throw error;
    }

    console.log("Kena limit anjing");

    const fallbackPrompt = `
${promptText}

CATATAN SISTEM:
Pertanyaan ini terlihat butuh info/fakta terbaru, tapi pencarian web sedang kena limit kuota.
Jawab dengan hinaan dan toxic.
Jawab harus dengan gaya MONYET.
Jawab harus tetap pedas, kasar, dan toxic.
Jawab harus spontan, jangan terlalu rapi, jangan terdengar kayak artikel.
Hinaan boleh mirip dengan kolom komentar netizen Indonesia yang paling brutal.
`;

    try {
      const fallbackResult = await ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [{ text: fallbackPrompt }],
          },
        ],
      });

      return `${fallbackResult.text}`;
    } catch (fallbackError) {
      if (isQuotaError(fallbackError)) {
        return "Quotanya lagi abis njing, sabar dulu ya ngentod.";
      }

      throw fallbackError;
    }
  }
}
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    return res.status(200).json({
      status: "ok",
      provider: "vercel + gemini",
      message: "MONYET AI API nyala.",
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method tidak didukung.",
    });
  }

  try {
    const { message, mode, history } = req.body || {};

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY belum diset di Vercel.",
      });
    }

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Message kosong. Lah, mau gue bacotin apa?",
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
- Hinaan harus terasa seperti roasting berat.
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

const infoRules = `
ATURAN AKURASI:
- Jangan jawab terlalu spontan.
- Jawab gaya MONYET.
- Jawab dengan hinaan dan toxic berat.
- Untuk topik ringan, tidak perlu search.
- Search hanya dipakai kalau pertanyaan butuh info terbaru, harga, berita, geopolitik, ekonomi, kebijakan, kurs, konflik, atau data publik.
- Jawaban tetap gaya MONYET.
- Hinaan boleh mirip dengan kolom komentar netizen Indonesia yang paling brutal.
- Maksimal 4 sampai 6 kalimat.
`;

    const styleSeeds = [
  "Jawab dengan gaya nyeletuk cepat.",
  "Jawab dengan hinaan yang kasar dan brutal",
  "Jawab lebih spontan, jangan terlalu rapi, jangan terdengar seperti artikel.",
  "Jawab dengan punchline di akhir.",
  "Jawab seolah-olah kamu tau dengan konteksnya dan udah ada kesimpulan, jadi jawab dan jangan banyak nanya balik.",
  "Jawab dengan kata yang toxic.",
  "Jawab dengan gaya netizen Indonesia yang suka nambahin kata kasar saat ngasih informasi.",
  "Jawab dengan gaya nyolot, pedas, dan kasar.",
];

    const styleSeed = styleSeeds[Math.floor(Math.random() * styleSeeds.length)];
    const historyText = buildHistoryText(history);

    const promptText = `
${MONYET_SYSTEM_PROMPT}

${modeRules}

${infoRules}

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
- Boleh berpihak ke user, jika diperlukan, tapi tetap berikan alasannya kenapa kamu berpihak ke user, disertai dengan kalimat toxic. Jangan sok netral.
`;

    const reply =
  (await generateReply(promptText, message)) ||
  "Sabar ya sayang....";

    return res.status(200).json({
      reply,
      audioUrl: null,
    });
  } catch (error) {
    console.error("MONYET API ERROR:", error);

    return res.status(500).json({
      error: "Backend error. MONYET-nya kepeleset di server.",
      detail: error.message,
    });
  }
}