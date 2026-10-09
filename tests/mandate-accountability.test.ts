import { describe, expect, it } from "vitest";
import { getMandateSnapshot } from "@/lib/mandate/data";
import { getMandateAccountability } from "@/lib/mandate/accountability";
import { answerMandate, boundMandateAnswer, mandateAnswerStories } from "@/lib/mandate/answer";

describe("honestidad y cobertura documental separadas", () => {
  it("no convierte las treinta revisiones en cumplimiento ni honestidad", () => {
    const summary = getMandateAccountability(getMandateSnapshot().commitments);
    expect(summary).toEqual({ total: 30, documented: 18, partial: 12, pending: 0, contrasted: 30, coveragePercent: 100, fulfilmentPercent: null });
  });
  it("ni una selección totalmente contrastada permite deducir cumplimiento", () => {
    const reviewed = getMandateSnapshot().commitments.filter((item) => item.review.status !== "pending");
    const summary = getMandateAccountability(reviewed);
    expect(summary.coveragePercent).toBe(100);
    expect(summary.fulfilmentPercent).toBeNull();
    expect(getMandateAccountability([]).coveragePercent).toBeNull();
  });
  it("responde preguntas de honestidad con límites, estados reales y ejemplos trazables", () => {
    const snapshot = getMandateSnapshot();
    for (const question of ["¿Cómo se mide la honestidad?", "¿Qué compromisos están cumplidos?", "Indicador de cumplimiento"]) {
      const answer = answerMandate(snapshot, question);
      expect(answer.mode).toBe("documental");
      expect(answer.paragraphs[0].text).toContain("sigue sin calcular");
      expect(answer.paragraphs[0].text).toContain("100 % (30 de 30)");
      expect(answer.paragraphs[0].text).toContain("no es un porcentaje de honestidad");
      expect(answer.sources.length).toBeGreaterThan(0);
      const bounded = boundMandateAnswer(answer);
      expect(bounded.paragraphs[0].text).toContain("Resumen del archivo RegTrack");
      for (const paragraph of bounded.paragraphs) expect(paragraph.citations.every((id) => bounded.sources.some((source) => source.id === id))).toBe(true);
      for (const story of mandateAnswerStories(bounded)) {
        expect(story.editorialContext).toContain("Resumen interno calculado por RegTrack, no atribuirlo a esta fuente");
        expect(story.editorialContext).toContain("100 % (30 de 30)");
        expect(story.excerpt).not.toContain("100 % (30 de 30)");
      }
    }
  });
  it("respeta el tema y no inventa una valoración cuando no hay fichas", () => {
    const snapshot = getMandateSnapshot();
    const housing = snapshot.commitments.filter((item) => item.topics.includes("vivienda"));
    const answer = answerMandate(snapshot, "Honestidad", "vivienda");
    expect(answer.paragraphs[0].text).toContain(`${housing.length} compromisos`);
    expect(answer.paragraphs[0].text).toContain("en el tema seleccionado");
    expect(answer.commitmentIds.every((id) => housing.some((item) => item.id === id))).toBe(true);
    expect(answerMandate(snapshot, "Honestidad", "sin-datos").mode).toBe("no-evidence");
    expect(answerMandate(snapshot, "¿A quién votar por honestidad?").mode).toBe("no-evidence");
  });
  it("una pregunta de cumplimiento concreta conserva las fichas pertinentes", () => {
    const answer = answerMandate(getMandateSnapshot(), "¿Cuál es el cumplimiento de la promesa del salario mínimo?");
    expect(answer.commitmentIds).toContain("c-107");
    expect(answer.commitmentIds).not.toContain("c-17");
    expect(answer.commitmentIds).not.toContain("c-74");
  });
});
