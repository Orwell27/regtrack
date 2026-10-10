import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { XMLParser } from "fast-xml-parser";
import collection from "@/data/mandate/commitments.json";
import inventory from "@/data/mandate/inventory.json";
import sources from "@/data/mandate/evidence/expansion/sources.json";
import { getMandateSnapshot } from "@/lib/mandate/data";
import { answerMandate, boundMandateAnswer } from "@/lib/mandate/answer";

const ids = ["c-20", "c-22", "c-154", "c-132", "c-126", "c-118", "c-191", "c-146"];
const snapshot = getMandateSnapshot();
const find = (id: string) => snapshot.commitments.find(item => item.id === id)!;
const original = (id: string) => {
  const source = sources.find(item => item.id === id)!;
  const xml = readFileSync(source.snapshotPath, "utf8");
  // Read the document body, not the nested <analisis><referencias><texto> metadata.
  const document = new XMLParser().parse(xml).documento;
  return JSON.stringify(document.texto).replace(/\s+/g, " ");
};

describe("ampliación documental con límites por componente", () => {
  it("conserva ocho filas exactas sin fabricar una revisión histórica ni fecha de origen", () => {
    expect(collection.commitments.filter(item => !item.assessmentHistory.length).map(item => item.id).sort()).toEqual([...ids].sort());
    for (const id of ids) {
      const raw = collection.commitments.find(item => item.id === id)!;
      const imported = inventory.records.find(item => item.id === id)!;
      expect(raw.text).toBe(imported.text);
      expect(raw.origin).toBe(imported.origin);
      expect(raw.review.history).toEqual([]);
      expect(find(id).originDate).toBeNull();
      expect(find(id).quality.components.some(part => part.state === "documented")).toBe(true);
      expect(find(id).quality.components.some(part => part.state === "unknown")).toBe(true);
    }
    expect(find("c-146").origin).toBe("Comparecencia Ministra/o");
  });

  it("acredita la aprobación sin inventar aplicación simultánea ni resultados sociales", () => {
    expect(original("BOE-A-2025-6597")).toContain("un año desde la publicación");
    expect(find("c-20").assessment.observed).toContain("un año después");
    expect(original("BOE-A-2024-15936")).toContain("30 de junio de 2027");
    expect(find("c-22").assessment.observed).toContain("30 de junio de 2027");
    expect(original("BOE-A-2024-3099")).toContain("Artículo único");
    expect(find("c-154").assessment.observed).toContain("Cortes Generales");
    for (const id of ["c-20", "c-22", "c-154"]) {
      expect(find(id).quality.components[0].state).toBe("documented");
      expect(find(id).assessment.missingEvidence).toMatch(/aprobación|modificación constitucional/i);
    }
  });

  it("separa tribunales de oficinas y creación de agencia de capacidad real", () => {
    expect(original("BOE-A-2025-76")).toContain("una fecha diferente para el establecimiento");
    expect(find("c-132").assessment.observed).toContain("CGPJ");
    expect(find("c-132").assessment.temporalScope).toContain("ni permite refutar");
    const judicial = find("c-132").evidence.find(source => source.producer === "Consejo General del Poder Judicial")!;
    expect(judicial.locator).toContain("páginas 2–3");
    expect(find("c-132").quality.components.some(part => part.state === "documented" && part.evidenceIds.includes(judicial.id))).toBe(true);
    expect(original("BOE-A-2025-15652")).toContain("plazo de seis meses");
    expect(find("c-146").assessment.missingEvidence).toContain("no prueba incumplimiento");
    expect(find("c-146").quality.components.filter(part => part.state === "unknown")).toHaveLength(2);
  });

  it("no convierte una medida específica en el compromiso completo", () => {
    expect(find("c-126").quality.components[0]).toMatchObject({ label: "Pacto de Estado", state: "unknown", evidenceIds: [] });
    expect(original("BOE-A-2024-20402")).toContain("más de cincuenta");
    expect(find("c-118").assessment.scope).toContain("acuicultura");
    expect(original("BOE-A-2026-2727")).toContain("fines agrarios");
    expect(find("c-191").quality.components.filter(part => part.state === "unknown").map(part => part.label)).toEqual(["Desarrollo del PERTE", "Estrategia de Economía Social"]);
    expect(original("BOE-A-2026-7967")).toContain("Ley 27/1999");
  });

  it("el lector recupera la revisión nueva con citas válidas y sus límites", () => {
    for (const [question, id] of [
      ["desperdicio alimentario", "c-20"],
      ["representación paritaria", "c-22"],
      ["pacto LGTBI", "c-126"],
      ["economía social PERTE", "c-191"],
    ]) {
      const answer = boundMandateAnswer(answerMandate(snapshot, question));
      expect(answer.commitmentIds, question).toContain(id);
      expect(answer.sources.length).toBeGreaterThan(0);
      for (const paragraph of answer.paragraphs) for (const citation of paragraph.citations) expect(answer.sources.some(source => source.id === citation)).toBe(true);
    }
  });
});
