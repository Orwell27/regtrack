import { describe, expect, it } from "vitest";
import { getTerritorialBalance } from "@/lib/mandate/territorial";
import { getCoverage } from "@/lib/mandate/coverage";
import { isCoverageComplete } from "@/lib/mandate/coverage-model";

describe("Asturias: preacuerdo, gasto previsto y acceso a escuelas", () => {
  it("impide cerrar el balance aun revisando todo el preacuerdo", () => {
    const balance = getTerritorialBalance("r-03")!;
    expect(balance).toMatchObject({ inventoryKind: "preagreement", inventoryTotal: 37, level: "region" });
    expect(balance.records[36].text).toContain("ocho personas");
    expect(balance.records[18].text).toContain("cuatro alumnos/as");
    const coverage = getCoverage().find(c => c.id === "r-03")!;
    expect(coverage).toMatchObject({ imported: 37, reviewed: 2, independentlyReviewed: 0, originalInventoryComplete: false });
    expect(isCoverageComplete({ ...coverage, reviewed: 37, independentlyReviewed: 37, blockers: [] })).toBe(false);
    expect(coverage.blockers.join(" ")).toContain("texto final firmado");
    expect(JSON.stringify(balance)).not.toMatch(/rawText|snapshotPath|extractionSha256|extractionMethod/);
  });
  it("no cuenta copias idénticas como evaluaciones independientes", () => {
    const balance = getTerritorialBalance("r-03")!;
    const copies = balance.sources.filter(s => ["asturias-concertation", "asturias-concertation-ccoo"].includes(s.id));
    expect(copies).toHaveLength(2);
    expect(new Set(copies.map(s => s.sha256)).size).toBe(1);
    expect(new Set(copies.map(s => s.family))).toEqual(new Set(["concertacion-asturias-firmantes"]));
    expect(balance.sources).toHaveLength(14);
    expect(balance.sources.some(s => s.role === "control")).toBe(false);
    expect(balance.reviews[0].components.find(c => c.id === "resultados")?.status).toBe("unresolved");
  });
  it("mantiene los anuncios fechados y las lagunas del apartado educativo", () => {
    const review = getTerritorialBalance("r-03")!.reviews.find(r => r.commitmentId === "r-03-19")!;
    expect(review.components.find(c => c.id === "extension")?.status).toBe("reported");
    expect(review.components.find(c => c.id === "extension")?.finding).toContain("previsiones");
    expect(review.components.find(c => c.id === "red")?.finding).toContain("20/11/2024");
    expect(review.components.find(c => c.id === "limites")?.finding).toContain("cuatro alumnos");
    expect(review.components.find(c => c.id === "limites")?.status).toBe("unresolved");
    expect(review.pending.join(" ")).toContain("humana independiente");
  });
});
