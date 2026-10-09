import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import collection from "@/data/mandate/commitments.json";
import { getMandateSnapshot } from "@/lib/mandate/data";
import { validateMandateSnapshot } from "@/lib/mandate/validate";
import { answerMandate, boundMandateAnswer } from "@/lib/mandate/answer";

describe("revisión de las 30 promesas y efecto práctico", () => {
  it("cierra las 22 primeras revisiones sin perder las 8 anteriores ni llamar cumplimiento a cobertura", () => {
    expect(collection.commitments).toHaveLength(30);
    expect(new Set(collection.commitments.map(item => item.officialId)).size).toBe(30);
    expect(collection.commitments.filter(item => item.review.history[0].status === "sin_verificar")).toHaveLength(22);
    for (const item of collection.commitments) {
      expect(item.review.history[0].asOf).toBe("2026-10-07");
      expect(item.review.asOf).toBe("2026-10-10");
      expect(item.review.status).not.toBe("sin_verificar");
      expect(item.assessment.evidenceSourceIds.length).toBeGreaterThan(0);
      for (const id of item.assessment.evidenceSourceIds) {
        expect(collection.sources.some(source => source.id === id), `${item.id}: ${id}`).toBe(true);
        expect(item.review.evidence.some(evidence => evidence.sourceId === id)).toBe(true);
      }
    }
    expect(collection.commitments.filter(item => item.assessment.verdict === "not_met").map(item => item.id)).toEqual(["c-170"]);
  });
  it("fundamenta el plazo incumplido en la promesa y en la ley al vencimiento y al corte", () => {
    const item = collection.commitments.find(item => item.id === "c-170")!;
    expect(item.officialDeadline?.year).toBe(2025);
    expect(item.assessment.evidenceSourceIds).toEqual(expect.arrayContaining(["coalicion-2023", "estatuto-2025-12-31", "estatuto-2026-10-10"]));
    for (const id of ["estatuto-2025-12-31", "estatuto-2026-10-10"]) {
      const source = collection.sources.find(source => source.id === id)!;
      const text = readFileSync(source.snapshotPath, "utf8").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
      expect(text).toContain("cuarenta horas semanales de trabajo efectivo de promedio en cómputo anual");
    }
  });
  it("no permite una evaluación sin efecto práctico, con fuentes inexistentes o fecha posterior al corte", () => {
    const noEffect = structuredClone(getMandateSnapshot());
    noEffect.commitments[0].assessment.practicalEffect = "";
    expect(() => validateMandateSnapshot(noEffect)).toThrow("evaluación sin practicalEffect");
    const noSource = structuredClone(getMandateSnapshot());
    noSource.commitments[0].assessment.evidenceIds = ["inventada"];
    expect(() => validateMandateSnapshot(noSource)).toThrow("evaluación con evidencia inexistente");
    const future = structuredClone(getMandateSnapshot());
    future.commitments[0].assessment.reviewedAt = "2027-01-01";
    expect(() => validateMandateSnapshot(future)).toThrow("fechas de revisión incompatibles");
  });
  it("recupera las conclusiones correctas y conserva sus límites al acotar la respuesta", () => {
    const snapshot = getMandateSnapshot();
    for (const [question, id, expected] of [
      ["¿Qué está incumplido?", "c-170", "cuarenta horas"],
      ["¿Cómo me afectan los permisos para cuidar?", "c-139", "diecinueve semanas"],
      ["¿Qué pasa con las viviendas públicas?", "c-112", "184.000"],
      ["¿Cuál es el cumplimiento del salario mínimo?", "c-107", "1.221"],
      ["¿Está incumplida la promesa del salario mínimo?", "c-107", "1.221"],
    ]) {
      const answer = answerMandate(snapshot, question);
      expect(answer.commitmentIds, question).toContain(id);
      expect(answer.paragraphs.map(p => p.text).join(" "), question).toContain(expected);
      const bounded = boundMandateAnswer(answer);
      expect(bounded.paragraphs.some(p => p.text.includes("Qué falta:")), question).toBe(true);
      expect(bounded.sources.length).toBeLessThanOrEqual(8);
      for (const paragraph of bounded.paragraphs) expect(paragraph.citations.every(id => bounded.sources.some(source => source.id === id))).toBe(true);
    }
  });
  it("no presenta un anteproyecto, una ayuda aprobada o una observación como logro íntegro", () => {
    const snapshot = getMandateSnapshot();
    const find = (id: string) => snapshot.commitments.find(item => item.id === id)!;
    expect(find("c-123").assessment.observed).toContain("Un anteproyecto no se presenta como ley vigente");
    expect(find("c-10").assessment.observed).toContain("no de ejecución");
    expect(find("c-33").assessment.verdict).toBe("inconclusive");
    expect(find("c-32").assessment.missingEvidence).toContain("−2,2 %");
    expect(find("c-32").assessment.missingEvidence).toContain("−2,4 %");
    expect(find("c-187").assessment.observed).toContain("derogó");
    expect(find("c-186").assessment.observed).toContain("RDL 29/2026");
  });
});
