import { describe, expect, it } from "vitest";
import { getTerritorialBalance } from "@/lib/mandate/territorial";
import { getCoverage } from "@/lib/mandate/coverage";
import { isCoverageComplete } from "@/lib/mandate/coverage-model";

describe("Extremadura: pruebas de actuación separadas de resultados", () => {
  it("conserva el inventario provisional y no fabrica revisiones ni un recuento oficial", () => {
    const b = getTerritorialBalance("r-11")!;
    expect(b).toMatchObject({ mandateId: "r-11-2026", inventoryTotal: 62, transcriptionPending: true });
    expect(b.contextBlocks).toHaveLength(14);
    expect(b.reviews).toHaveLength(4);
    expect(b.reviews.flatMap(r => r.components)).toHaveLength(15);
    expect(b.textNote).toContain("61 puntos y 74 medidas");
    const c = getCoverage().find(c => c.id === "r-11")!;
    expect(c).toMatchObject({ imported: 62, reviewed: 4, independentlyReviewed: 0, originalInventoryComplete: false });
    expect(isCoverageComplete(c)).toBe(false);
    expect(c.blockers.join(" ")).toContain("58");
    expect(JSON.stringify(b)).not.toMatch(/rawText|fragments|snapshotPath|extractionSha256/);
  });
  it("mantiene el emisor autonómico aunque publique el BOE y el límite del extracto", () => {
    const b = getTerritorialBalance("r-11")!;
    expect(b.sources).toHaveLength(12);
    expect(b.sources.find(s => s.id === "extremadura-budget")).toMatchObject({ role: "action", family: "gob-extremadura" });
    expect(b.sources.find(s => s.id === "extremadura-programme-announcement")).toMatchObject({ family: "pp-vox-extremadura", captureType: "extracto_editorial" });
    expect(b.sources.find(s => s.id === "extremadura-irpf-baseline")?.publicationDate).toBeNull();
  });
  it("no atribuye la autorización estatal a la ecotasa ni certifica una estimación contradictoria", () => {
    const r = getTerritorialBalance("r-11")!.reviews.find(r => r.commitmentId === "r-11-1")!;
    expect(r.components.find(c => c.id === "autorizacion")?.status).toBe("documented");
    const fiscal = r.components.find(c => c.id === "fiscal")!;
    expect(fiscal.status).toBe("unresolved");
    expect(fiscal.finding).toContain("149 millones");
    expect(fiscal.finding).toContain("147");
    expect(r.components.some(c => c.status === "deadline-missed")).toBe(false);
  });
  it("no convierte crédito, cuotas máximas o tipos legales en resultados completos", () => {
    const reviews = getTerritorialBalance("r-11")!.reviews;
    const water = reviews.find(r => r.commitmentId === "r-11-6")!;
    expect(water.components.find(c => c.id === "presupuesto")?.status).toBe("reported");
    expect(water.periodNote).toContain("no terminar todas las obras");
    const tax = reviews.find(r => r.commitmentId === "r-11-32")!;
    expect(tax.components.find(c => c.id === "norma")?.finding).toContain("0,25 puntos");
    expect(tax.components.find(c => c.id === "resultado")?.status).toBe("unresolved");
    const school = reviews.find(r => r.commitmentId === "r-11-50")!;
    expect(school.components.find(c => c.id === "ayudas")?.finding).toContain("200 € al mes");
    expect(school.components.find(c => c.id === "pagos")?.status).toBe("unresolved");
    expect(school.pending.join(" ")).toContain("sin publicar datos de menores");
  });
});
