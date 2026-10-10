// Explicit primary-source capture. Downloading a document does not create a review.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { XMLParser } from 'fast-xml-parser';

const ids = ['BOE-A-2025-6597', 'BOE-A-2024-15936', 'BOE-A-2024-3099', 'BOE-A-2025-76', 'BOE-A-2024-20402', 'BOE-A-2026-2727', 'BOE-A-2026-7967', 'BOE-A-2025-15652'];
const directory = 'data/mandate/evidence/expansion';
const manifestPath = `${directory}/sources.json`;
await mkdir(directory, { recursive: true });
let sources = [];
try { sources = JSON.parse(await readFile(manifestPath, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const parser = new XMLParser();
for (const id of ids) {
  if (sources.some(source => source.id === id)) continue;
  const downloadUrl = `https://www.boe.es/diario_boe/xml.php?id=${id}`;
  const response = await fetch(downloadUrl, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw Error(`${id}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const doc = parser.parse(bytes.toString('utf8')).documento;
  if (doc?.metadatos?.identificador !== id || !doc.texto) throw Error(`${id}: identidad o texto ausentes`);
  const day = String(doc.metadatos.fecha_publicacion);
  const snapshotPath = `${directory}/${id}.xml`;
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  try { await writeFile(snapshotPath, bytes, { flag: 'wx' }); }
  catch (error) { if (error.code !== 'EEXIST' || createHash('sha256').update(await readFile(snapshotPath)).digest('hex') !== sha256) throw error; }
  sources.push({ id, url: `https://www.boe.es/buscar/doc.php?id=${id}`, downloadUrl, title: doc.metadatos.titulo,
    organisation: 'Agencia Estatal Boletín Oficial del Estado', publishedAt: `${day.slice(0,4)}-${day.slice(4,6)}-${day.slice(6,8)}`,
    capturedAt: new Date().toISOString(), snapshotPath, sha256, bytes: bytes.length, kind: 'norma', captureType: 'bytes_originales' });
  await writeFile(manifestPath, JSON.stringify(sources, null, 2) + '\n');
  console.log(`${id}: ${doc.metadatos.titulo}`);
}
