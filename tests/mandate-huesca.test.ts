import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { getTerritorialBalance } from "@/lib/mandate/territorial";
import { getCoverage } from "@/lib/mandate/coverage";
import { isCoverageComplete } from "@/lib/mandate/coverage-model";

describe("Huesca: selección archivada y contraste con alcance limitado", () => {
  it("conserva el PDF y sus cinco puntos sin convertirlos en un programa exhaustivo", () => {
    const root = "data/mandate/evidence/territorial/huesca/";
    const meta = JSON.parse(readFileSync(`${root}programme.meta.json`, "utf8"));
    const bytes = readFileSync(meta.snapshotPath);
    const pagesBytes = readFileSync(`${root}programme.pages.json`);
    const hash = (b: Buffer) => createHash("sha256").update(b).digest("hex");
    expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
    expect(hash(bytes)).toBe("b30d2b8b6521f43a50e420f008fd41fc1215581e428792dec8650811eac8f13e");
    expect(hash(pagesBytes)).toBe(meta.extractionSha256);
    const pages = JSON.parse(pagesBytes.toString());
    expect(pages.map((p: { page: number }) => p.page)).toEqual([1, 2]);
    expect(pages[0].text).toContain("5 puntos importantes");
    const officialIds = [...pages[1].text.matchAll(/(?:^|\n)([1-5])\. /g)].map(m => m[1]);
    const b = getTerritorialBalance("m-22125")!;
    expect(b.records.map(r => r.officialId)).toEqual(officialIds);
    expect(b.records.every(r => r.page === 2 && r.endPage === 2 && r.sourceNote?.includes("Resumen editorial"))).toBe(true);
    expect(b.sources.find(s => s.id === "huesca-programme")?.publicationDate).toBeNull();
    expect(b.textNote).toContain("no transcripciones literales");
    expect(b.textNote).toContain("Walqua");
    const coverage = getCoverage().find(c => c.id === "m-22125")!;
    expect(coverage).toMatchObject({ imported: 5, reviewed: 3, independentlyReviewed: 0, originalInventoryComplete: false, inventoryKind: "initial-programme" });
    expect(isCoverageComplete(coverage)).toBe(false);
    const pretendClosed = { ...coverage, reviewed: 5, independentlyReviewed: 5, blockers: [] };
    expect(isCoverageComplete(pretendClosed)).toBe(false);
    expect(JSON.stringify(b)).not.toMatch(/snapshotPath|rawText|extractionSha256|CSVBN2X84Z4HH1H0XFIL/);
  });

  it("separa el anuncio previo a la alcaldía, la apertura comunicada y el calendario académico", () => {
    const b = getTerritorialBalance("m-22125")!;
    const r = b.reviews.find(r => r.commitmentId === "m-22125-2")!;
    expect(b.sources.find(s => s.id === "huesca-medicine-origin")?.publicationDate).toBe("2023-03-28");
    expect(r.components.find(c => c.id === "origen")?.finding).toContain("antes de la toma de posesión");
    expect(r.components.find(c => c.id === "instalaciones")?.status).toBe("reported");
    expect(r.components.find(c => c.id === "calendario")?.finding).toContain("2029–2030");
    expect(r.components.find(c => c.id === "pendientes")?.status).toBe("unresolved");
    expect(new Set(b.sources.filter(s => s.id.startsWith("huesca-medicine-")).map(s => s.family)).size).toBe(1);
  });

  it("no transforma una convocatoria ni una reducción del IVTM en cumplimiento completo", () => {
    const b = getTerritorialBalance("m-22125")!;
    expect(b.reviews.map(r => r.commitmentId)).toEqual(["m-22125-1", "m-22125-2", "m-22125-5"]);
    expect(b.reviews.flatMap(r => r.components)).toHaveLength(13);
    expect(b.reviews.every(r => r.components.some(c => c.status === "unresolved"))).toBe(true);
    expect(b.reviews[0].components.find(c => c.id === "convocatoria")?.finding).toContain("no gasto ejecutado");
    const tax = b.reviews[2];
    expect(tax.components.find(c => c.id === "turismos")?.finding).toContain("0,267 %");
    expect(tax.components.find(c => c.id === "ibi")?.finding).toContain("tramos de empleados");
    expect(b.sources.find(s => s.id === "huesca-tax-change")?.family).toBe("ayuntamiento-huesca");
    expect(b.sources.find(s => s.id === "huesca-housing-call")?.family).toBe("ayuntamiento-huesca");
  });
});
