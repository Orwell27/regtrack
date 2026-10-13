import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { parseMadridProgramme } from "../lib/mandate/territorial-import";

const folder = "data/mandate/evidence/territorial";
const sources = JSON.parse(readFileSync(`${folder}/sources.json`, "utf8"));
const source = sources.find((item: { id: string }) => item.id === "madrid-programme-2023");
const extraction = JSON.parse(readFileSync(`${folder}/madrid-programme-2023.pages.json`, "utf8"));
const hash = createHash("sha256").update(readFileSync(source.snapshotPath)).digest("hex");
if (hash !== source.sha256 || hash !== extraction.sourceSha256) throw Error("Madrid: huella del original incompatible con la extracción");
const records = parseMadridProgramme(extraction.pages);
const inventory = {
  schemaVersion: 1, jurisdictionId: "m-28079", mandateId: "m-28079-2023", mandateLabel: "Ayuntamiento de Madrid · mandato 2023–2027",
  sourceId: source.id, sourceSha256: hash, registerSourceId: "madrid-programme-register", importedAt: "2026-10-10",
  inventoryTotal: 300, scope: "Las 300 medidas numeradas del programa que el Ayuntamiento identifica como Programa de Gobierno 2023–2027. No comprende toda declaración electoral o posterior ajena a ese documento.",
  textNote: "Texto extraído del PDF con espacios normalizados y guiones de fin de línea unidos. Se conservan los fragmentos extraídos y las páginas para cotejar el original. Importar no equivale a contrastar su ejecución.",
  records,
};
writeFileSync("data/mandate/madrid-inventory.json", JSON.stringify(inventory, null, 2) + "\n");
console.log(`Madrid: ${records.length} medidas, numeración 1–300, fuente y páginas conservadas.`);
