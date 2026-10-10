import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import inventory from "@/data/mandate/madrid-inventory.json";
import extraction from "@/data/mandate/evidence/territorial/madrid-programme-2023.pages.json";
import sources from "@/data/mandate/evidence/territorial/sources.json";
import { parseMadridProgramme } from "@/lib/mandate/territorial-import";
import { getTerritorialBalance } from "@/lib/mandate/territorial";
import { validateTerritorialBalance } from "@/lib/mandate/territorial-model";
import { getCoverage } from "@/lib/mandate/coverage";

describe("inventario municipal reproducible y separado de la revisión", () => {
  it("reproduce las 300 medidas de las páginas conservadas y verifica los originales", () => {
    for (const source of sources) {
      const bytes = readFileSync(source.snapshotPath);
      expect(bytes.length).toBe(source.bytes);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(source.sha256);
    }
    expect(extraction.sourceSha256).toBe(inventory.sourceSha256);
    expect(parseMadridProgramme(extraction.pages)).toEqual(inventory.records);
    expect(inventory.records.map(record => +record.officialId)).toEqual(Array.from({ length: 300 }, (_, index) => index + 1));
  });
  it("une palabras partidas por guiones y elimina pies de página multilínea", () => {
    const records = parseMadridProgramme(extraction.pages);
    expect(records[162].text).toMatch(/consolidando su imagen fuera de España\.$/);
    expect(records[162].text).not.toContain("empleo");
    expect(records[162].text).toContain("idiosincrasia");
    expect(records[162].rawText).toContain("idio -\nsincrasia");
    expect(records[102]).toMatchObject({ page: 33, officialId: "103" });
    expect(records[245]).toMatchObject({ page: 63, officialId: "246" });
  });
  it("rechaza páginas ausentes o duplicadas y medidas borradas o renumeradas", () => {
    expect(() => parseMadridProgramme(extraction.pages.slice(1))).toThrow("páginas incompletas");
    expect(() => parseMadridProgramme([...extraction.pages.slice(1), extraction.pages[1]])).toThrow("duplicadas");
    const pages = structuredClone(extraction.pages);
    const page = pages.find(item => item.page === 15)!;
    page.text = page.text.replace(/\b2\.\s/, "3. ");
    expect(() => parseMadridProgramme(pages)).toThrow("secuencia inválida");
  });
  it("muestra 4 fichas parciales y 296 pendientes sin heredar el balance nacional", () => {
    const balance = getTerritorialBalance("m-28079")!;
    expect(balance.reviews.map(review => review.commitmentId)).toEqual(["m-28079-103", "m-28079-163", "m-28079-181", "m-28079-246"]);
    expect(balance.inventoryTotal - balance.reviews.length).toBe(296);
    expect(getCoverage().find(item => item.id === balance.jurisdictionId)).toMatchObject({ imported: 300, reviewed: 4, independentlyReviewed: 0 });
    expect(new Set(balance.sources.map(source => source.family))).toEqual(new Set(["ayto-madrid"]));
    expect(getTerritorialBalance("r-13")).toBeNull();
    expect(getTerritorialBalance("es")).toBeNull();
    expect(getTerritorialBalance("../../m-28079")).toBeNull();
  });
  it("la proyección pública omite originales y rutas locales", () => {
    const json = JSON.stringify(getTerritorialBalance("m-28079"));
    expect(json).not.toMatch(/rawText|snapshotPath|bytes_originales|expectedText/);
    expect(Buffer.byteLength(json)).toBeLessThan(250_000);
  });
  it("no declara completadas ni independientes promesas con componentes abiertos", () => {
    const balance = getTerritorialBalance("m-28079")!;
    for (const review of balance.reviews) {
      expect(review.components.some(component => component.status === "unresolved")).toBe(true);
      expect(review.pending.join(" ")).toContain("independiente");
    }
    const ibi = balance.reviews.find(review => review.commitmentId.endsWith("-246"))!;
    expect(ibi.components[0].status).toBe("target-pending");
    expect(ibi.conclusion).toContain("no lo declara incumplido al cierre");
    expect(balance.reviews[0].periodNote).toContain("antes del mandato");
  });
  it("rechaza revisiones sin ficha, citas huérfanas y conclusiones sin evidencia", () => {
    const balance = getTerritorialBalance("m-28079")!;
    balance.reviews = structuredClone(balance.reviews);
    balance.reviews[0].commitmentId = "c-103";
    expect(() => validateTerritorialBalance(balance)).toThrow("Revisión territorial inválida");
    balance.reviews[0].commitmentId = "m-28079-103";
    balance.reviews[0].components[0].citations[0].sourceId = "national-source";
    expect(() => validateTerritorialBalance(balance)).toThrow("Cita territorial inválida");
    balance.reviews[0].components[0].citations = [];
    expect(() => validateTerritorialBalance(balance)).toThrow("sin evidencia");
  });
  it("rechaza un universo reducido, un original distinto y fuentes de otro territorio", () => {
    const balance = getTerritorialBalance("m-28079")!;
    balance.inventoryTotal = 299;
    expect(() => validateTerritorialBalance(balance)).toThrow("Inventario territorial incompleto");
    balance.inventoryTotal = 300; balance.sourceSha256 = "0".repeat(64);
    expect(() => validateTerritorialBalance(balance)).toThrow("sin programa");
    balance.sourceSha256 = inventory.sourceSha256;
    balance.sources[0].jurisdictionId = "r-13";
    expect(() => validateTerritorialBalance(balance)).toThrow("Fuente territorial inválida");
  });
});
