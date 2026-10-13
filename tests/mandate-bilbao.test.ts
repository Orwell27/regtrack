import { describe, expect, it } from "vitest";
import { getTerritorialBalance } from "@/lib/mandate/territorial";
import { getCoverage } from "@/lib/mandate/coverage";
import { isCoverageComplete } from "@/lib/mandate/coverage-model";

describe("Bilbao conserva el origen de la copia y separa hechos, atribución e impacto", () => {
  it("importa 80 descripciones sin inventar seguimiento ni cerrar el balance", () => {
    const balance = getTerritorialBalance("m-48020")!;
    expect(balance.records).toHaveLength(80);
    expect(balance.records.every(r => r.programmeText && !r.governmentReport && !r.governmentState)).toBe(true);
    expect(balance.programmeCopy).toBe(true);
    expect(balance.sourceLabel).toContain("EAJ-PNV");
    expect(balance.textNote).toContain("no se ha comprobado igualdad de bytes");
    expect(balance.reviews).toHaveLength(2);
    expect(balance.reviews.flatMap(r => r.components)).toHaveLength(9);
    const coverage = getCoverage().find(r => r.id === balance.jurisdictionId)!;
    expect(coverage).toMatchObject({ imported: 80, reviewed: 2, independentlyReviewed: 0, originalInventoryComplete: false });
    expect(coverage.blockers.join(" ")).toContain("78 compromisos");
    expect(isCoverageComplete(coverage)).toBe(false);
    expect(JSON.stringify(balance)).not.toMatch(/snapshotPath|rawText|"spans"/);
    expect(Buffer.byteLength(JSON.stringify(balance))).toBeLessThan(150_000);
  });
  it("mantiene los matices del objetivo residencial y del horizonte digital", () => {
    const balance = getTerritorialBalance("m-48020")!;
    expect(balance.records.find(r => r.officialId === "6.3")?.programmeText).toContain("en torno a 200 nuevos recursos");
    expect(balance.records.find(r => r.officialId === "6.3")?.programmeText).toContain("unos 23 millones");
    expect(balance.records.find(r => r.officialId === "10.5")?.programmeText).toContain("Modernización Municipal 2030");
    expect(balance.reviews[1].components.find(c => c.id === "competencias")?.finding).toContain("tampoco se cuentan las 63 dos veces");
    expect(balance.reviews[1].components.find(c => c.id === "entregas-ejecucion")?.status).toBe("unresolved");
  });
  it("sitúa la adjudicación en 2021 y no convierte al organizador en auditor", () => {
    const balance = getTerritorialBalance("m-48020")!;
    expect(balance.reviews[0].components.find(c => c.id === "adjudicacion-previa")?.finding).toContain("anterior a 2023");
    expect(balance.reviews[0].components.find(c => c.id === "impacto")?.status).toBe("unresolved");
    expect(balance.sources.filter(s => s.family === "uefa")).toHaveLength(3);
    expect(new Set(balance.sources.map(s => s.family))).toEqual(new Set(["ayto-bilbao", "gob-euskadi", "uefa"]));
    expect(balance.sources.some(s => s.role === "control")).toBe(false);
    expect(balance.reviews.every(r => r.pending.join(" ").includes("humana independiente"))).toBe(true);
  });
  it("etiqueta las notas editoriales también cuando su función es registro o actuación", () => {
    const balance = getTerritorialBalance("m-48020")!;
    expect(balance.sources.filter(s => s.captureType === "bytes_originales")).toHaveLength(2);
    const notes = balance.sources.filter(s => s.captureType === "extracto_editorial");
    expect(notes).toHaveLength(4);
    const coverage = getCoverage().find(r => r.id === balance.jurisdictionId)!;
    for (const note of notes) {
      expect(coverage.sources.find(s => s.id === note.id)?.scopeNote).toContain("su huella no corresponde al documento original");
    }
  });
});
