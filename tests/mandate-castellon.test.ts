import { describe, expect, it } from "vitest";
import { getTerritorialBalance } from "@/lib/mandate/territorial";
import { getCoverage } from "@/lib/mandate/coverage";
import { isCoverageComplete } from "@/lib/mandate/coverage-model";

describe("Castellón municipal: pacto, ejecución y atribución", () => {
  it("conserva 90 puntos sin hacerlos pasar por el programa completo o cumplimiento", () => {
    const b = getTerritorialBalance("m-12040")!;
    expect(b).toMatchObject({ mandateId: "m-12040-2023", inventoryKind: "numbered-sections", inventoryTotal: 90, transcriptionPending: true, programmeCopy: true });
    expect(new Set(b.records.map(r => r.topic)).size).toBe(14);
    expect(b.contextBlocks).toHaveLength(20);
    expect(b.reviews).toHaveLength(3);
    expect(b.reviews.flatMap(r => r.components)).toHaveLength(13);
    expect(b.sources).toHaveLength(12);
    const c = getCoverage().find(c => c.id === "m-12040")!;
    expect(c).toMatchObject({ imported: 90, reviewed: 3, independentlyReviewed: 0, originalInventoryComplete: false });
    expect(isCoverageComplete(c)).toBe(false);
    expect(b.textNote).toContain("ejecutados o en ejecución");
    expect(b.records.every(r => r.governmentProgress === undefined)).toBe(true);
    expect(JSON.stringify(b)).not.toMatch(/rawText|fragments|snapshotPath|ocrSha256/);
  });
  it("no equipara efectivos de Proximidad con nuevas plazas de Barrios", () => {
    const r = getTerritorialBalance("m-12040")!.reviews[0];
    expect(r.components.find(c => c.id === "anuncio")?.finding).toContain("no acredita que sean 30 nuevas incorporaciones");
    expect(r.components.find(c => c.id === "contraste")?.status).toBe("unresolved");
    expect(r.components.find(c => c.id === "contraste")?.finding).toContain("no son directamente comparables");
    expect(r.contrast).toContain("Burriana");
  });
  it("distingue adjudicación, inadmisión y prestación del operador", () => {
    const b = getTerritorialBalance("m-12040")!;
    const r = b.reviews[1];
    expect(r.components.find(c => c.id === "contrato")?.finding).toContain("no es gasto ejecutado");
    expect(r.components.find(c => c.id === "recurso")?.finding).toContain("no equivale a desestimar el fondo");
    expect(r.components.find(c => c.id === "prestacion")?.status).toBe("unresolved");
    expect(r.components.find(c => c.id === "resultado")?.finding).toContain("no constituye un evaluador independiente");
    expect(b.sources.find(s => s.id === "castellon-bicicas-award")?.family).toBe("ayuntamiento-castellon");
    expect(b.sources.find(s => s.id === "castellon-bicicas-operator")?.family).toBe("operador-bicicas");
  });
  it("acredita el cambio de nombre sin afirmar firmeza ni rotulación completa", () => {
    const b = getTerritorialBalance("m-12040")!;
    const r = b.reviews[2];
    expect(r.components.find(c => c.id === "norma")?.status).toBe("documented");
    expect(r.components.find(c => c.id === "norma")?.finding).toContain("Castelló de la Plana/Castellón de la Plana");
    expect(r.components.find(c => c.id === "contraste")?.finding).toContain("no se afirma firmeza");
    expect(r.components.find(c => c.id === "resultado")?.status).toBe("unresolved");
    expect(b.sources.find(s => s.id === "castellon-police-contrast")?.family).toBe("pspv-castellon");
  });
});
