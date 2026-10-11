import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import inventory from "@/data/mandate/albacete-inventory.json";
import pages from "@/data/mandate/evidence/territorial/albacete/programme.pages.json";
import { parseAlbaceteProgramme } from "@/lib/mandate/albacete-import";
import { getTerritorialBalance } from "@/lib/mandate/territorial";
import { getCoverage } from "@/lib/mandate/coverage";
import { isCoverageComplete } from "@/lib/mandate/coverage-model";

describe("Albacete: apartados numerados, ética y contraste de versiones", () => {
  it("reproduce 250 apartados y tres éticos sin confundir reinicio de numeración ni contexto", () => {
    const root = "data/mandate/evidence/territorial/albacete/";
    const meta = JSON.parse(readFileSync(`${root}programme.meta.json`, "utf8"));
    const hash = (b: Buffer) => createHash("sha256").update(b).digest("hex");
    expect(hash(readFileSync(meta.snapshotPath))).toBe(inventory.sourceSha256);
    expect(hash(readFileSync(`${root}programme.pages.json`))).toBe(meta.extractionSha256);
    const parsed = parseAlbaceteProgramme(pages);
    expect(parsed.sections).toEqual(inventory.records.map(({ officialId, page, endPage, rawText, fragments }) => ({ officialId, page, endPage, rawText, fragments })));
    expect(parsed.sections).toHaveLength(253);
    expect(parsed.sections.slice(-3).map(s => s.officialId)).toEqual(["Ético 1", "Ético 2", "Ético 3"]);
    expect(inventory.records.slice(-3).map(s => s.id)).toEqual(["m-02003-ethics-1", "m-02003-ethics-2", "m-02003-ethics-3"]);
    for (const [n, start, end] of [[14, 5, 6], [68, 10, 11], [94, 12, 13]]) {
      expect(parsed.sections[n - 1]).toMatchObject({ page: start, endPage: end });
    }
    expect(parsed.sections[56].rawText).not.toContain("EMPRESAS");
    expect(parsed.sections[108].rawText).not.toContain("MOVILIDAD");
    expect(parsed.sections[163].rawText).not.toContain("ACTIVAMOS");
    expect(parsed.sections[224].rawText).not.toContain("FUTURO");
    const fragments = [...parsed.sections.flatMap(s => s.fragments), ...parsed.context];
    expect(new Set(fragments.map(f => `${f.page}:${f.line}`)).size).toBe(fragments.length);
    expect(parsed.context).toEqual(inventory.contextBlocks.flatMap(c => c.fragments));
  });

  it("rechaza páginas perdidas, duplicadas y cambios de numeración", () => {
    expect(() => parseAlbaceteProgramme(pages.slice(1))).toThrow("Páginas");
    expect(() => parseAlbaceteProgramme([...pages.slice(1), pages[27]])).toThrow("Páginas");
    const duplicate = structuredClone(pages);
    duplicate[4].text = duplicate[4].text.replace("3. Incrementaremos", "2. Incrementaremos");
    expect(() => parseAlbaceteProgramme(duplicate)).toThrow("Numeración");
    const ethics = structuredClone(pages);
    ethics[25].text = ethics[25].text.replace("3. A trabajar", "4. A trabajar");
    expect(() => parseAlbaceteProgramme(ethics)).toThrow("Numeración");
  });

  it("mantiene resúmenes públicos y no convierte 253 apartados en 253 revisiones", () => {
    const b = getTerritorialBalance("m-02003")!;
    expect(b.records.every(r => r.sourceNote?.startsWith("Resumen editorial"))).toBe(true);
    expect(b.reviews.map(r => r.commitmentId)).toEqual(["m-02003-3", "m-02003-107", "m-02003-108"]);
    const c = getCoverage().find(c => c.id === "m-02003")!;
    expect(c).toMatchObject({ imported: 253, reviewed: 3, independentlyReviewed: 0, inventoryKind: "numbered-sections", originalInventoryComplete: false });
    expect(isCoverageComplete({ ...c, reviewed: 253, independentlyReviewed: 253, blockers: [] })).toBe(false);
    expect(JSON.stringify(b)).not.toMatch(/rawText|fragments|snapshotPath|extractionSha256|AEAA ELVW/);
    expect(b.contextBlocks).toHaveLength(7);
    expect(b.textNote).toContain("no sustituye al acta");
  });

  it("retiene las cantidades originales, la divergencia de 2024 y los pagos pendientes", () => {
    const root = "data/mandate/evidence/territorial/albacete/";
    const page = (name: string, n: number) => JSON.parse(readFileSync(`${root}${name}.pages.json`, "utf8"))[n - 1].text;
    expect(page("cheque-2023", 2)).toContain("360.000");
    expect(page("cheque-2023", 2)).toContain("90 euros");
    expect(page("cheque-2024", 2)).toContain("360.000");
    expect(page("cheque-2024", 2)).toContain("100 euros");
    expect(page("cheque-2024-extract", 1)).toContain("360.000");
    expect(page("cheque-2026", 2)).toContain("500.000");
    expect(page("cheque-2026", 2)).toContain("2027 quedan condicionadas");
    const b = getTerritorialBalance("m-02003")!;
    const cheque = b.reviews[0];
    expect(cheque.components.find(c => c.id === "versiones")?.status).toBe("unresolved");
    expect(cheque.components.find(c => c.id === "ejecucion")?.status).toBe("unresolved");
    expect(cheque.components.find(c => c.id === "dotacion-2026")?.finding).toContain("después del corte");
    expect(new Set(b.sources.filter(s => s.id.includes("cheque")).map(s => s.family))).toEqual(new Set(["ayuntamiento-albacete"]));
    expect(b.sources.find(s => s.id === "albacete-cheque-announcement-2024")?.captureType).toBe("extracto_editorial");
  });

  it("separa celebración, traslado y prueba externa de una revisión humana independiente", () => {
    const b = getTerritorialBalance("m-02003")!;
    expect(b.reviews.flatMap(r => r.components)).toHaveLength(13);
    expect(b.reviews[1].components.find(c => c.id === "celebracion")?.status).toBe("reported");
    expect(b.reviews[2].components.find(c => c.id === "otras-ferias")?.status).toBe("unresolved");
    expect(b.reviews[1].periodNote).toContain("no se toma el anuncio de 2027");
    expect(b.sources.find(s => s.id === "albacete-expovicaman-visit")?.family).toBe("twins-farm");
    expect(b.reviews[2].contrast).toContain("No son dos éxitos independientes");
  });
});
