import { describe, expect, it } from "vitest";
import { getTerritorialBalance } from "@/lib/mandate/territorial";
import { validateTerritorialBalance } from "@/lib/mandate/territorial-model";
import { getCoverage } from "@/lib/mandate/coverage";
import { isCoverageComplete } from "@/lib/mandate/coverage-model";

describe("Barcelona: catálogo completo sin atribuir cumplimiento ni inventar promesas", () => {
  it("publica 1248 fichas completas, dos contrastes parciales y 1246 pendientes", () => {
    const balance = getTerritorialBalance("m-08019")!;
    expect(balance).toMatchObject({ inventoryTotal: 1248, inventoryKind: "action-catalogue", governmentDateKind: "capture", textLanguage: "ca" });
    expect(balance.records).toHaveLength(1248);
    expect(balance.reviews).toHaveLength(2);
    expect(balance.records.length - balance.reviews.length).toBe(1246);
    expect(new Set(balance.records.map(record => record.id)).size).toBe(1248);
    for (const record of balance.records) {
      expect(record.page).toBeNull();
      expect(record.endPage).toBeNull();
      expect(record.detailText?.length).toBeGreaterThan(0);
      expect(record.webSource?.url).toMatch(new RegExp(`_${record.officialId}$`));
      expect(record.webSource?.sha256).toMatch(/^[a-f0-9]{64}$/);
    }
    const json = JSON.stringify(balance);
    expect(json).not.toMatch(/snapshotPath|rawText|drupal-settings-json/);
    expect(Buffer.byteLength(json)).toBeLessThan(4_000_000);
  });
  it("conserva estados municipales, texto completo y enlaces sin convertirlos en revisión", () => {
    const balance = getTerritorialBalance("m-08019")!;
    expect(balance.records.filter(record => record.governmentState === "Finalitzada")).toHaveLength(538);
    expect(balance.records.filter(record => record.governmentState === "En execució")).toHaveLength(439);
    expect(balance.records.filter(record => record.governmentState === "En planificació")).toHaveLength(271);
    const laietana = balance.records.find(record => record.officialId === "493")!;
    expect(laietana.detailText).toContain("38,16");
    expect(laietana.detailText).toContain("2025");
    const port = balance.records.find(record => record.officialId === "538")!;
    expect(port.detailText).toContain("20.000");
    expect(port.detailLinks?.length).toBeGreaterThan(0);
    expect(balance.reviews[0].components.map(item => item.status)).toEqual(["reported", "documented", "documented", "unresolved"]);
    expect(balance.reviews[1].components.map(item => item.status)).toEqual(["reported", "documented", "unresolved", "unresolved"]);
    expect(balance.sources.filter(source => source.captureType === "extracto_editorial")).toHaveLength(2);
    expect(balance.sources.find(source => source.id === "barcelona-laietana-court")?.family).toBe("europa-press");
  });
  it("impide cerrar el balance aunque se revisara todo el catálogo sin reconstruir las promesas", () => {
    const item = structuredClone(getCoverage().find(item => item.id === "m-08019")!);
    expect(item).toMatchObject({ inventoryKind: "action-catalogue", originalInventoryComplete: false, independentlyReviewed: 0 });
    item.reviewed = item.imported; item.independentlyReviewed = item.imported; item.blockers = [];
    expect(isCoverageComplete(item)).toBe(false);
  });
  it("rechaza fichas web sin texto, con huella inválida, enlaces ejecutables o páginas ficticias", () => {
    for (const mutation of [
      (balance: ReturnType<typeof getTerritorialBalance>) => { balance!.records[0].detailText = ""; },
      (balance: ReturnType<typeof getTerritorialBalance>) => { balance!.records[0].webSource!.sha256 = "unknown"; },
      (balance: ReturnType<typeof getTerritorialBalance>) => { balance!.records[0].detailLinks = ["javascript:alert(1)"]; },
      (balance: ReturnType<typeof getTerritorialBalance>) => { balance!.records[0].page = 1; },
    ]) {
      const balance = structuredClone(getTerritorialBalance("m-08019")!);
      mutation(balance);
      expect(() => validateTerritorialBalance(balance)).toThrow("Ficha web territorial inválida");
    }
  });
  it.each(["101%", "100.9%", "-1%", "completado"])("rechaza porcentajes municipales inválidos: %s", value => {
    const balance = structuredClone(getTerritorialBalance("m-08019")!);
    balance.records[0].governmentProgress = value;
    expect(() => validateTerritorialBalance(balance)).toThrow("Porcentaje gubernamental inválido");
  });
});
