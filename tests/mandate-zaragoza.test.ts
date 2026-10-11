import { describe, expect, it } from "vitest";
import { getTerritorialBalance } from "@/lib/mandate/territorial";
import { getCoverage } from "@/lib/mandate/coverage";
import { isCoverageComplete } from "@/lib/mandate/coverage-model";

describe("Zaragoza: secciones, fechas y actuaciones sin equiparar", () => {
  it("separa municipio y región y no presenta secciones como promesas verificadas", () => {
    const b = getTerritorialBalance("m-50297")!;
    expect(b).toMatchObject({ inventoryTotal: 37, mandateId: "m-50297-2023", transcriptionPending: true });
    expect(b.contextBlocks).toHaveLength(2);
    expect(b.reviews).toHaveLength(3);
    expect(b.reviews.flatMap(r => r.components)).toHaveLength(14);
    expect(b.sources).toHaveLength(13);
    expect(b.scope).toContain("No son 37 promesas únicas");
    expect(b.textNote).toContain("sin mayoría absoluta");
    expect(b.sources.every(s => s.jurisdictionId === "m-50297")).toBe(true);
    expect(getTerritorialBalance("r-02")!.inventoryTotal).toBe(117);
    const c = getCoverage().find(c => c.id === "m-50297")!;
    expect(c).toMatchObject({ imported: 37, reviewed: 3, independentlyReviewed: 0, originalInventoryComplete: false });
    expect(isCoverageComplete(c)).toBe(false);
    expect(JSON.stringify(b)).not.toMatch(/rawText|fragments|snapshotPath|layoutSha256/);
  });
  it("contrasta 2026 con la concesión de ACES para 2027", () => {
    const b = getTerritorialBalance("m-50297")!;
    const r = b.reviews[0];
    expect(r.components.find(c => c.id === "capitalidad")).toMatchObject({ status: "documented" });
    expect(r.components.find(c => c.id === "capitalidad")?.finding).toContain("Zaragoza en 2027 y Nápoles en 2026");
    expect(r.components.find(c => c.id === "estadio")?.finding).toContain("no como certificado actualizado");
    expect(r.components.find(c => c.id === "resultado")?.status).toBe("unresolved");
    expect(b.sources.find(s => s.id === "zaragoza-aces")?.family).toBe("aces-europe");
  });
  it("no transforma porcentajes de una fase en recepción completa", () => {
    const r = getTerritorialBalance("m-50297")!.reviews[1];
    expect(r.components.find(c => c.id === "avance")?.status).toBe("reported");
    expect(r.components.find(c => c.id === "avance")?.finding).toContain("No se suman");
    expect(r.components.find(c => c.id === "incidencia")?.finding).toContain("no fija por sí solo un plazo contractual");
    expect(r.contrast).toContain("no tres verificaciones independientes");
  });
  it("no confunde acuerdo previo, financiación prevista y viviendas entregadas", () => {
    const r = getTerritorialBalance("m-50297")!.reviews[2];
    expect(r.components.find(c => c.id === "origen")?.finding).toContain("anterior a la elección de Chueca");
    expect(r.components.find(c => c.id === "presupuesto")?.finding).toContain("no son gasto ejecutado");
    expect(r.components.find(c => c.id === "otra-fase")?.finding).toContain("expediente distinto");
    expect(r.components.find(c => c.id === "plazo")?.status).toBe("unresolved");
    expect(r.components.find(c => c.id === "plazo")?.finding).toContain("el primer plazo ha pasado y el segundo aún no");
  });
});
