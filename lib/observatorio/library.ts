import { parseRecord, type KnowledgeRecord } from "../knowledge/vault";
import { TOPICS, type Story } from "./model";
import { documentReferences } from "./relevance";

export interface PublicationTerritory {
  role: "jurisdiction" | "measured";
  code: string;
  label: string;
  level: "national" | "region" | "province" | "municipality";
}
export interface PublicationStatistic {
  seriesCode: string;
  unit: string;
  frequency: string;
  observations: { period: string; value: number | null }[];
}
export interface PublicationEntry {
  recordId: string;
  recordVersion: string;
  contentHash: string;
  visibility: "public";
  sourceId: "boe" | "ine";
  documentId: string;
  summary: string;
  topics: string[];
  profiles: string[];
  territory: PublicationTerritory;
  reuse: { label: string; url: string; checkedAt: string };
  reason: string;
  kind: "norma" | "indicador";
  statistic?: PublicationStatistic;
}
export interface PublicationRelation {
  from: string;
  to: string;
  type: "contexto";
  reason: string;
  evidence: string;
}
export interface PublicationManifest {
  schemaVersion: 1;
  entries: PublicationEntry[];
  relations: PublicationRelation[];
}
export interface PublicDocument extends PublicationEntry {
  key: string;
  title: string;
  sourceUrl: string;
  publisher: string;
  observedAt: string;
  publishedAt?: string;
  content: string;
  contentKind: KnowledgeRecord["contentKind"];
}
export interface PublicLibrary {
  schemaVersion: 1;
  generatedAt: string;
  documents: PublicDocument[];
  relations: PublicationRelation[];
  coverage: string;
}

export const PUBLICATION_REUSE_URLS = {
  boe: "https://www.boe.es/informacion/aviso_legal/index.php",
  ine: "https://www.ine.es/aviso_legal/",
} as const;
const topicIds = new Set<string>(TOPICS.map((topic) => topic.id));
const keyPattern = /^[a-f0-9]{32}-[a-f0-9]{32}$/;
function invalid(message: string): never {
  throw new Error(`Biblioteca pública: ${message}`);
}
function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    invalid(`${label} no válido`);
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string, max = 1000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))
    invalid(`${label} no válido`);
  return value;
}
function date(value: unknown, label: string): string {
  const result = text(value, label, 40);
  if (!/^\d{4}-\d{2}-\d{2}(?:T.*(?:Z|[+-]\d{2}:\d{2}))?$/.test(result) ||
      !Number.isFinite(Date.parse(result)) ||
      (/^\d{4}-\d{2}-\d{2}$/.test(result) && new Date(result).toISOString().slice(0, 10) !== result))
    invalid(`${label} no válida`);
  return result;
}
function labels(value: unknown, label: string, allowed?: Set<string>): string[] {
  if (!Array.isArray(value) || !value.length || value.length > 30)
    invalid(`${label} no válidos`);
  const values = value.map((item) => text(item, label, 100));
  if (new Set(values).size !== values.length || (allowed && values.some((item) => !allowed.has(item))))
    invalid(`${label} duplicados o desconocidos`);
  return values;
}
function territory(value: unknown): PublicationTerritory {
  const v = object(value, "territorio");
  if (v.role !== "jurisdiction" && v.role !== "measured") invalid("función territorial no válida");
  const code = text(v.code, "código territorial", 5);
  const label = text(v.label, "nombre territorial", 120);
  const valid = v.level === "national" ? code === "ES"
    : v.level === "region" ? /^\d{2}$/.test(code) && Number(code) >= 1 && Number(code) <= 19
    : v.level === "province" ? /^\d{2}$/.test(code) && Number(code) >= 1 && Number(code) <= 52
    : v.level === "municipality" ? /^\d{5}$/.test(code) && Number(code.slice(0, 2)) >= 1 && Number(code.slice(0, 2)) <= 52
    : false;
  if (!valid) invalid("código y nivel territorial incompatibles");
  return { role: v.role, code, label, level: v.level as PublicationTerritory["level"] };
}
function statistic(value: unknown): PublicationStatistic {
  const v = object(value, "serie estadística");
  const seriesCode = text(v.seriesCode, "código de serie", 80);
  if (!/^[A-Za-z0-9_.-]+$/.test(seriesCode)) invalid("código de serie no válido");
  const unit = text(v.unit, "unidad", 200);
  const frequency = text(v.frequency, "frecuencia", 40);
  const periods: Record<string, RegExp> = {
    anual: /^\d{4}$/, trimestral: /^\d{4}-Q[1-4]$/, mensual: /^\d{4}-(0[1-9]|1[0-2])$/,
    semestral: /^\d{4}-S[12]$/, semanal: /^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/, diaria: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
  };
  const pattern = periods[frequency.toLocaleLowerCase("es")];
  if (!pattern || !Array.isArray(v.observations) || !v.observations.length || v.observations.length > 10_000)
    invalid("frecuencia u observaciones no válidas");
  const seen = new Set<string>();
  const observations = v.observations.map((item) => {
    const observation = object(item, "observación");
    const period = text(observation.period, "periodo", 10);
    if (!pattern.test(period) || seen.has(period)) invalid("periodo incompatible o duplicado");
    if (frequency.toLocaleLowerCase("es") === "diaria") date(period, "periodo");
    if (observation.value !== null && (typeof observation.value !== "number" || !Number.isFinite(observation.value)))
      invalid("valor estadístico no numérico");
    seen.add(period);
    return { period, value: observation.value as number | null };
  });
  return { seriesCode, unit, frequency, observations };
}
function officialUrl(record: KnowledgeRecord, entry: PublicationEntry) {
  const url = new URL(record.sourceUrl);
  if (url.protocol !== "https:" || url.port || url.username || url.password || url.hash)
    invalid("procedencia oficial no válida");
  if (entry.sourceId === "boe") {
    if (!["www.boe.es", "boe.es"].includes(url.hostname) ||
        !["/diario_boe/txt.php", "/diario_boe/xml.php", "/buscar/doc.php", "/buscar/act.php"].includes(url.pathname) ||
        url.searchParams.get("id") !== entry.documentId ||
        !/^BOE-[AB]-\d{4}-\d+$/.test(entry.documentId) ||
        record.kind !== "norma" || entry.kind !== "norma" || entry.territory.role !== "jurisdiction" ||
        !["texto_completo", "sumario"].includes(record.contentKind) || entry.statistic)
      invalid("la entrada no corresponde al documento BOE autorizado");
  } else {
    if (url.hostname !== "servicios.ine.es" ||
        !["ES", "es"].some((language) => url.pathname === `/wstempus/js/${language}/DATOS_SERIE/${entry.statistic?.seriesCode}`) ||
        entry.kind !== "indicador" || record.kind !== "reporte" || record.contentKind !== "derivado" ||
        entry.territory.role !== "measured" || entry.documentId !== entry.statistic?.seriesCode)
      invalid("la entrada no corresponde a la serie INE autorizada");
    let payload: Record<string, unknown>;
    try { payload = object(JSON.parse(record.content), "contenido INE"); }
    catch { invalid("contenido INE no válido"); }
    const capturedStatistic = statistic(payload);
    const capturedTerritory = territory(payload.territory);
    if (JSON.stringify(capturedStatistic) !== JSON.stringify(entry.statistic) ||
        JSON.stringify(capturedTerritory) !== JSON.stringify(entry.territory))
      invalid("los datos o el territorio no coinciden con la captura INE");
  }
}
function entry(value: unknown): PublicationEntry {
  const v = object(value, "entrada");
  if (v.visibility !== "public" || !["boe", "ine"].includes(String(v.sourceId)) || !["norma", "indicador"].includes(String(v.kind)))
    invalid("entrada no autorizada para publicación");
  const recordId = text(v.recordId, "identificador", 32);
  const recordVersion = text(v.recordVersion, "versión", 32);
  const contentHash = text(v.contentHash, "huella", 64);
  if (!keyPattern.test(`${recordId}-${recordVersion}`) || !/^[a-f0-9]{64}$/.test(contentHash))
    invalid("referencia de captura no válida");
  const sourceId = v.sourceId as PublicationEntry["sourceId"];
  const reuse = object(v.reuse, "reutilización");
  if (reuse.url !== PUBLICATION_REUSE_URLS[sourceId]) invalid("condiciones de reutilización sin fuente oficial autorizada");
  return {
    recordId, recordVersion, contentHash, visibility: "public", sourceId,
    documentId: text(v.documentId, "documento", 100), summary: text(v.summary, "resumen", 3000),
    topics: labels(v.topics, "temas", topicIds), profiles: labels(v.profiles, "perfiles"),
    territory: territory(v.territory),
    reuse: { label: text(reuse.label, "condiciones", 500), url: reuse.url as string, checkedAt: date(reuse.checkedAt, "fecha de revisión") },
    reason: text(v.reason, "motivo de publicación", 2000), kind: v.kind as PublicationEntry["kind"],
    ...(v.statistic === undefined ? {} : { statistic: statistic(v.statistic) }),
  };
}

/** Curated projection only. The original v1 captures remain private and immutable. */
export function buildPublicLibrary(records: KnowledgeRecord[], manifest: PublicationManifest, generatedAt: string): PublicLibrary {
  const generated = date(generatedAt, "fecha de generación");
  const input = object(manifest, "manifiesto");
  if (input.schemaVersion !== 1 || !Array.isArray(input.entries) || !Array.isArray(input.relations) || input.entries.length > 1000)
    invalid("manifiesto no válido");
  const documents: PublicDocument[] = [];
  const publicKeys = new Set<string>();
  const documentIds = new Set<string>();
  for (const value of input.entries) {
    const publication = entry(value);
    const key = `${publication.recordId}-${publication.recordVersion}`;
    const identity = `${publication.sourceId}:${publication.documentId}`;
    if (publicKeys.has(key) || documentIds.has(identity)) invalid("documento público duplicado");
    const matches = records.filter((record) => record.id === publication.recordId && record.version === publication.recordVersion);
    if (matches.length !== 1) invalid("falta la captura autorizada o está duplicada");
    const record = parseRecord(matches[0]);
    if (record.contentHash !== publication.contentHash) invalid("la huella no coincide con la captura autorizada");
    // Public snapshots are independently recoverable without disclosing private links.
    if (record.relatedTo?.length) invalid("las relaciones de captura requieren revisión antes de publicar");
    officialUrl(record, publication);
    if (Date.parse(record.observedAt) > Date.parse(generated) || Date.parse(publication.reuse.checkedAt) > Date.parse(generated))
      invalid("captura o revisión posterior a la exportación");
    publicKeys.add(key);
    documentIds.add(identity);
    documents.push({
      ...publication, key, title: record.title, sourceUrl: record.sourceUrl, publisher: record.publisher,
      observedAt: record.observedAt, ...(record.publishedAt ? { publishedAt: record.publishedAt } : {}),
      content: record.content, contentKind: record.contentKind,
    });
  }
  const relationKeys = new Set<string>();
  const relations = input.relations.map((value) => {
    const v = object(value, "relación");
    const from = text(v.from, "origen de relación", 65);
    const to = text(v.to, "destino de relación", 65);
    const key = [from, to].sort().join(":");
    if (v.type !== "contexto" || from === to || !publicKeys.has(from) || !publicKeys.has(to) || relationKeys.has(key))
      invalid("relación duplicada o fuera del archivo público");
    relationKeys.add(key);
    return { from, to, type: "contexto" as const, reason: text(v.reason, "motivo de relación", 2000), evidence: text(v.evidence, "evidencia de relación", 3000) };
  });
  return {
    schemaVersion: 1, generatedAt: generated, documents, relations,
    coverage: "Selección documental del piloto. Clasificación editorial; vigencia jurídica sin verificar. Los indicadores aportan contexto, no demuestran efectos de una norma. No acredita cobertura completa ni actualización automática.",
  };
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const v = value as Record<string, unknown>;
  return `{${Object.keys(v).sort().map((key) => `${JSON.stringify(key)}:${canonical(v[key])}`).join(",")}}`;
}

/** Validate a checked-in projection and reconstruct the exact public captures. */
export function validatePublicLibrary(value: unknown): PublicLibrary {
  const v = object(value, "archivo exportado");
  if (v.schemaVersion !== 1 || !Array.isArray(v.documents) || !Array.isArray(v.relations))
    invalid("archivo exportado no válido");
  const entries = v.documents.map(entry);
  const records = v.documents.map((value, index) => {
    const document = object(value, "documento exportado");
    const publication = entries[index];
    return parseRecord({
      kind: publication.kind === "norma" ? "norma" : "reporte",
      title: document.title, sourceUrl: document.sourceUrl, publisher: document.publisher,
      observedAt: document.observedAt,
      ...(document.publishedAt === undefined ? {} : { publishedAt: document.publishedAt }),
      content: document.content, contentKind: document.contentKind, relatedTo: [],
      schemaVersion: 1, id: publication.recordId, version: publication.recordVersion,
      contentHash: publication.contentHash, review: "pendiente", legalStatus: "sin_verificar",
    });
  });
  const rebuilt = buildPublicLibrary(records, { schemaVersion: 1, entries, relations: v.relations as PublicationRelation[] }, text(v.generatedAt, "fecha de generación", 40));
  // Reject added fields as well as altered derived labels, keys and coverage statements.
  if (canonical(rebuilt) !== canonical(value)) invalid("el archivo exportado no coincide con su proyección verificable");
  return rebuilt;
}

/** Indicators remain in the library; they are never passed off as regulatory news. */
export function libraryStories(library: PublicLibrary): Story[] {
  const documents = new Map(library.documents.map((document) => [document.key, document]));
  return library.documents.filter((document) => document.kind === "norma" && document.sourceId === "boe").map((document) => {
    const t = document.territory;
    const prefix = t.level === "region" ? "r" : t.level === "province" ? "p" : "m";
    const relatedDocuments = library.relations.flatMap((relation) => {
      const key = relation.from === document.key ? relation.to : relation.to === document.key ? relation.from : undefined;
      const target = key ? documents.get(key) : undefined;
      return target ? [{ id: target.documentId, title: target.title, url: target.sourceUrl, reason: `${relation.reason} ${relation.evidence}`, libraryKey: target.key }] : [];
    });
    return {
      id: document.documentId, title: document.title, excerpt: document.summary, url: document.sourceUrl,
      sourceId: document.sourceId, source: document.publisher, kind: "oficial", author: null,
      publishedAt: document.publishedAt ?? null, topics: [...document.topics],
      territories: t.level === "national" ? [] : [`${prefix}-${t.code}`],
      national: t.role === "jurisdiction" && t.code === "ES",
      documentReferences: documentReferences(`${document.documentId} ${document.title}`),
      relatedDocuments, libraryKey: document.key,
    };
  });
}
