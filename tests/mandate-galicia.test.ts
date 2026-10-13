import { describe, expect, it } from "vitest";
import { getTerritorialBalance } from "@/lib/mandate/territorial";
import { getCoverage } from "@/lib/mandate/coverage";

describe("Galicia: origen, condiciones y evidencia de resultados", () => {
  it("conserva el inventario provisional y no convierte el balance partidista en cumplimiento", () => {
    const balance = getTerritorialBalance("r-12")!;
    expect(balance).toMatchObject({ inventoryTotal: 793, mandateId: "r-12-2024", inventoryKind: "numbered-sections", transcriptionPending: true, transcriptionMethod: "digital" });
    const blockers = getCoverage().find(c => c.id === "r-12")!.blockers.join(" ");
    expect(blockers).toContain("Extracción digital provisional");
    expect(blockers).toContain("790 apartados numerados");
    expect(blockers).not.toMatch(/OCR|viñeta/);
    expect(balance.contextBlocks).toHaveLength(159);
    expect(balance.reviews).toHaveLength(3);
    expect(balance.reviews.flatMap(r => r.components)).toHaveLength(13);
    expect(balance.textNote).toContain("87 %");
    expect(balance.records.every(r => !r.governmentState && !r.governmentProgress)).toBe(true);
    expect(getCoverage().find(c => c.id === "r-12")).toMatchObject({ imported: 793, reviewed: 3, independentlyReviewed: 0, originalInventoryComplete: false });
    expect(JSON.stringify(balance)).not.toMatch(/rawText|fragments|snapshotPath|extractionSha256|cellsSha256|finalUrl/);
  });
  it("distingue el autor de la norma de su alojamiento y acota la corroboración del firmante", () => {
    const balance = getTerritorialBalance("r-12")!;
    expect(balance.sources).toHaveLength(15);
    expect(new Set(balance.sources.map(s => s.family)).size).toBe(6);
    expect(balance.sources.find(s => s.id === "galicia-university-law-2024")).toMatchObject({ family: "gob-galicia", publicationDate: "2024-07-03" });
    expect(balance.sources.find(s => s.id === "galicia-university-udc")).toMatchObject({ family: "udc", publicationDate: "2026-07-09" });
    expect(balance.sources.find(s => s.id === "galicia-party-balance")).toMatchObject({ family: "pp-galicia", captureType: "extracto_editorial" });
    expect(balance.reviews.find(r => r.commitmentId === "r-12-3-5")?.contrast).toContain("no auditor de resultados");
  });
  it("no equipara licitaciones con entregas ni el 99 % con acceso universal", () => {
    const balance = getTerritorialBalance("r-12")!;
    const housing = balance.reviews.find(r => r.commitmentId === "r-12-3-4")!;
    expect(housing.components.find(c => c.id === "entregas")?.status).toBe("reported");
    expect(housing.components.find(c => c.id === "contraste")?.status).toBe("unresolved");
    expect(housing.periodNote).toContain("no ha vencido");
    const university = balance.reviews.find(r => r.commitmentId === "r-12-7-1")!;
    expect(university.components.find(c => c.id === "requisitos")?.finding).toContain("90 %");
    expect(university.components.find(c => c.id === "importe")?.finding).toContain("centros adscritos");
    expect(university.components.find(c => c.id === "aplicacion")?.status).toBe("unresolved");
    expect(university.components.find(c => c.id === "aplicacion")?.finding).toContain("15/02/2027");
  });
});
