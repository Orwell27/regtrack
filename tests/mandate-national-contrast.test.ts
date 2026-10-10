import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { XMLParser } from "fast-xml-parser";
import collection from "@/data/mandate/commitments.json";
import inventory from "@/data/mandate/inventory.json";
import { getMandateSnapshot } from "@/lib/mandate/data";
import { answerMandate, boundMandateAnswer } from "@/lib/mandate/answer";

const ids = ["c-52", "c-69", "c-104", "c-110", "c-127", "c-163", "c-177", "c-184"];
const snapshot = getMandateSnapshot();
const find = (id: string) => snapshot.commitments.find(item => item.id === id)!;
const original = (id: string) => JSON.stringify(new XMLParser().parse(readFileSync(`data/mandate/evidence/expansion/${id}.xml`, "utf8")).documento.texto).replace(/\s+/g, " ");

describe("contraste nacional con periodos, ámbito y correcciones oficiales", () => {
  it("conserva las ocho promesas y no fabrica historia ni revisión independiente", () => {
    for (const id of ids) {
      const raw = collection.commitments.find(item => item.id === id)!;
      const row = inventory.records.find(item => item.id === id)!;
      expect(raw.text).toBe(row.text);
      expect(raw.origin).toBe(row.origin);
      expect(raw.assessmentHistory).toEqual([]);
      expect(raw.review.history).toEqual([]);
      expect(find(id).originDate).toBeNull();
      expect(find(id).governmentAssessment.date).toBe("2026-06-30");
      expect(find(id).quality.components.some(part => part.state === "unknown")).toBe(true);
    }
    expect(snapshot.calibration.independentReview).toBe("pending");
    expect(snapshot.calibration.accuracyRate).toBeNull();
  });

  it("publica la evaluación del IMV sin mezclar territorio, no solicitud y reforma posterior", () => {
    const item = find("c-52");
    expect(item.assessment.verdict).toBe("partial");
    expect(item.assessment.observed).toContain("41,8 % al 44,2 %");
    expect(item.assessment.observed).toContain("sin País Vasco ni Navarra");
    expect(item.assessment.observed).toContain("no una tasa de denegaciones");
    expect(item.assessment.practicalEffect).toContain("2026 no puede evaluarse con resultados de 2025");
    const source = item.evidence.find(e => e.producer.includes("AIReF"))!;
    expect(source.role).toBe("indicator");
    expect(source.locator).toContain("26–28");
    expect(item.quality.components[1]).toMatchObject({ stage: "outcome", state: "documented", evidenceIds: [source.id] });
    expect(item.quality.components[2].state).toBe("unknown");
  });

  it("lee la corrección del calendario de asilo y no usa el original desactualizado", () => {
    expect(original("DOUE-L-2024-80742")).toContain("1 de julio de 2026");
    expect(original("DOUE-L-2025-81799")).toContain("12 de junio de 2026");
    const item = find("c-127");
    expect(item.assessment.observed).toContain("12 de junio de 2026");
    expect(item.evidence.some(e => e.url.includes("DOUE-L-2025-81799"))).toBe(true);
    expect(item.evidence.some(e => e.url.includes("DOUE-L-2026-81426"))).toBe(true);
    expect(item.assessment.temporalScope).toContain("posterior al corte gubernamental");
    expect(item.quality.components.at(-1)?.state).toBe("unknown");
  });

  it("preserva los plazos abiertos de alimentación, atención al cliente y electricidad", () => {
    expect(original("BOE-A-2025-7659")).toContain("veinticuatro meses");
    expect(find("c-69").assessment.observed).toContain("16 de abril de 2027");
    expect(original("BOE-A-2025-26698")).toContain("doce meses desde su entrada en vigor");
    expect(find("c-177").assessment.observed).toContain("todavía no ha terminado");
    expect(original("DOUE-L-2024-80974")).toContain("17 de julio de 2027");
    expect(find("c-163").assessment.observed).toContain("2029");
    for (const id of ["c-69", "c-177", "c-163"]) expect(find(id).assessment.verdict).toBe("measures");
  });

  it("no universaliza el impuesto ni convierte financiación y nombramientos en resultados globales", () => {
    expect(original("BOE-A-2024-26694")).toContain("dos de los cuatro");
    expect(find("c-110").assessment.observed).toContain("750 millones");
    expect(find("c-110").assessment.observed).toContain("No establece un tipo universal");
    expect(find("c-104").assessment.observed).toContain("diez a propuesta del Congreso y diez del Senado");
    expect(find("c-104").quality.components[1].state).toBe("unknown");
    expect(find("c-184").assessment.observed).toContain("no acredita por sí solo gasto ejecutado");
    expect(find("c-184").quality.components[2].state).toBe("unknown");
  });

  it("el lector recupera fuentes y límites de la ampliación", () => {
    for (const [question, id] of [["Ingreso Mínimo Vital", "c-52"], ["servicios de atención a la clientela", "c-177"], ["Pacto Europeo de Migración y Asilo", "c-127"]]) {
      const answer = boundMandateAnswer(answerMandate(snapshot, question));
      expect(answer.commitmentIds, question).toContain(id);
      for (const paragraph of answer.paragraphs) for (const citation of paragraph.citations) expect(answer.sources.some(source => source.id === citation)).toBe(true);
    }
  });
});
