import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { KnowledgeVault, digest, parseInput, type KnowledgeInput, type KnowledgeRecord } from "@/lib/knowledge/vault";
import { PUBLICATION_REUSE_URLS, buildPublicLibrary, libraryStories, validatePublicLibrary, type PublicationEntry, type PublicationManifest, type PublicationStatistic, type PublicationTerritory } from "@/lib/observatorio/library";

const capturedAt = "2026-10-07T09:00:00Z";
const generatedAt = "2026-10-07T10:00:00Z";
function record(overrides: Partial<KnowledgeInput> = {}): KnowledgeRecord {
  const input = parseInput({
    kind: "norma", title: "Ley 12/2023, de 24 de mayo, por el derecho a la vivienda.",
    sourceUrl: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2023-12203", publisher: "BOE",
    observedAt: capturedAt, publishedAt: "2023-05-25", content: "Texto oficial conservado para comprobar su procedencia.",
    contentKind: "texto_completo", ...overrides,
  });
  return { ...input, schemaVersion: 1, id: digest(`${input.kind}\n${input.sourceUrl}`).slice(0, 32),
    version: digest(JSON.stringify(input)).slice(0, 32), contentHash: digest(input.content),
    review: "pendiente", legalStatus: "sin_verificar" };
}
function entry(source: KnowledgeRecord): PublicationEntry {
  return {
    recordId: source.id, recordVersion: source.version, contentHash: source.contentHash,
    visibility: "public", sourceId: "boe", documentId: "BOE-A-2023-12203",
    summary: "Marco de la política de vivienda. Lectura pendiente de validación jurídica.",
    topics: ["vivienda"], profiles: ["ciudadania", "propietarios"],
    territory: { role: "jurisdiction", code: "ES", label: "España", level: "national" },
    reuse: { label: "Fuente y condiciones oficiales", url: PUBLICATION_REUSE_URLS.boe, checkedAt: "2026-10-07" },
    reason: "Norma elegida para el piloto documental.", kind: "norma",
  };
}
const keyOf = (r: KnowledgeRecord) => `${r.id}-${r.version}`;
function fixture() {
  const law = record();
  const territory: PublicationTerritory = { role: "measured", code: "14", label: "Región de Murcia", level: "region" };
  const statistic: PublicationStatistic = {
    seriesCode: "IPV123", unit: "Índice, base 2015 = 100", frequency: "trimestral",
    observations: [{ period: "2025-Q1", value: 125.2 }, { period: "2025-Q2", value: null }],
  };
  const indicator = record({ kind: "reporte", title: "Índice de precios de vivienda. Región de Murcia.", publisher: "INE",
    sourceUrl: "https://servicios.ine.es/wstempus/js/es/DATOS_SERIE/IPV123?tip=AM",
    contentKind: "derivado", content: JSON.stringify({ ...statistic, territory }) });
  const indicatorEntry: PublicationEntry = {
    ...entry(indicator), sourceId: "ine", documentId: "IPV123", territory, kind: "indicador", statistic,
    summary: "Serie autonómica de precios; no representa precios municipales.",
    reuse: { label: "Condiciones INE", url: PUBLICATION_REUSE_URLS.ine, checkedAt: "2026-10-07" },
  };
  const manifest: PublicationManifest = { schemaVersion: 1, entries: [entry(law), indicatorEntry],
    relations: [{ from: keyOf(law), to: keyOf(indicator), type: "contexto",
      reason: "La serie aporta contexto sobre vivienda.", evidence: "Indicador regional de precios; no mide el efecto causal de la ley." }] };
  return { law, indicator, records: [law, indicator], manifest };
}

describe("biblioteca pública: evidencia y publicación explícita", () => {
  it("publica solo capturas enumeradas, manteniendo privado un análisis del mismo archivo", () => {
    const { records, manifest } = fixture();
    const privateAnalysis = record({ kind: "analisis", sourceUrl: "urn:regtrack:internal:1", content: "No publicar esta nota interna." });
    const library = buildPublicLibrary([...records, privateAnalysis], manifest, generatedAt);
    expect(library.documents).toHaveLength(2);
    expect(JSON.stringify(library)).not.toContain("nota interna");
    expect(library.coverage).toContain("vigencia jurídica sin verificar");
    expect(library.relations).toEqual(manifest.relations);
    expect(library.documents[0]).not.toHaveProperty("relatedTo");
    expect(privateAnalysis.review).toBe("pendiente");
  });

  it("conserva una captura pública fijada aunque el archivo ya tenga otra más reciente", () => {
    const { law, records, manifest } = fixture();
    const later = record({ observedAt: generatedAt, content: "Nueva captura distinta y todavía privada." });
    const library = buildPublicLibrary([...records, later], manifest, generatedAt);
    expect(library.documents[0].recordVersion).toBe(law.version);
    expect(library.documents[0].content).toBe(law.content);
    expect(JSON.stringify(library)).not.toContain(later.content);
  });

  it("recupera las capturas públicas desde JSON y rechaza alteración o campos extra", () => {
    const { records, manifest } = fixture();
    const saved = JSON.stringify(buildPublicLibrary(records, manifest, generatedAt));
    expect(validatePublicLibrary(JSON.parse(saved))).toEqual(JSON.parse(saved));
    const modified = JSON.parse(saved);
    modified.documents[0].content += " Contenido nuevo.";
    expect(() => validatePublicLibrary(modified)).toThrow("Integridad");
    const extra = JSON.parse(saved);
    extra.documents[0].privateNote = "No publicar";
    expect(() => validatePublicLibrary(extra)).toThrow("proyección verificable");
    const modifiedCoverage = JSON.parse(saved);
    modifiedCoverage.coverage = "Todas las normas están vigentes.";
    expect(() => validatePublicLibrary(modifiedCoverage)).toThrow("proyección verificable");
  });

  it("no exporta relaciones originales privadas ni pierde su participación en la huella", () => {
    const linked = record({ relatedTo: ["a".repeat(32)] });
    expect(() => buildPublicLibrary([linked], { schemaVersion: 1, entries: [entry(linked)], relations: [] }, generatedAt)).toThrow("relaciones de captura");
  });

  it("rechaza capturas ausentes, alteradas y huellas distintas antes de exportar", () => {
    const { records, manifest } = fixture();
    expect(() => buildPublicLibrary(records.slice(1), manifest, generatedAt)).toThrow("falta la captura");
    expect(() => buildPublicLibrary([{ ...records[0], content: "modificado" }, records[1]], manifest, generatedAt)).toThrow("Integridad");
    manifest.entries[0].contentHash = "0".repeat(64);
    expect(() => buildPublicLibrary(records, manifest, generatedAt)).toThrow("huella");
  });

  it("un manifiesto privado o duplicado nunca habilita publicación por accidente", () => {
    const { records, manifest } = fixture();
    manifest.entries[0].visibility = "private" as "public";
    expect(() => buildPublicLibrary(records, manifest, generatedAt)).toThrow("no autorizada");
    manifest.entries[0].visibility = "public";
    manifest.entries.push(manifest.entries[0]);
    expect(() => buildPublicLibrary(records, manifest, generatedAt)).toThrow("duplicado");
  });

  it.each([
    "https://www.boe.es.evil.test/diario_boe/txt.php?id=BOE-A-2023-12203",
    "http://www.boe.es/diario_boe/txt.php?id=BOE-A-2023-12203",
    "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2023-99999",
    "https://www.boe.es/informacion/aviso_legal/index.php",
  ])("la etiqueta BOE no autoriza una URL arbitraria: %s", (sourceUrl) => {
    const r = record({ sourceUrl });
    expect(() => buildPublicLibrary([r], { schemaVersion: 1, entries: [entry(r)], relations: [] }, generatedAt)).toThrow();
  });

  it("no promociona un análisis privado por usar una URL oficial", () => {
    const analysis = record({ kind: "analisis", contentKind: "derivado" });
    expect(() => buildPublicLibrary([analysis], { schemaVersion: 1, entries: [entry(analysis)], relations: [] }, generatedAt)).toThrow("BOE autorizado");
  });

  it("exige las condiciones oficiales y temas conocidos", () => {
    const { records, manifest } = fixture();
    manifest.entries[0].reuse.url = "https://example.com/licencia";
    expect(() => buildPublicLibrary(records, manifest, generatedAt)).toThrow("reutilización");
    manifest.entries[0].reuse.url = PUBLICATION_REUSE_URLS.boe;
    manifest.entries[0].topics = ["tema-inventado"];
    expect(() => buildPublicLibrary(records, manifest, generatedAt)).toThrow("temas");
  });

  it("una relación necesita ambos documentos públicos y una explicación", () => {
    const { records, manifest } = fixture();
    manifest.entries.pop();
    expect(() => buildPublicLibrary(records, manifest, generatedAt)).toThrow("fuera del archivo público");
    const valid = fixture();
    valid.manifest.relations[0].evidence = "";
    expect(() => buildPublicLibrary(valid.records, valid.manifest, generatedAt)).toThrow("evidencia");
  });

  it("no duplica una relación de contexto invirtiendo sus extremos", () => {
    const { records, manifest } = fixture();
    const relation = manifest.relations[0];
    manifest.relations.push({ ...relation, from: relation.to, to: relation.from });
    expect(() => buildPublicLibrary(records, manifest, generatedAt)).toThrow("relación duplicada");
  });

  it("no admite capturas o revisiones posteriores a la fecha de exportación", () => {
    const { records, manifest } = fixture();
    expect(() => buildPublicLibrary(records, manifest, "2026-10-06T10:00:00Z")).toThrow("posterior");
  });

  it("una repetición exacta es idempotente y una nueva observación no implica cambio de texto", () => {
    const directory = mkdtempSync(join(tmpdir(), "observatorio-library-"));
    try {
      const vault = new KnowledgeVault(directory);
      const original = record();
      const first = vault.put(original);
      expect(vault.put(original).version).toBe(first.version);
      expect(vault.list()).toHaveLength(1);
      const later = vault.put({ ...original, observedAt: generatedAt });
      expect(later.version).not.toBe(first.version);
      expect(later.contentHash).toBe(first.contentHash);
      expect(vault.list()).toHaveLength(2);
      expect(vault.list({ latest: true, asOf: capturedAt })[0].version).toBe(first.version);
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
});

describe("biblioteca pública: contrato estadístico y consumidores", () => {
  it("conserva valores, unidades y ausencias de la serie capturada", () => {
    const { records, manifest } = fixture();
    const library = buildPublicLibrary(records, manifest, generatedAt);
    expect(library.documents[1].statistic?.observations).toEqual([{ period: "2025-Q1", value: 125.2 }, { period: "2025-Q2", value: null }]);
    expect(library.documents[1].territory.level).toBe("region");
  });

  it("impide atribuir a Cartagena una medida capturada para toda Murcia", () => {
    const { records, manifest } = fixture();
    manifest.entries[1].territory = { role: "measured", code: "30016", label: "Cartagena", level: "municipality" };
    expect(() => buildPublicLibrary(records, manifest, generatedAt)).toThrow("territorio no coinciden");
  });

  it("no permite cambiar valores ni unidades en la proyección", () => {
    const changedValue = fixture();
    changedValue.manifest.entries[1].statistic!.observations[0].value = 999;
    expect(() => buildPublicLibrary(changedValue.records, changedValue.manifest, generatedAt)).toThrow("no coinciden");
    const changedUnit = fixture();
    changedUnit.manifest.entries[1].statistic!.unit = "Euros por metro cuadrado";
    expect(() => buildPublicLibrary(changedUnit.records, changedUnit.manifest, generatedAt)).toThrow("no coinciden");
  });

  it.each([NaN, Infinity, "125.2"]) ("rechaza observaciones no numéricas o no finitas: %s", (value) => {
    const { records, manifest } = fixture();
    manifest.entries[1].statistic!.observations[0].value = value as number;
    expect(() => buildPublicLibrary(records, manifest, generatedAt)).toThrow("no numérico");
  });

  it("rechaza periodos duplicados y periodos incompatibles con la frecuencia", () => {
    const duplicate = fixture();
    duplicate.manifest.entries[1].statistic!.observations[1].period = "2025-Q1";
    expect(() => buildPublicLibrary(duplicate.records, duplicate.manifest, generatedAt)).toThrow("periodo");
    const monthly = fixture();
    monthly.manifest.entries[1].statistic!.frequency = "mensual";
    expect(() => buildPublicLibrary(monthly.records, monthly.manifest, generatedAt)).toThrow("periodo");
  });

  it("mapa, noticias y preguntas reciben solo normas y conservan enlaces de contexto", () => {
    const { records, manifest, law } = fixture();
    const stories = libraryStories(buildPublicLibrary(records, manifest, generatedAt));
    expect(stories).toHaveLength(1);
    expect(stories[0]).toMatchObject({ id: "BOE-A-2023-12203", kind: "oficial", national: true, territories: [], libraryKey: keyOf(law) });
    expect(stories[0].documentReferences).toContain("BOE-A-2023-12203");
    expect(stories[0].relatedDocuments?.[0]).toMatchObject({ id: "IPV123", reason: `${manifest.relations[0].reason} ${manifest.relations[0].evidence}` });
  });
});
