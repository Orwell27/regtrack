import { describe, expect, it } from "vitest";
import extraction from "@/data/mandate/evidence/territorial/navarra-balance-2025.pages.json";
import inventory from "@/data/mandate/navarra-inventory.json";
import { parseNavarraBalance } from "@/lib/mandate/navarra-import";
import { getTerritorialBalance } from "@/lib/mandate/territorial";
import { validateTerritorialBalance } from "@/lib/mandate/territorial-model";
import { getCoverage } from "@/lib/mandate/coverage";

describe("Navarra: inventario gubernamental separado del acuerdo y de la revisión", () => {
  it("reproduce las 347 fichas, sus páginas y la distribución del balance", () => {
    expect(extraction.sourceSha256).toBe(inventory.sourceSha256);
    const records = parseNavarraBalance(extraction.pages);
    expect(records).toEqual(inventory.records);
    expect(records).toHaveLength(347);
    expect(records.filter(record => record.governmentState === "Finalizado")).toHaveLength(47);
    expect(records.find(record => record.officialId === "03.01.39")).toMatchObject({ text: "Personal referente", governmentState: "Descartado", page: 78 });
    expect(new Set(records.map(record => record.topic)).size).toBe(13);
  });
  it("rechaza páginas ausentes, identificadores duplicados y estados manipulados", () => {
    expect(() => parseNavarraBalance(extraction.pages.slice(1))).toThrow("páginas incompletas");
    const duplicated = structuredClone(extraction.pages);
    duplicated[45].text = duplicated[45].text.replace("01.01.02", "01.01.01");
    expect(() => parseNavarraBalance(duplicated)).toThrow("duplicado");
    const state = structuredClone(extraction.pages);
    state[77].text = state[77].text.replace("Descartado", "Finalizado");
    expect(() => parseNavarraBalance(state)).toThrow("distribución de estados");
  });
  it("conserva el programa como referencia del mandato sin atribuirle el texto del balance", () => {
    const balance = getTerritorialBalance("r-15")!;
    expect(balance).toMatchObject({ sourceId: "navarra-balance-2025", mandateSourceId: "navarra-programme-2023", level: "region", governmentCutoff: "2025-12-31" });
    expect(getCoverage().find(item => item.id === "r-15")).toMatchObject({ imported: 347, reviewed: 3, independentlyReviewed: 0, mandate: { sourceId: "navarra-programme-2023" } });
    expect(balance.inventoryTotal - balance.reviews.length).toBe(344);
    expect(JSON.stringify(balance)).not.toMatch(/rawText|snapshotPath|expectedText/);
    expect(Buffer.byteLength(JSON.stringify(balance))).toBeLessThan(250_000);
  });
  it("no convierte finalizados del Gobierno en revisiones completas ni omite las condiciones del acuerdo", () => {
    const balance = getTerritorialBalance("r-15")!;
    const bidean = balance.reviews.find(review => review.commitmentId.endsWith("01.01.04"))!;
    expect(bidean.components.map(component => component.status)).toEqual(["reported", "documented", "unresolved", "unresolved"]);
    expect(bidean.components.find(component => component.id === "control-creacion")?.finding).toContain("no demuestra que el servicio iniciado en 2025 sea ineficiente");
    expect(bidean.conclusion).toContain("criterio geográfico");
    expect(balance.reviews[0].components[0].status).toBe("deadline-missed");
    expect(balance.reviews[0].periodNote).toContain("no describe el estado parlamentario a octubre");
    expect(balance.reviews.every(review => review.pending.join(" ").includes("independiente"))).toBe(true);
    expect(balance.sources.some(source => source.family === "ayto-madrid")).toBe(false);
  });
  it("impide estados declarados sin fecha y sustituir el acuerdo por el informe de seguimiento", () => {
    const balance = getTerritorialBalance("r-15")!;
    balance.mandateSourceId = balance.sourceId;
    expect(() => validateTerritorialBalance(balance)).toThrow("sin programa");
    balance.mandateSourceId = "navarra-programme-2023";
    delete balance.governmentCutoff;
    expect(() => validateTerritorialBalance(balance)).toThrow("Estado gubernamental sin fecha");
  });
});
