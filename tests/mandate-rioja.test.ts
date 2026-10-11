import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { getTerritorialBalance } from "@/lib/mandate/territorial";
import { getCoverage } from "@/lib/mandate/coverage";
import { isCoverageComplete } from "@/lib/mandate/coverage-model";

describe("La Rioja: apartados documentales, unidades fiscales y evaluación académica", () => {
  it("no permite dar por completas las promesas a partir de las viñetas", () => {
    const balance = getTerritorialBalance("r-17")!;
    expect(balance).toMatchObject({ inventoryKind: "bullet-sections", inventoryTotal: 949 });
    expect(balance.reviews).toHaveLength(2);
    const coverage = getCoverage().find(c => c.id === "r-17")!;
    expect(coverage).toMatchObject({ reviewed: 2, imported: 949, originalInventoryComplete: false, independentlyReviewed: 0 });
    expect(isCoverageComplete({ ...coverage, reviewed: 949, independentlyReviewed: 949, blockers: [] })).toBe(false);
    expect(coverage.blockers.join(" ")).toContain("formulados en prosa");
    expect(JSON.stringify(balance)).not.toMatch(/rawText|snapshotPath|orderedSha256|extractionSha256/);
  });
  it("concilia total, individual y conjunta sin contar cada tabla como un origen", () => {
    const balance = getTerritorialBalance("r-17")!;
    const tables = ["total", "individual", "joint"].map(kind => {
      const html = readFileSync(`data/mandate/evidence/territorial/rioja/sports-statistics-${kind}-2023.html`, "utf8");
      const row = html.match(/<tr[^>]*>[\s\S]*?1168\.[\s\S]*?<\/tr>/)?.[0].split("1168.")[1];
      const values = row?.match(/\d{1,3}(?:\.\d{3})+/g)?.map(n => Number(n.replaceAll(".", "")));
      expect(values?.length).toBeGreaterThanOrEqual(2);
      return values!;
    });
    expect(tables[0].slice(0, 2)).toEqual([50668, 5316485]);
    expect(tables[1][0] + tables[2][0]).toBe(tables[0][0]);
    expect(tables[1][1] + tables[2][1]).toBe(tables[0][1]);
    expect(new Set(balance.sources.filter(s => s.id.includes("sports-statistics")).map(s => s.family))).toEqual(new Set(["aeat"]));
    const review = balance.reviews.find(r => r.commitmentId === "r-17-894")!;
    expect(review.components.find(c => c.id === "discrepancia")?.status).toBe("unresolved");
    expect(review.components.find(c => c.id === "impacto")?.status).toBe("unresolved");
    expect(balance.sources.find(s => s.id === "rioja-sports-government-2024")?.captureType).toBe("extracto_editorial");
  });
  it("limita el control de ANECA al título y conserva las demás partes sin resolver", () => {
    const balance = getTerritorialBalance("r-17")!;
    expect(balance.sources.filter(s => s.role === "control").map(s => s.family)).toEqual(["aneca"]);
    const review = balance.reviews.find(r => r.commitmentId === "r-17-714")!;
    expect(review.components.find(c => c.id === "documentacion")?.status).toBe("reported");
    expect(review.components.find(c => c.id === "resto")?.status).toBe("unresolved");
    expect(review.pending.join(" ")).toContain("humana independiente");
  });
});
