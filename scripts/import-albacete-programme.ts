import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { parseAlbaceteProgramme } from "../lib/mandate/albacete-import";

const root = "data/mandate/evidence/territorial/albacete/";
const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const save = (path: string, value: unknown) => writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
const meta = read(`${root}programme.meta.json`);
const hash = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");
if (hash(meta.snapshotPath) !== "6b21a166f9bfcd119dc62e01fb920f34ee9935f00aefca5ddffc7a11063b77cc"
  || hash(`${root}programme.pages.json`) !== meta.extractionSha256) throw Error("Original de Albacete cambiado");
const { sections, context } = parseAlbaceteProgramme(read(`${root}programme.pages.json`));
const summaries: string[] = read(`${root}summaries.json`);
if (summaries.length !== sections.length || summaries.some(t => !t.trim())) throw Error("Resúmenes de Albacete incompletos");
const topics: [number, string][] = [
  [22, "Familias, inclusión y mayores"], [27, "Igualdad"], [34, "Educación"], [40, "Salud"],
  [52, "Atención social"], [57, "Participación y barrios"], [70, "Empleo"], [78, "Industria"],
  [90, "Comercio, fiscalidad e inversión"], [109, "Turismo y ferias"], [122, "Urbanismo"],
  [132, "Ciudad y barrios"], [148, "Medio ambiente"], [164, "Movilidad"], [173, "Fiestas y tradiciones"],
  [181, "Patrimonio"], [206, "Cultura"], [225, "Deporte"], [234, "Proyectos de futuro"],
  [243, "Administración"], [250, "Seguridad"], [253, "Compromiso ético"],
];
const contextSpecs: [number, number, string, string][] = [
  [3, 3, "Presentación", "El candidato plantea una ciudad participativa y mejores servicios, empleo e inversiones. Las valoraciones sobre gobiernos anteriores son discurso político y no hechos comprobados por esta importación."],
  [4, 4, "Personas e igualdad", "Introducción sobre familias, educación, accesibilidad, atención social, igualdad, salud y participación vecinal. Incluye objetivos que reaparecen en los puntos numerados."],
  [9, 10, "Empleo y empresas", "Presenta apoyo empresarial, ampliación industrial, formación y simplificación administrativa y tributaria como líneas generales."],
  [14, 14, "Ciudad sostenible", "Introduce movilidad activa, transporte colectivo, ampliación de parques, biodiversidad y mejora del espacio urbano."],
  [18, 19, "Patrimonio, cultura y deporte", "Expone objetivos de acceso cultural, conservación patrimonial, apoyo a creadores y clubes y nuevas instalaciones deportivas."],
  [23, 23, "Proyectos de futuro", "Reúne grandes infraestructuras, cooperación institucional, administración accesible y refuerzo de los servicios de seguridad. Las comparaciones sobre criminalidad no se verifican en esta importación."],
  [26, 26, "Marco ético", "La candidatura asume participación, transparencia, prioridad del interés general y responsabilidad ante la ciudadanía. Los tres compromisos numerados de esta página se conservan con identificadores propios."],
];
save("data/mandate/albacete-inventory.json", {
  schemaVersion: 1, jurisdictionId: "m-02003", mandateId: "m-02003-2023",
  mandateLabel: "Albacete · programa municipal 2023–2027",
  sourceId: "albacete-programme", mandateSourceId: "albacete-programme", registerSourceId: "albacete-register-2025",
  sourceLabel: "Programa electoral · 250 apartados y tres compromisos éticos",
  sourceSha256: meta.sha256, importedAt: "2026-10-11", textLanguage: "es", inventoryKind: "numbered-sections",
  inventoryTotal: sections.length,
  scope: "Los 250 apartados numerados y los tres compromisos éticos del programa municipal de Manuel Serrano publicado por el PP de Albacete. Son unidades del documento, no 253 promesas únicas: contienen submedidas, reiteraciones y peticiones a otras administraciones. La prosa introductoria se conserva como contexto; falta conciliar otras promesas y modificaciones del mandato.",
  textNote: "Las entradas y el contexto son resúmenes editoriales, no transcripciones literales. Se conservan el PDF de 28 páginas, su extracción y los fragmentos de origen. Las páginas 2 y 28 se revisaron visualmente: contienen marca y contacto, no medidas adicionales; la 27 identifica la candidatura. Los tres puntos éticos de la página 26 reinician la numeración y llevan identificadores distintos. El BOP de 03/10/2025 identifica a Manuel Serrano López como alcalde en un anuncio firmado el 24/09/2025; no sustituye al acta de constitución ni certifica continuidad hasta el corte. Fecha exacta de publicación del programa, acta constitutiva, vigencia del gobierno al corte y cotejo humano independiente pendientes. Firmas electrónicas no validadas.",
  records: sections.map((s, i) => ({
    id: `m-02003-${i < 250 ? s.officialId : `ethics-${i - 249}`}`,
    officialId: s.officialId, text: summaries[i], topic: topics.find(([end]) => i + 1 <= end)![1],
    page: s.page, endPage: s.endPage, sourceId: "albacete-programme",
    sourceNote: "Resumen editorial del apartado numerado; consultar el original para condiciones y submedidas completas.",
    rawText: s.rawText, fragments: s.fragments,
  })),
  contextBlocks: contextSpecs.map(([page, endPage, topic, text], i) => ({
    id: `m-02003-context-${i + 1}`, page, endPage, topic, text,
    fragments: context.filter(f => f.page >= page && f.page <= endPage),
  })),
});
console.log(`Albacete: ${sections.length} apartados y ${contextSpecs.length} bloques de contexto; ninguna revisión creada por la importación.`);
