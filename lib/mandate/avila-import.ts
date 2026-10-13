type Block = { page: number; index: number; top: number; bottom: number; bullet: boolean; text: string };
type Page = { page: number; blocks: Block[]; bulletCount: number };

// Zero-based blocks in the coordinate extraction. Nested sensor/congress lists
// remain with their parent; the introductory assessment is kept as context.
const GROUPS: [number, string, number[][]][] = [
  [10, "Urbanismo", [[1],[2],[3],[4],[5],[6],[7],[8],[9],[10]]],
  [11, "Movilidad y limpieza", [[1],[2]]],
  [12, "Patrimonio", [[1],[2],[3],[4]]],
  [13, "Jardines", [[2],[3],[4],[5],[6],[7]]],
  [14, "Control urbano y transporte", [[1],[2,3,4,5,6],[8],[9],[10]]],
  [15, "Cementerio", [[2],[3],[4],[5],[6]]],
  [16, "Alumbrado", [[3],[4],[5],[6]]],
  [18, "Medio ambiente", [[3],[4],[5],[6],[7],[8],[9],[10]]],
  [19, "Medio ambiente y agua", [[1],[2],[3],[4],[5],[6],[7],[8]]],
  [22, "Barrios anexionados", [[0],[2],[3],[4],[5],[6],[7],[8],[9],[10]]],
  [24, "Accesibilidad", [[2],[3],[4],[5],[6]]],
  [25, "Accesibilidad", [[1],[2]]],
  [26, "Mayores", [[2],[3]]],
  [27, "Política social y conciliación", [[1],[3],[4]]],
  [28, "Juventud", [[1],[2],[3],[4],[5],[6]]],
  [29, "Igualdad e inclusión", [[1],[2],[3],[4],[5]]],
  [30, "Participación ciudadana", [[1]]],
  [32, "Turismo", [[0],[1],[2],[3],[4],[5],[6]]],
  [33, "Turismo", [[0],[1],[2],[3],[4],[5],[6,7,8,9]]],
  [34, "Rodajes", [[1],[2],[3]]],
  [36, "Empleo y empresas", [[0,1],[3],[4],[5],[6],[7]]],
  [37, "Industria y comercio", [[0],[1],[2],[3],[4]]],
  [39, "Fiscalidad y economía", [[0],[1],[2],[3],[4],[5]]],
  [40, "Bonificaciones", [[0]]],
  [42, "Cultura", [[0],[1],[2],[3],[4],[5]]],
  [43, "Educación y fiestas", [[0],[1],[2],[3],[4],[5],[6],[7]]],
  [45, "Deporte", [[0],[2],[3],[4],[5],[6],[7],[8],[9],[10]]],
  [47, "Buen gobierno y transparencia", [[2],[3],[5],[6]]],
  [48, "Presupuestos y fondos europeos", [[0],[1],[3],[4]]],
  [49, "Administración digital", [[0],[1]]],
  [51, "Reivindicaciones a otras administraciones", [[2],[3],[4],[5],[6],[7],[8],[9]]],
];

export function parseAvilaProgramme(pages: Page[]) {
  if (pages.length !== 51 || pages.some((p,i) => p.page !== i+1)) throw Error("Páginas de Ávila incompletas");
  const expected: [number,number,number][] = [[9,2,0],[10,11,10],[11,3,2],[12,5,4],[13,8,5],[14,11,7],[15,7,5],[16,7,4],[18,11,8],[19,9,8],[21,8,6],[22,11,9],[24,7,0],[25,3,0],[26,4,0],[27,5,0],[28,7,0],[29,6,0],[30,2,0],[32,7,0],[33,10,2],[34,4,3],[36,8,5],[37,5,5],[39,6,0],[40,1,0],[42,6,0],[43,8,0],[45,11,9],[47,7,0],[48,6,0],[49,2,0],[51,10,8]];
  for (const [page,count,bullets] of expected) {
    const p = pages[page-1];
    if (p.blocks.length !== count || p.bulletCount !== bullets || p.blocks.filter(b => b.bullet).length !== bullets) throw Error(`Estructura de Ávila alterada: ${page}`);
  }
  const sections = GROUPS.flatMap(([page, topic, groups]) => groups.map((indices, i) => {
    const blocks = indices.map(index => pages[page-1].blocks[index]);
    if (blocks.some((b,j) => !b || b.page !== page || b.index !== indices[j] || !b.text.trim())) throw Error(`Bloques de Ávila incompletos: ${page}`);
    return {
      officialId: `P${String(page).padStart(2,"0")}-${String(i+1).padStart(2,"0")}`,
      topic, page, endPage: page, rawText: blocks.map(b => b.text).join("\n"),
      fragments: blocks.map(b => ({ page, block: b.index, top: b.top, bottom: b.bottom, text: b.text })),
    };
  }));
  return sections;
}
