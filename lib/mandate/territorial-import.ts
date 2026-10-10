export type ExtractedPage = { page: number; text: string };
export const MADRID_PROGRAMME_AXES = [
  { first: 1, last: 19, pages: [15, 16, 17], label: "Instituciones" },
  { first: 20, last: 40, pages: [20, 21, 22], label: "Seguridad" },
  { first: 41, last: 85, pages: [25, 26, 27, 28, 29], label: "Familias" },
  { first: 86, last: 129, pages: [32, 33, 34, 35], label: "Medioambiente y movilidad" },
  { first: 130, last: 155, pages: [38, 39, 40, 41], label: "Barrios y accesibilidad" },
  { first: 156, last: 194, pages: [45, 46, 47, 48, 49], label: "Economía y empleo" },
  { first: 195, last: 224, pages: [52, 53, 54, 55], label: "Cultura y ocio" },
  { first: 225, last: 245, pages: [58, 59, 60], label: "Urbanismo y vivienda" },
  { first: 246, last: 275, pages: [63, 64, 65, 66], label: "Servicios y administración" },
  { first: 276, last: 300, pages: [69, 70, 71], label: "Salud y deporte" },
] as const;

/** This parser is specific to the captured 2023 programme, not arbitrary PDFs. */
export function parseMadridProgramme(pages: ExtractedPage[]) {
  if (pages.length !== 73 || new Set(pages.map(page => page.page)).size !== 73) throw Error("Madrid: páginas incompletas o duplicadas");
  const records: { id: string; officialId: string; text: string; rawText: string; topic: string; page: number; endPage: number; sourceId: string }[] = [];
  for (const axis of MADRID_PROGRAMME_AXES) {
    let current: (typeof records)[number] | undefined;
    let next = axis.first as number;
    for (const pageNumber of axis.pages) {
      const page = pages.find(item => item.page === pageNumber);
      if (!page) throw Error(`Madrid: falta página ${pageNumber}`);
      for (const rawLine of page.text.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (/^Eje \d+$/i.test(line)) break; // Repeated footer and chapter title, not part of a promise.
        if (line.startsWith("⊲")) { if (current) break; else continue; }
        if (!line || /^\d+$/.test(line) || /^(Programa Electoral 2023|Ayuntamiento de Madrid|MEDIDAS\s*:)/.test(line)) continue;
        const start = line.match(/^(\d{1,3})\.\s+(.*)$/);
        if (start) {
          if (+start[1] !== next || next > axis.last) throw Error(`Madrid: secuencia inválida ${start[1]}, esperado ${next}`);
          current = { id: `m-28079-${next}`, officialId: String(next), text: "", rawText: start[2], topic: axis.label, page: pageNumber, endPage: pageNumber, sourceId: "madrid-programme-2023" };
          records.push(current);
          next++;
        } else if (current) {
          current.rawText += `\n${line}`;
          current.endPage = pageNumber;
        } else {
          throw Error(`Madrid: texto fuera de una medida en página ${pageNumber}`);
        }
      }
    }
    if (next !== axis.last + 1) throw Error(`Madrid: eje incompleto ${axis.label}`);
  }
  for (const item of records) {
    item.text = item.rawText.replace(/(\p{L})\s*-\s*\n(?=\p{Ll})/gu, "$1").replace(/\s+/g, " ").trim();
    if (item.text.length < 30 || /Programa Electoral|Ayuntamiento de Madrid\s*\d|⊲|Eje \d/.test(item.text)) throw Error(`Madrid: texto sospechoso ${item.id}`);
  }
  if (records.length !== 300) throw Error("Madrid: el programa debe contener 300 medidas");
  return records;
}
