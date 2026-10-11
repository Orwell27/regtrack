// Fixed public originals. A captured programme is not a reviewed outcome.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const directory = 'data/mandate/evidence/territorial';
const manifestPath = `${directory}/sources.json`;
const requests = [
  { id: 'euskadi-waiting-2026', jurisdictionId: 'r-16', role: 'government-report', family: 'gob-euskadi',
    title: 'Osakidetza · listas de espera a 23 de mayo de 2026', publisher: 'Gobierno Vasco · Osakidetza', publicationDate: null, format: 'pdf',
    url: 'https://www.euskadi.eus/contenidos/informacion/osk_corp_listas_espera/es_def/adjuntos/Listas-de-espera-a-23-de-mayo-de-2026.pdf' },
  { id: 'euskadi-waiting-2025', jurisdictionId: 'r-16', role: 'government-report', family: 'gob-euskadi',
    title: 'Osakidetza · listas de espera a 29 de noviembre de 2025', publisher: 'Gobierno Vasco · Osakidetza', publicationDate: null, format: 'pdf',
    url: 'https://www.euskadi.eus/contenidos/informacion/osk_corp_listas_espera/es_def/adjuntos/Situacion-de-listas-de-espera-de-Osakidetza-29-de-noviembre-.pdf' },
  { id: 'euskadi-health-pact', jurisdictionId: 'r-16', role: 'action', family: 'gob-euskadi',
    title: 'Pacto Vasco de Salud · Líneas estratégicas', publisher: 'Gobierno Vasco', publicationDate: null, format: 'pdf',
    url: 'https://www.euskadi.eus/contenidos/informacion/pacto_salud_2025/es_def/adjuntos/LIBRO-4-LINEAS-ESTRATEGICAS.pdf' },
  { id: 'euskadi-ararteko-2025', jurisdictionId: 'r-16', role: 'control', family: 'ararteko',
    title: 'Ararteko · informe anual 2025', publisher: 'Ararteko', publicationDate: null, format: 'pdf',
    url: 'https://ararteko.eus/sites/default/files/2026-03/ES-IA-2025.pdf' },
  { id: 'euskadi-emantzipa-2026', jurisdictionId: 'r-16', role: 'action', family: 'gob-euskadi',
    title: 'Decreto 42/2026 · Programa Emantzipa', publisher: 'Gobierno Vasco · BOPV', publicationDate: '2026-03-31', format: 'pdf',
    url: 'https://www.euskadi.eus/bopv2/datos/2026/03/2601387a.pdf' },
  { id: 'euskadi-gaztelagun-2026', jurisdictionId: 'r-16', role: 'action', family: 'gob-euskadi',
    title: 'Orden de 5 de junio de 2026 · convocatoria Gaztelagun', publisher: 'Gobierno Vasco · BOPV', publicationDate: '2026-06-15', format: 'pdf',
    url: 'https://www.euskadi.eus/bopv2/datos/2026/06/2602608a.pdf' },
  { id: 'euskadi-programme-2024', jurisdictionId: 'r-16', role: 'programme', family: 'gob-euskadi',
    title: 'Programa de Gobierno 2024–2028 · XIII Legislatura', publisher: 'Gobierno Vasco', publicationDate: null, format: 'pdf',
    url: 'https://bideoak2.euskadi.eus/paginas/page_98299/Programa_Gobierno_2024-2028_es.pdf' },
  { id: 'euskadi-programme-register', jurisdictionId: 'r-16', role: 'register', family: 'gob-euskadi',
    title: 'Irekia · Programa de Gobierno 2024–2028', publisher: 'Gobierno Vasco · Irekia', publicationDate: null, format: 'html', expectedText: 'Programa de Gobierno',
    url: 'https://www.irekia.euskadi.eus/es/pages/98299-2024-2028-gobernu-programa' },
  { id: 'euskadi-balance-2025', jurisdictionId: 'r-16', role: 'government-report', family: 'gob-euskadi',
    title: 'Informe de ejecución del Programa de Gobierno · ejercicio 2025', publisher: 'Gobierno Vasco', publicationDate: null, format: 'pdf',
    url: 'https://www.euskadi.eus/contenidos/informacion/lxiii_coordinacion_programacio/es_def/adjuntos/Informe-Seguimiento-2025-ES_web.pdf' },
  { id: 'navarra-comptos-2023', jurisdictionId: 'r-15', role: 'control', family: 'camara-comptos',
    title: 'Cámara de Comptos · Cuentas generales de Navarra, 2023', publisher: 'Cámara de Comptos de Navarra', publicationDate: null, format: 'pdf',
    url: 'https://camaradecomptos.navarra.es/sites/default/files/assets/files/informes/InformeComptos2419firmado.pdf' },
  { id: 'navarra-health-2026', jurisdictionId: 'r-15', role: 'government-report', family: 'gob-navarra',
    title: 'Salud presenta el anteproyecto de Ley Foral de Salud', publisher: 'Gobierno de Navarra', publicationDate: '2026-03-30', format: 'html', expectedText: 'anteproyecto',
    url: 'https://www.navarra.es/es/-/nota-prensa/salud-presenta-el-texto-del-anteproyecto-de-ley-foral-de-salud-con-el-objetivo-de-dar-respuesta-a-las-necesidades-reales-de-las-personas' },
  { id: 'navarra-housing-boe-2025', jurisdictionId: 'r-15', role: 'action', family: 'gob-espana',
    title: 'BOE-A-2025-15728 · zonas tensionadas de Navarra', publisher: 'Ministerio de Vivienda y Agenda Urbana · BOE', publicationDate: '2025-07-29', format: 'pdf',
    url: 'https://www.boe.es/boe/dias/2025/07/29/pdfs/BOE-A-2025-15728.pdf' },
  { id: 'navarra-housing-boe-correction', jurisdictionId: 'r-15', role: 'action', family: 'gob-espana',
    title: 'BOE-A-2025-20246 · corrección de enlaces de las zonas tensionadas', publisher: 'Ministerio de Vivienda y Agenda Urbana · BOE', publicationDate: '2025-10-10', format: 'pdf',
    url: 'https://www.boe.es/boe/dias/2025/10/10/pdfs/BOE-A-2025-20246.pdf' },
  { id: 'navarra-bidean-2025', jurisdictionId: 'r-15', role: 'government-report', family: 'gob-navarra',
    title: 'Bidean comunica 57.838 traslados en sus tres primeros meses', publisher: 'Bidean · sociedad pública de Navarra', publicationDate: '2025-10-01', format: 'html', expectedText: '57.838',
    url: 'https://www.bideansalud.es/es/actualidad/la-sociedad-publica-bidean-lleva-cabo-57838-traslados-en-sus-tres-primeros-meses-de' },
  { id: 'navarra-bidean-start', jurisdictionId: 'r-15', role: 'government-report', family: 'gob-navarra',
    title: 'CPEN anuncia el inicio de Bidean y describe su constitución', publisher: 'Corporación Pública Empresarial de Navarra', publicationDate: '2025-05-06', format: 'html', expectedText: '2023',
    url: 'https://www.sociedadespublicasdenavarra.es/es/cpen-al-dia/nuestras-noticias/la-empresa-publica-de-transporte-sanitario-bidean-comenzara-su' },
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
    url: 'https://analisisyprospectiva.navarra.es/documents/56417073/56419029/2023_ACUERDO_PROGRAMATICO.pdf/44995778-0664-34c1-1532-996e8b43777b?t=1768556539489', publicationDate: null, format: 'pdf' },
  { id: 'navarra-programme-register', jurisdictionId: 'r-15', role: 'register', family: 'gob-navarra',
    title: 'Rendición de cuentas del Acuerdo Programático 2023–2027 · registro', publisher: 'Gobierno de Navarra · Oficina de Análisis y Prospectiva',
    url: 'https://analisisyprospectiva.navarra.es/es/rendicion-de-cuentas', publicationDate: null, format: 'html', expectedText: '347 compromisos' },
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
