import { describe, expect, it } from "vitest";
import { getTerritorialBalance } from "@/lib/mandate/territorial";
import { getCoverage } from "@/lib/mandate/coverage";

describe("Baleares: pacto inicial, reformas y límites de la evidencia", () => {
  it("no convierte el pacto inicial ni los documentos adicionales en todo el mandato", () => {
    const balance = getTerritorialBalance("r-04")!;
    expect(balance).toMatchObject({ inventoryTotal: 117, inventoryKind: "initial-programme", mandateId: "r-04-2023" });
    expect(balance.reviews).toHaveLength(3);
    expect(balance.reviews.flatMap(r => r.components)).toHaveLength(13);
    expect(balance.contextBlocks).toHaveLength(13);
    expect(balance.textNote).toContain("12/07/2024");
    expect(balance.textNote).toContain("30/05/2025");
    expect(getCoverage().find(c => c.id === "r-04")).toMatchObject({ imported: 117, reviewed: 3, independentlyReviewed: 0, originalInventoryComplete: false });
    expect(JSON.stringify(balance)).not.toMatch(/rawText|fragments|snapshotPath|extractionSha256|finalUrl/);
  });
  it("separa procedencia, publicación y efecto, sin multiplicar corroboraciones", () => {
    const balance = getTerritorialBalance("r-04")!;
    for (const id of ["succession-law", "succession-law-2025", "budget-law-boib", "succession-atib"]) {
      expect(balance.sources.find(s => s.id === `balears-${id}`)?.family).toBe("gob-balears");
    }
    expect(balance.sources.find(s => s.id === "balears-succession-law")?.publicationDate).toBe("2023-11-30");
    expect(balance.sources.find(s => s.id === "balears-budget-law-boib")?.publicationDate).toBe("2025-07-24");
    expect(balance.sources.find(s => s.id === "balears-pp-programme-copy")).toMatchObject({ family: "pp-balears", role: "programme" });
    expect(balance.sources.find(s => s.id === "balears-education-fapa-2026")).toMatchObject({ family: "fapa-mallorca", role: "reporting" });
    expect(balance.sources.filter(s => s.captureType === "extracto_editorial").map(s => s.id)).toEqual([
      "balears-programme-register", "balears-pp-programme-register", "balears-budget-pact-register",
    ]);
  });
  it("mantiene sin resolver la aplicación universal, la comparación fiscal y la continuidad", () => {
    const balance = getTerritorialBalance("r-04")!;
    const fiscal = balance.reviews.find(r => r.commitmentId === "r-04-6")!;
    expect(fiscal.components.find(c => c.id === "colaterales-2023")?.finding).toContain("25 %");
    expect(fiscal.components.find(c => c.id === "reforma-2025")?.finding).toContain("35 %");
    expect(fiscal.components.find(c => c.id === "comparacion-espana")?.status).toBe("unresolved");
    const education = balance.reviews.find(r => r.commitmentId === "r-04-63")!;
    expect(education.components.find(c => c.id === "oferta")?.status).toBe("reported");
    expect(education.components.find(c => c.id === "acceso")?.status).toBe("unresolved");
    expect(education.components.find(c => c.id === "conciliacion")?.status).toBe("unresolved");
    expect(education.components.find(c => c.id === "guarderias")?.status).toBe("unresolved");
    expect(balance.reviews[2].components.find(c => c.id === "secuencia-completa")?.status).toBe("unresolved");
  });
});
