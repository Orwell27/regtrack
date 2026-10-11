import { describe, expect, it } from "vitest";
import { getTerritorialBalance } from "@/lib/mandate/territorial";
import { getCoverage } from "@/lib/mandate/coverage";
import { validateTerritorialBalance } from "@/lib/mandate/territorial-model";

describe("Aragón: transcripción provisional, cambio de mandato y evidencia contraria", () => {
  it("mantiene el OCR y el cotejo pendientes, aunque se hayan importado todos los apartados", () => {
    const balance = getTerritorialBalance("r-02")!;
    expect(balance).toMatchObject({ mandateId: "r-02-2026", inventoryTotal: 117, programmeCopy: true, transcriptionPending: true });
    expect(balance.reviews).toHaveLength(2);
    expect(balance.reviews.flatMap(r => r.components)).toHaveLength(8);
    const coverage = getCoverage().find(c => c.id === "r-02")!;
    expect(coverage).toMatchObject({ imported: 117, reviewed: 2, independentlyReviewed: 0, originalInventoryComplete: false });
    expect(coverage.blockers.join(" ")).toContain("Transcripción OCR provisional");
    expect(JSON.stringify(balance)).not.toMatch(/rawText|fragments|snapshotPath|ocrSha256|orderedSha256|extractionSha256/);
    expect(() => validateTerritorialBalance({ ...balance, transcriptionPending: "no" as unknown as boolean })).toThrow("transcripción");
  });
  it("no convierte copias idénticas o voces de interesados en revisiones independientes", () => {
    const balance = getTerritorialBalance("r-02")!;
    const copies = balance.sources.filter(s => ["aragon-programme", "aragon-programme-ser"].includes(s.id));
    expect(new Set(copies.map(s => s.sha256)).size).toBe(1);
    expect(new Set(copies.map(s => s.family)).size).toBe(1);
    expect(balance.sources.find(s => s.id === "aragon-education-plaintiff")).toMatchObject({ role: "reporting", family: "plataforma-escuela-publica-aragon" });
    expect(balance.sources.find(s => s.id === "aragon-programme-register")?.captureType).toBe("extracto_editorial");
  });
  it("separa orden anterior, cautelar comunicada, consulta y aplicación efectiva", () => {
    const balance = getTerritorialBalance("r-02")!;
    const education = balance.reviews[0];
    expect(balance.sources.find(s => s.id === "aragon-education-order")?.publicationDate).toBe("2026-04-08");
    expect(education.components.find(c => c.id === "cronologia")?.finding).toContain("actuación previa");
    expect(education.components.find(c => c.id === "cautelar")?.status).toBe("unresolved");
    expect(education.components.find(c => c.id === "consulta")?.finding).toContain("terminó su plazo de aportaciones");
    expect(education.components.find(c => c.id === "ejecucion")?.status).toBe("unresolved");
    expect(balance.reviews[1].components.find(c => c.id === "nombramiento")?.status).toBe("documented");
    expect(balance.reviews[1].components.find(c => c.id === "precedencia")?.status).toBe("unresolved");
  });
});
