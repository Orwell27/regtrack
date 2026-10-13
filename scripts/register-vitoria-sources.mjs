import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const path = 'data/mandate/evidence/territorial/sources.json';
const sources = JSON.parse(await readFile(path, 'utf8'));
const id = 'vitoria-zbe-racvn';
const snapshotPath = `data/mandate/evidence/territorial/${id}.md`;
const bytes = await readFile(snapshotPath);
const sha256 = createHash('sha256').update(bytes).digest('hex');
const existing = sources.find(source => source.id === id);
if (existing && existing.sha256 !== sha256) throw Error('Changed editorial note');
if (!existing) {
  sources.push({ id, jurisdictionId: 'm-01059', role: 'reporting', family: 'racvn', title: 'RACVN · recurso contra la ZBE y posición del club', publisher: 'Real Automóvil Club Vasco Navarro', publicationDate: null,
    url: 'https://racvn.net/wp-content/uploads/2026/02/InformeBalanceAnualRACVN_2025-1.pdf', snapshotPath, sha256, bytes: bytes.length, retrievedAt: new Date().toISOString(), captureType: 'extracto_editorial' });
  await writeFile(path, JSON.stringify(sources, null, 2) + '\n');
}
