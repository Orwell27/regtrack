import type { ExtractedPage } from "./territorial-import";

const AREAS: Record<string, { total: number; label: string }> = {
  "01": { total: 98, label: "Derechos sociales" }, "02": { total: 18, label: "Igualdad" },
  "03": { total: 39, label: "Educación" }, "04": { total: 14, label: "Cultura y deporte" },
  "05": { total: 10, label: "Hacienda" }, "06": { total: 21, label: "Cohesión territorial" },
  "07": { total: 68, label: "Empleo y desarrollo económico" }, "08": { total: 22, label: "Medioambiente" },
  "09": { total: 12, label: "Desarrollo rural" }, "10": { total: 8, label: "Política lingüística" },
  "11": { total: 6, label: "Función pública" }, "12": { total: 13, label: "Memoria y convivencia" },
  "13": { total: 18, label: "Autogobierno" },
};
const EXPECTED_STATES: Record<string, number> = {
  "En proceso (>0%-25%)": 18, "En proceso (>25%-50%)": 60,
  "En proceso (>50%-75%)": 104, "En proceso (>75%-100%)": 87,
  Finalizado: 47, "No iniciado": 19, "En pausa": 4, Descartado: 8,
};

/** Fixed annex of the captured 2025 report. Government summaries are not literal programme promises. */
export function parseNavarraBalance(pages: ExtractedPage[]) {
  if (pages.length !== 115 || pages.some((page, index) => page.page !== index + 1)) throw Error("Navarra: páginas incompletas o desordenadas");
  const rows: { officialId: string; page: number; endPage: number; rawText: string }[] = [];
  let current: (typeof rows)[number] | undefined;
  for (const page of pages.filter(page => page.page >= 46 && page.page <= 109)) {
    for (const rawLine of page.text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || /^\d+$/.test(line) || /^(Rendición de Cuentas|COMPROMISO\s+ESTADO)/.test(line)) continue;
      const start = line.match(/^(\d{2}\.\d{2}\.\d{2}(?:\.\d{2})?)\s+(.+)/);
      if (start) {
        current = { officialId: start[1], page: page.page, endPage: page.page, rawText: start[2] };
        rows.push(current);
      } else if (current) {
        current.rawText += `\n${line}`;
        current.endPage = page.page;
      }
    }
  }
  if (rows.length !== 347 || new Set(rows.map(row => row.officialId)).size !== 347) throw Error("Navarra: inventario incompleto o duplicado");
  const counts: Record<string, number> = {};
  const areas: Record<string, number> = {};
  const records = rows.map(row => {
    const match = /\s(En proceso\s*\(>\d+%-\d+%\)|Finalizado|Descartado|En pausa|No iniciado)(?=\s|$)/.exec(row.rawText);
    if (!match) throw Error(`Navarra: estado ausente ${row.officialId}`);
    const governmentState = match[1].replace(/\s+/g, " ");
    const text = row.rawText.slice(0, match.index).replace(/\s+/g, " ").trim();
    const area = row.officialId.slice(0, 2);
    if (!text || !AREAS[area] || !Object.hasOwn(EXPECTED_STATES, governmentState)) throw Error(`Navarra: ficha inválida ${row.officialId}`);
    counts[governmentState] = (counts[governmentState] ?? 0) + 1;
    areas[area] = (areas[area] ?? 0) + 1;
    return { ...row, id: `r-15-${row.officialId}`, text, governmentState, topic: AREAS[area].label, sourceId: "navarra-balance-2025" };
  });
  for (const [state, total] of Object.entries(EXPECTED_STATES)) if (counts[state] !== total) throw Error(`Navarra: distribución de estados alterada (${state})`);
  for (const [area, { total }] of Object.entries(AREAS)) if (areas[area] !== total) throw Error(`Navarra: área incompleta (${area})`);
  return records;
}
