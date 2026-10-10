// Fixed public originals. A captured programme is not a reviewed outcome.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const directory = 'data/mandate/evidence/territorial';
const manifestPath = `${directory}/sources.json`;
const requests = [
  { id: 'madrid-programme-2023', jurisdictionId: 'm-28079', role: 'programme', family: 'ayto-madrid',
    title: 'Programa de Gobierno 2023–2027: programa electoral publicado por el Ayuntamiento de Madrid',
    publisher: 'Ayuntamiento de Madrid; documento del Partido Popular',
    url: 'https://www.madrid.es/UnidadesDescentralizadas/Calidad/Observatorio_Ciudad/03_SG_Operativa/ficheros/Programa_electoral_Partido_Popular_Momento_Madrid.pdf',
    publicationDate: null, format: 'pdf' },
  { id: 'madrid-programme-register', jurisdictionId: 'm-28079', role: 'register', family: 'ayto-madrid',
    title: 'Programa de Gobierno 2023–2027 · catálogo municipal de 300 medidas', publisher: 'Ayuntamiento de Madrid',
    url: 'https://www.madrid.es/portales/munimadrid/es/Inicio/El-Ayuntamiento/Calidad-y-Evaluacion/Estrategia-y-planificacion/Programa-de-Gobierno-2023-2027/?vgnextchannel=486a261f46839710VgnVCM1000001d4a900aRCRD&vgnextfmt=default&vgnextoid=03881859be9fb910VgnVCM100000891ecb1aRCRD',
    publicationDate: null, format: 'html', expectedText: '300 medidas' },
  { id: 'madrid-bicimad-2026', jurisdictionId: 'm-28079', role: 'government-report', family: 'ayto-madrid',
    title: 'El nuevo bicimad cumple tres años · balance del operador', publisher: 'EMT Madrid', publicationDate: '2026-03-07', format: 'html', expectedText: '634 estaciones',
    url: 'https://www.emtmadrid.es/Noticias/El-nuevo-bicimad-cumple-tres-anos-y-alcanza-casi-3.aspx' },
  { id: 'madrid-tourism-plan', jurisdictionId: 'm-28079', role: 'action', family: 'ayto-madrid',
    title: 'Plan Estratégico de Turismo 2024–2027 · documento publicado', publisher: 'Ayuntamiento de Madrid', publicationDate: null, format: 'pdf',
    url: 'https://www.madrid.es/FWProjects/transparencia/PlanesYMemorias/Planes/Turismo/Ficheros/plan_estrategico_turismo.pdf' },
  { id: 'madrid-tourism-register', jurisdictionId: 'm-28079', role: 'government-report', family: 'ayto-madrid',
    title: 'Ficha del Plan Estratégico de Turismo y fecha de aprobación', publisher: 'Ayuntamiento de Madrid', publicationDate: null, format: 'html', expectedText: '23 de enero de 2025',
    url: 'https://www.madrid.es/portales/munimadrid/es/Inicio/El-Ayuntamiento/Publicaciones/Listado-de-Publicaciones/Plan-Estrategico-de-Turismo-de-la-Ciudad-de-Madrid-para-el-periodo-2024-2027/?vgnextchannel=f1aebadb6b997010VgnVCM100000dc0ca8c0RCRD&vgnextfmt=default&vgnextoid=8475306e7a394910VgnVCM2000001f4a900aRCRD' },
  { id: 'madrid-ibi-2026', jurisdictionId: 'm-28079', role: 'government-report', family: 'ayto-madrid',
    title: 'IBI · información de tipos para 2026', publisher: 'Agencia Tributaria Madrid', publicationDate: null, format: 'html', expectedText: '0,414',
    url: 'https://agenciatributaria.madrid.es/portales/contribuyente/es/Impuestos-tasas-y-precios-publicos/Bienes-Inmuebles-IBI-/Impuesto-sobre-Bienes-Inmuebles-IBI-Informacion-general/?vgnextchannel=3cd1e5bcc9c78710VgnVCM1000008a4a900aRCRD&vgnextfmt=default&vgnextoid=d88526dcde762810VgnVCM1000001d4a900aRCRD' },
  { id: 'madrid-ibi-ordenanza-2026', jurisdictionId: 'm-28079', role: 'action', family: 'ayto-madrid',
    title: 'Ordenanza fiscal del IBI · texto consolidado de 26 de diciembre de 2025', publisher: 'Ayuntamiento de Madrid · Sede electrónica', publicationDate: '2025-12-26', format: 'pdf',
    url: 'https://sede.madrid.es/eli/es-md-01860896/odnz/1989/12/22/(1)/con/20251226/spa/pdf' },
  { id: 'madrid-tourism-boam', jurisdictionId: 'm-28079', role: 'action', family: 'ayto-madrid',
    title: 'BOAM 9814/449 · acuerdo de aprobación del Plan Estratégico de Turismo', publisher: 'Ayuntamiento de Madrid · BOAM', publicationDate: '2025-02-07', format: 'html', expectedText: '9814',
    url: 'https://sede.madrid.es/sites/v/index.jsp?vgnextoid=ed5e5ec7f30d4910VgnVCM2000001f4a900aRCRD&vgnextchannel=741d814231ede410VgnVCM1000000b205a0aRCRD' },
  { id: 'navarra-programme-2023', jurisdictionId: 'r-15', role: 'programme', family: 'gob-navarra',
    title: 'Acuerdo Programático 2023–2027 de Navarra', publisher: 'Gobierno de Navarra; acuerdo PSN-PSOE, Geroa Bai y Contigo-Zurekin',
    url: 'https://gobiernoabierto.navarra.es/sites/default/files/2023_acuerdo_programatico.pdf', publicationDate: null, format: 'pdf' },
  { id: 'navarra-balance-2025', jurisdictionId: 'r-15', role: 'government-report', family: 'gob-navarra',
    title: 'Rendición de cuentas 2025 · Balance II', publisher: 'Gobierno de Navarra · Oficina de Análisis y Prospectiva',
    url: 'https://analisisyprospectiva.navarra.es/documents/56417073/56419029/Rendici%C3%B3n%2Bde%2Bcuentas%2B2025.pdf/44863f2d-0674-86ee-00a7-25466f583c6f?t=1769157335439', publicationDate: null, format: 'pdf' },
];
await mkdir(directory, { recursive: true });
let sources = [];
try { sources = JSON.parse(await readFile(manifestPath, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const selected = process.argv.slice(2);
if (selected.some(id => !requests.some(request => request.id === id))) throw Error('Unknown source id');
for (const request of requests.filter(request => !selected.length || selected.includes(request.id))) {
  const existing = sources.find(source => source.id === request.id);
  if (existing) {
    if (hash(await readFile(existing.snapshotPath)) !== existing.sha256) throw Error(`Capture changed: ${request.id}`);
    continue;
  }
  const response = await fetch(request.url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw Error(`${request.id}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (request.format === 'pdf' && bytes.subarray(0, 5).toString() !== '%PDF-') throw Error(`Not a PDF: ${request.id}`);
  if (request.format === 'html' && !bytes.toString('utf8').includes(request.expectedText)) throw Error(`Source content not identified: ${request.id}`);
  const snapshotPath = `${directory}/${request.id}.${request.format}`;
  await writeFile(snapshotPath, bytes, { flag: 'wx' });
  sources.push({ ...request, snapshotPath, sha256: hash(bytes), bytes: bytes.length, retrievedAt: new Date().toISOString(), captureType: 'bytes_originales' });
  await writeFile(manifestPath, JSON.stringify(sources, null, 2) + '\n');
  console.log(`${request.id}: ${bytes.length} bytes`);
}
