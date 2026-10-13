import { describe, expect, it } from "vitest";
import { getTerritorialBalance } from "@/lib/mandate/territorial";
import { getCoverage } from "@/lib/mandate/coverage";
import { isCoverageComplete } from "@/lib/mandate/coverage-model";

describe("Murcia municipal: cronología, denominadores y resultados", () => {
  it("mantiene 2023 y separa municipio, región y relevo de 2026", () => {
    const b = getTerritorialBalance("m-30030")!;
    expect(b).toMatchObject({ mandateId: "m-30030-2023", inventoryKind: "speech-sections", inventoryTotal: 11, transcriptionPending: true });
    expect(b.contextBlocks).toHaveLength(2);
    expect(b.reviews).toHaveLength(3);
    expect(b.reviews.flatMap(r => r.components)).toHaveLength(14);
    expect(b.sources).toHaveLength(15);
    expect(b.textNote).toContain("El relevo no reinicia el mandato");
    expect(b.textNote).toContain("11/05/2025");
    expect(b.records.every(r => r.sourceId === "murcia-city-programme")).toBe(true);
    expect(b.sources.every(s => s.jurisdictionId === "m-30030")).toBe(true);
    expect(getTerritorialBalance("r-14")!.inventoryTotal).toBe(38);
    const c = getCoverage().find(c => c.id === "m-30030")!;
    expect(c).toMatchObject({ imported: 11, reviewed: 3, independentlyReviewed: 0, originalInventoryComplete: false });
    expect(isCoverageComplete(c)).toBe(false);
    expect(JSON.stringify(b)).not.toMatch(/rawText|fragments|snapshotPath|transportPath/);
  });
  it("no suma versiones del plan ni equipara proyectos con actuaciones", () => {
    const r = getTerritorialBalance("m-30030")!.reviews[0];
    expect(r.components.find(c => c.id === "anuncios")?.finding).toContain("no se suman");
    expect(r.components.find(c => c.id === "norma")?.finding).toContain("13 proyectos");
    expect(r.components.find(c => c.id === "norma")?.finding).toContain("no acredita cobro ni gasto ejecutado");
    expect(r.components.find(c => c.id === "contraste")?.status).toBe("unresolved");
    expect(r.components.find(c => c.id === "resultado")?.finding).toContain("no ha vencido");
  });
  it("no atribuye 2019 a este mandato ni una modificación a obra recibida", () => {
    const r = getTerritorialBalance("m-30030")!.reviews[1];
    expect(r.components.find(c => c.id === "contrato")?.finding).toContain("incremento contractual");
    expect(r.components.find(c => c.id === "obras")?.finding).toContain("fase I en 2019");
    expect(r.components.find(c => c.id === "resultado")?.status).toBe("unresolved");
  });
  it("separa cuatro entregas, piloto de 25 y previsión de 325", () => {
    const b = getTerritorialBalance("m-30030")!;
    const r = b.reviews[2];
    expect(r.components.find(c => c.id === "piloto")?.status).toBe("reported");
    expect(r.components.find(c => c.id === "piloto")?.finding).toContain("No acredita que se hayan entregado las 25");
    expect(r.components.find(c => c.id === "estrategia")?.finding).toContain("sin ofertas");
    expect(r.components.find(c => c.id === "consulta")?.finding).toContain("No es una adjudicación");
    expect(r.components.find(c => c.id === "resultado")?.finding).toContain("no se mezcla");
    expect(b.sources.find(s => s.id === "murcia-city-housing-contrast")?.family).toBe("psoe-murcia");
    expect(b.sources.find(s => s.id === "murcia-city-pedanias-contrast")?.family).toBe("psoe-murcia");
  });
});
