import { describe, expect, it } from "vitest";
import { getTerritorialBalance } from "@/lib/mandate/territorial";
import { validateTerritorialBalance } from "@/lib/mandate/territorial-model";
import { getCoverage } from "@/lib/mandate/coverage";
import { isCoverageComplete } from "@/lib/mandate/coverage-model";

describe("Ceuta: programa inicial, fases documentales y condiciones", () => {
  it("no convierte un programa no exhaustivo en todo el mandato", () => {
    const balance = getTerritorialBalance("r-18")!;
    expect(balance).toMatchObject({ level: "autonomous-city", inventoryKind: "initial-programme", inventoryTotal: 138 });
    expect(balance.reviews).toHaveLength(3);
    expect(balance.reviews.flatMap(r => r.components)).toHaveLength(13);
    const coverage = getCoverage().find(r => r.id === "r-18")!;
    expect(coverage).toMatchObject({ imported: 138, reviewed: 3, independentlyReviewed: 0, originalInventoryComplete: false });
    expect(coverage.blockers.join(" ")).toContain("135 medidas iniciales");
    expect(isCoverageComplete(coverage)).toBe(false);
    expect(balance.sources).toHaveLength(10);
    expect(balance.sources.every(s => s.captureType === "bytes_originales")).toBe(true);
    expect(new Set(balance.sources.map(s => s.family))).toEqual(new Set(["ciudad-ceuta", "grupo-faro"]));
    expect(JSON.stringify(balance)).not.toMatch(/rawText|snapshotPath|extractionSha256/);
  });
  it("conserva números repetidos, notas de origen y fases anidadas", () => {
    const balance = getTerritorialBalance("r-18")!;
    const duplicated = balance.records.filter(r => r.id.startsWith("r-18-F-") && r.officialId === "26");
    expect(duplicated).toHaveLength(2);
    expect(new Set(duplicated.map(r => r.id)).size).toBe(2);
    expect(duplicated.every(r => r.sourceNote?.includes("se repite"))).toBe(true);
    expect(balance.records.find(r => r.id === "r-18-F-7")?.initiatives).toHaveLength(5);
    duplicated[0].sourceNote = " ";
    expect(() => validateTerritorialBalance(balance)).toThrow("Nota de origen territorial vacía");
  });
  it("distingue propuesta, presentación, consumo ofertado y resultados", () => {
    const balance = getTerritorialBalance("r-18")!;
    const bus = balance.reviews.find(r => r.commitmentId === "r-18-F-28")!;
    expect(bus.components.find(c => c.id === "contratacion")?.finding).toContain("no la adjudicación definitiva");
    expect(bus.components.find(c => c.id === "emisiones")?.finding).toContain("33,81 y 35,30");
    expect(bus.components.find(c => c.id === "resultado")?.status).toBe("unresolved");
    expect(bus.components[0].citations).toContainEqual({ sourceId: "ceuta-bus-report-2023", locator: "Apartado 3.4: fecha de inicio del servicio", page: 4 });
    expect(balance.sources.find(s => s.id === "ceuta-bus-report-2023")?.family).toBe("ciudad-ceuta");
    expect(balance.sources.find(s => s.id === "ceuta-bus-tender-2023")?.publicationDate).toBeNull();
  });
  it("no transforma obligaciones previas o presupuesto en ejecución", () => {
    const balance = getTerritorialBalance("r-18")!;
    const cleaning = balance.reviews.find(r => r.commitmentId === "r-18-F-18")!;
    expect(cleaning.components.find(c => c.id === "obligaciones-previas")?.finding).toContain("ni como pago ya ejecutado");
    const budget = balance.reviews.find(r => r.commitmentId === "r-18-H-2")!;
    expect(budget.components.find(c => c.id === "plazo")?.status).toBe("unresolved");
    expect(budget.components.find(c => c.id === "condicion")?.finding).toContain("criterio declarado por el Gobierno");
    expect(balance.reviews.flatMap(r => r.components).some(c => c.status === "deadline-missed")).toBe(false);
    expect(balance.reviews.every(r => r.pending.join(" ").includes("humana independiente"))).toBe(true);
  });
});
