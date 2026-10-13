import { describe, expect, it } from "vitest";
import { getTerritorialBalance } from "@/lib/mandate/territorial";
import { getCoverage } from "@/lib/mandate/coverage";
import { isCoverageComplete } from "@/lib/mandate/coverage-model";

describe("Castilla y León: nuevo mandato y resultados separados de anuncios", () => {
  it("conserva 220 apartados, submedidas y límites sin crear 217 revisiones", () => {
    const balance = getTerritorialBalance("r-07")!;
    expect(balance).toMatchObject({ mandateId: "r-07-2026", inventoryTotal: 220, programmeCopy: true, transcriptionPending: true });
    expect(balance.contextBlocks).toHaveLength(25);
    expect(balance.reviews).toHaveLength(3);
    expect(balance.reviews.flatMap(r => r.components)).toHaveLength(13);
    const coverage = getCoverage().find(c => c.id === "r-07")!;
    expect(coverage).toMatchObject({ imported: 220, reviewed: 3, independentlyReviewed: 0, originalInventoryComplete: false });
    expect(isCoverageComplete(coverage)).toBe(false);
    expect(coverage.blockers.join(" ")).toContain("217");
    expect(JSON.stringify(balance)).not.toMatch(/rawText|fragments|snapshotPath|orderedSha256/);
    expect(balance.records.find(r => r.officialId === "1.2")?.text).toContain("1.2.8");
    expect(balance.records.find(r => r.officialId === "11.8")?.sourceNote).toContain("omite el primer dígito");
    expect(balance.records.find(r => r.officialId === "10.1")?.text).toContain("No más menores");
  });
  it("distingue normativa, declaraciones y antecedente externo de otro mandato", () => {
    const balance = getTerritorialBalance("r-07")!;
    expect(balance.sources).toHaveLength(12);
    expect(balance.sources.find(s => s.id === "cyl-housing-debate")).toMatchObject({ role: "government-report", family: "gob-cyl" });
    expect(balance.sources.find(s => s.id === "cyl-buscyl-facua")).toMatchObject({ publicationDate: "2025-10-30", captureType: "extracto_editorial", family: "facua-cyl" });
    const bus = balance.reviews.find(r => r.commitmentId === "r-07-6-2")!;
    expect(bus.components.find(c => c.id === "incidencias")?.status).toBe("unresolved");
    expect(bus.components.find(c => c.id === "incidencias")?.finding).toContain("no demuestra que el problema continúe");
    expect(bus.components.find(c => c.id === "norma")?.finding).toContain("no es una creación del mandato");
  });
  it("no convierte una convocatoria en pagos ni omite la modificación de justificación", () => {
    const r = getTerritorialBalance("r-07")!.reviews.find(r => r.commitmentId === "r-07-13-17")!;
    expect(r.components.find(c => c.id === "convocatoria")?.status).toBe("documented");
    expect(r.components.find(c => c.id === "resultado")?.status).toBe("unresolved");
    expect(r.components.find(c => c.id === "condiciones")?.finding).toContain("disponibilidad presupuestaria");
    expect(r.components.find(c => c.id === "pago-matricula")?.finding).toContain("acreditación posterior");
    expect(r.components.find(c => c.id === "pago-matricula")?.citations[0].sourceId).toBe("cyl-university-modification");
  });
  it("no da por vencido el primer presupuesto ni atribuye hipotecas antiguas al nuevo aval", () => {
    const r = getTerritorialBalance("r-07")!.reviews.find(r => r.commitmentId === "r-07-15-3")!;
    expect(r.periodNote).toContain("primer presupuesto en 2027");
    expect(r.components.find(c => c.id === "anuncio")?.finding).toContain("mezcla mandatos");
    expect(r.components.find(c => c.id === "aplicacion")?.status).toBe("unresolved");
    expect(r.components.some(c => c.status === "deadline-missed")).toBe(false);
  });
});
