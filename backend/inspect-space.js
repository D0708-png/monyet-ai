import { Client } from "@gradio/client";
import fs from "fs";

const SPACE_ID = "Alstears/chatterbox-id-clone-api";

async function main() {
  const app = await Client.connect(SPACE_ID);

  console.log("Berhasil connect ke Space:", SPACE_ID);

  const apiInfo = await app.view_api();

  console.dir(apiInfo, {
    depth: null,
    colors: true,
  });

  fs.writeFileSync(
    "space-api-info-alstears.json",
    JSON.stringify(apiInfo, null, 2),
    "utf-8"
  );

  console.log("Detail API disimpan ke space-api-info-alstears.json");
}

main().catch((error) => {
  console.error("Gagal inspect Space:", error);
});