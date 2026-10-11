import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { parseAvilaProgramme } from "../lib/mandate/avila-import";

const root = "data/mandate/evidence/territorial/avila/";
const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const hash = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");
const meta = read(`${root}programme.meta.json`);
if (hash(meta.snapshotPath) !== "50d0ba3ac4cf04eaa7e6d0d67f714fd0d648adf68c860da3888b320f6e7dba8b"
  || hash(`${root}programme.pages.json`) !== meta.extractionSha256
  || hash(`${root}programme.layout.json`) !== "ee66ec39a5a7d88f9c8029e3953da5bf91d75818a61eddd4abb0496461d12711") throw Error("Original o extracción de Ávila cambiados");
const sections = parseAvilaProgramme(read(`${root}programme.layout.json`));
const summaries: Record<string, string[]> = read(`${root}summaries.json`);
if (Object.values(summaries).flat().length !== sections.length
  || sections.some(s => !summaries[String(s.page)]?.[Number(s.officialId.slice(-2))-1]?.trim())) throw Error("Resúmenes de Ávila incompletos");
const context: [number,number,string,string][] = [
  [5,5,"Presentación", "El programa sitúa el mandato 2023–2027 y plantea igualdad, proximidad y una gestión responsable de recursos."],
  [6,6,"Balance previo", "Las afirmaciones sobre cumplimiento, deuda e inversión describen 2019–2023 según la candidatura; no se consideran resultados del nuevo mandato ni cifras comprobadas."],
  [7,7,"Síntesis gráfica", "La página gráfica enumera prioridades generales: servicios, educación, sanidad, accesibilidad, agua, comercio, cultura y espacios públicos. Falta conciliar esta síntesis con los apartados y otros compromisos."],
  [9,9,"Modelo urbano", "La candidatura presenta un proyecto de ciudad a distintos plazos y propone aprovechar fondos europeos y la estrategia Ávila 2030."],
  [13,13,"Introducción a jardines", "Los planes de jardines se enmarcan en ampliar y mejorar las áreas verdes y el arbolado."],
  [15,15,"Introducción al cementerio", "Se plantea cuidar el cementerio como espacio que requiere especial atención."],
  [16,16,"Diagnóstico de alumbrado", "La candidatura reconoce problemas de iluminación anteriores y presenta las propuestas como continuidad de mejoras."],
  [18,18,"Criterios ambientales", "Se plantea incorporar criterios ambientales a todas las políticas municipales."],
  [21,21,"Candidaturas de barrios", "Se presentan seis candidaturas a representantes de los barrios anexionados; no son seis compromisos de ejecución."],
  [24,24,"Accesibilidad universal", "La accesibilidad se propone como criterio transversal de servicios, espacios urbanos e información."],
  [26,26,"Necesidades de mayores", "Se destaca la demanda de las personas mayores de permanecer en su hogar."],
  [34,34,"Rodajes", "Los tres apartados de esta página desarrollan la promoción de Ávila como localización audiovisual."],
  [47,47,"Principios y balance de transparencia", "El programa declara principios de integridad y eficiencia y atribuye al mandato anterior mejoras de acceso a información. Esa autoevaluación no acredita cumplimiento ni honestidad personal."],
  [48,48,"Antecedentes europeos", "Las cifras de ayudas y proyectos anteriores se conservan como antecedentes declarados por la candidatura, separados de nuevas realizaciones."],
  [51,51,"Competencias de otras administraciones", "Las ocho peticiones de la última página se dirigen al Estado y a la comunidad autónoma. Que un servicio se abra no demuestra por sí solo causalidad municipal."],
];
const inventory = {
  schemaVersion: 1, jurisdictionId: "m-05019", mandateId: "m-05019-2023", mandateLabel: "Ávila · programa municipal 2023–2027",
  sourceId: "avila-programme", mandateSourceId: "avila-programme", registerSourceId: "avila-constitution",
  sourceLabel: "Programa electoral · apartados con referencias editoriales", sourceSha256: meta.sha256,
  importedAt: "2026-10-11", textLanguage: "es", inventoryKind: "programme-sections", inventoryTotal: sections.length,
  scope: "163 apartados del programa de Por Ávila. Incluyen prosa y listas agrupadas por su sentido, con repeticiones y submedidas; no equivalen a 163 promesas únicas. Contexto y balance previo separados. Falta conciliar la síntesis gráfica, el discurso de investidura, otros compromisos y modificaciones del mandato.",
  textNote: "Resúmenes editoriales; Pxx-yy indica página y orden creado para esta revisión, no numeración oficial. PDF de 51 páginas revisado visualmente: se conserva extracción bruta y otra por coordenadas para evitar duplicados superpuestos y reconocer viñetas gráficas. El índice interno sitúa erróneamente dos separadores: las páginas 30 y 37 contienen propuestas y están incluidas. El acta 08/23 de 17/06/2023 acredita la proclamación de Sánchez Cabrera y su referencia al programa como hoja de ruta (páginas 3–4); contiene errores de plantilla sobre fecha electoral, asistentes y lugar. Su título interno 7/99 tampoco coincide con el acta. Registro municipal consultado con cambios hasta junio de 2026; continuidad al corte, firmas y revisión humana independiente pendientes. Portada: mayo de 2023, día exacto de publicación desconocido.",
  records: sections.map(s => ({ id: `m-05019-${s.officialId.toLowerCase()}`, ...s,
    text: summaries[String(s.page)][Number(s.officialId.slice(-2))-1], sourceId: "avila-programme",
    sourceNote: "Resumen editorial. Referencia creada con la página y orden del apartado; no es un número oficial." })),
  contextBlocks: context.map(([page,endPage,topic,text],i) => ({ id: `m-05019-context-${i+1}`, page,endPage,topic,text })),
};
writeFileSync("data/mandate/avila-inventory.json", JSON.stringify(inventory,null,2)+"\n");
console.log(`Ávila: ${sections.length} apartados y ${context.length} bloques de contexto; ninguna revisión creada por la importación.`);
