import { describe, expect, it } from "vitest";
import { getTerritorialBalance } from "@/lib/mandate/territorial";
import { getCoverage } from "@/lib/mandate/coverage";
import { isCoverageComplete } from "@/lib/mandate/coverage-model";
describe("València municipal: alcance y pruebas", () => {
  it("separa el discurso municipal del autonómico y no cierra el inventario", () => {
    const b = getTerritorialBalance("m-46250")!;
    expect(b).toMatchObject({ mandateId: "m-46250-2023", level: "municipality", inventoryKind: "speech-sections", inventoryTotal: 19, transcriptionPending: true });
    expect(b.contextBlocks).toHaveLength(2);
    expect(b.reviews).toHaveLength(3);
    expect(b.reviews.flatMap(r => r.components)).toHaveLength(14);
    expect(b.textNote).toContain("Programa electoral completo");
    const c = getCoverage().find(c => c.id === "m-46250")!;
    expect(c).toMatchObject({ imported: 19, reviewed: 3, independentlyReviewed: 0, originalInventoryComplete: false });
    expect(c.blockers.join(" ")).toContain("16 secciones del discurso");
    expect(isCoverageComplete(c)).toBe(false);
    expect(JSON.stringify(b)).not.toMatch(/rawText|fragments|snapshotPath|extractionSha256/);
    expect(b.sources.every(s => s.jurisdictionId === "m-46250")).toBe(true);
  });
  it("mantiene los requisitos de plusvalías y no confunde ahorro parcial y total", () => {
    const r = getTerritorialBalance("m-46250")!.reviews[0];
    expect(r.components.find(c => c.id === "plusvalia")?.finding).toContain("dos años");
    expect(r.components.find(c => c.id === "comunicado")?.status).toBe("reported");
    expect(r.components.find(c => c.id === "resultado")?.status).toBe("unresolved");
    expect(r.contrast).toContain("no una auditoría del ahorro");
  });
  it("conserva la contradicción de periodos y las unidades de licencias", () => {
    const r = getTerritorialBalance("m-46250")!.reviews[1];
    expect(r.components.find(c => c.id === "comparabilidad")?.status).toBe("unresolved");
    expect(r.components.find(c => c.id === "comparabilidad")?.finding).toContain("primer trimestre de 2023");
    expect(r.components.find(c => c.id === "comparabilidad")?.finding).toContain("primer semestre de 2023");
    expect(r.components.find(c => c.id === "cifras")?.finding).toContain("Viviendas autorizadas no equivale");
  });
  it("distingue auditor financiero, contraparte y límites temporales", () => {
    const b = getTerritorialBalance("m-46250")!;
    expect(b.sources).toHaveLength(14);
    const audit = b.sources.find(s => s.id === "valencia-marina-audit")!;
    const accounts = b.sources.find(s => s.id === "valencia-marina-accounts")!;
    expect(audit.sha256).toBe(accounts.sha256);
    expect(audit.family).not.toBe(accounts.family);
    expect(audit.role).toBe("control");
    expect(b.sources.find(s => s.id === "valencia-register")?.sha256).toBe(b.sources.find(s => s.id === "valencia-programme")?.sha256);
    expect(b.reviews[2].components.find(c => c.id === "antecedentes")?.finding).toContain("antes de este mandato");
    expect(b.reviews[2].components.find(c => c.id === "resultado")?.status).toBe("unresolved");
  });
});
