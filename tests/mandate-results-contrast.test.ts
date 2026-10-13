import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import previous from "@/data/mandate/evidence/contrast-2026-10-13/previous-reviews.json";
import collection from "@/data/mandate/commitments.json";
import { getMandateSnapshot } from "@/lib/mandate/data";
import { validateMandateSnapshot } from "@/lib/mandate/validate";
import { answerMandate, boundMandateAnswer } from "@/lib/mandate/answer";

describe("resultados nacionales: nuevas fuentes sin fabricar cumplimiento", () => {
  it("conserva exactamente las revisiones sustituidas y la declaración del Gobierno", () => {
    for (const old of previous) {
      const item = collection.commitments.find(c => c.id === old.commitmentId)!;
      expect(item.assessmentHistory.at(-1)?.assessment).toEqual(old.assessment);
      const { history: oldHistory, ...oldReview } = old.review;
      expect(item.review.history.slice(0, -1)).toEqual(oldHistory);
      expect(item.review.history.at(-1)).toEqual(oldReview);
      expect(item.governmentAssessment.asOf).toBe("2026-06-30");
    }
    expect(collection.selection.totalImported).toBe(46);
    expect(collection.selection.totalAvailable).toBe(203);
  });

  it("impide convertir el balance propio de AEAT en evidencia independiente", () => {
    const snapshot = structuredClone(getMandateSnapshot());
    const item = snapshot.commitments.find(c => c.id === "c-136")!;
    expect(item.assessment.verdict).toBe("measures");
    const report = item.quality.components.find(p => p.id === "c-136-part-3")!;
    expect(report.state).toBe("reported");
    expect(item.quality.components.some(p => p.state === "unknown")).toBe(true);
    report.state = "documented";
    expect(() => validateMandateSnapshot(snapshot)).toThrow("afirmación directa basada solo en promesa o declaración");
  });

  it("permite el resultado parcial de cobertura manteniendo pendiente la suficiencia", () => {
    const item = getMandateSnapshot().commitments.find(c => c.id === "c-143")!;
    expect(item.assessment.verdict).toBe("partial");
    expect(item.quality.components.find(p => p.id === "c-143-part-3")?.state).toBe("documented");
    expect(item.quality.components.find(p => p.id === "c-143-part-2")?.state).toBe("unknown");
    expect(item.assessment.observed).toContain("+6,40 puntos");
    expect(item.assessment.practicalEffect).toContain("no todos los parados de la EPA");
    expect(item.assessment.observed).toContain("incluye cotizaciones");
    expect(item.assessment.temporalScope).toContain("datos provisionales");
  });

  it("recalcula la brecha EPA desde los originales y conserva el estancamiento interanual", () => {
    const csv = readFileSync("data/mandate/evidence/contrast-2026-10-13/epa-tasas-sexo-65349.csv", "utf8");
    const rows = csv.trim().split(/\r?\n/).slice(1).map(line => line.split(";"));
    const value = (sex: string, rate: string, period: string) => {
      const found = rows.filter(r => r[0] === sex && r[1] === "Total Nacional" && r[2].startsWith(rate) && r[3] === period);
      expect(found).toHaveLength(1);
      return Number(found[0][4].replace(",", "."));
    };
    const gap = (rate: string, period: string) => Number((value("Hombres", rate, period) - value("Mujeres", rate, period)).toFixed(2));
    expect(gap("Tasa de empleo", "2023T3")).toBe(11);
    expect(gap("Tasa de empleo", "2023T4")).toBe(10.21);
    expect(gap("Tasa de empleo", "2025T2")).toBe(9.92);
    expect(gap("Tasa de empleo", "2026T2")).toBe(9.92);
    expect(gap("Tasa de actividad", "2025T2")).toBe(9.54);
    expect(gap("Tasa de actividad", "2026T2")).toBe(9.58);
    expect(-gap("Tasa de paro", "2023T3")).toBe(3.34);
    expect(-gap("Tasa de paro", "2026T2")).toBe(2.18);
    const px = readFileSync("data/mandate/evidence/contrast-2026-10-13/epa-tasas-sexo-65349.px", "latin1");
    expect(px).toContain('CREATION-DATE="20260728"');
    expect(px).toContain("base 2021");
    const item = getMandateSnapshot().commitments.find(c => c.id === "c-33")!;
    expect(item.assessment.verdict).toBe("partial");
    expect(item.assessment.observed).toContain("igual que");
    expect(item.assessment.missingEvidence).toContain("estadísticamente significativas");
    expect(item.quality.components.some(p => p.state === "unknown")).toBe(true);
  });

  it("mantiene visible la discrepancia ICO y evita sumar dos niveles territoriales", () => {
    const rows = readFileSync("data/mandate/evidence/contrast-2026-10-13/ico-vivienda-2025.csv", "latin1").split(/\r?\n/).map(line => line.split(";"));
    const num = (s: string) => Number(s.replaceAll(".", ""));
    const total = rows.find(r => r[0] === "Total general")!;
    expect(total.slice(45).map(num)).toEqual([1344387902, 255864390, 10454]);
    // Indices of the 18 aggregate rows (Ceuta/Melilla combined); province rows must not be added again.
    const regions = [3, 12, 16, 18, 20, 23, 25, 31, 41, 46, 49, 52, 57, 59, 61, 63, 65, 69];
    expect(regions.reduce((sum, i) => sum + num(rows[i][47]), 0)).toBe(10454);
    expect(num(rows[3][47])).toBe(3149);
    const data = structuredClone(getMandateSnapshot());
    const item = data.commitments.find(c => c.id === "c-17")!;
    expect(item.assessment.verdict).toBe("measures");
    expect(item.assessment.observed).toContain("10.453");
    expect(item.assessment.observed).toContain("10.454");
    expect(item.assessment.practicalEffect).toContain("no equivalen a 10.453 jóvenes");
    const report = item.quality.components.find(p => p.id === "c-17-part-3")!;
    expect(report.state).toBe("reported");
    report.state = "documented";
    expect(() => validateMandateSnapshot(data)).toThrow("afirmación directa basada solo en promesa o declaración");
  });

  it("el lector devuelve las nuevas fuentes y sus límites sin perder las citas", () => {
    const snapshot = getMandateSnapshot();
    for (const [question, id] of [["Luchar contra el fraude, la evasión y la elusión fiscal", "c-136"], ["Mejorar la protección por desempleo", "c-143"], ["Vivienda para jóvenes", "c-17"], ["Brecha de género en el empleo", "c-33"]]) {
      const answer = boundMandateAnswer(answerMandate(snapshot, question));
      expect(answer.commitmentIds).toContain(id);
      expect(answer.paragraphs.some(p => p.text.includes("Qué falta:"))).toBe(true);
      for (const p of answer.paragraphs) for (const citation of p.citations) {
        expect(answer.sources.some(s => s.id === citation)).toBe(true);
      }
      expect(JSON.stringify(answer)).not.toMatch(/snapshotPath|previous-reviews|\.artifacts/);
    }
  });
});
