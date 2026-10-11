import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { parseAlmeriaProgramme } from "../lib/mandate/almeria-import";

const root = "data/mandate/evidence/territorial/almeria/";
const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const hash = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");
const meta = read(`${root}programme.meta.json`);
if (hash(meta.snapshotPath) !== "860b0dc920f87a6878c08ad0c6f5ec01bf7c3bc84988c7d9208488b9871ede16"
  || hash(`${root}programme.pages.json`) !== meta.extractionSha256) throw Error("Original de Almería cambiado");
const { sections, context } = parseAlmeriaProgramme(read(`${root}programme.pages.json`));
const summaries: Record<string, string> = read(`${root}summaries.json`);
if (Object.keys(summaries).length !== sections.length || sections.some(s => !summaries[s.officialId]?.trim())) throw Error("Resúmenes de Almería incompletos");
const contextText = [
  ["Presentación", "La candidatura plantea un proyecto participativo centrado en las personas y en preparar la ciudad para el futuro."],
  ["Personas", "La introducción sitúa la inclusión, la igualdad y la atención a personas vulnerables como prioridades municipales."],
  ["Sostenibilidad", "Se propone mejorar movilidad, reciclaje y eficiencia energética para reducir emisiones y mejorar la calidad de vida."],
  ["Barrios", "Se anuncia apoyo a todos los barrios, al centro histórico, al litoral y a proyectos pendientes tras la pandemia."],
  ["Turismo y comercio", "La candidatura busca turismo durante todo el año y apoyo al comercio local como parte de la identidad y la economía urbana."],
  ["Deporte", "Se plantea mantener instalaciones y facilitar el deporte en todos los barrios y para distintas edades y colectivos."],
  ["Cultura", "Se propone conservar el patrimonio y promover una cultura local vinculada a su historia y al futuro de la ciudad."],
  ["Juventud", "La introducción plantea facilitar formación, empleo, cultura y oportunidades para los jóvenes."],
];
const inventory = {
  schemaVersion: 1, jurisdictionId: "m-04013", mandateId: "m-04013-2023",
  mandateLabel: "Almería · programa municipal 2023–2027", sourceId: "almeria-programme", mandateSourceId: "almeria-programme",
  registerSourceId: "almeria-constitution-report", sourceLabel: "Programa electoral · apartados con referencias editoriales",
  sourceSha256: meta.sha256, importedAt: "2026-10-11", textLanguage: "es", inventoryKind: "programme-sections", inventoryTotal: sections.length,
  scope: "155 apartados extraídos del programa municipal de María del Mar Vázquez (PP), incluidos los destacados sin viñeta. Son unidades editoriales del documento, no 155 promesas únicas: hay reiteraciones, submedidas y solicitudes a otras administraciones. La prosa introductoria se conserva como contexto; falta conciliar otros compromisos y modificaciones del mandato.",
  textNote: "Resúmenes editoriales, no citas literales. Los códigos Pxx-yy indican página y orden visual, no numeración oficial. Se conserva el PDF de 32 páginas y su extracción; la página 7 se reordena según su composición visual y el apartado del Mercado Central continúa en la 20. Portadas, separadores, eslóganes y contacto se revisaron visualmente. La crónica municipal documenta la proclamación de la alcaldesa el 17/06/2023 y otra la identifica en el pleno del 08/09/2026; faltan acta constitutiva y comprobación de continuidad hasta el corte. Fecha exacta de publicación del programa y cotejo humano independiente pendientes. No se han validado firmas electrónicas.",
  records: sections.map(s => ({ id: `m-04013-${s.officialId.toLowerCase()}`, ...s, text: summaries[s.officialId], sourceId: "almeria-programme", sourceNote: "Resumen editorial. Código de página y apartado creado para esta revisión; no es un número oficial." })),
  contextBlocks: context.map((c, i) => ({ id: `m-04013-context-${i + 1}`, page: c.page, endPage: c.page, topic: contextText[i][0], text: contextText[i][1], fragments: c.fragments })),
};
writeFileSync("data/mandate/almeria-inventory.json", JSON.stringify(inventory, null, 2) + "\n");
console.log(`Almería: ${sections.length} apartados y ${context.length} bloques de contexto; ninguna revisión creada por la importación.`);
