import { describe, expect, it } from "vitest";
import { getTerritorialBalance } from "@/lib/mandate/territorial";
import { getCoverage } from "@/lib/mandate/coverage";
import { isCoverageComplete } from "@/lib/mandate/coverage-model";

describe("Andalucía: nuevo mandato, OCR provisional y contraste por componentes", () => {
  it("importa 150 medidas sin cerrar el universo ni atribuir 147 revisiones inexistentes", () => {
    const balance = getTerritorialBalance("r-01")!;
    expect(balance).toMatchObject({ mandateId: "r-01-2026", inventoryTotal: 150, programmeCopy: true, transcriptionPending: true, inventoryKind: "numbered-sections" });
    expect(balance.contextBlocks).toHaveLength(20);
    expect(balance.reviews).toHaveLength(3);
    expect(balance.reviews.flatMap(r => r.components)).toHaveLength(14);
    const coverage = getCoverage().find(c => c.id === "r-01")!;
    expect(coverage).toMatchObject({ imported: 150, reviewed: 3, independentlyReviewed: 0, originalInventoryComplete: false });
    expect(isCoverageComplete(coverage)).toBe(false);
    expect(coverage.blockers.join(" ")).toContain("147");
    expect(JSON.stringify(balance)).not.toMatch(/rawText|fragments|snapshotPath|orderedSha256|finalUrl/);
  });
  it("no inventa una segunda fuente independiente por alojar un acuerdo en un periódico", () => {
    const balance = getTerritorialBalance("r-01")!;
    expect(balance.sources).toHaveLength(10);
    expect(balance.sources.find(s => s.id === "andalucia-programme")?.family).toBe("pp-vox-andalucia");
    expect(balance.sources.find(s => s.id === "andalucia-huelva-appeal")?.role).toBe("control");
    expect(balance.sources.filter(s => s.id.startsWith("andalucia-infant-")).every(s => s.family === "gob-andalucia")).toBe(true);
    expect(balance.records.find(r => r.officialId === "74")?.text).toContain("primer semestre de 2026");
    expect(balance.records.find(r => r.officialId === "74")?.sourceNote).toContain("anterior a la firma");
    expect(balance.reviews.some(r => r.commitmentId === "r-01-74")).toBe(false);
  });
  it("contrasta cursos y conserva el alcance de la gratuidad", () => {
    const review = getTerritorialBalance("r-01")!.reviews.find(r => r.commitmentId === "r-01-63")!;
    expect(review.components.find(c => c.id === "plazo")).toMatchObject({ status: "target-pending" });
    expect(review.components.find(c => c.id === "plazo")?.finding).toContain("2027–2028");
    expect(review.components.find(c => c.id === "norma")?.finding).toContain("no recibos");
    expect(review.components.find(c => c.id === "financiacion")?.status).toBe("unresolved");
    expect(review.periodNote).toContain("anterior al nuevo mandato");
  });
  it("no convierte obra iniciada en entrega, inadmisión en validación técnica o plazo futuro en vencido", () => {
    const reviews = getTerritorialBalance("r-01")!.reviews;
    const housing = reviews.find(r => r.commitmentId === "r-01-47")!;
    expect(housing.components.find(c => c.id === "plazo")?.status).toBe("unresolved");
    expect(housing.components.find(c => c.id === "resultado")?.finding).toContain("desde 2019 mezclan periodos");
    const hospital = reviews.find(r => r.commitmentId === "r-01-88")!;
    expect(hospital.components.find(c => c.id === "antecedente")?.finding).toContain("sin constituir una validación técnica");
    expect(hospital.components.find(c => c.id === "calendario")?.status).toBe("unresolved");
    expect(hospital.components.find(c => c.id === "apertura")?.finding).toContain("no se trata como vencido");
  });
});
