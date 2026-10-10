export type JurisdictionLevel = "national" | "region" | "autonomous-city" | "municipality";
export type CoverageSource = {
  id: string;
  title: string;
  url: string;
  publisher: string;
  family: string;
  role: "programme" | "government-report" | "control" | "register" | "action";
  consultedAt: string;
  scopeNote: string;
};
export type Jurisdiction = {
  id: string;
  name: string;
  level: JurisdictionLevel;
  region: string | null;
  province: string | null;
  mandate: { label: string; sourceId: string } | null;
  sources: CoverageSource[];
  inventoryTotal: number | null;
  imported: number;
  reviewed: number;
  independentlyReviewed: number;
  blockers: string[];
};
export const JURISDICTION_LABELS: Record<JurisdictionLevel, string> = {
  national: "España", region: "Comunidad autónoma", "autonomous-city": "Ciudad autónoma", municipality: "Capital de provincia",
};

/** A portal, source count, or empty inventory can never close a balance. */
export function isCoverageComplete(item: Jurisdiction): boolean {
  return item.mandate !== null && item.inventoryTotal !== null && item.inventoryTotal > 0
    && item.imported === item.inventoryTotal && item.reviewed === item.inventoryTotal
    && item.independentlyReviewed === item.inventoryTotal && item.blockers.length === 0;
}

export function validateCoverage(items: Jurisdiction[]) {
  const ids = new Set<string>();
  for (const item of items) {
    if (ids.has(item.id)) throw Error(`Jurisdicción duplicada: ${item.id}`);
    ids.add(item.id);
    for (const count of [item.imported, item.reviewed, item.independentlyReviewed]) {
      if (!Number.isInteger(count) || count < 0) throw Error(`Recuento inválido: ${item.id}`);
    }
    if (item.inventoryTotal !== null && (!Number.isInteger(item.inventoryTotal) || item.inventoryTotal <= 0 || item.imported > item.inventoryTotal)) throw Error(`Universo inválido: ${item.id}`);
    if (item.reviewed > item.imported || item.independentlyReviewed > item.reviewed) throw Error(`Revisión sin inventario: ${item.id}`);
    const sources = new Set<string>();
    for (const source of item.sources) {
      if (sources.has(source.id)) throw Error(`Fuente duplicada: ${item.id}`);
      sources.add(source.id);
      if (!source.title || !source.publisher || !source.family || !source.scopeNote || !/^https:\/\//.test(source.url) || !/^\d{4}-\d{2}-\d{2}$/.test(source.consultedAt)) throw Error(`Fuente incompleta: ${item.id}`);
    }
    if (item.mandate && !sources.has(item.mandate.sourceId)) throw Error(`Mandato sin fuente: ${item.id}`);
  }
}
