import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { KnowledgeVault } from "@/lib/knowledge/vault";
import { captureIfChanged, parsePilotBoe, parsePilotIne, fetchPilotSource } from "@/lib/observatorio/pilot-ingest";
const stamp = "2026-10-07T10:00:00.000Z";
const id = "BOE-A-2023-12203";
const xml = `<documento><metadatos><identificador>${id}</identificador><titulo>Ley de vivienda</titulo><fecha_publicacion>20230525</fecha_publicacion></metadatos><referencias><texto>NO ES CUERPO</texto></referencias><texto><p>Artículo 1. ${"Vivienda ".repeat(12)}<b>protegida</b> y pública.</p><p>Artículo 2. Final &amp; completo.</p></texto></documento>`;
const ine = { COD: "IPVA4962", Nombre: "Total Nacional. Total. Índice. ", FK_Unidad: 133, FK_Escala: 1, Data: [
  { Anyo: 2020, FK_Periodo: 28, FK_TipoDato: 1, Valor: 110.942, Secreto: false },
  { Anyo: 2021, FK_Periodo: 28, FK_TipoDato: 1, Valor: null, Secreto: false },
  { Anyo: 2022, FK_Periodo: 28, FK_TipoDato: 1, Valor: 9, Secreto: true },
] };
afterEach(() => vi.unstubAllGlobals());
describe("importación documental reproducible", () => {
  it("conserva el cuerpo BOE ordenado y no mezcla metadatos o referencias", () => {
    const result = parsePilotBoe(xml, id, stamp);
    expect(result.content).toContain("protegida y pública.\nArtículo 2. Final & completo.");
    expect(result.content).not.toContain("NO ES CUERPO");
    expect(result.publishedAt).toBe("2023-05-25");
    expect(() => parsePilotBoe(xml.replace(id, "BOE-A-2020-1"), id, stamp)).toThrow();
    expect(() => parsePilotBoe(`<!DOCTYPE x>${xml}`, id, stamp)).toThrow();
    expect(() => parsePilotBoe(xml.replace("20230525", "20230231"), id, stamp)).toThrow();
  });
  it("conserva escala, nulos y secreto estadístico sin inventar publicación", () => {
    const parsed = parsePilotIne(JSON.stringify(ine), "IPVA4962", stamp);
    expect(parsed.statistic.observations).toEqual([{ period: "2020", value: 110.942 }, { period: "2021", value: null }, { period: "2022", value: null }]);
    expect(parsed.territory).toMatchObject({ code: "ES", level: "national", role: "measured" });
    expect(parsed.input.publishedAt).toBeUndefined();
    for (const corrupt of [{ ...ine, FK_Unidad: 1 }, { ...ine, COD: "IPVA4920" }, { ...ine, Data: [...ine.Data, ine.Data[0]] }, { ...ine, Data: [{ ...ine.Data[0], FK_Periodo: 1 }] }])
      expect(() => parsePilotIne(JSON.stringify(corrupt), "IPVA4962", stamp)).toThrow();
  });
  it("reintenta sin duplicar y conserva una nueva versión solo al cambiar la evidencia", async () => {
    const dir = await mkdtemp(join(tmpdir(), "regtrack-pilot-"));
    try {
      const vault = new KnowledgeVault(dir);
      const input = parsePilotBoe(xml, id, stamp);
      const first = await captureIfChanged(vault, input);
      const repeated = await captureIfChanged(vault, { ...input, observedAt: "2026-10-07T11:00:00Z" });
      expect(repeated).toEqual(first);
      const next = await captureIfChanged(vault, { ...input, content: input.content + "\nCorrección.", observedAt: "2026-10-07T11:00:00Z" });
      expect(next.id).toBe(first.id);
      expect(next.version).not.toBe(first.version);
      expect(vault.list()).toHaveLength(2);
      expect(vault.list({ asOf: stamp })).toEqual([first]);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
  it("rechaza URLs fuera de lista y respuestas incompletas sin fingir un documento vacío", async () => {
    const fetchMock = vi.fn(async () => new Response("No disponible", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchPilotSource("http://127.0.0.1/private")).rejects.toThrow("fuera");
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(fetchPilotSource(`https://www.boe.es/diario_boe/xml.php?id=${id}`)).rejects.toThrow("503");
    fetchMock.mockImplementation(async () => new Response("ok", { headers: { "content-length": "3000000" } }));
    await expect(fetchPilotSource(`https://www.boe.es/diario_boe/xml.php?id=${id}`)).rejects.toThrow("grande");
  });
});
