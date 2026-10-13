import type { ExtractedPage } from "./territorial-import";

// Body starts after the table of contents. Chapter covers must not become promises.
const BODY_PAGES = [[26, 62], [64, 92], [94, 106], [108, 117], [120, 129]] as const;
const AREA_PAGES = [26, 32, 37, 41, 50, 52, 54, 57, 59, 61, 64, 70, 75, 77, 80, 83, 87, 89, 92, 94, 97, 99, 101, 103, 105, 108, 111, 114, 116, 120, 124, 127];
const normalize = (text: string) => text.replace(/(\p{L})\s*-\s*\n(?=\p{Ll})/gu, "$1").replace(/\s+/g, " ").trim();
type Initiative = { officialId: string; text: string; rawText: string; page: number; endPage: number };
type Record = { id: string; officialId: string; text: string; rawText: string; topic: string; page: number; endPage: number; sourceId: string; initiatives: Initiative[] };

/** Specific to the archived 129-page programme; fail closed if its structure changes. */
export function parseEuskadiProgramme(pages: ExtractedPage[]): Record[] {
  if (pages.length !== 129 || pages.some((page, index) => page.page !== index + 1)) throw Error("Euskadi: páginas incompletas o desordenadas");
  const records: Record[] = [];
  let current: Record | undefined;
  let initiative: Initiative | undefined;
  let topic = "";
  let areas = 0;
  for (const page of pages.filter(page => BODY_PAGES.some(([first, last]) => page.page >= first && page.page <= last))) {
    // Commitment 11 initiative 6 shares a printed line with initiative 5 on p.33.
    const lines = page.text.replace(/(?<!^)\s+(?=Iniciativa\s+\d+(?:\.|\s))/gm, "\n").split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || /^\d+$/.test(line) || /^Programa de Gobierno 2024-2028 XIII Legislatura$/.test(line) || /^EJE [IVX]+\s*[:.]/.test(line)) continue;
      const area = line.match(/^(\d{1,2})\.\s+(.+)$/);
      if (area && AREA_PAGES.includes(page.page)) {
        if (+area[1] !== areas + 1 || AREA_PAGES[areas] !== page.page) throw Error("Euskadi: secuencia de áreas inválida");
        topic = area[2].trim(); areas++; current = undefined; initiative = undefined;
        continue;
      }
      const commitment = line.match(/^COMPROMISO (\d+)\.$/);
      if (commitment) {
        if (+commitment[1] !== records.length + 1 || !topic) throw Error(`Euskadi: secuencia de compromisos inválida ${commitment[1]} en página ${page.page}; esperado ${records.length + 1}, área ${topic}`);
        current = { id: `r-16-${commitment[1]}`, officialId: commitment[1], text: "", rawText: "", topic, page: page.page, endPage: page.page, sourceId: "euskadi-programme-2024", initiatives: [] };
        records.push(current); initiative = undefined; continue;
      }
      if (!current) continue; // Introductory prose belongs to the area, not the preceding commitment.
      const start = line.match(/^Iniciativa\s+(\d+)(?:\.\s*|\s+)(.+)$/);
      if (start) {
        if (+start[1] !== current.initiatives.length + 1) throw Error(`Euskadi: secuencia de iniciativas inválida en ${current.id}`);
        initiative = { officialId: start[1], text: "", rawText: start[2], page: page.page, endPage: page.page };
        current.initiatives.push(initiative);
      } else if (initiative) {
        initiative.rawText += `\n${line}`; initiative.endPage = page.page;
      } else current.rawText += `${current.rawText ? "\n" : ""}${line}`;
      current.endPage = page.page;
    }
  }
  if (areas !== 32 || records.length !== 154 || records.reduce((sum, record) => sum + record.initiatives.length, 0) !== 846) throw Error("Euskadi: inventario incompleto (32 áreas, 154 compromisos, 846 iniciativas)");
  for (const record of records) {
    record.text = normalize(record.rawText);
    if (record.text.length < 10 || !record.initiatives.length) throw Error(`Euskadi: compromiso vacío ${record.id}`);
    for (const item of record.initiatives) {
      item.text = normalize(item.rawText);
      if (item.text.length < 15 || /COMPROMISO\s+\d|Iniciativa\s+\d|Programa de Gobierno 2024-2028/.test(item.text)) throw Error(`Euskadi: iniciativa sospechosa ${record.id}-${item.officialId}`);
    }
  }
  return records;
}
