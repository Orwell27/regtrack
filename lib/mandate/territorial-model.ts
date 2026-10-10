export const TERRITORIAL_STATUS_LABELS = {
  documented: "Actuación documentada",
  reported: "Avance comunicado por la administración",
  unresolved: "Evidencia insuficiente para esta parte",
  "target-pending": "Objetivo aún no alcanzado en el ejercicio examinado",
} as const;
export type TerritorialSource = {
  id: string; jurisdictionId: string; title: string; publisher: string; family: string;
  url: string; role: "programme" | "register" | "government-report" | "action" | "control" | "reporting";
  publicationDate: string | null; retrievedAt: string; sha256: string;
  captureType: "bytes_originales" | "extracto_editorial";
};
export type TerritorialReview = {
  commitmentId: string; reviewedAt: string; title: string; conclusion: string; periodNote: string;
  components: { id: string; claim: string; status: keyof typeof TERRITORIAL_STATUS_LABELS; finding: string;
    citations: { sourceId: string; locator: string; page?: number }[] }[];
  contrast: string; pending: string[];
};
export type TerritorialRecord = {
  id: string; officialId: string; text: string; topic: string; page: number; endPage: number; sourceId: string;
};
export type TerritorialBalance = {
  jurisdictionId: string; mandateId: string; mandateLabel: string; sourceId: string; registerSourceId: string;
  sourceSha256: string; inventoryTotal: number; scope: string; textNote: string;
  records: TerritorialRecord[]; reviews: TerritorialReview[]; sources: TerritorialSource[];
};

/** Invalid evidence must stop publication; an import cannot create a review. */
export function validateTerritorialBalance(balance: TerritorialBalance) {
  if (balance.inventoryTotal <= 0 || balance.inventoryTotal !== balance.records.length) throw Error("Inventario territorial incompleto");
  const sources = new Map(balance.sources.map(source => [source.id, source]));
  if (sources.size !== balance.sources.length) throw Error("Fuente territorial duplicada");
  for (const source of sources.values()) {
    if (source.jurisdictionId !== balance.jurisdictionId || !/^https:\/\//.test(source.url)
      || !/^[a-f0-9]{64}$/.test(source.sha256) || !source.title || !source.publisher || !source.family
      || !["programme", "register", "government-report", "action", "control", "reporting"].includes(source.role)
      || !["bytes_originales", "extracto_editorial"].includes(source.captureType)
      || !Number.isFinite(Date.parse(source.retrievedAt))
      || (source.publicationDate !== null && !/^\d{4}-\d{2}-\d{2}$/.test(source.publicationDate))) throw Error("Fuente territorial inválida");
  }
  if (sources.get(balance.sourceId)?.role !== "programme" || sources.get(balance.sourceId)?.sha256 !== balance.sourceSha256
    || sources.get(balance.registerSourceId)?.role !== "register") throw Error("Inventario sin programa o registro comprobado");
  const ids = new Set<string>();
  for (const record of balance.records) {
    if (ids.has(record.id) || !record.id.startsWith(`${balance.jurisdictionId}-`) || !record.text || !record.officialId
      || record.sourceId !== balance.sourceId || !Number.isInteger(record.page) || record.page < 1
      || !Number.isInteger(record.endPage) || record.endPage < record.page) throw Error("Compromiso territorial inválido");
    ids.add(record.id);
  }
  const reviews = new Set<string>();
  for (const review of balance.reviews) {
    if (!ids.has(review.commitmentId) || reviews.has(review.commitmentId) || !review.conclusion || !review.contrast
      || !review.periodNote || !/^\d{4}-\d{2}-\d{2}$/.test(review.reviewedAt) || !review.pending.length
      || !review.components.length) throw Error("Revisión territorial inválida");
    reviews.add(review.commitmentId);
    const components = new Set<string>();
    for (const component of review.components) {
      if (!component.id || components.has(component.id) || !component.claim || !component.finding
        || !Object.hasOwn(TERRITORIAL_STATUS_LABELS, component.status)
        || (component.status !== "unresolved" && !component.citations.length)) throw Error("Componente territorial sin evidencia");
      components.add(component.id);
      for (const citation of component.citations) {
        if (!sources.has(citation.sourceId) || !citation.locator || (citation.page !== undefined && (!Number.isInteger(citation.page) || citation.page < 1))) throw Error("Cita territorial inválida");
      }
    }
  }
}
