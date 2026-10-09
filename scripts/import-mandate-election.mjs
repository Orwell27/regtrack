import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { XMLParser } from "fast-xml-parser";

const url = "https://www.boe.es/diario_boe/xml.php?id=BOE-A-2026-20742";
const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
if (!response.ok) throw Error(`BOE: HTTP ${response.status}`);
const raw = await response.text();
if (Buffer.byteLength(raw) > 1_000_000) throw Error("XML inesperadamente grande");
const parsed = new XMLParser({ ignoreAttributes: false }).parse(raw);
const metadata = parsed.documento?.metadatos;
const plain = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
if (metadata?.identificador !== "BOE-A-2026-20742" || !plain.includes("29 de noviembre de 2026")) throw Error("La captura no confirma la fecha electoral");
const sha256 = createHash("sha256").update(raw).digest("hex");
const election = {
  date: "2026-11-29", timeZone: "Europe/Madrid",
  source: {
    id: "boe-election-2026", title: metadata.titulo,
    url: "https://www.boe.es/boe/dias/2026/10/06/pdfs/BOE-A-2026-20742.pdf",
    producer: "Boletín Oficial del Estado", publishedAt: "2026-10-06",
    retrievedAt: new Date().toISOString(), locator: "Artículo 2; BOE-A-2026-20742",
    excerpt: "El artículo 2 convoca elecciones al Congreso y al Senado para el 29 de noviembre de 2026.",
    role: "action", sha256,
  },
};
await mkdir("data/mandate/evidence/election", { recursive: true });
await writeFile("data/mandate/evidence/election/BOE-A-2026-20742.xml", raw);
await writeFile("data/mandate/election.json", JSON.stringify(election, null, 2) + "\n");
console.log(`Convocatoria confirmada; XML conservado: ${sha256}`);
