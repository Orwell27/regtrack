import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { readInventoryRecords } from "../lib/mandate/inventory-csv";
import reviewed from "../data/mandate/commitments.json";

const source = reviewed.sources.find(source => source.id === "cumpliendo-2026-07")!;
const bytes = readFileSync(source.snapshotPath);
if (createHash("sha256").update(bytes).digest("hex") !== source.sha256) throw Error("La captura original ha cambiado");
const records = readInventoryRecords(new TextDecoder("windows-1252").decode(bytes));
if (records.length !== reviewed.selection.totalAvailable) throw Error("El universo no coincide con el inventario conocido");
for (const item of reviewed.commitments) {
  const record = records.find(record => record.id === item.id)!;
  if (!record || record.text !== item.text || record.origin !== item.origin) throw Error(`Se altera el original de ${item.id}`);
}
const result = {
  schemaVersion: 1, jurisdiction: "es", sourceId: source.id, sourceUrl: source.url,
  publishedAt: source.publishedAt, governmentCutoff: reviewed.governmentCutoffDate,
  capturedAt: source.capturedAt, sourceSha256: source.sha256,
  attribution: reviewed.selection.attribution,
  limitation: "Inventario declarado por el Gobierno. Importar una fila o enlazar su fuente no significa contrastar la actuación ni corroborar sus resultados.",
  records,
};
writeFileSync("data/mandate/inventory.json", JSON.stringify(result, null, 2) + "\n");
console.log(`${records.length} compromisos importados; ${reviewed.commitments.length} textos previos conservados literalmente.`);
