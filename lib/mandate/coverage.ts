import inventory from "@/data/mandate/inventory.json";
import geography from "@/data/mandate/jurisdictions.json";
import { getMandateSnapshot } from "./data";
import { territorialDossiers } from "./coverage-sources";
import { validateCoverage, type Jurisdiction } from "./coverage-model";
import { getTerritorialBalance } from "./territorial";

export function getCoverage() {
  const snapshot = getMandateSnapshot();
  const items: Jurisdiction[] = [{
    id: "es", name: "España", level: "national", region: null, province: null,
    mandate: { label: snapshot.mandate.label, sourceId: inventory.sourceId },
    sources: [{ id: inventory.sourceId, title: "Cumpliendo · inventario de julio de 2026", url: inventory.sourceUrl,
      publisher: "Gobierno de España", family: "gob-espana", role: "government-report", consultedAt: inventory.capturedAt.slice(0, 10),
      scopeNote: inventory.limitation }],
    inventoryTotal: inventory.records.length, imported: inventory.records.length, reviewed: snapshot.commitments.length,
    independentlyReviewed: 0,
    blockers: [`${inventory.records.length - snapshot.commitments.length} compromisos del inventario pendientes de revisión sustantiva.`, "Revisión humana independiente pendiente. El inventario del Gobierno no abarca necesariamente todas las promesas formuladas."],
  }, ...geography.jurisdictions.map(item => {
    const balance = getTerritorialBalance(item.id);
    if (balance) return {
      ...item, level: item.level as Jurisdiction["level"],
      mandate: { label: balance.mandateLabel, sourceId: balance.mandateSourceId },
      sources: balance.sources.map(source => ({ ...source,
        consultedAt: source.retrievedAt.slice(0, 10),
        scopeNote: source.captureType === "extracto_editorial"
          ? `Se conserva una nota de lectura editorial; su huella no corresponde al documento original. Origen: ${source.family}. Consultar su autoría, intereses y límites en la revisión; no constituye por sí sola una auditoría.`
          : source.role === "programme" ? balance.scope
          : `Documento conservado y consultado. Origen: ${source.family}. Un enlace adicional no acredita una corroboración independiente; consultar los límites de cada revisión.`,
      })),
      inventoryTotal: balance.inventoryTotal, imported: balance.records.length, reviewed: balance.reviews.length, independentlyReviewed: 0,
      ...(balance.inventoryKind ? { inventoryKind: balance.inventoryKind, originalInventoryComplete: false } : {}),
      ...(balance.programmeCopy ? { originalInventoryComplete: false } : {}),
      ...(balance.transcriptionPending ? { originalInventoryComplete: false } : {}),
      blockers: [
        ...(balance.transcriptionPending ? [balance.transcriptionMethod === "digital" ? "Extracción digital provisional; cotejo íntegro independiente con el documento pendiente." : "Transcripción OCR provisional; cotejo íntegro independiente del texto escaneado pendiente."] : []),
        ...(balance.programmeCopy ? ["Programa importado desde una copia de otro editor; cotejo con un archivo publicado por su autor pendiente."] : []),
        ...(balance.inventoryKind === "action-catalogue" ? ["Catálogo de seguimiento importado; reconstrucción de las promesas originales y cambios del plan pendiente."] : []),
        ...(balance.inventoryKind === "strategic-plan" ? ["Plan estratégico administrativo importado; inventario completo y correspondencia de las promesas políticas pendientes."] : []),
        ...(balance.inventoryKind === "programme-sections" ? ["Secciones del programa importadas; cada una puede contener varias medidas. Desagregación y conciliación de reiteraciones pendientes."] : []),
        ...(balance.inventoryKind === "speech-sections" ? ["Secciones editoriales del discurso inicial; conciliación con otros documentos del mandato pendiente. No son promesas únicas."] : []),
        ...(balance.inventoryKind === "numbered-sections" ? ["Apartados numerados importados; descomposición de submedidas y conciliación de reiteraciones y compromisos posteriores pendientes."] : []),
        ...(balance.inventoryKind === "bullet-sections" ? ["Apartados con viñeta importados; conciliación de reiteraciones y compromisos formulados en prosa pendiente."] : []),
        ...(balance.inventoryKind === "preagreement" ? ["Preacuerdo importado; cotejo con el texto final firmado e inventario definitivo del mandato pendientes."] : []),
        ...(balance.inventoryKind === "initial-programme" ? ["Programa inicial no exhaustivo importado; inventario completo del mandato y modificaciones posteriores pendientes."] : []),
        `${balance.inventoryTotal - balance.reviews.length} ${balance.inventoryKind === "programme-sections" ? "secciones del programa" : balance.inventoryKind === "speech-sections" ? "secciones del discurso" : balance.inventoryKind === "numbered-sections" ? "apartados numerados" : balance.inventoryKind === "bullet-sections" ? "apartados con viñeta" : balance.inventoryKind === "preagreement" ? "apartados del preacuerdo" : balance.inventoryKind === "initial-programme" ? "medidas iniciales" : balance.inventoryKind === "strategic-plan" ? "objetivos estratégicos" : balance.inventoryKind ? "actuaciones" : "compromisos"} pendientes de revisión sustantiva.`, "Las revisiones disponibles son parciales: conservan componentes sin resolver y controles externos pendientes.", "Revisión humana independiente pendiente."],
    };
    const dossier = territorialDossiers[item.id];
    return { ...item, level: item.level as Jurisdiction["level"], mandate: dossier?.mandate ?? null,
      sources: dossier?.sources ?? [], inventoryTotal: null, imported: 0, reviewed: 0, independentlyReviewed: 0,
      blockers: [
        ...(!dossier?.mandate ? ["Identificar y comprobar el mandato vigente y su documento de compromisos."] : []),
        ...(dossier?.blockers ?? []),
        "Importar el inventario y fijar su alcance: el total de compromisos aún no está determinado.",
        "Contrastar actuaciones, ejecución y resultados, buscar evidencia contraria y registrar sus límites.",
        "Revisión humana independiente pendiente.",
      ],
    };
  })];
  validateCoverage(items);
  return items;
}

/** Only the small public projection crosses the server/client boundary. */
export function getPublicInventory() {
  const reviewed = new Map(getMandateSnapshot().commitments.map(item => [item.id, item]));
  return {
    sourceUrl: inventory.sourceUrl, sourceSha256: inventory.sourceSha256, governmentCutoff: inventory.governmentCutoff,
    publishedAt: inventory.publishedAt, limitation: inventory.limitation,
    records: inventory.records.map(item => ({
      id: item.id, officialId: item.officialId, text: item.text, origin: item.origin, topics: item.topics,
      reviewed: reviewed.has(item.id), verdict: reviewed.get(item.id)?.assessment.verdict ?? null,
    })),
  };
}
export type PublicInventory = ReturnType<typeof getPublicInventory>;
