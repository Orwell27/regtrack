import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { parseEuskadiProgramme } from "../lib/mandate/euskadi-import";

const folder = "data/mandate/evidence/territorial";
const sources = JSON.parse(readFileSync(`${folder}/sources.json`, "utf8"));
const source = sources.find((item: { id: string }) => item.id === "euskadi-programme-2024");
const extraction = JSON.parse(readFileSync(`${folder}/euskadi-programme-2024.pages.json`, "utf8"));
const hash = createHash("sha256").update(readFileSync(source.snapshotPath)).digest("hex");
if (hash !== source.sha256 || hash !== extraction.sourceSha256) throw Error("Euskadi: original incompatible con la extracción");
const records = parseEuskadiProgramme(extraction.pages);
writeFileSync("data/mandate/euskadi-inventory.json", JSON.stringify({
  schemaVersion: 1, jurisdictionId: "r-16", mandateId: "r-16-2024", mandateLabel: "Euskadi · mandato 2024–2028",
  sourceId: source.id, mandateSourceId: source.id, sourceLabel: "Programa", sourceSha256: hash,
  registerSourceId: "euskadi-programme-register", importedAt: "2026-10-11", inventoryTotal: 154,
  scope: "Los 154 compromisos y sus 846 iniciativas del Programa de Gobierno 2024–2028, agrupados en 32 áreas. Las iniciativas se conservan dentro de cada compromiso: no se cuentan como promesas adicionales.",
  textNote: "Texto extraído del programa original, con espacios y guiones de final de línea normalizados. El informe de seguimiento de 2025 es una declaración del Gobierno; no se incorpora su porcentaje como cumplimiento verificado ni se trasladan sus estados a estas fichas. Importar el programa no acredita su ejecución.",
  records,
}, null, 2) + "\n");
console.log(`Euskadi: ${records.length} compromisos y 846 iniciativas.`);
