import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { INDICATOR_SPECS, buildIndicators, normalizeEurostat, normalizeIne, periodDate, sha256, type CaptureManifest } from "../scripts/import-mandate-indicators";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");
const manifest = JSON.parse(read("data/mandate/evidence/indicators/manifest.json")) as CaptureManifest;
function ineSpec(id: string) {
  const spec = INDICATOR_SPECS.find(item => item.id === id);
  if (!spec || spec.provider !== "ine") throw Error("INE fixture specification missing");
  return spec;
}
function euroSpec(id: string) {
  const spec = INDICATOR_SPECS.find(item => item.id === id);
  if (!spec || spec.provider !== "eurostat") throw Error("Eurostat fixture specification missing");
  return spec;
}
type IneFixture = { COD: string; Nombre: string; FK_Unidad: number; FK_Escala: number; Data: { Fecha: number; Anyo: number; FK_Periodo: number; FK_TipoDato: number; Valor: number | null; Secreto: boolean }[] };
const ineFixture = (id: string): IneFixture => JSON.parse(read(`data/mandate/evidence/indicators/${id}.json`));
type EuroFixture = { id: string[]; size: number[]; value: Record<string, number | null>; status: Record<string, string>; dimension: Record<string, { category: { index: Record<string, number> } }> };
const euroFixture = (id: string): EuroFixture => JSON.parse(read(`data/mandate/evidence/indicators/${id}.json`));

describe("mandate indicators: original evidence and public projection", () => {
  it("replays all 15 public series byte-for-byte without network and validates every evidence hash", () => {
    const built = buildIndicators(manifest, read);
    expect(`${JSON.stringify(built, null, 2)}\n`).toBe(read("data/mandate/indicators.json"));
    expect(built.indicators).toHaveLength(15);
    expect(built.indicators.reduce((sum, item) => sum + item.observations.length, 0)).toBe(179);
    for (const indicator of built.indicators) {
      expect(indicator.source.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(indicator.observations).toContainEqual(indicator.baseline);
      expect(indicator.observations.map(point => point.period)).toEqual([...new Set(indicator.observations.map(point => point.period))].sort());
    }
  });

  it("rejects source content tampering even if it is valid JSON", () => {
    expect(() => buildIndicators(manifest, path => path.endsWith("debt-stock.json") ? read(path).replace('1739501', '1739502') : read(path))).toThrow("evidence hash mismatch");
  });

  it("rejects a reassigned time offset in captured data before interpreting it", () => {
    expect(() => buildIndicators(manifest, path => {
      if (!path.endsWith("debt-stock.json")) return read(path);
      const swapped = euroFixture("debt-stock");
      const time = swapped.dimension.time.category.index;
      [time["2023-Q1"], time["2023-Q2"]] = [time["2023-Q2"], time["2023-Q1"]];
      return JSON.stringify(swapped);
    })).toThrow("evidence hash mismatch");
  });

  it("rejects unapproved URLs, duplicate captures and path traversal", () => {
    const wrongUrl = structuredClone(manifest);
    wrongUrl.captures[0].url = "https://example.org/replacement";
    expect(() => buildIndicators(wrongUrl, read)).toThrow("invalid source capture");
    const duplicate = structuredClone(manifest);
    duplicate.captures[1] = duplicate.captures[0];
    expect(() => buildIndicators(duplicate, read)).toThrow("Duplicate capture");
    const traversal = structuredClone(manifest);
    traversal.captures[0].evidencePath = "../outside.json";
    expect(() => buildIndicators(traversal, read)).toThrow("Unexpected evidence path");
  });

  it("keeps the income reference year distinct from ECV collection year", () => {
    const income = normalizeIne(ineFixture("income-person"), ineSpec("income-person"));
    expect(income).toMatchObject([
      { period: "2023", sourcePeriod: "2024", date: "2023-01-01", value: 14807 },
      { period: "2024", sourcePeriod: "2025", date: "2024-01-01", value: 15620 },
    ]);
    expect(normalizeIne(ineFixture("arope"), ineSpec("arope")).at(-1)).toMatchObject({ period: "2025", value: 25.7 });
  });

  it("pairs national debt stock and ratio from exactly the same periods, with provisional flags", () => {
    const built = buildIndicators(manifest, read);
    const stock = built.indicators.find(item => item.id === "debt-stock")!;
    const ratio = built.indicators.find(item => item.id === "debt-gdp")!;
    expect(stock.observations.map(point => point.period)).toEqual(ratio.observations.map(point => point.period));
    expect(stock.observations.at(-1)).toMatchObject({ period: "2026-Q1", value: 1739501, status: "p" });
    expect(ratio.observations.at(-1)).toMatchObject({ period: "2026-Q1", value: 101.6, status: "p" });
    expect(stock.unit).toBe("millones de euros corrientes");
    expect(ratio.unit).toBe("% del PIB");
  });

  it("verifies INE definitive/advance labels against the expanded official API response", () => {
    const reference = JSON.parse(read("data/mandate/evidence/indicators/ine-status-reference.json")) as { Data: { Anyo: number; T3_Periodo: string; T3_TipoDato: string; Valor: number }[] };
    const proof = JSON.parse(read("data/mandate/evidence/indicators/ine-status-reference.source.json")) as { sha256: string };
    expect(sha256(read("data/mandate/evidence/indicators/ine-status-reference.json"))).toBe(proof.sha256);
    const points = normalizeIne(ineFixture("cpi-inflation"), ineSpec("cpi-inflation"));
    for (const point of reference.Data) {
      const originalPeriod = `${point.Anyo}-${point.T3_Periodo.slice(1)}`;
      expect(points.find(item => item.period === originalPeriod)).toMatchObject({ value: point.Valor, status: point.T3_TipoDato.toLowerCase() });
    }
    expect(points.at(-1)).toMatchObject({ period: "2026-09", status: "avance" });
    expect(normalizeIne(ineFixture("cpi-level"), ineSpec("cpi-level")).at(-1)?.period).toBe("2026-08");
  });
});

describe("statistical contracts fail closed", () => {
  it("rejects changed INE unit, scale, population and series identifier", () => {
    for (const mutation of [{ FK_Unidad: 7 }, { FK_Escala: 1 }, { Nombre: "Hombres. Ocupados." }, { COD: "EPA-other" }]) {
      expect(() => normalizeIne({ ...ineFixture("epa-employment"), ...mutation }, ineSpec("epa-employment"))).toThrow(/changed/);
    }
  });

  it("preserves explicit missing values and confidentiality instead of coercing them to zero", () => {
    const missing = ineFixture("epa-employment");
    missing.Data.at(-1)!.Valor = null;
    expect(normalizeIne(missing, ineSpec("epa-employment")).at(-1)?.value).toBeNull();
    const confidential = ineFixture("epa-employment");
    confidential.Data.at(-1)!.Secreto = true;
    expect(normalizeIne(confidential, ineSpec("epa-employment")).at(-1)).toMatchObject({ value: null, status: "confidencial" });
    const absent = euroFixture("debt-stock");
    delete absent.value["12"];
    expect(normalizeEurostat(absent, euroSpec("debt-stock")).at(-1)?.value).toBeNull();
  });

  it("rejects duplicate or disappeared periods and conflicting INE timestamps", () => {
    const duplicate = ineFixture("epa-employment");
    duplicate.Data.push(duplicate.Data.at(-1)!);
    expect(() => normalizeIne(duplicate, ineSpec("epa-employment"))).toThrow("Duplicate period");
    const gap = ineFixture("epa-employment");
    gap.Data.splice(gap.Data.length - 2, 1);
    expect(() => normalizeIne(gap, ineSpec("epa-employment"))).toThrow("Missing period");
    const conflict = ineFixture("epa-employment");
    conflict.Data.at(-1)!.FK_Periodo = 19;
    expect(() => normalizeIne(conflict, ineSpec("epa-employment"))).toThrow("timestamp disagrees");
  });

  it("rejects incompatible Eurostat units, territory, sector, dimensions and offsets", () => {
    for (const [key, code] of [["unit", "PC_GDP"], ["geo", "FR"], ["sector", "S1311"]]) {
      const wrong = euroFixture("debt-stock");
      wrong.dimension[key].category.index = { [code]: 0 };
      expect(() => normalizeEurostat(wrong, euroSpec("debt-stock"))).toThrow(`unexpected ${key}`);
    }
    const dimension = euroFixture("debt-stock");
    dimension.id.push("sex");
    expect(() => normalizeEurostat(dimension, euroSpec("debt-stock"))).toThrow("dimension set changed");
    const offset = euroFixture("debt-stock");
    offset.dimension.time.category.index["2023-Q1"] = 1;
    expect(() => normalizeEurostat(offset, euroSpec("debt-stock"))).toThrow("Invalid time offsets");
  });

  it("rejects forecasts and keeps unknown status labels rather than inventing certainty", () => {
    const forecast = euroFixture("debt-stock");
    forecast.status["12"] = "f";
    expect(() => normalizeEurostat(forecast, euroSpec("debt-stock"))).toThrow("Forecast");
    const unknown = ineFixture("epa-employment");
    unknown.Data.at(-1)!.FK_TipoDato = 99;
    expect(normalizeIne(unknown, ineSpec("epa-employment")).at(-1)?.status).toBe("INE tipo 99");
  });

  it("uses explicit period anchors including quarter boundaries, never a UTC previous day", () => {
    expect(periodDate("2023-Q3")).toBe("2023-07-01");
    expect(periodDate("2023-10")).toBe("2023-10-01");
    expect(periodDate("2023")).toBe("2023-01-01");
    expect(() => periodDate("2023-13")).toThrow();
    expect(() => periodDate("2023-Q5")).toThrow();
  });
});
