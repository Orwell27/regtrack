import { describe, expect, it } from "vitest";
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

  it("el lector devuelve las nuevas fuentes y sus límites sin perder las citas", () => {
    const snapshot = getMandateSnapshot();
    for (const [question, id] of [["Luchar contra el fraude, la evasión y la elusión fiscal", "c-136"], ["Mejorar la protección por desempleo", "c-143"]]) {
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
