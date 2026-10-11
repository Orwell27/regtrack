import { describe, expect, it } from "vitest";
import { getTerritorialBalance } from "@/lib/mandate/territorial";
import { getCoverage } from "@/lib/mandate/coverage";
import { validateTerritorialBalance } from "@/lib/mandate/territorial-model";

describe("Madrid autonómico: condiciones, períodos y universos comparables", () => {
  it("rechaza presentar la promesa por sí sola como actuación realizada", () => {
    const balance = structuredClone(getTerritorialBalance("r-13")!);
    const promise = balance.reviews.find(r => r.commitmentId === "r-13-5-10")!.components[0];
    expect(promise.status).toBe("promise-documented");
    promise.status = "documented";
    expect(() => validateTerritorialBalance(balance)).toThrow("Actuación sustentada solo en un programa");
    promise.status = "promise-documented";
    promise.citations[0].sourceId = "madrid-region-transport-guide";
    expect(() => validateTerritorialBalance(balance)).toThrow("Compromiso sin programa citado");
  });
  it("separa el programa autonómico del municipal y mantiene la cobertura pendiente", () => {
    const balance = getTerritorialBalance("r-13")!;
    expect(balance).toMatchObject({ inventoryTotal: 459, mandateId: "r-13-2023", inventoryKind: "numbered-sections", transcriptionMethod: "digital", transcriptionPending: true });
    expect(balance.contextBlocks).toHaveLength(75);
    expect(balance.reviews).toHaveLength(4);
    expect(balance.reviews.flatMap(r => r.components)).toHaveLength(15);
    expect(balance.records.every(r => r.id.startsWith("r-13-") && !r.governmentState)).toBe(true);
    expect(getTerritorialBalance("m-28079")!.inventoryTotal).toBe(300);
    const coverage = getCoverage().find(c => c.id === "r-13")!;
    expect(coverage).toMatchObject({ imported: 459, reviewed: 4, independentlyReviewed: 0, originalInventoryComplete: false });
    expect(coverage.blockers.join(" ")).toContain("455 apartados numerados");
    expect(JSON.stringify(balance)).not.toMatch(/rawText|fragments|snapshotPath|extractionSha256|orderedSha256|finalUrl/);
  });
  it("identifica las notas editoriales y no confunde publicación estatal con auditoría", () => {
    const balance = getTerritorialBalance("r-13")!;
    expect(balance.sources).toHaveLength(11);
    expect(balance.sources.filter(s => s.captureType === "extracto_editorial").map(s => s.id)).toEqual(["madrid-region-birth-procedure", "madrid-region-dependency-wait", "madrid-region-housing-start"]);
    expect(balance.sources.find(s => s.id === "madrid-region-dependency-funding")).toMatchObject({ family: "gob-espana", role: "government-report", publicationDate: "2026-09-09" });
    expect(balance.sources.find(s => s.id === "madrid-region-transport-tariffs")?.family).toBe("gob-madrid");
    expect(balance.reviews.find(r => r.commitmentId === "r-13-6-2")?.contrast).toContain("datos administrativos autonómicos");
  });
  it("distingue crédito de pagos y tarifa base de precio bonificado", () => {
    const balance = getTerritorialBalance("r-13")!;
    const birth = balance.reviews.find(r => r.commitmentId === "r-13-5-2")!;
    expect(birth.components.find(c => c.id === "pagos")?.status).toBe("unresolved");
    expect(birth.components.find(c => c.id === "condiciones")?.finding).toContain("estrictamente inferior");
    expect(birth.components.find(c => c.id === "credito")?.finding).toContain("2024");
    const transport = balance.reviews.find(r => r.commitmentId === "r-13-5-10")!;
    expect(transport.components.find(c => c.id === "tarifa-familiar")?.status).toBe("target-pending");
    expect(transport.components.find(c => c.id === "tarifa-familiar")?.finding).toContain("no el precio final");
    expect(transport.periodNote).toContain("no ha vencido");
  });
  it("no convierte listas sin cohortes ni obras en resultados finales", () => {
    const balance = getTerritorialBalance("r-13")!;
    const dependency = balance.reviews.find(r => r.commitmentId === "r-13-6-2")!;
    expect(dependency.components.find(c => c.id === "plazos-coste")?.status).toBe("unresolved");
    expect(dependency.components.find(c => c.id === "lista-estatal")?.finding).toContain("no equivale necesariamente a ausencia de oferta");
    expect(dependency.components.find(c => c.id === "lista-residencial")?.finding).toContain("excluyendo");
    const housing = balance.reviews.find(r => r.commitmentId === "r-13-10-17")!;
    expect(housing.components.find(c => c.id === "obras")?.status).toBe("reported");
    expect(housing.components.find(c => c.id === "entrega")?.status).toBe("unresolved");
    expect(housing.components.find(c => c.id === "entrega")?.finding).toContain("Plan Vive general");
  });
});
