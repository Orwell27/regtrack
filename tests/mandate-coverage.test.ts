import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import inventory from "@/data/mandate/inventory.json";
import { getCoverage, getPublicInventory } from "@/lib/mandate/coverage";
import { isCoverageComplete, validateCoverage } from "@/lib/mandate/coverage-model";
import { getMandateSnapshot } from "@/lib/mandate/data";
import { answerMandate, findMandateRecords } from "@/lib/mandate/answer";
import { parseInventoryCsv, readInventoryRecords } from "@/lib/mandate/inventory-csv";

describe("inventario nacional completo, sin convertir importaciones en revisiones", () => {
  it("conserva las 203 filas del CSV original verificado, incluidos saltos de línea y comillas", () => {
    const bytes = readFileSync("data/mandate/evidence/commitments/cumpliendo-julio-2026.csv");
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(inventory.sourceSha256);
    const records = readInventoryRecords(new TextDecoder("windows-1252").decode(bytes));
    expect(records).toEqual(inventory.records);
    expect(records).toHaveLength(203);
    expect(new Set(records.map(item => item.id)).size).toBe(203);
    for (const item of getMandateSnapshot().commitments) {
      expect(records.find(record => record.id === item.id)).toMatchObject({ text: item.text, origin: item.origin });
    }
  });
  it("resuelve campos entrecomillados y no pierde el último campo vacío", () => {
    expect(parseInventoryCsv('a;"b;c\r\nd";"e""f";')).toEqual([["a", "b;c\r\nd", 'e"f', ""]]);
  });
  it.each(['a;"sin cerrar', 'a;"cerrado"x', 'a;comilla"suelta'])('rechaza CSV mal formado: %s', csv => {
    expect(() => parseInventoryCsv(csv)).toThrow();
  });
  it("rechaza duplicados, columnas ausentes y cabecera cambiada", () => {
    const original = new TextDecoder("windows-1252").decode(readFileSync("data/mandate/evidence/commitments/cumpliendo-julio-2026.csv"));
    const header = "Título\nPeriodo\n" + parseInventoryCsv(original)[2].join(";") + "\n";
    expect(() => readInventoryRecords(header + "1;A;B;;;;;;;;;;\n1;C;D;;;;;;;;;;")).toThrow("duplicado");
    expect(() => readInventoryRecords(header + "1;A")).toThrow("Registro inválido");
    expect(() => readInventoryRecords(header.replace("Compromiso", "Otro") + "1;A;B")).toThrow("Cabecera");
  });
  it("muestra 173 pendientes sin asignarles un veredicto y no serializa la captura completa", () => {
    const data = getPublicInventory();
    expect(data.records.filter(item => item.reviewed)).toHaveLength(30);
    const pending = data.records.filter(item => !item.reviewed);
    expect(pending).toHaveLength(173);
    expect(pending.every(item => item.verdict === null)).toBe(true);
    const json = JSON.stringify(data);
    expect(json).not.toMatch(/snapshotPath|currentInitiatives|previousInitiatives|verificationSources/);
    expect(Buffer.byteLength(json)).toBeLessThan(250_000);
  });
});

describe("cobertura de 70 administraciones con responsabilidades separadas", () => {
  it.each(["¿Qué promesas de vivienda cumplió Madrid?", "¿Cuándo son las elecciones en Andalucía?", "Balance de sanidad de Navarra", "¿Qué ha hecho el Ayuntamiento por el alquiler?", "Empleo en Vitoria-Gasteiz", "¿Ha cumplido el gobierno autonómico?"])("no responde con pruebas nacionales a: %s", question => {
    const snapshot = getMandateSnapshot();
    const answer = answerMandate(snapshot, question);
    expect(answer.mode).toBe("no-evidence");
    expect(answer.sources).toEqual([]);
    expect(answer.note).toContain("información territorial");
    expect(findMandateRecords(snapshot, question)).toEqual({ commitments: [], indicators: [] });
  });
  it("conserva consultas nacionales sin ámbito territorial concreto", () => {
    expect(answerMandate(getMandateSnapshot(), "¿Qué medidas nacionales existen sobre vivienda?").mode).toBe("documental");
  });
  it("incluye 17 comunidades, 2 ciudades autónomas y una capital por cada una de las 50 provincias", () => {
    const all = getCoverage();
    expect(all).toHaveLength(70);
    expect(all.filter(item => item.level === "national")).toHaveLength(1);
    expect(all.filter(item => item.level === "region")).toHaveLength(17);
    expect(all.filter(item => item.level === "autonomous-city")).toHaveLength(2);
    const cities = all.filter(item => item.level === "municipality");
    expect(cities).toHaveLength(50);
    expect(new Set(cities.map(item => item.province)).size).toBe(50);
    expect(cities.some(item => ["m-51001", "m-52001"].includes(item.id))).toBe(false);
    expect(cities.find(item => item.province === "p-33")?.name).toBe("Oviedo");
    expect(cities.find(item => item.province === "p-36")?.name).toBe("Pontevedra");
  });
  it("no hereda los 30 contrastes nacionales en ningún territorio", () => {
    const all = getCoverage();
    expect(all[0].reviewed).toBe(30);
    for (const item of all.slice(1)) {
      expect(item.reviewed).toBe(0);
      expect(item.inventoryTotal).toBeNull();
      expect(isCoverageComplete(item)).toBe(false);
    }
    expect(all.filter(isCoverageComplete)).toHaveLength(0);
    expect(all.find(item => item.id === "r-13")?.sources[0].family).not.toBe(all.find(item => item.id === "m-28079")?.sources[0].family);
  });
  it("no permite cerrar un inventario vacío, desconocido o sin revisión independiente", () => {
    const item = structuredClone(getCoverage()[0]);
    item.reviewed = 203; item.blockers = [];
    expect(isCoverageComplete(item)).toBe(false);
    item.independentlyReviewed = 203;
    expect(isCoverageComplete(item)).toBe(true);
    item.inventoryTotal = null;
    expect(isCoverageComplete(item)).toBe(false);
    item.inventoryTotal = 0; item.imported = 0; item.reviewed = 0; item.independentlyReviewed = 0;
    expect(isCoverageComplete(item)).toBe(false);
  });
  it("rechaza duplicados, revisiones huérfanas y mandatos sin fuente", () => {
    const all = getCoverage();
    expect(() => validateCoverage([...all, all[0]])).toThrow("Jurisdicción duplicada");
    const item = structuredClone(all[1]); item.reviewed = 1;
    expect(() => validateCoverage([item])).toThrow("Revisión sin inventario");
    item.reviewed = 0; item.mandate = { label: "2023–2027", sourceId: "missing" };
    expect(() => validateCoverage([item])).toThrow("Mandato sin fuente");
  });
});
