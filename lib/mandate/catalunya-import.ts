import type { ExtractedPage } from "./territorial-import";

// Fixed to the archived XV-legislature plan. Themes are editorial Spanish labels;
// the complete measures retain the original Catalan text and official identifiers.
export const CATALUNYA_OBJECTIVES = [
  ["1.1", 53, 54, 16, "Economía y empleo"], ["1.2", 55, 56, 9, "Industria"],
  ["1.3", 57, 58, 6, "Investigación"], ["1.4", 59, 59, 5, "Universidades"],
  ["1.5", 60, 60, 7, "Formación profesional"], ["1.6", 61, 61, 6, "Barrios y regeneración urbana"],
  ["1.7", 62, 63, 11, "Vivienda"], ["1.8", 64, 64, 4, "Industrias culturales"],
  ["2.1", 67, 67, 5, "Energía"], ["2.2", 68, 68, 8, "Descarbonización"],
  ["2.3", 69, 69, 6, "Biodiversidad"], ["2.4", 70, 71, 8, "Agua y sequía"],
  ["2.5", 72, 72, 7, "Movilidad e infraestructuras"], ["2.6", 73, 74, 8, "Sector agroalimentario"],
  ["3.1", 77, 77, 6, "Resultados educativos"], ["3.2", 78, 79, 7, "Equidad educativa"],
  ["3.3", 80, 81, 8, "Cuidados y atención integrada"], ["3.4", 82, 82, 5, "Listas de espera"],
  ["3.5", 83, 84, 15, "Servicios públicos, salud e infancia"], ["3.6", 85, 85, 5, "Prestaciones y pobreza"],
  ["3.7", 86, 86, 6, "Inclusión y migración"], ["3.8", 87, 88, 12, "Violencia machista e igualdad"],
  ["3.9", 89, 89, 7, "Deporte"], ["3.10", 90, 90, 7, "Artes y cultura"],
  ["4.1", 93, 93, 8, "Reforma de la administración"], ["4.2", 94, 94, 5, "Simplificación administrativa"],
  ["4.3", 95, 95, 6, "Evaluación, transparencia y participación"], ["4.4", 96, 96, 7, "Conectividad y ciberseguridad"],
  ["4.5", 97, 97, 7, "Seguridad y emergencias"], ["4.6", 98, 99, 9, "Justicia"],
  ["5.1", 103, 103, 4, "Financiación y fiscalidad"], ["5.2", 104, 104, 4, "Acción exterior y cooperación"],
  ["5.3", 105, 106, 11, "Cohesión territorial"], ["5.4", 107, 107, 7, "Lenguas"],
  ["5.5", 108, 109, 8, "Derechos humanos y memoria democrática"],
] as const;

export function parseCatalunyaProgramme(pages: ExtractedPage[]) {
  if (pages.length !== 121 || pages.some((page, index) => page.page !== index + 1)) throw Error("Cataluña: páginas incompletas o desordenadas");
  const records: { id: string; officialId: string; text: string; rawText: string; topic: string; page: number; endPage: number; sourceId: string }[] = [];
  for (const [objective, first, last, count, topic] of CATALUNYA_OBJECTIVES) {
    let current: (typeof records)[number] | undefined;
    let started = false;
    let next = 1;
    for (let page = first; page <= last; page++) {
      for (const rawLine of pages[page - 1].text.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || /^\d+$/.test(line)) continue;
        if (line.startsWith("Mesures de l’objectiu específic")) {
          if (started || line !== `Mesures de l’objectiu específic ${objective}.`) throw Error("Cataluña: cabecera de objetivo inválida");
          started = true; continue;
        }
        if (!started) continue; // Descriptive introduction is not a numbered measure.
        const match = line.match(/^([1-5]\.\d+\.\d+)\.(?:\s+(.*))?$/);
        if (match) {
          if (match[1] !== `${objective}.${next}` || next > count) throw Error(`Cataluña: secuencia inválida en ${objective}`);
          current = { id: `r-09-${match[1]}`, officialId: match[1], text: "", rawText: match[2] ?? "", topic: `${topic} · objetivo ${objective}`, page, endPage: page, sourceId: "catalunya-programme-2024" };
          records.push(current); next++;
        } else if (current) {
          current.rawText += `\n${line}`; current.endPage = page;
        } else throw Error(`Cataluña: texto sin medida en página ${page}`);
      }
    }
    if (next !== count + 1) throw Error(`Cataluña: objetivo incompleto ${objective}`);
  }
  for (const record of records) {
    record.text = record.rawText.replace(/(\p{L})\s*-\s*\n(?=\p{Ll})/gu, "$1").replace(/\s+/g, " ").trim();
    if (record.text.length < 25 || /Mesures de l’objectiu|O\.E\.\d|^\d+\.\d+\.\d+/m.test(record.text)) throw Error(`Cataluña: texto sospechoso ${record.id}`);
  }
  if (records.length !== 260) throw Error("Cataluña: se esperan 260 medidas");
  return records;
}
