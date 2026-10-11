import { describe, expect, it } from "vitest";
import extraction from "@/data/mandate/evidence/territorial/euskadi-programme-2024.pages.json";
import inventory from "@/data/mandate/euskadi-inventory.json";
import { parseEuskadiProgramme } from "@/lib/mandate/euskadi-import";
import { getTerritorialBalance } from "@/lib/mandate/territorial";
import { validateTerritorialBalance } from "@/lib/mandate/territorial-model";
import { getCoverage } from "@/lib/mandate/coverage";

describe("Euskadi: compromisos completos con sus iniciativas y evidencia limitada", () => {
  it("reproduce 154 compromisos y 846 iniciativas de las 32 áreas", () => {
    expect(extraction.sourceSha256).toBe(inventory.sourceSha256);
    const records = parseEuskadiProgramme(extraction.pages);
    expect(records).toEqual(inventory.records);
    expect(records).toHaveLength(154);
    expect(new Set(records.map(record => record.topic)).size).toBe(32);
    expect(records.reduce((total, record) => total + record.initiatives.length, 0)).toBe(846);
    // Two initiatives share one printed line; neither can disappear or absorb the other.
    expect(records[10].initiatives).toHaveLength(8);
    expect(records[10].initiatives[4].text).toBe("Configurar un Estatuto de las personas cuidadoras, profesionales y familiares.");
    expect(records[10].initiatives[5]).toMatchObject({ officialId: "6", page: 33 });
    expect(records[10].initiatives[5].text).toMatch(/^Promover la transversalidad/);
    expect(records[123]).toMatchObject({ page: 105, endPage: 106 });
    expect(records[123].initiatives).toHaveLength(4);
    expect(records[153]).toMatchObject({ officialId: "154", endPage: 128 });
    expect(records[17].initiatives).toHaveLength(5);
    expect(records[51].initiatives).toHaveLength(8);
  });
  it("rechaza una página perdida, una promesa duplicada y una iniciativa omitida", () => {
    expect(() => parseEuskadiProgramme(extraction.pages.slice(1))).toThrow("páginas incompletas");
    const duplicate = structuredClone(extraction.pages);
    duplicate[32].text = duplicate[32].text.replace("COMPROMISO 12.", "COMPROMISO 11.");
    expect(() => parseEuskadiProgramme(duplicate)).toThrow("secuencia de compromisos");
    const missing = structuredClone(extraction.pages);
    missing[32].text = missing[32].text.replace("Iniciativa 6.", "");
    expect(() => parseEuskadiProgramme(missing)).toThrow("secuencia de iniciativas");
    const last = structuredClone(extraction.pages);
    last[127].text = last[127].text.replace("Iniciativa 4. Ampliar", "Ampliar");
    expect(() => parseEuskadiProgramme(last)).toThrow("inventario incompleto");
  });
  it("coteja los 154 títulos con el índice sin trasladar sus dos erratas al cuerpo", () => {
    const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const index = extraction.pages.filter(page => page.page >= 13 && page.page <= 24).map(page => page.text).join("\n");
    // The archived index says 'desl' (143) and 'esxterior' (151); the body does not.
    const indexText = normalize(index.replace("Defensa desl", "Defensa del").replace("esxterior", "exterior"));
    for (const record of inventory.records) expect(indexText, record.id).toContain(normalize(record.text));
  });
  it("no traslada los estados gubernamentales ni el texto bruto al navegador", () => {
    const balance = getTerritorialBalance("r-16")!;
    expect(balance).toMatchObject({ level: "region", inventoryTotal: 154, sourceId: "euskadi-programme-2024", mandateSourceId: "euskadi-programme-2024" });
    expect(balance.reviews).toHaveLength(2);
    expect(balance.inventoryTotal - balance.reviews.length).toBe(152);
    expect(balance.records.reduce((total, record) => total + (record.initiatives?.length ?? 0), 0)).toBe(846);
    expect(JSON.stringify(balance)).not.toMatch(/rawText|snapshotPath|expectedText|governmentState/);
    expect(Buffer.byteLength(JSON.stringify(balance))).toBeLessThan(400_000);
    expect(getCoverage().find(item => item.id === "r-16")).toMatchObject({ imported: 154, reviewed: 2, independentlyReviewed: 0 });
    expect(balance.reviews.some(review => review.commitmentId === "r-16-52")).toBe(false);
  });
  it("no confunde tablas del prestador, quejas externas y evaluación causal", () => {
    const balance = getTerritorialBalance("r-16")!;
    const health = balance.reviews[0];
    expect(health.components.map(component => component.status)).toEqual(["documented", "reported", "reported", "documented", "unresolved"]);
    expect(health.periodNote).toContain("No son datos de octubre");
    expect(health.components[1].finding).toContain("54,19");
    expect(health.components[1].finding).toContain("77,40");
    expect(health.components[3].finding).toContain("no constituyen un segundo recuento independiente");
    expect(balance.sources.find(source => source.id === "euskadi-ararteko-2025")?.family).toBe("ararteko");
    expect(balance.reviews[1].components[0].finding).toContain("hasta 30.000");
    expect(balance.reviews[1].components[1].finding).toContain("exactamente 30.000 € queda fuera");
    expect(balance.reviews.every(review => review.pending.some(item => item.includes("humana independiente")))).toBe(true);
  });
  it("rechaza iniciativas duplicadas o páginas fuera de su compromiso", () => {
    const balance = structuredClone(getTerritorialBalance("r-16")!);
    balance.records[0].initiatives![1].officialId = "1";
    expect(() => validateTerritorialBalance(balance)).toThrow("Iniciativa territorial inválida");
    balance.records[0].initiatives![1].officialId = "2";
    balance.records[0].initiatives![1].endPage = 99;
    expect(() => validateTerritorialBalance(balance)).toThrow("Iniciativa territorial inválida");
  });
});
