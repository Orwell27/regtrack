type Page = { page: number; text: string };
type Fragment = { page: number; line: number; text: string };
export type AlbaceteSection = {
  officialId: string; page: number; endPage: number; rawText: string; fragments: Fragment[];
};

// Boundaries refer to non-empty lines in the archived 28-page PDF extraction.
// Keep the unnumbered introductions separate: they are not continuations of 57/109/164/225.
const CONTEXT: Record<number, [number, number][]> = {
  3: [[2, Infinity]], 4: [[2, Infinity]], 9: [[23, Infinity]], 10: [[2, 6]],
  14: [[3, 21]], 18: [[15, Infinity]], 19: [[2, 5]], 23: [[4, 26]],
  26: [[3, 13], [17, Infinity]],
};

export function parseAlbaceteProgramme(pages: Page[]) {
  if (pages.length !== 28 || pages.some((p, i) => p.page !== i + 1)) throw Error("Páginas de Albacete incompletas");
  const sections: AlbaceteSection[] = [];
  const context: Fragment[] = [];
  let active: AlbaceteSection | undefined;
  for (const { page, text } of pages) {
    if (page < 3 || page > 26) continue;
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines[1] !== String(page)) throw Error("Cabecera de Albacete inesperada");
    for (let line = 2; line < lines.length; line++) {
      const fragment = { page, line, text: lines[line] };
      if (CONTEXT[page]?.some(([start, end]) => line >= start && line <= end)) {
        context.push(fragment);
        active = undefined;
        continue;
      }
      const match = /^(\d+)\.\s/.exec(fragment.text);
      if (match) {
        active = { officialId: page === 26 ? `Ético ${match[1]}` : match[1], page, endPage: page, rawText: "", fragments: [] };
        sections.push(active);
      } else if (fragment.text === fragment.text.toUpperCase()) {
        active = undefined;
        continue;
      }
      if (!active) throw Error(`Texto sin clasificar en Albacete: ${page}:${line}`);
      active.fragments.push(fragment);
      active.endPage = page;
    }
  }
  const expected = [...Array.from({ length: 250 }, (_, i) => String(i + 1)), "Ético 1", "Ético 2", "Ético 3"];
  if (sections.map(s => s.officialId).join("|") !== expected.join("|")) throw Error("Numeración de Albacete incompleta o duplicada");
  for (const section of sections) section.rawText = section.fragments.map(f => f.text).join("\n");
  return { sections, context };
}
