import { describe, expect, it } from "vitest";
import { getTerritorialBalance } from "@/lib/mandate/territorial";
import { getCoverage } from "@/lib/mandate/coverage";
import { isCoverageComplete } from "@/lib/mandate/coverage-model";
import { validateTerritorialBalance } from "@/lib/mandate/territorial-model";

describe("Valenciana: discurso, condiciones y resultados separados", () => {
  it("no convierte secciones editoriales en promesas únicas ni inventario cerrado", () => {
    const b = getTerritorialBalance("r-10")!;
    expect(b).toMatchObject({ inventoryKind: "speech-sections", inventoryTotal: 19, transcriptionPending: true, mandateId: "r-10-2025" });
    expect(b.contextBlocks).toHaveLength(2);
    expect(b.reviews).toHaveLength(3);
    expect(b.reviews.flatMap(r => r.components)).toHaveLength(13);
    expect(b.textNote).toContain("réplicas posteriores");
    expect(b.textNote).toContain("no la veracidad");
    const c = getCoverage().find(c => c.id === "r-10")!;
    expect(c).toMatchObject({ imported: 19, reviewed: 3, independentlyReviewed: 0, originalInventoryComplete: false });
    expect(c.blockers.join(" ")).toContain("16 secciones del discurso");
    expect(isCoverageComplete(c)).toBe(false);
    expect(JSON.stringify(b)).not.toMatch(/rawText|fragments|snapshotPath|extractionSha256/);
    const invalid = { ...b, inventoryKind: "promesas-verificadas" };
    expect(() => validateTerritorialBalance(invalid as typeof b)).toThrow("Tipo de inventario inválido");
  });
  it("mantiene emisores, fechas y colaboración sin inventar independencia", () => {
    const b = getTerritorialBalance("r-10")!;
    expect(b.sources).toHaveLength(11);
    expect(b.sources.find(s => s.id === "valenciana-music-law")?.family).toBe("gob-valenciana");
    expect(b.sources.find(s => s.id === "valenciana-music-validation")?.family).toBe("corts-valencianes");
    expect(b.sources.find(s => s.id === "valenciana-impulso-uv")?.publicationDate).toBeNull();
    const r = b.reviews.find(r => r.commitmentId === "r-10-12")!;
    expect(r.contrast).toContain("entidades colaboradoras");
    expect(r.components.find(c => c.id === "convocatoria")?.finding).toContain("hasta agotar 20 millones");
    expect(r.components.find(c => c.id === "convocatoria")?.finding).toContain("centros privados al precio público");
    expect(r.components.find(c => c.id === "calendario")?.status).toBe("unresolved");
    expect(r.components.find(c => c.id === "pagos")?.status).toBe("unresolved");
  });
  it("preserva umbrales musicales y antecedentes sin confundir deducción y pago", () => {
    const r = getTerritorialBalance("r-10")!.reviews.find(r => r.commitmentId === "r-10-13")!;
    const law = r.components.find(c => c.id === "norma")!;
    expect(law.status).toBe("documented");
    expect(law.finding).toContain("150 € por contribuyente, no por hijo");
    expect(law.finding).toContain("la fórmula da cero");
    expect(r.components.find(c => c.id === "promesa")?.finding).toContain("propuesta del anterior debate");
    expect(r.components.find(c => c.id === "resultado")?.status).toBe("unresolved");
  });
  it("distingue presentación, convalidación, derogación y efectos de simplificación", () => {
    const r = getTerritorialBalance("r-10")!.reviews.find(r => r.commitmentId === "r-10-15")!;
    expect(r.components.find(c => c.id === "normas")?.finding).toContain("deroga expresamente");
    expect(r.components.find(c => c.id === "plazo")?.status).toBe("unresolved");
    expect(r.components.find(c => c.id === "efectos")?.status).toBe("unresolved");
    expect(r.components.some(c => c.status === "deadline-missed")).toBe(false);
  });
});
