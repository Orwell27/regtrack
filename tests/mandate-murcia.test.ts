import { describe, expect, it } from "vitest";
import { getTerritorialBalance } from "@/lib/mandate/territorial";
import { getCoverage } from "@/lib/mandate/coverage";
import { isCoverageComplete } from "@/lib/mandate/coverage-model";

describe("Murcia: pacto inicial y contraste con fechas y orígenes", () => {
  it("no confunde dos copias del pacto, 38 apartados y tres revisiones", () => {
    const balance = getTerritorialBalance("r-14")!;
    expect(balance).toMatchObject({ level: "region", inventoryTotal: 38, programmeCopy: true });
    expect(balance.records.slice(30).map(r => r.officialId)).toEqual(["Primero", "Segundo", "Tercero", "Cuarto", "Quinto", "Sexto", "Séptimo", "Octavo"]);
    expect(balance.contextBlocks).toHaveLength(2);
    expect(balance.reviews).toHaveLength(3);
    expect(balance.reviews.flatMap(r => r.components)).toHaveLength(13);
    const coverage = getCoverage().find(c => c.id === "r-14")!;
    expect(coverage).toMatchObject({ imported: 38, reviewed: 3, independentlyReviewed: 0, originalInventoryComplete: false });
    expect(coverage.blockers.join(" ")).toContain("35");
    expect(coverage.blockers.join(" ")).not.toContain("archivo municipal");
    expect(isCoverageComplete(coverage)).toBe(false);
    const copies = balance.sources.filter(s => s.role === "programme");
    expect(new Set(copies.map(s => s.family)).size).toBe(1);
    expect(new Set(copies.map(s => s.sha256)).size).toBe(2);
    expect(balance.sources.filter(s => s.captureType === "extracto_editorial")).toHaveLength(3);
    expect(balance.sources).toHaveLength(16);
    expect(JSON.stringify(balance)).not.toMatch(/rawText|snapshotPath|extractionSha256/);
  });
  it("separa rebaja general, acceso al tipo reducido, impuestos y efectos", () => {
    const review = getTerritorialBalance("r-14")!.reviews.find(r => r.commitmentId === "r-14-21")!;
    expect(review.components.find(c => c.id === "general")?.finding).toContain("0,25 puntos porcentuales");
    expect(review.components.find(c => c.id === "jovenes")?.finding).toContain("no se crea el 3 %");
    expect(review.components.find(c => c.id === "familias")?.status).toBe("unresolved");
    expect(review.components.find(c => c.id === "efecto")?.status).toBe("unresolved");
  });
  it("expone el contraste crítico sin convertirlo en auditoría de datos clínicos", () => {
    const balance = getTerritorialBalance("r-14")!;
    const health = balance.reviews.find(r => r.commitmentId === "r-14-17")!;
    expect(health.components.find(c => c.id === "medias")?.status).toBe("reported");
    expect(health.components.find(c => c.id === "inconsistencias")?.finding).toContain("personas únicas");
    expect(health.components.find(c => c.id === "limites")?.status).toBe("unresolved");
    expect(balance.sources.find(s => s.id === "murcia-waiting-national-2025")?.family).toBe("gobierno-murcia");
    expect(balance.sources.find(s => s.id === "murcia-waiting-reply-2026")?.family).toBe("gobierno-murcia");
    expect(balance.sources.find(s => s.id === "murcia-waiting-adsp-2026")?.role).toBe("reporting");
  });
  it("no perpetúa en 2026 los nombramientos del pacto de 2023", () => {
    const review = getTerritorialBalance("r-14")!.reviews.find(r => r.commitmentId === "r-14-acuerdo-4")!;
    expect(review.components.find(c => c.id === "ceses")?.finding).toContain("15 de julio de 2024");
    expect(review.components.find(c => c.id === "alcance")?.status).toBe("unresolved");
    expect(review.pending.join(" ")).toContain("humana independiente");
  });
});
