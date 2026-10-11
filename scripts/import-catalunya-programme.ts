import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { parseCatalunyaProgramme } from "../lib/mandate/catalunya-import";

const folder = "data/mandate/evidence/territorial";
const sources = JSON.parse(readFileSync(`${folder}/sources.json`, "utf8"));
const source = sources.find((item: { id: string }) => item.id === "catalunya-programme-2024");
const extraction = JSON.parse(readFileSync(`${folder}/catalunya-programme-2024.pages.json`, "utf8"));
const hash = createHash("sha256").update(readFileSync(source.snapshotPath)).digest("hex");
if (hash !== source.sha256 || hash !== extraction.sourceSha256) throw Error("Cataluña: original incompatible con la extracción");
const records = parseCatalunyaProgramme(extraction.pages);
writeFileSync("data/mandate/catalunya-inventory.json", JSON.stringify({
  schemaVersion: 1, jurisdictionId: "r-09", mandateId: "r-09-2024", mandateLabel: "Cataluña · XV legislatura · plan 2024–2027",
  sourceId: source.id, mandateSourceId: source.id, sourceLabel: "Pla de Govern", sourceSha256: hash,
  registerSourceId: "catalunya-programme-register", importedAt: "2026-10-11", inventoryTotal: 260, textLanguage: "ca",
  scope: "Las 260 medidas prioritarias del Pla de Govern de la XV legislatura, agrupadas en 35 objetivos y cinco prioridades. El periodo 2024–2027 corresponde al plan, no a una fecha electoral. Algunas medidas fijan horizontes posteriores, que se conservan en su texto.",
  textNote: "Se conserva el texto original en catalán, normalizando espacios y guiones de final de línea. Los temas breves son etiquetas editoriales en español para facilitar la búsqueda. El inventario no incluye como medidas nuevas los 35 objetivos ni las 30 actuaciones destacadas, que son una selección del mismo plan. Importar una medida no acredita su ejecución.",
  records,
}, null, 2) + "\n");
console.log(`Cataluña: ${records.length} medidas de 35 objetivos.`);
