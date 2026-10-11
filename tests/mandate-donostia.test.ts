import { describe, expect, it } from "vitest";
import { getTerritorialBalance } from "@/lib/mandate/territorial";
import { validateTerritorialBalance } from "@/lib/mandate/territorial-model";
import { getCoverage } from "@/lib/mandate/coverage";
import { isCoverageComplete } from "@/lib/mandate/coverage-model";

describe("Donostia conserva la discrepancia del catálogo y los periodos de cada dato", () => {
  it("mantiene 129 fichas y 27 seguimientos sin inventar estado para las otras 102", () => {
    const balance = getTerritorialBalance("m-20069")!;
    expect(balance.records).toHaveLength(129);
    expect(balance.records.filter(r => r.governmentReport)).toHaveLength(27);
    expect(balance.records.filter(r => !r.governmentReport)).toHaveLength(102);
    expect(balance.records.every(r => r.detailText && r.webSource && r.page === null)).toBe(true);
    expect(balance.scope).toContain("127 proyectos");
    expect(balance.reviews).toHaveLength(2);
    expect(balance.reviews.flatMap(r => r.components)).toHaveLength(11);
    const coverage = getCoverage().find(r => r.id === "m-20069")!;
    expect(coverage).toMatchObject({ imported: 129, reviewed: 2, independentlyReviewed: 0, originalInventoryComplete: false });
    expect(isCoverageComplete(coverage)).toBe(false);
    expect(balance.sources).toHaveLength(37);
    expect(new Set(balance.sources.map(s => s.family))).toEqual(new Set(["ayto-donostia"]));
    const json = JSON.stringify(balance);
    expect(json).not.toMatch(/snapshotPath|rawText|expectedText/);
    expect(Buffer.byteLength(json)).toBeLessThan(750_000);
  });
  it("conserva el horizonte 2033, decimales y los periodos 2023–2024 en vivienda", () => {
    const balance = getTerritorialBalance("m-20069")!;
    const housing = balance.records.find(r => r.governmentReport?.officialId === "14")!;
    expect(housing.detailText).toContain("6.000 viviendas nuevas para 2033");
    expect(housing.governmentReport).toMatchObject({ percentage: 36.5 });
    expect(housing.governmentReport?.text).toContain("673 (datos de 2023 y 2024)");
    expect(housing.governmentReport?.text).toContain("310 viviendas (datos de 2023 y 2024)");
    expect(balance.reviews[0].components.find(c => c.id === "illarra-tramitacion")?.finding).toContain("propuesta al Pleno");
  });
  it("no convierte 100% en Finalizado ni 0% en ausencia de seguimiento", () => {
    const balance = getTerritorialBalance("m-20069")!;
    const rights = balance.records.find(r => r.governmentReport?.officialId === "21")!;
    expect(rights.governmentReport?.percentage).toBe(100);
    expect(rights.governmentReport?.text).toContain("En marcha");
    expect(balance.reviews.some(r => r.commitmentId === rights.id)).toBe(false);
    const sagues = balance.records.find(r => r.governmentReport?.officialId === "16")!;
    expect(sagues.governmentReport?.percentage).toBe(0);
    expect(sagues.governmentReport?.text).toContain("18/09/2025");
    const mobility = balance.reviews[1];
    expect(mobility.components.find(c => c.id === "ruido")?.status).toBe("target-pending");
    expect(mobility.components.find(c => c.id === "aire-discrepancias")?.status).toBe("unresolved");
  });
  it.each([NaN, Infinity, -1, 101])("rechaza porcentaje inválido %s", value => {
    const balance = getTerritorialBalance("m-20069")!;
    balance.records.find(r => r.governmentReport)!.governmentReport!.percentage = value;
    expect(() => validateTerritorialBalance(balance)).toThrow("Seguimiento municipal inválido");
  });
  it("rechaza sustitución del recurso o de su función documental", () => {
    for (const change of ["url", "role"]) {
      const balance = getTerritorialBalance("m-20069")!;
      const report = balance.records.find(r => r.governmentReport)!.governmentReport!;
      if (change === "url") report.url += "&projectId=999";
      else balance.sources.find(s => s.id === report.sourceId)!.role = "programme";
      expect(() => validateTerritorialBalance(balance)).toThrow("Seguimiento municipal inválido");
    }
  });
});
