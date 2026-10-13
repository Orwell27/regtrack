import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const path = 'data/mandate/evidence/territorial/sources.json';
const sources = JSON.parse(await readFile(path, 'utf8'));
const folder = 'data/mandate/evidence/territorial';
const descriptors = [
  ['barcelona-catalogue-2026', 'catalogue', 'Catálogo de actuaciones municipales · captura completa', 'government-report'],
  ['barcelona-port-ficha', '538', 'Ficha municipal · Nou Port Olímpic', 'government-report'],
  ['barcelona-laietana-ficha', '493', 'Ficha municipal · Reforma de la via Laietana', 'government-report'],
];
for (const [id, key, title, role] of descriptors) {
  const metadata = JSON.parse(await readFile(`${folder}/barcelona/${key}.meta.json`, 'utf8'));
  if (sources.some(source => source.id === id)) continue;
  sources.push({ ...metadata, id, jurisdictionId: 'm-08019', title, role, publisher: 'Ajuntament de Barcelona', family: 'ayto-barcelona', publicationDate: null, captureType: 'bytes_originales' });
}
for (const [id, title, date, url, publisher, family] of [
  ['barcelona-laietana-opening', 'Crónica de la inauguración de Via Laietana', '2025-06-29', 'https://elpais.com/espana/catalunya/2025-06-29/barcelona-reestrena-la-via-laietana-despues-de-tres-anos-de-obras.html', 'El País', 'elpais'],
  ['barcelona-laietana-court', 'Información sobre sentencia y recurso anunciado de Via Laietana', '2025-07-11', 'https://elpais.com/espana/catalunya/2025-07-11/el-ayuntamiento-de-barcelona-recurrira-la-sentencia-que-invalida-de-nuevo-el-proyecto-de-reforma-de-via-laietana.html', 'Europa Press, publicada por El País', 'europa-press'],
]) {
  if (sources.some(source => source.id === id)) continue;
  const snapshotPath = `${folder}/${id}.md`;
  const bytes = await readFile(snapshotPath);
  sources.push({ id, jurisdictionId: 'm-08019', title, url, publisher, family, publicationDate: date, role: 'reporting', captureType: 'extracto_editorial', snapshotPath, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), retrievedAt: new Date().toISOString() });
}
await writeFile(path, JSON.stringify(sources, null, 2) + '\n');
