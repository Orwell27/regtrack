import { describe, expect, it } from "vitest";
import { getTerritorialBalance } from "@/lib/mandate/territorial";
import { validateTerritorialBalance } from "@/lib/mandate/territorial-model";
import { getCoverage } from "@/lib/mandate/coverage";
import { isCoverageComplete } from "@/lib/mandate/coverage-model";

describe("Melilla: promesas originales y límites del contraste", () => {
  it("separa inventario, revisión parcial y procedencia de los documentos", () => {
    const balance = getTerritorialBalance("r-19")!;
    expect(balance).toMatchObject({ level: "autonomous-city", inventoryTotal: 816 });
    expect(balance.reviews).toHaveLength(3);
    expect(balance.reviews.flatMap(r => r.components)).toHaveLength(13);
    const coverage = getCoverage().find(r => r.id === "r-19")!;
    expect(coverage).toMatchObject({ imported: 816, reviewed: 3, independentlyReviewed: 0 });
    expect(coverage.blockers.join(" ")).toContain("813");
    expect(isCoverageComplete(coverage)).toBe(false);
    expect(balance.sources).toHaveLength(9);
    expect(balance.sources.every(s => s.captureType === "bytes_originales")).toBe(true);
    expect(new Set(balance.sources.map(s => s.family))).toEqual(new Set(["pp-melilla", "ciudad-melilla", "ugr", "rtve"]));
    expect(balance.sources.filter(s => s.role === "control")).toHaveLength(0);
    expect(JSON.stringify(balance)).not.toMatch(/rawText|snapshotPath|extractionSha256/);
  });
  it("mantiene las dos propuestas 388 y condiciones sin número fuera del recuento", () => {
    const balance = getTerritorialBalance("r-19")!;
    expect(balance.records.filter(r => r.officialId === "388").map(r => r.id)).toEqual(["r-19-388", "r-19-388-bis"]);
    expect(balance.contextBlocks).toHaveLength(88);
    expect(balance.contextBlocks?.some(c => c.text.includes("5000 universitarios") && c.text.includes("de inmediato"))).toBe(true);
    expect(balance.sources.find(s => s.id === balance.sourceId)?.publicationDate).toBeNull();
    expect(balance.textNote).toContain("no fecha cada promesa ni su ejecución");
    for (const mutate of [
      () => { balance.contextBlocks![0].page = 0; },
      () => { balance.contextBlocks![0].page = 9; balance.contextBlocks![0].text = " "; },
      () => { balance.contextBlocks![0].text = "Contexto"; balance.contextBlocks![1].id = balance.contextBlocks![0].id; },
    ]) {
      mutate();
      expect(() => validateTerritorialBalance(balance)).toThrow("Contexto territorial inválido");
    }
  });
  it("no convierte una convocatoria, el presupuesto o el plazo anunciado en apertura", () => {
    const balance = getTerritorialBalance("r-19")!;
    const review = balance.reviews.find(r => r.commitmentId === "r-19-81")!;
    expect(review.components.find(c => c.id === "contratacion")?.finding).toContain("no el acta de la sesión ni una adjudicación definitiva");
    expect(review.components.find(c => c.id === "inicio")?.status).toBe("reported");
    expect(review.components.find(c => c.id === "contraste")?.finding).toContain("edificio principal del Campus, no a Correos");
    expect(review.components.find(c => c.id === "resultado")?.status).toBe("unresolved");
    expect(balance.sources.find(s => s.id === "melilla-correos-tender-2024")?.family).toBe("ciudad-melilla");
  });
  it("conserva datos ausentes, denominadores y límites de independencia", () => {
    const balance = getTerritorialBalance("r-19")!;
    const quality = balance.reviews.find(r => r.commitmentId === "r-19-784")!;
    expect(quality.components.find(c => c.id === "lagunas")?.finding).toContain("Fuerte Rostrogordo, Pabellón Javier Imbroda y Ludotecas");
    expect(quality.components.find(c => c.id === "quejas")?.finding).toContain("No se suman esos subconjuntos al total");
    const survey = balance.reviews.find(r => r.commitmentId === "r-19-785")!;
    const finding = survey.components.find(c => c.id === "unidad")!.finding;
    for (const fragment of ["4,81 sobre 5", "1.197", "1.203", "4,80", "No se convierte esa media en porcentaje"]) expect(finding).toContain(fragment);
    expect(survey.components.find(c => c.id === "independencia")?.status).toBe("unresolved");
    expect(balance.reviews.every(r => r.pending.join(" ").includes("humana independiente"))).toBe(true);
  });
});
