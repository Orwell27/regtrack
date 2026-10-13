import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import inventory from "@/data/mandate/avila-inventory.json";
import pages from "@/data/mandate/evidence/territorial/avila/programme.layout.json";
import raw from "@/data/mandate/evidence/territorial/avila/programme.pages.json";
import { parseAvilaProgramme } from "@/lib/mandate/avila-import";
import { getTerritorialBalance } from "@/lib/mandate/territorial";
import { getCoverage } from "@/lib/mandate/coverage";
import { isCoverageComplete } from "@/lib/mandate/coverage-model";

const root = "data/mandate/evidence/territorial/avila/";
const pdfText = (name: string, page: number): string => JSON.parse(readFileSync(`${root}${name}.pages.json`, "utf8"))[page-1].text;

describe("Ávila: composición del original y atribución de resultados", () => {
  it("preserva el original y reproduce 163 apartados sin duplicar capas ni perder páginas por el índice erróneo", () => {
    const meta = JSON.parse(readFileSync(`${root}programme.meta.json`, "utf8"));
    const hash = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");
    expect(hash(meta.snapshotPath)).toBe(inventory.sourceSha256);
    expect(hash(`${root}programme.pages.json`)).toBe(meta.extractionSha256);
    expect(hash(`${root}programme.layout.json`)).toBe(meta.layoutSha256);
    expect(raw[8].text.match(/En Por Ávila hemos/g)).toHaveLength(2);
    expect(pages[8].blocks.filter(b => b.text.startsWith("En Por Ávila hemos"))).toHaveLength(1);
    const sections = parseAvilaProgramme(pages);
    expect(sections).toEqual(inventory.records.map(({ officialId, topic, page, endPage, rawText, fragments }) => ({ officialId, topic, page, endPage, rawText, fragments })));
    expect(sections).toHaveLength(163);
    expect(sections.filter(s => s.page === 30)).toHaveLength(1);
    expect(sections.filter(s => s.page === 37)).toHaveLength(5);
    expect(sections.find(s => s.officialId === "P14-02")?.rawText).toContain("Consumo energético");
    expect(sections.filter(s => s.page === 51)).toHaveLength(8);
    const fragments = sections.flatMap(s => s.fragments);
    expect(new Set(fragments.map(f => `${f.page}:${f.block}`)).size).toBe(fragments.length);
    expect(sections.some(s => [6,7,21].includes(s.page))).toBe(false);
  });

  it("rechaza páginas, párrafos y viñetas perdidos o añadidos", () => {
    expect(() => parseAvilaProgramme(pages.slice(1))).toThrow("Páginas");
    const missing = structuredClone(pages); missing[29].blocks.pop();
    expect(() => parseAvilaProgramme(missing)).toThrow("Estructura");
    const extra = structuredClone(pages); extra[36].blocks.push(extra[36].blocks[0]);
    expect(() => parseAvilaProgramme(extra)).toThrow("Estructura");
    const bullet = structuredClone(pages); bullet[9].blocks[1].bullet = false;
    expect(() => parseAvilaProgramme(bullet)).toThrow("Estructura");
  });

  it("no convierte importación en revisión independiente ni publica extracción privada", () => {
    const b = getTerritorialBalance("m-05019")!;
    const c = getCoverage().find(c => c.id === "m-05019")!;
    expect(c).toMatchObject({ imported: 163, reviewed: 3, independentlyReviewed: 0, inventoryKind: "programme-sections", originalInventoryComplete: false });
    expect(isCoverageComplete({ ...c, reviewed: 163, independentlyReviewed: 163, blockers: [] })).toBe(false);
    expect(b.sources).toHaveLength(11);
    expect(new Set(b.sources.map(s => s.family)).size).toBe(5);
    expect(b.contextBlocks).toHaveLength(15);
    expect(b.reviews.flatMap(r => r.components)).toHaveLength(12);
    expect(JSON.stringify(b)).not.toMatch(/rawText|fragments|snapshotPath|layoutSha256|extractionSha256/);
    expect(b.sources.find(s => s.id === "avila-organic-project")?.publicationDate).toBeNull();
  });

  it("retiene los límites del registro y no transforma una memoria de mantenimiento en servicio ejecutado", () => {
    expect(pdfText("constitution",3)).toMatch(/once|11/);
    expect(inventory.textNote).toContain("errores de plantilla");
    expect(pdfText("stairs-maintenance",6)).toContain("18.149,88");
    expect(pdfText("stairs-maintenance",7)).toContain("7 meses");
    const r = getTerritorialBalance("m-05019")!.reviews[0];
    expect(r.components.find(c => c.id === "apertura")?.status).toBe("documented");
    expect(r.components.find(c => c.id === "mantenimiento")?.finding).toContain("documentación preparatoria");
    expect(r.components.find(c => c.id === "resultado")?.status).toBe("unresolved");
  });

  it("mantiene comunicado el contenedor y no cuenta cubos previstos como hogares o toneladas", () => {
    const r = getTerritorialBalance("m-05019")!.reviews[1];
    expect(r.components.find(c => c.id === "implantacion")?.status).toBe("reported");
    expect(r.components.find(c => c.id === "reparto")?.finding).toContain("no hogares atendidos");
    expect(r.components.find(c => c.id === "resultado")?.status).toBe("unresolved");
    expect(r.contrast).toContain("no son corroboración externa");
  });

  it("separa el servicio sanitario autonómico de la reivindicación municipal y de las previsiones de actividad", () => {
    const r = getTerritorialBalance("m-05019")!.reviews[2];
    expect(r.components.find(c => c.id === "antecedente")?.finding).toContain("21/07/2022");
    expect(r.components.find(c => c.id === "apertura")?.finding).toContain("400 pacientes anuales era una previsión");
    expect(r.components.find(c => c.id === "atribucion")?.status).toBe("unresolved");
    expect(r.conclusion).toContain("No se atribuye su ejecución al Ayuntamiento");
  });
});
