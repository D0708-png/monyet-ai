import { Client } from "@gradio/client";
import fs from "fs";

const SPACE_ID = "Alstears/chatterbox-id-clone-api";

async function main() {
  console.log("Connect ke Space:", SPACE_ID);

  const app = await Client.connect(SPACE_ID);

  const text =
    "Halo, gue MONYET AI. Kalau suara gue udah lebih niat, berarti Android default bisa pensiun dulu.";

  console.log("Generate TTS...");

  const result = await app.predict("/clone_voice", [
    text,
    null,
    "",
  ]);

  console.log("HASIL:");
  console.dir(result, {
    depth: null,
    colors: true,
  });

  fs.writeFileSync(
    "tts-result-alstears.json",
    JSON.stringify(result, null, 2),
    "utf-8"
  );

  console.log("Hasil disimpan ke tts-result-alstears.json");
}

main().catch((error) => {
  console.error("Gagal generate TTS:");
  console.dir(error, {
    depth: null,
    colors: true,
  });
});