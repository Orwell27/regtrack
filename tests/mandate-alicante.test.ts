import { describe, expect, it } from "vitest";
import { getTerritorialBalance } from "@/lib/mandate/territorial";
import { getCoverage } from "@/lib/mandate/coverage";
import { isCoverageComplete } from "@/lib/mandate/coverage-model";

describe("Alicante municipal: programa escaneado y alcance de las pruebas", () => {
  it("conserva 24 áreas y 901 apartados provisionales sin cerrar la cobertura", () => {
    const b = getTerritorialBalance("m-03014")!;
    expect(b).toMatchObject({ mandateId: "m-03014-2023", inventoryKind: "bullet-sections", inventoryTotal: 901, transcriptionPending: true, programmeCopy: true });
    expect(new Set(b.records.map(r => r.topic)).size).toBe(24);
    expect(b.contextBlocks).toHaveLength(62);
    expect(b.reviews).toHaveLength(3);
    expect(b.reviews.flatMap(r => r.components)).toHaveLength(14);
    expect(b.sources).toHaveLength(14);
    const c = getCoverage().find(c => c.id === "m-03014")!;
    expect(c).toMatchObject({ imported: 901, reviewed: 3, independentlyReviewed: 0, originalInventoryComplete: false });
    expect(isCoverageComplete(c)).toBe(false);
    expect(JSON.stringify(b)).not.toMatch(/rawText|fragments|snapshotPath|ocrSha256/);
  });
  it("no usa la bonificación general como prueba de concesión a comercios centenarios", () => {
    const r = getTerritorialBalance("m-03014")!.reviews[0];
    expect(r.commitmentId).toBe("m-03014-43");
    expect(r.components.find(c => c.id === "norma")?.finding).toContain("sujeto pasivo");
    expect(r.components.find(c => c.id === "versiones")?.finding).toContain("corresponden al IAE, no al IBI");
    expect(r.components.find(c => c.id === "versiones")?.finding).toContain("hasta diez");
    expect(r.components.find(c => c.id === "resultado")?.status).toBe("unresolved");
  });
  it("distingue inicio de evaluación, obra y relato periodístico", () => {
    const r = getTerritorialBalance("m-03014")!.reviews[1];
    expect(r.components.find(c => c.id === "actuacion")?.citations.some(c => c.page === 58)).toBe(true);
    expect(r.components.find(c => c.id === "contraste")?.status).toBe("unresolved");
    expect(r.components.find(c => c.id === "calendario")?.status).toBe("reported");
    expect(r.contrast).toContain("Elche");
  });
  it("no presenta requisitos de UNICEF como concesión y respeta el plazo futuro", () => {
    const b = getTerritorialBalance("m-03014")!;
    const r = b.reviews[2];
    expect(r.components.find(c => c.id === "resultado")?.status).toBe("unresolved");
    expect(r.components.find(c => c.id === "requisitos")?.finding).toContain("no una evaluación favorable de Alicante");
    expect(r.components.find(c => c.id === "resultado")?.finding).toContain("no se considera vencida");
    expect(b.sources.find(s => s.id === "alicante-unicef-rules")?.family).toBe("unicef-espana");
    expect(b.sources.find(s => s.id === "alicante-programme")?.family).not.toBe(b.sources.find(s => s.id === "alicante-programme-provenance")?.family);
  });
});
