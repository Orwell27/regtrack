type Page = { page: number; text: string };
type Fragment = { page: number; line: number; text: string };
type Section = { officialId: string; topic: string; page: number; endPage: number; rawText: string; fragments: Fragment[] };

// Zero-based non-empty extraction lines, checked against the rendered PDF.
// Page 7 is extracted in reverse thematic order; restore its visible order.
// Highlights have no bullet and are nevertheless programme commitments.
const SEGMENTS: [number, number, number, string, number[]][] = [
  [5, 15, 29, "Inclusión", [15]], [6, 1, 4, "Inclusión", []],
  [6, 5, 21, "Igualdad e inmigración", [5]],
  [7, 17, 28, "Integración y participación", [17]], [7, 4, 17, "Familia y mayores", []],
  [8, 2, 16, "Infancia", [2]],
  [10, 13, 29, "Movilidad, reciclaje y energía", [13]], [11, 2, 22, "Movilidad, reciclaje y energía", []],
  [12, 2, 20, "Limpieza y espacio público", [2, 6]],
  [14, 15, 30, "Centro histórico", []], [15, 2, 12, "Centro histórico", []],
  [15, 13, 29, "Vivienda y servicios urbanos", [13, 15]], [16, 1, 21, "Vivienda y servicios urbanos", []],
  [17, 5, 16, "Proyectos pendientes", [5, 6, 7, 8]], [17, 16, 26, "Litoral", [16]],
  [19, 19, 30, "Turismo", [19, 20]], [20, 1, 20, "Turismo", []],
  [20, 21, 30, "Comercio", []],
  [22, 16, 29, "Deporte", [16]], [23, 2, 7, "Deporte", []],
  [25, 13, 28, "Cultura y patrimonio", [13]], [26, 2, 23, "Urbanismo y capitalidad", [2]],
  [28, 14, 27, "Formación y empleo juvenil", [14]], [29, 3, 23, "Talento joven", [3]],
];
const CONTEXT: [number, number, number][] = [[3, 1, 12], [5, 4, 15], [10, 4, 13], [14, 4, 15], [19, 5, 19], [22, 4, 16], [25, 4, 13], [28, 3, 14]];

export function parseAlmeriaProgramme(pages: Page[]) {
  if (pages.length !== 32 || pages.some((p, i) => p.page !== i + 1)) throw Error("Páginas de Almería incompletas");
  const lines = pages.map(p => p.text.split(/\r?\n/).map(l => l.trim()).filter(Boolean));
  const sections: Section[] = [];
  const pageCounts = new Map<number, number>();
  let active: Section | undefined;
  for (const [page, start, end, topic, highlights] of SEGMENTS) {
    if (end > lines[page - 1].length) throw Error(`Líneas de Almería incompletas: ${page}`);
    if (!(page === 20 && start === 1)) active = undefined;
    for (let line = start; line < end; line++) {
      const text = lines[page - 1][line];
      if (text.startsWith("•") || highlights.includes(line)) {
        const n = (pageCounts.get(page) ?? 0) + 1;
        pageCounts.set(page, n);
        active = { officialId: `P${String(page).padStart(2, "0")}-${String(n).padStart(2, "0")}`, topic, page, endPage: page, rawText: "", fragments: [] };
        sections.push(active);
      }
      if (!active || active.topic !== topic) throw Error(`Texto sin clasificar en Almería: ${page}:${line}`);
      active.fragments.push({ page, line, text });
      active.endPage = page;
    }
  }
  for (const section of sections) section.rawText = section.fragments.map(f => f.text).join("\n");
  const expected = [7, 10, 12, 8, 7, 11, 7, 6, 14, 8, 12, 6, 9, 6, 4, 5, 8, 6, 9];
  if ([...pageCounts.values()].join() !== expected.join()) throw Error("Apartados de Almería incompletos o duplicados");
  const context = CONTEXT.map(([page, start, end]) => ({ page, fragments: lines[page - 1].slice(start, end).map((text, i) => ({ page, line: start + i, text })) }));
  return { sections, context };
}
