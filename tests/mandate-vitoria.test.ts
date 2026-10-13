import { describe, expect, it } from "vitest";
import { getTerritorialBalance } from "@/lib/mandate/territorial";
import { validateTerritorialBalance } from "@/lib/mandate/territorial-model";
import { getCoverage } from "@/lib/mandate/coverage";
import { isCoverageComplete } from "@/lib/mandate/coverage-model";

describe("Vitoria: original y seguimiento separados", () => {
  it("publica los cien originales sin inflar las revisiones con porcentajes municipales", () => {
    const balance = getTerritorialBalance("m-01059")!;
    expect(balance.records).toHaveLength(100);
    expect(balance.reviews).toHaveLength(2);
    expect(balance.records.every(r => r.programmeText && r.governmentReport)).toBe(true);
    expect(balance.records.some(r => r.governmentReport?.percentage === 100 && !balance.reviews.some(review => review.commitmentId === r.id))).toBe(true);
    const coverage = getCoverage().find(item => item.id === "m-01059")!;
    expect(coverage).toMatchObject({ imported: 100, reviewed: 2, independentlyReviewed: 0 });
    expect(isCoverageComplete(coverage)).toBe(false);
    const json = JSON.stringify(balance);
    expect(json).not.toMatch(/snapshotPath|rawText|expectedText/);
    expect(Buffer.byteLength(json)).toBeLessThan(1_200_000);
  });
  it("preserva condiciones originales omitidas del título posterior y la doble numeración", () => {
    const balance = getTerritorialBalance("m-01059")!;
    const patios = balance.records.find(r => r.officialId === "5.8")!;
    expect(patios.text).toContain("SOMBRAS");
    expect(patios.governmentReport?.title.toLowerCase()).not.toContain("sombras");
    const zbe = balance.records.find(r => r.officialId === "2.17")!;
    expect(zbe).toMatchObject({ page: 50, governmentReport: { officialId: "2.3.3", percentage: 75 } });
    expect(zbe.governmentReport?.text).toContain("Redacción del plan");
  });
  it("conserva decisiones posteriores y no convierte una impugnación en sentencia", () => {
    const review = getTerritorialBalance("m-01059")!.reviews[0];
    expect(review.components.find(c => c.id === "decision-posterior")?.finding).toContain("23 de agosto de 2026");
    expect(review.components.find(c => c.id === "contraste-judicial")).toMatchObject({ status: "unresolved" });
    expect(review.components.find(c => c.id === "resultados-declarados")).toMatchObject({ status: "reported" });
  });
  it("mantiene un presupuesto de proyecto separado del gasto y de la apertura", () => {
    const review = getTerritorialBalance("m-01059")!.reviews[1];
    expect(review.components.find(c => c.id === "proyecto-mariturri")?.finding).toContain("IVA incluido");
    expect(review.components.find(c => c.id === "proyecto-mariturri")?.finding).toContain("No son gasto ejecutado");
    expect(review.components.find(c => c.id === "inicio-aldaia")?.status).toBe("reported");
    expect(review.components.at(-1)?.status).toBe("unresolved");
  });
  it("rechaza seguimiento ajeno, enlaces ejecutables, porcentajes imposibles y texto vacío", () => {
    for (const mutation of [
      (r: NonNullable<ReturnType<typeof getTerritorialBalance>>["records"][number]) => { r.programmeText = ""; },
      (r: NonNullable<ReturnType<typeof getTerritorialBalance>>["records"][number]) => { r.governmentReport!.sourceId = "vitoria-programme-2023"; },
      (r: NonNullable<ReturnType<typeof getTerritorialBalance>>["records"][number]) => { r.governmentReport!.url = "https://example.org/#another"; },
      (r: NonNullable<ReturnType<typeof getTerritorialBalance>>["records"][number]) => { r.governmentReport!.percentage = 101; },
      (r: NonNullable<ReturnType<typeof getTerritorialBalance>>["records"][number]) => { r.governmentReport!.links = ["javascript:alert(1)"]; },
    ]) {
      const balance = structuredClone(getTerritorialBalance("m-01059")!);
      mutation(balance.records[0]);
      expect(() => validateTerritorialBalance(balance)).toThrow();
    }
  });
});
