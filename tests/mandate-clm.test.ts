import { describe, expect, it } from "vitest";
import { getTerritorialBalance } from "@/lib/mandate/territorial";
import { getCoverage } from "@/lib/mandate/coverage";

describe("Castilla-La Mancha: universo inicial, condiciones y datos atribuidos", () => {
  it("conserva 861 compromisos iniciales sin cerrar el mandato ni importar sus estados", () => {
    const balance = getTerritorialBalance("r-08")!;
    expect(balance).toMatchObject({ inventoryTotal: 861, inventoryKind: "initial-programme", transcriptionPending: true });
    expect(balance.contextBlocks).toHaveLength(18);
    expect(balance.reviews).toHaveLength(5);
    expect(balance.reviews.flatMap(r => r.components)).toHaveLength(22);
    expect(balance.records.every(r => !r.governmentState && !r.governmentProgress)).toBe(true);
    const coverage = getCoverage().find(c => c.id === "r-08")!;
    expect(coverage).toMatchObject({ imported: 861, reviewed: 5, independentlyReviewed: 0, originalInventoryComplete: false });
    expect(coverage.blockers.join(" ")).toContain("856 medidas iniciales");
    expect(JSON.stringify(balance)).not.toMatch(/rawText|fragments|governmentUrl|snapshotPath|orderedSha256|finalUrl/);
  });
  it("distingue familias de fuentes, cortes estadísticos y personas de prestaciones", () => {
    const balance = getTerritorialBalance("r-08")!;
    expect(balance.sources).toHaveLength(15);
    expect(balance.sources.filter(s => s.captureType === "extracto_editorial").map(s => s.id)).toEqual(["clm-tv-press"]);
    expect(new Set(balance.sources.map(s => s.family))).toEqual(new Set(["gob-clm", "gob-espana", "diario-sanitario"]));
    const dependency = balance.reviews.find(r => r.commitmentId === "r-08-1")!;
    expect(dependency.components.find(c => c.id === "serie")?.status).toBe("reported");
    expect(dependency.components.find(c => c.id === "serie")?.finding).toContain("78.035 personas");
    expect(dependency.components.find(c => c.id === "actualizacion")?.finding).toContain("no se calcula con ellas una ratio de julio");
    expect(dependency.components.find(c => c.id === "calidad")?.status).toBe("unresolved");
    expect(balance.reviews.find(r => r.commitmentId === "r-08-166")?.periodNote).toContain("03/01/2023");
  });
  it("conserva condiciones de acceso y no convierte normas en entregas o pagos", () => {
    const balance = getTerritorialBalance("r-08")!;
    const books = balance.reviews.find(r => r.commitmentId === "r-08-257")!;
    expect(books.components.find(c => c.id === "entregas")?.status).toBe("unresolved");
    expect(books.components.find(c => c.id === "condiciones")?.finding).toContain("No son un cobro universal anual");
    const university = balance.reviews.find(r => r.commitmentId === "r-08-384")!;
    expect(university.components[0].status).toBe("promise-documented");
    expect(university.components[0].finding).toContain("condición");
    expect(university.components.find(c => c.id === "bonificacion")?.finding).toContain("60 o 72");
    expect(university.components.find(c => c.id === "resultado")?.status).toBe("unresolved");
  });
  it("no confunde avance medio con compromisos completos ni ampliaciones con el universo inicial", () => {
    const review = getTerritorialBalance("r-08")!.reviews.find(r => r.commitmentId === "r-08-446")!;
    const count = review.components.find(c => c.id === "denominador")!;
    expect(count.status).toBe("reported");
    expect(count.finding).toContain("37,4 %");
    expect(count.finding).toContain("112 compromisos");
    expect(count.finding).toContain("81 en 2025");
    expect(review.components.find(c => c.id === "auditoria")?.status).toBe("unresolved");
    expect(review.periodNote).toContain("no se ha auditado la totalidad");
  });
});
