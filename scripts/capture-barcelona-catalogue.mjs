// Archive the public list and every linked detail before interpreting any outcome.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = 'data/mandate/evidence/territorial/barcelona';
const origin = 'https://ajuntament.barcelona.cat/pla-accio-govern2023-2027/ca/';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
await mkdir(root, { recursive: true });
async function capture(id, url, expected) {
  const metadataPath = `${root}/${id}.meta.json`;
  try {
    const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
    if (metadata.url !== url || hash(await readFile(metadata.snapshotPath)) !== metadata.sha256) throw Error(`Changed archive: ${id}`);
    return metadata;
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw Error(`${id}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.toString('utf8').includes(expected)) throw Error(`${id}: unrecognized document`);
  const snapshotPath = `${root}/${id}.html`;
  await writeFile(snapshotPath, bytes, { flag: 'wx' });
  const metadata = { id, url, snapshotPath, retrievedAt: new Date().toISOString(), bytes: bytes.length, sha256: hash(bytes) };
  await writeFile(metadataPath, JSON.stringify(metadata, null, 2) + '\n', { flag: 'wx' });
  return metadata;
}
const catalogue = await capture('catalogue', `${origin}totes-les-actuacions`, 'drupal-settings-json');
const html = await readFile(catalogue.snapshotPath, 'utf8');
const matches = [...html.matchAll(/<script[^>]*data-drupal-selector="drupal-settings-json"[^>]*>([\s\S]*?)<\/script>/g)];
if (matches.length !== 1) throw Error('Ambiguous public catalogue');
const settings = JSON.parse(matches[0][1]);
const records = settings.pag_actuacions.actuacions.result;
if (records.length !== Number(settings.pag_actuacions.actuacions.total) || records.length !== 1248 || new Set(records.map(record => record.nid)).size !== records.length) throw Error('Incomplete or changed catalogue; review the new scope before capturing');
const details = [];
let cursor = 0;
await Promise.all([0, 1, 2].map(async () => {
  while (cursor < records.length) {
    const record = records[cursor++];
    if (!/^\d+$/.test(record.nid) || !/^actuacio\/[\p{L}\p{N}_-]+$/u.test(record.node) || !record.node.endsWith(`_${record.nid}`)) throw Error(`Invalid public route: ${record.nid}`);
    const metadata = await capture(record.nid, origin + record.node, 'class="page-actuacio"');
    details.push(metadata);
    if (details.length % 100 === 0) console.log(`${details.length}/${records.length} archived`);
  }
}));
details.sort((a, b) => Number(a.id) - Number(b.id));
await writeFile(`${root}/capture.json`, JSON.stringify({ catalogue, details }, null, 2) + '\n');
console.log(`Complete: ${details.length} detail pages; ${details.reduce((sum, item) => sum + item.bytes, catalogue.bytes)} original bytes`);
