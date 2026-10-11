import { describe, expect, it } from "vitest";
import { getTerritorialBalance } from "@/lib/mandate/territorial";
import { getCoverage } from "@/lib/mandate/coverage";

describe("Cantabria: autoría, ayudas condicionadas y alcance de las redes", () => {
  it("separa el inventario de las dos revisiones parciales y de la revisión humana", () => {
    const balance = getTerritorialBalance("r-06")!;
    expect(balance.inventoryTotal).toBe(1228);
    expect(balance.reviews).toHaveLength(2);
    expect(balance.reviews.flatMap(r => r.components)).toHaveLength(10);
    expect(balance.contextBlocks).toHaveLength(137);
    expect(getCoverage().find(c => c.id === "r-06")).toMatchObject({ imported: 1228, reviewed: 2, independentlyReviewed: 0 });
    expect(JSON.stringify(balance)).not.toMatch(/rawText|snapshotPath|requestForm|orderedSha256|extractionSha256/);
  });
  it("mantiene como gubernamental la respuesta alojada en el Parlamento", () => {
    const balance = getTerritorialBalance("r-06")!;
    expect(balance.sources.find(s => s.id === "cantabria-quota-response")).toMatchObject({ family: "gob-cantabria", role: "government-report" });
    expect(balance.sources.find(s => s.id === "cantabria-parliament-resolutions")).toMatchObject({ family: "parlamento-cantabria", role: "control" });
    expect(new Set(balance.sources.map(s => s.family)).size).toBe(4);
    expect(balance.sources.filter(s => s.captureType === "extracto_editorial").map(s => s.id)).toEqual(["cantabria-transport-card", "cantabria-transport-portal"]);
    const review = balance.reviews[0];
    expect(review.components.find(c => c.id === "alcance")?.status).toBe("unresolved");
    expect(review.components.find(c => c.id === "balance")?.finding).toContain("otras líneas");
    expect(review.components.find(c => c.id === "resultados")?.status).toBe("unresolved");
  });
  it("no convierte el soporte interoperable ni un abono municipal en tarifa regional ilimitada", () => {
    const balance = getTerritorialBalance("r-06")!;
    const review = balance.reviews[1];
    expect(review.components.find(c => c.id === "redes")?.finding).toContain("15,75 euros trimestrales");
    expect(review.components.find(c => c.id === "precio")?.finding).toContain("sin establecer el abono único de 20 euros");
    expect(review.components.find(c => c.id === "resultados")?.status).toBe("unresolved");
    expect(balance.sources.find(s => s.id === "cantabria-transport-torrelavega")?.family).toBe("ayto-torrelavega");
    expect(balance.sources.find(s => s.id === "cantabria-transport-law-2026")?.url).toContain("cve=2026-5303");
  });
});
