import { describe, expect, it } from "vitest";
import { getTerritorialBalance } from "@/lib/mandate/territorial";
import { validateTerritorialBalance } from "@/lib/mandate/territorial-model";
import { getCoverage } from "@/lib/mandate/coverage";
import { isCoverageComplete } from "@/lib/mandate/coverage-model";

describe("Canarias: plan administrativo, unidades y límites de corroboración", () => {
  it("conserva todo el plan sin confundirlo con todas las promesas políticas", () => {
    const balance = getTerritorialBalance("r-05")!;
    expect(balance.inventoryKind).toBe("strategic-plan");
    expect(balance.records).toHaveLength(145);
    expect(balance.records.flatMap(r => r.initiatives ?? [])).toHaveLength(788);
    expect(new Set(balance.records.map(r => r.topic)).size).toBe(13);
    expect(balance.sources.filter(s => s.id.startsWith("canarias-agreement-") && s.role === "programme")).toHaveLength(3);
    expect(balance.reviews).toHaveLength(2);
    expect(balance.reviews.flatMap(r => r.components)).toHaveLength(9);
    const coverage = getCoverage().find(r => r.id === "r-05")!;
    expect(coverage).toMatchObject({ imported: 145, reviewed: 2, independentlyReviewed: 0, originalInventoryComplete: false });
    expect(coverage.blockers.join(" ")).toContain("143 objetivos estratégicos");
    expect(isCoverageComplete(coverage)).toBe(false);
    expect(JSON.stringify(balance)).not.toMatch(/snapshotPath|rawText|"split"|"top"/);
    expect(Buffer.byteLength(JSON.stringify(balance))).toBeLessThan(500_000);
  });
  it("mantiene la errata del código sin colisiones de identidad ni pérdida de texto", () => {
    const balance = getTerritorialBalance("r-05")!;
    const record = balance.records.find(r => r.officialId === "BSIJIF.OEst.3")!;
    const repeated = record.initiatives!.filter(c => c.officialId === "BSIJIF.OEsp.3.2");
    expect(repeated).toHaveLength(2);
    expect(new Set(repeated.map(c => c.id)).size).toBe(2);
    expect(repeated.map(c => c.page)).toEqual([54, 55]);
    expect(repeated.every(c => c.sourceNote?.includes("no se corrige"))).toBe(true);
    repeated[1].id = repeated[0].id;
    expect(() => validateTerritorialBalance(balance)).toThrow("Iniciativa territorial inválida");
  });
  it("usa el corte de junio de 2026 y no sustituye el máximo por la media", () => {
    const balance = getTerritorialBalance("r-05")!;
    const review = balance.reviews.find(r => r.commitmentId === "r-05-S.OEst.1")!;
    expect(review.conclusion).toContain("incoherencia");
    expect(review.components.find(c => c.id === "corte-junio")).toMatchObject({ status: "target-pending" });
    expect(review.components.find(c => c.id === "corte-junio")?.finding).toContain("6.047");
    expect(review.components.find(c => c.id === "corte-junio")?.finding).toContain("ninguna sustituye al máximo");
    expect(review.components.find(c => c.id === "universo-control")?.status).toBe("unresolved");
  });
  it("separa personas, actos, abastecimiento y seguridad, con origen compartido", () => {
    const balance = getTerritorialBalance("r-05")!;
    const review = balance.reviews.find(r => r.commitmentId === "r-05-S.OEst.9")!;
    expect(review.components.find(c => c.id === "donantes")?.finding).toContain("24.422 personas");
    expect(review.components.find(c => c.id === "abastecimiento")?.status).toBe("reported");
    expect(review.components.find(c => c.id === "seguridad")?.status).toBe("unresolved");
    expect(balance.sources.filter(s => s.id.includes("national")).every(s => s.family === "gob-canarias" && s.role === "reporting")).toBe(true);
    expect(balance.sources.some(s => s.role === "control")).toBe(false);
    expect(balance.sources.every(s => s.captureType === "bytes_originales")).toBe(true);
    expect(balance.reviews.every(r => r.pending.join(" ").includes("humana independiente"))).toBe(true);
  });
});
