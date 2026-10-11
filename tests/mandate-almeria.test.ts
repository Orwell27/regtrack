import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import inventory from "@/data/mandate/almeria-inventory.json";
import pages from "@/data/mandate/evidence/territorial/almeria/programme.pages.json";
import { parseAlmeriaProgramme } from "@/lib/mandate/almeria-import";
import { getTerritorialBalance } from "@/lib/mandate/territorial";
import { getCoverage } from "@/lib/mandate/coverage";
import { isCoverageComplete } from "@/lib/mandate/coverage-model";

const root = "data/mandate/evidence/territorial/almeria/";
const page = (name: string, n: number): string => JSON.parse(readFileSync(`${root}${name}.pages.json`, "utf8"))[n - 1].text;

describe("Almería: destacados, contexto y documentos completos", () => {
  it("reproduce los 155 apartados, incluidos los destacados y la continuación de Mercado Central", () => {
    const meta = JSON.parse(readFileSync(`${root}programme.meta.json`, "utf8"));
    const hash = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");
    expect(hash(meta.snapshotPath)).toBe(inventory.sourceSha256);
    expect(hash(`${root}programme.pages.json`)).toBe(meta.extractionSha256);
    const { sections, context } = parseAlmeriaProgramme(pages);
    expect(sections).toEqual(inventory.records.map(({ officialId, topic, page, endPage, rawText, fragments }) => ({ officialId, topic, page, endPage, rawText, fragments })));
    expect(sections).toHaveLength(155);
    expect(sections.find(s => s.officialId === "P15-07")?.rawText).toContain("300 nuevas viviendas");
    expect(sections.find(s => s.officialId === "P19-06")).toMatchObject({ page: 19, endPage: 20 });
    expect(sections.find(s => s.officialId === "P19-06")?.rawText).toContain("celebración de eventos");
    expect(sections.filter(s => s.page === 7).map(s => s.topic)).toEqual([
      ...Array(6).fill("Integración y participación"), ...Array(6).fill("Familia y mayores"),
    ]);
    expect(sections.filter(s => s.page === 17 && s.topic === "Proyectos pendientes")).toHaveLength(7);
    const fragments = [...sections.flatMap(s => s.fragments), ...context.flatMap(c => c.fragments)];
    expect(new Set(fragments.map(f => `${f.page}:${f.line}`)).size).toBe(fragments.length);
    expect(context.flatMap(c => c.fragments)).toEqual(inventory.contextBlocks.flatMap(c => c.fragments));
  });

  it("rechaza páginas perdidas y listas con viñetas omitidas o añadidas", () => {
    expect(() => parseAlmeriaProgramme(pages.slice(1))).toThrow("Páginas");
    const missing = structuredClone(pages);
    missing[7].text = missing[7].text.replace("• Acciones", "Acciones");
    expect(() => parseAlmeriaProgramme(missing)).toThrow("Apartados");
    const extra = structuredClone(pages);
    extra[19].text = extra[19].text.replace("para el comercio", "• para el comercio");
    expect(() => parseAlmeriaProgramme(extra)).toThrow("Apartados");
  });

  it("separa importación de revisión y mantiene privados los textos y rutas de trabajo", () => {
    const b = getTerritorialBalance("m-04013")!;
    const c = getCoverage().find(c => c.id === "m-04013")!;
    expect(c).toMatchObject({ imported: 155, reviewed: 3, independentlyReviewed: 0, inventoryKind: "programme-sections", originalInventoryComplete: false });
    expect(isCoverageComplete({ ...c, reviewed: 155, independentlyReviewed: 155, blockers: [] })).toBe(false);
    expect(b.sources).toHaveLength(15);
    expect(new Set(b.sources.map(s => s.family)).size).toBe(4);
    expect(b.contextBlocks).toHaveLength(8);
    expect(b.reviews.flatMap(r => r.components)).toHaveLength(14);
    expect(b.records.every(r => r.sourceNote?.includes("no es un número oficial"))).toBe(true);
    expect(JSON.stringify(b)).not.toMatch(/rawText|fragments|snapshotPath|extractionSha256/);
  });

  it("no convierte obras comunicadas y entregas históricas en viviendas entregadas durante el mandato", () => {
    const r = getTerritorialBalance("m-04013")!.reviews[0];
    expect(r.components.find(c => c.id === "obras")?.finding).toContain("no se suman 203 y 92");
    expect(r.components.find(c => c.id === "plazo")).toMatchObject({ status: "reported" });
    expect(r.components.find(c => c.id === "plazo")?.finding).toContain("enero de 2028");
    expect(r.components.find(c => c.id === "historico")?.status).toBe("unresolved");
    expect(r.components.find(c => c.id === "resultados")?.status).toBe("unresolved");
  });

  it("distingue la corroboración de UNICEF y el acuerdo de aprobación de un resultado social", () => {
    const r = getTerritorialBalance("m-04013")!.reviews[1];
    expect(r.components.find(c => c.id === "renovacion")?.citations).toContainEqual({ sourceId: "almeria-unicef-2023", locator: "Fila Almería · Andalucía", page: 3 });
    expect(page("unicef-2023", 3)).toBe("");
    expect(r.contrast).toContain("se leyó como imagen");
    expect(page("childhood-certificate", 4)).toContain("16 votos favorables");
    expect(r.components.find(c => c.id === "impacto")?.status).toBe("unresolved");
  });

  it("lee el encabezado del desistimiento y no atribuye 100.000 euros a una incorporación ni a una obra ejecutada", () => {
    const text = page("budget-amendment-2024", 2);
    expect(text.indexOf("Desistir de continuar")).toBeLessThan(text.indexOf("PLAYA CANINA DE COSTACABANA"));
    expect(text).toContain("2023.2.032.1 100.000,00");
    expect(page("procurement-2024", 9)).toContain("01/06/24");
    const r = getTerritorialBalance("m-04013")!.reviews[2];
    expect(r.components.find(c => c.id === "desistimiento")?.finding).toContain("No pertenece a la tabla");
    expect(r.components.find(c => c.id === "situacion")?.status).toBe("unresolved");
    expect(r.periodNote).toContain("no demuestra que nada haya cambiado");
  });
});
