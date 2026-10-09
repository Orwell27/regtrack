// Explicit public-source capture for the 10 October review. No credentials or model calls.
// Originals are immutable: an existing path with different bytes is never overwritten.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { XMLParser } from 'fast-xml-parser';

const directory = 'data/mandate/evidence/commitments';
const xml = new XMLParser();
const boe = ['2026-13643', '2026-5713', '2026-8872', '2026-20823', '2026-8287', '2026-5714', '2026-5843', '2024-8710', '2021-21651', '2023-26452', '2025-1137'];
const pages = [
  ['estatuto-2025-12-31', 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-11430&p=20251231&tn=1', 'Estatuto de los Trabajadores, versión a 31 de diciembre de 2025', 'Agencia Estatal Boletín Oficial del Estado', null],
  ['estatuto-2026-10-10', 'https://www.boe.es/buscar/act.php?id=BOE-A-2015-11430&p=20261010&tn=1', 'Estatuto de los Trabajadores, consolidado consultado al corte', 'Agencia Estatal Boletín Oficial del Estado', null],
  ['libros-2026', 'https://www.educacionfpydeportes.gob.es/prensa/actualidad/2026/03/20260310-librosdetexto.html', 'Reparto de ayudas para libros de texto y material didáctico en 2026', 'Ministerio de Educación, Formación Profesional y Deportes', '2026-03-10'],
  ['salud-mental-plan', 'https://www.sanidad.gob.es/gl/gabinete/notasPrensa.do?id=6650', 'Aprobación del Plan de Acción de Salud Mental 2025-2027', 'Ministerio de Sanidad', '2025-04-04'],
  ['salud-mental-financiacion', 'https://www.sanidad.gob.es/gabinete/notasPrensa.do?id=6698&metodo=detalle', 'Distribución de fondos para atención primaria, salud mental y prevención del suicidio', 'Ministerio de Sanidad', '2025-06-18'],
  ['epa-2026-t2', 'https://www.ine.es/dyngs/Prensa/EPA2T26.htm?print=1', 'Encuesta de Población Activa, segundo trimestre de 2026', 'Instituto Nacional de Estadística', '2026-07-28'],
  ['paro-ue-agosto-2026', 'https://ec.europa.eu/eurostat/web/products-euro-indicators/w/3-01102026-ap', 'Unemployment, August 2026', 'Eurostat', '2026-10-01'],
  ['cliente-financiero-julio-2026', 'https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/economia-comercio-empresa/Paginas/2026/240726-autoridad-deensa-cliente-financiero.aspx', 'Estado de tramitación de la Autoridad de Defensa del Cliente Financiero', 'Ministerio de Economía, Comercio y Empresa', '2026-07-24'],
  ['creditos-consumo-2026', 'https://portal-cec.consumo.gob.es/es/comunicacion/noticias/2026/las-nuevas-normas-sobre-creditos-al-consumo-limitaran-los-intereses-para', 'Anteproyecto de regulación de créditos al consumo', 'Centro Europeo del Consumidor en España — Ministerio de Consumo', '2026-04-24'],
  ['estabilizacion-junio-2026', 'https://digital.gob.es/comunicacion/notas-prensa/secretaria-estado-funcion-publica/2026/06/el-gobierno-emplaza-a-las-ccaa-a-una-reunion-para-abordar-medida', 'Seguimiento de procesos de estabilización y medidas para reducir la temporalidad', 'Ministerio para la Transformación Digital y de la Función Pública', '2026-06-30'],
];
await mkdir(directory, { recursive: true });
const manifestPath = `${directory}/review-2026-10-10-sources.json`;
let sources = [];
try { sources = JSON.parse(await readFile(manifestPath, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
const jobs = [...boe.map(value => { const id = `BOE-A-${value}`; return { id, url: `https://www.boe.es/diario_boe/txt.php?id=${id}`, download: `https://www.boe.es/diario_boe/xml.php?id=${id}`, extension: 'xml' }; }), ...pages.map(([id, url, title, organisation, publishedAt]) => ({ id, url, download: url, title, organisation, publishedAt, extension: 'html' }))];
let failures = 0;
for (const job of jobs) {
  if (sources.some(source => source.id === job.id)) { console.log(`Conservada ${job.id}`); continue; }
  try {
    const response = await fetch(job.download, { signal: AbortSignal.timeout(25000), headers: { 'User-Agent': 'RegTrack documentary review (public sources)' } });
    if (!response.ok) throw Error(`HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 5_000_000 || bytes.length < 300) throw Error(`Tamaño inesperado: ${bytes.length}`);
    let { title, organisation, publishedAt } = job;
    if (job.extension === 'xml') {
      const metadata = xml.parse(bytes.toString('utf8')).documento?.metadatos;
      if (metadata?.identificador !== job.id) throw Error('Identidad BOE incorrecta');
      title = metadata.titulo; organisation = 'Agencia Estatal Boletín Oficial del Estado';
      const day = String(metadata.fecha_publicacion); publishedAt = `${day.slice(0,4)}-${day.slice(4,6)}-${day.slice(6,8)}`;
    } else if (!/<html/i.test(bytes.toString('utf8')) || /<title>[^<]*(?:access denied|just a moment|error 404)/i.test(bytes.toString('utf8'))) throw Error('Respuesta HTML no documental');
    const snapshotPath = `${directory}/${job.id}-review-2026-10-10.${job.extension}`;
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    try { await writeFile(snapshotPath, bytes, { flag: 'wx' }); }
    catch (error) { if (error.code !== 'EEXIST' || createHash('sha256').update(await readFile(snapshotPath)).digest('hex') !== sha256) throw error; }
    sources.push({ id: job.id, url: job.url, downloadUrl: response.url, title, organisation, publishedAt, capturedAt: new Date().toISOString(), sha256, snapshotPath, bytes: bytes.length, captureType: 'bytes_originales', kind: job.extension === 'xml' ? 'norma' : 'fuente_primaria' });
    await writeFile(manifestPath, JSON.stringify(sources, null, 2) + '\n');
    console.log(`Capturada ${job.id}: ${title}`);
  } catch (error) { failures++; console.error(`${job.id}: ${error.message}`); }
}
if (failures) process.exitCode = 1;
