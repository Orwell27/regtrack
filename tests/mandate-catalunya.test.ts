import { describe, expect, it } from "vitest";
import extraction from "@/data/mandate/evidence/territorial/catalunya-programme-2024.pages.json";
import inventory from "@/data/mandate/catalunya-inventory.json";
import { parseCatalunyaProgramme } from "@/lib/mandate/catalunya-import";
import { getTerritorialBalance } from "@/lib/mandate/territorial";
import { getCoverage } from "@/lib/mandate/coverage";

describe("Cataluña: 260 medidas originales y revisiones con límites", () => {
  it("reproduce las 260 medidas de 35 objetivos y conserva horizontes distintos", () => {
    expect(extraction.sourceSha256).toBe(inventory.sourceSha256);
    const records = parseCatalunyaProgramme(extraction.pages);
    expect(records).toEqual(inventory.records);
    expect(records).toHaveLength(260);
    expect(new Set(records.map(record => record.topic)).size).toBe(35);
    expect(new Set(records.map(record => record.officialId.split(".")[0])).size).toBe(5);
    expect(new Set(records.map(record => record.id)).size).toBe(260);
    expect(records.find(record => record.officialId === "1.7.1")?.text).toContain("2030");
    expect(records.find(record => record.officialId === "1.7.5")?.text).toContain("vint anys");
    expect(records.find(record => record.officialId === "1.7.6")?.text).toContain("bonificació dels interessos");
    expect(records.find(record => record.officialId === "2.2.6")?.text).toContain("mercat d'emissions");
    // 1.6.4 has its identifier on a separate printed line; its body must survive.
    expect(records.find(record => record.officialId === "1.6.4")).toMatchObject({ page: 61, endPage: 61 });
    expect(records.find(record => record.officialId === "1.6.4")?.text).toContain("3.282");
    expect(records.at(-1)).toMatchObject({ officialId: "5.5.8", endPage: 109 });
  });
  it("rechaza páginas perdidas, numeración duplicada y medidas finales omitidas", () => {
    expect(() => parseCatalunyaProgramme(extraction.pages.slice(1))).toThrow("páginas incompletas");
    const duplicate = structuredClone(extraction.pages);
    duplicate[61].text = duplicate[61].text.replace("1.7.2.", "1.7.1.");
    expect(() => parseCatalunyaProgramme(duplicate)).toThrow("secuencia inválida");
    const missing = structuredClone(extraction.pages);
    missing[108].text = missing[108].text.replace("5.5.8.", "");
    expect(() => parseCatalunyaProgramme(missing)).toThrow("objetivo incompleto");
  });
  it("publica el idioma original, 2 revisiones y 258 pendientes sin texto bruto", () => {
    const balance = getTerritorialBalance("r-09")!;
    expect(balance).toMatchObject({ inventoryTotal: 260, textLanguage: "ca", level: "region" });
    expect(balance.reviews).toHaveLength(2);
    expect(balance.inventoryTotal - balance.reviews.length).toBe(258);
    expect(JSON.stringify(balance)).not.toMatch(/rawText|snapshotPath|expectedText|governmentState/);
    expect(Buffer.byteLength(JSON.stringify(balance))).toBeLessThan(250_000);
    expect(getCoverage().find(item => item.id === "r-09")).toMatchObject({ imported: 260, reviewed: 2, independentlyReviewed: 0 });
  });
  it("no convierte aprobaciones de préstamos o presupuestos climáticos en resultados", () => {
    const balance = getTerritorialBalance("r-09")!;
    expect(balance.reviews[0].components.map(component => component.status)).toEqual(["documented", "documented", "reported", "unresolved"]);
    expect(balance.reviews[1].components.map(component => component.status)).toEqual(["documented", "documented", "unresolved"]);
    expect(balance.reviews[0].components[2].finding).toContain("no significa que todas estuvieran firmadas o desembolsadas");
    expect(balance.reviews[1].components[0].finding).toContain("acumulados en cinco años");
    expect(balance.sources.find(source => source.id === "catalunya-carbon-bopc")?.captureType).toBe("extracto_editorial");
    expect(balance.sources.filter(source => source.captureType === "bytes_originales")).toHaveLength(8);
    expect(balance.reviews.every(review => review.pending.some(item => item.includes("humana independiente")))).toBe(true);
  });
});
