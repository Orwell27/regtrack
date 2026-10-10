import { describe, expect, it } from "vitest";
import collection from "@/data/mandate/commitments.json";
import calibration from "@/data/mandate/calibration.json";
import { getMandateSnapshot } from "@/lib/mandate/data";
import { validateMandateSnapshot } from "@/lib/mandate/validate";
import { answerMandate, boundMandateAnswer } from "@/lib/mandate/answer";

const snapshot = () => structuredClone(getMandateSnapshot());

describe("calibración editorial y límites de la evidencia", () => {
  it("amplía a treinta y ocho promesas y conserva las versiones anteriores sin fabricar exactitud", () => {
    const data = snapshot();
    expect(data.calibration.accuracyRate).toBeNull();
    expect(data.calibration.independentReview).toBe("pending");
    expect(data.calibration.blind).toBe(false);
    expect(data.calibration.selection.selectedCount).toBe(38);
    expect(calibration.audits).toHaveLength(38);
    expect(new Set(calibration.audits.map(audit => audit.commitmentId)).size).toBe(38);
    expect(data.commitments.flatMap(item => item.quality.components)).toHaveLength(82);
    expect(collection.commitments.filter(item => item.assessmentHistory.length)).toHaveLength(30);
    for (const item of collection.commitments.filter(item => item.assessmentHistory.length)) {
      const previous = item.assessmentHistory[0];
      expect(previous.revision).toBe("2026-10-10-v1");
      const audit = calibration.audits.find(audit => audit.commitmentId === item.id)!;
      if (audit.correction) {
        expect(audit.correction.before, item.id).toEqual(previous.assessment);
        expect(audit.correction.after, item.id).toEqual(item.assessment);
      } else {
        for (const field of ["expected", "observed", "practicalEffect", "missingEvidence", "temporalScope", "scope", "verdict", "reviewedAt"] as const) {
          expect(item.assessment[field], `${item.id}/${field}`).toEqual(previous.assessment[field]);
        }
        expect(item.assessment.evidenceSourceIds).toEqual(expect.arrayContaining(previous.assessment.evidenceSourceIds));
      }
      expect(item.assessment.verdict, item.id).toBe(previous.assessment.verdict);
    }
  });

  it.each([{ accuracyRate: 99 }, { blind: true }, { independentReview: "done" }])("rechaza atribuciones no medidas: %j", mutation => {
    const data = snapshot();
    Object.assign(data.calibration, mutation);
    expect(() => validateMandateSnapshot(data)).toThrow("no atribuir independencia o exactitud no medidas");
  });

  it("no acepta una declaración del mismo organismo como prueba directa ni cuenta dos notas como independientes", () => {
    const data = snapshot();
    const health = data.commitments.find(item => item.id === "c-65")!;
    const report = health.quality.components.find(part => part.state === "reported")!;
    expect(report).toBeDefined();
    expect(health.quality.challenge).toMatch(/mismo|misma|independiente/);
    report.state = "documented";
    expect(() => validateMandateSnapshot(data)).toThrow("afirmación directa basada solo en promesa o declaración");
  });

  it("rechaza afirmaciones sin fuente y referencias inexistentes; admite desconocimiento explícito", () => {
    const data = snapshot();
    const part = data.commitments[0].quality.components[0];
    part.evidenceIds = [];
    expect(() => validateMandateSnapshot(data)).toThrow("afirmación de componente sin evidencia");
    part.state = "unknown";
    expect(() => validateMandateSnapshot(data)).not.toThrow();
    part.evidenceIds = ["fuente-inventada"];
    expect(() => validateMandateSnapshot(data)).toThrow("componente con evidencia inexistente");
  });

  it("el historial debe coincidir con el texto nuevo visible y no puede añadir componentes al denominador", () => {
    const data = snapshot();
    const changed = data.commitments.find(item => item.quality.correction)!;
    changed.quality.correction!.changes[0].after = "Texto que no coincide con la ficha";
    expect(() => validateMandateSnapshot(data)).toThrow("historial de corrección incoherente");
    const wrongSelection = snapshot();
    wrongSelection.calibration.selection.selectedCount = 61;
    expect(() => validateMandateSnapshot(wrongSelection)).toThrow("universo de selección incoherente");
  });

  it("preserva evidencia de la iniciativa parlamentaria aunque no se alcanzó el objetivo en plazo", () => {
    const work = collection.commitments.find(item => item.id === "c-170")!;
    expect(work.assessment.verdict).toBe("not_met");
    expect(work.assessment.observed).toMatch(/devol|rechaz/);
    expect(work.review.evidence.some(entry => entry.sourceId.startsWith("congreso-jornada"))).toBe(true);
    const data = snapshot();
    data.commitments.find(item => item.id === "c-170")!.quality.components.forEach(part => { part.state = "unknown"; });
    expect(() => validateMandateSnapshot(data)).toThrow("objetivo fuera de plazo sin evidencia contraria");
  });

  it("hace visibles la corrección de becas y los límites de vivienda, permisos e impuesto", () => {
    const find = (id: string) => collection.commitments.find(item => item.id === id)!;
    expect(find("c-78").assessment.observed).toContain("umbrales");
    expect(find("c-78").assessment.observed).toMatch(/no.*convocatoria/i);
    expect(find("c-112").assessment.temporalScope).toMatch(/medio.*largo/);
    expect(find("c-139").assessment.observed).toMatch(/ocho años|8 años/);
    expect(find("c-87").assessment.verdict).toBe("inconclusive");
    expect(calibration.audits.filter(audit => audit.correction?.kind === "error").map(audit => audit.commitmentId)).toEqual(["c-78"]);
    expect(calibration.audits.filter(audit => audit.correction)).toHaveLength(8);
  });

  it("la consulta conserva límites de revisión y citas al acotar la respuesta", () => {
    const data = snapshot();
    for (const question of ["¿Qué está incumplido?", "¿Cómo me afectan los permisos para cuidar?", "¿Qué pasa con las viviendas públicas?"]) {
      const answer = boundMandateAnswer(answerMandate(data, question));
      expect(answer.paragraphs.map(part => part.text).join(" ")).toContain("exactitud no medida");
      expect(answer.sources.length).toBeLessThanOrEqual(8);
      for (const paragraph of answer.paragraphs) for (const citation of paragraph.citations) expect(answer.sources.some(source => source.id === citation)).toBe(true);
    }
  });
});
