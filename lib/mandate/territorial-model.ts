export const TERRITORIAL_STATUS_LABELS = {
  documented: "Actuación documentada",
  reported: "Dato comunicado por la administración",
  unresolved: "Evidencia insuficiente para esta parte",
  "target-pending": "Objetivo aún no alcanzado en el ejercicio examinado",
  "deadline-missed": "Plazo comprometido vencido sin alcanzar el hito",
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
  id: string; officialId: string; text: string; topic: string; page: number | null; endPage: number | null; sourceId: string;
  sourceNote?: string;
  governmentState?: string;
  governmentProgress?: string;
  detailText?: string;
  programmeText?: string;
  governmentReport?: { officialId: string; title: string; text: string; percentage: number; sourceId: string; url: string; links: string[] };
  detailLinks?: string[];
  webSource?: { url: string; sha256: string; retrievedAt: string };
  initiatives?: { id?: string; sourceNote?: string; officialId: string; text: string; page: number; endPage: number }[];
};
export type TerritorialBalance = {
  jurisdictionId: string; mandateId: string; mandateLabel: string; sourceId: string; registerSourceId: string;
  sourceSha256: string; inventoryTotal: number; scope: string; textNote: string;
  textLanguage?: "ca" | "es";
  programmeCopy?: boolean;
  inventoryKind?: "action-catalogue" | "strategic-plan" | "initial-programme" | "preagreement" | "bullet-sections";
  governmentDateKind?: "capture";
  mandateSourceId: string; sourceLabel: string; level: "municipality" | "region" | "autonomous-city"; governmentCutoff?: string;
  records: TerritorialRecord[]; reviews: TerritorialReview[]; sources: TerritorialSource[];
  contextBlocks?: { id: string; topic: string; text: string; page: number; endPage: number }[];
};

/** Invalid evidence must stop publication; an import cannot create a review. */
export function validateTerritorialBalance(balance: TerritorialBalance) {
  if (balance.programmeCopy !== undefined && typeof balance.programmeCopy !== "boolean") throw Error("Procedencia del programa inválida");
  if (balance.inventoryKind !== undefined && !["action-catalogue", "strategic-plan", "initial-programme", "preagreement", "bullet-sections"].includes(balance.inventoryKind)) throw Error("Tipo de inventario inválido");
  if (balance.governmentDateKind !== undefined && (balance.governmentDateKind !== "capture" || !balance.governmentCutoff)) throw Error("Fecha de captura inválida");
  if (balance.textLanguage !== undefined && !["ca", "es"].includes(balance.textLanguage)) throw Error("Idioma territorial inválido");
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
  if (!["programme", "government-report"].includes(sources.get(balance.sourceId)?.role ?? "") || sources.get(balance.sourceId)?.sha256 !== balance.sourceSha256
    || sources.get(balance.mandateSourceId)?.role !== "programme" || !balance.sourceLabel
    || sources.get(balance.registerSourceId)?.role !== "register") throw Error("Inventario sin programa o registro comprobado");
  if (balance.governmentCutoff !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(balance.governmentCutoff)) throw Error("Corte gubernamental inválido");
  const ids = new Set<string>();
  const contextIds = new Set<string>();
  for (const block of balance.contextBlocks ?? []) {
    if (!block.id.startsWith(`${balance.jurisdictionId}-context-`) || contextIds.has(block.id)
      || !block.topic.trim() || !block.text.trim() || !Number.isInteger(block.page) || block.page < 1
      || !Number.isInteger(block.endPage) || block.endPage < block.page) throw Error("Contexto territorial inválido");
    contextIds.add(block.id);
  }
  for (const record of balance.records) {
    if (ids.has(record.id) || !record.id.startsWith(`${balance.jurisdictionId}-`) || !record.text || !record.officialId
      || record.sourceId !== balance.sourceId) throw Error("Compromiso territorial inválido");
    if (record.sourceNote !== undefined && !record.sourceNote.trim()) throw Error("Nota de origen territorial vacía");
    if (record.webSource) {
      if (record.page !== null || record.endPage !== null || !record.detailText?.trim()
        || !/^https:\/\//.test(record.webSource.url) || !/^[a-f0-9]{64}$/.test(record.webSource.sha256)
        || !Number.isFinite(Date.parse(record.webSource.retrievedAt))
        || record.detailLinks?.some(url => !/^https?:\/\//.test(url))) throw Error("Ficha web territorial inválida");
    } else if (record.page === null || record.endPage === null || !Number.isInteger(record.page) || record.page < 1
      || !Number.isInteger(record.endPage) || record.endPage < record.page) throw Error("Compromiso territorial inválido");
    ids.add(record.id);
    if (record.programmeText !== undefined && (!record.programmeText.trim() || record.page === null)) throw Error("Ficha de programa incompleta");
    if (record.governmentReport) {
      const report = record.governmentReport;
      const source = sources.get(report.sourceId);
      if (!report.officialId || !report.title || !report.text.trim() || source?.role !== "government-report"
        || (report.url !== source.url && !report.url.startsWith(`${source.url}#`)) || !Number.isFinite(report.percentage) || report.percentage < 0 || report.percentage > 100
        || report.links.some(url => !/^https?:\/\//.test(url))) throw Error("Seguimiento municipal inválido");
    }
    if (record.initiatives !== undefined) {
      if (!record.initiatives.length) throw Error("Iniciativas territoriales vacías");
      const initiativeIds = new Set<string>();
      for (const initiative of record.initiatives) {
        const identity = initiative.id ?? initiative.officialId;
        if (!initiative.officialId || initiativeIds.has(identity) || !initiative.text.trim()
          || (initiative.id !== undefined && !initiative.id.startsWith(`${record.id}-`))
          || (initiative.sourceNote !== undefined && !initiative.sourceNote.trim())
          || !Number.isInteger(initiative.page) || !Number.isInteger(initiative.endPage)
          || record.page === null || record.endPage === null || initiative.page < record.page || initiative.endPage < initiative.page || initiative.endPage > record.endPage) throw Error("Iniciativa territorial inválida");
        initiativeIds.add(identity);
      }
    }
    if (record.governmentState && (!balance.governmentCutoff || sources.get(balance.sourceId)?.role !== "government-report")) throw Error("Estado gubernamental sin fecha o informe");
    if (record.governmentProgress && (!record.governmentState || !/^\d{1,3}(?:[.,]\d+)?%$/.test(record.governmentProgress)
      || Number(record.governmentProgress.slice(0, -1).replace(",", ".")) > 100)) throw Error("Porcentaje gubernamental inválido");
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
