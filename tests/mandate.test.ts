import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { getMandateSnapshot } from "@/lib/mandate/data";
import { validateMandateSnapshot } from "@/lib/mandate/validate";
import { answerMandate, boundMandateAnswer, mandateAnswerStories } from "@/lib/mandate/answer";
import { electionCountdown } from "@/lib/mandate/model";

describe("balance documental con evidencia real", () => {
  it("valida una selección explícita sin fabricar estados de cumplimiento", () => {
    const snapshot = getMandateSnapshot();
    expect(snapshot.commitments).toHaveLength(30);
    expect(snapshot.indicators.length).toBeGreaterThanOrEqual(12);
    expect(snapshot.commitments.filter((item) => item.review.status !== "pending").length).toBeGreaterThanOrEqual(6);
    expect(snapshot.methodology.join(" ")).toContain("No demuestra correlación");
    for (const item of snapshot.commitments) expect(item.governmentAssessment.label).toMatch(/sin calificación/i);
  });
  it("conserva la captura BOE que acredita la fecha del contador", () => {
    const snapshot = getMandateSnapshot();
    const raw = readFileSync("data/mandate/evidence/election/BOE-A-2026-20742.xml", "utf8");
    expect(createHash("sha256").update(raw).digest("hex")).toBe(snapshot.election.source.sha256);
    expect(raw).toMatch(/29\s+de\s+noviembre\s+de\s+2026/);
    expect(snapshot.election.date).toBe("2026-11-29");
  });
  it.each([
    ["2026-10-07T10:00:00Z", 53, "before"],
    ["2026-11-28T22:59:00Z", 1, "before"],
    ["2026-11-28T23:30:00Z", 0, "today"],
    ["2026-11-29T23:01:00Z", 0, "after"],
  ])("cuenta días naturales en Madrid: %s", (date, days, phase) => {
    expect(electionCountdown(getMandateSnapshot().election, new Date(date))).toEqual({ days, phase });
  });
  it("rechaza un contraste sin documento adicional por la razón correcta", () => {
    const snapshot = structuredClone(getMandateSnapshot());
    const item = snapshot.commitments.find((item) => item.review.status !== "pending")!;
    item.evidence = item.evidence.filter((source) => source.role !== "action");
    expect(() => validateMandateSnapshot(snapshot)).toThrow("contraste sin evidencia adicional");
  });
  it("rechaza comentarios con fuentes inexistentes y series sin unidad", () => {
    const snapshot = structuredClone(getMandateSnapshot());
    snapshot.commentary[0].indicatorIds = ["missing"];
    expect(() => validateMandateSnapshot(snapshot)).toThrow("interpretación con referencia inexistente");
    const another = structuredClone(getMandateSnapshot());
    another.indicators[0].unit = "";
    expect(() => validateMandateSnapshot(another)).toThrow("unidad");
  });
  it("no convierte ausencias en ceros y rechaza bases externas o referencias inseguras", () => {
    const snapshot = structuredClone(getMandateSnapshot());
    snapshot.indicators[0].observations.at(-1)!.value = null;
    snapshot.indicators[0].latest.value = null;
    expect(() => validateMandateSnapshot(snapshot)).not.toThrow();
    snapshot.indicators[0].baseline.value = 987654321;
    expect(() => validateMandateSnapshot(snapshot)).toThrow("base fuera de la serie");
    const another = structuredClone(getMandateSnapshot());
    another.election.source.url = "javascript:alert(1)";
    expect(() => validateMandateSnapshot(another)).toThrow("URL de fuente no pública");
  });
  it("responde con fichas, fechas y citas del archivo, sin una nota global", () => {
    const snapshot = getMandateSnapshot();
    const answer = answerMandate(snapshot, "¿Qué está documentado sobre vivienda?");
    expect(answer.mode).toBe("documental");
    expect(answer.commitmentIds.length).toBeGreaterThan(0);
    expect(answer.indicatorIds.length).toBeGreaterThan(0);
    const ids = new Set(answer.sources.map((source) => source.id));
    for (const paragraph of answer.paragraphs) {
      expect(paragraph.citations.length).toBeGreaterThan(0);
      expect(paragraph.citations.every((id) => ids.has(id))).toBe(true);
    }
    expect(answer.note).toContain("no una prueba de causalidad");
    expect(answerMandate(snapshot, "astrofisicainexistente").mode).toBe("no-evidence");
    expect(answerMandate(snapshot, "¿Es honesto el presidente?").note).toContain("no califica la honestidad");
    expect(answerMandate(snapshot, "¿Cuándo son las elecciones?").sources[0].id).toBe(snapshot.election.source.id);
    const pending = answerMandate(snapshot, "¿Qué falta por revisar?");
    expect(pending.mode).toBe("documental");
    expect(pending.note).toContain("0 compromisos pendientes de primera revisión");
    expect(pending.commitmentIds.every((id) => snapshot.commitments.find((item) => item.id === id)!.assessment.verdict === "inconclusive")).toBe(true);
  });
  it("prioriza las series de deuda y conserva avance y límites de renta nominal", () => {
    const snapshot = getMandateSnapshot();
    const debt = answerMandate(snapshot, "¿Se ha reducido la deuda?");
    expect(debt.indicatorIds).toEqual(expect.arrayContaining(["debt-stock", "debt-gdp"]));
    const bounded = boundMandateAnswer(debt);
    expect(bounded.indicatorIds).toEqual(expect.arrayContaining(["debt-stock", "debt-gdp"]));
    expect(bounded.sources.length).toBeLessThanOrEqual(8);
    expect(bounded.paragraphs.every((paragraph) => paragraph.citations.every((id) => bounded.sources.some((source) => source.id === id)))).toBe(true);
    const inflation = answerMandate(snapshot, "¿Cuál es la inflación?");
    expect(inflation.paragraphs.map((item) => item.text).join(" ")).toContain("avance");
    const income = answerMandate(snapshot, "¿Ha mejorado el poder adquisitivo?");
    expect(income.paragraphs.map((item) => item.text).join(" ")).toMatch(/nominal|no.*renta.*hogar|no.*renta.*mediana/);
  });
  it("mantiene contexto editorial separado del extracto oficial y enlaza el comentario salarial correcto", () => {
    const snapshot = getMandateSnapshot();
    expect(snapshot.commentary.find((item) => item.id === "employment-context")!.commitmentIds).toContain("c-107");
    const answer = answerMandate(snapshot, "permisos para cuidar");
    for (const story of mandateAnswerStories(answer)) {
      expect(story.excerpt).not.toContain("Información del inventario del Gobierno (corte");
      expect(story.editorialContext).toContain("no es contenido literal");
    }
  });
});
