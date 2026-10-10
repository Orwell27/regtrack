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
      mandate: { label: balance.mandateLabel, sourceId: balance.sourceId },
      sources: balance.sources.map(source => ({ ...source,
        consultedAt: source.retrievedAt.slice(0, 10),
        scopeNote: source.role === "programme" ? balance.scope : source.role === "reporting"
          ? "Reportaje ajeno a la administración: observación localizada, no auditoría global. Se conserva un extracto editorial, no el artículo original."
          : "Documento conservado y consultado. Comparte origen municipal; no cuenta como corroboración independiente.",
      })),
      inventoryTotal: balance.inventoryTotal, imported: balance.records.length, reviewed: balance.reviews.length, independentlyReviewed: 0,
      blockers: [`${balance.inventoryTotal - balance.reviews.length} compromisos pendientes de revisión sustantiva.`, "Las revisiones disponibles son parciales: conservan componentes sin resolver y controles externos pendientes.", "Revisión humana independiente pendiente."],
    };
    const dossier = territorialDossiers[item.id];
    return { ...item, level: item.level as Jurisdiction["level"], mandate: dossier?.mandate ?? null,
      sources: dossier?.sources ?? [], inventoryTotal: null, imported: 0, reviewed: 0, independentlyReviewed: 0,
      blockers: [
        ...(!dossier?.mandate ? ["Identificar y comprobar el mandato vigente y su documento de compromisos."] : []),
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
