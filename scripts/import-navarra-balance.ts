import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { parseNavarraBalance } from "../lib/mandate/navarra-import";

const folder = "data/mandate/evidence/territorial";
const sources = JSON.parse(readFileSync(`${folder}/sources.json`, "utf8"));
const source = sources.find((item: { id: string }) => item.id === "navarra-balance-2025");
const extraction = JSON.parse(readFileSync(`${folder}/navarra-balance-2025.pages.json`, "utf8"));
const hash = createHash("sha256").update(readFileSync(source.snapshotPath)).digest("hex");
if (hash !== source.sha256 || hash !== extraction.sourceSha256) throw Error("Navarra: original incompatible con la extracción");
const records = parseNavarraBalance(extraction.pages);
writeFileSync("data/mandate/navarra-inventory.json", JSON.stringify({
  schemaVersion: 1, jurisdictionId: "r-15", mandateId: "r-15-2023", mandateLabel: "Navarra · mandato 2023–2027",
  sourceId: source.id, mandateSourceId: "navarra-programme-2023", sourceLabel: "Balance del Gobierno 2025",
  sourceSha256: hash, registerSourceId: "navarra-programme-register", importedAt: "2026-10-10", governmentCutoff: "2025-12-31",
  inventoryTotal: 347,
  scope: "Las 347 fichas del anexo del balance oficial de 2025, agrupadas en 13 áreas. Es el inventario de seguimiento del Gobierno: sus resúmenes no reproducen necesariamente todas las condiciones del acuerdo original de 2023–2027.",
  textNote: "Texto extraído del anexo, con espacios normalizados. Los estados y porcentajes son declaraciones del Gobierno al cierre de 2025, no valoraciones de RegTrack. Cada revisión debe cotejar también el acuerdo original; importar una ficha no acredita su ejecución.",
  records,
}, null, 2) + "\n");
console.log(`Navarra: ${records.length} fichas; 13 áreas y distribución de estados comprobadas.`);
