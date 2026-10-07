import { XMLParser, XMLValidator } from "fast-xml-parser";
import type { KnowledgeInput, KnowledgeRecord } from "../knowledge/vault";
import { KnowledgeVault, digest, parseInput } from "../knowledge/vault";
import type { PublicationEntry } from "./library";

export const BOE_PILOT = ["BOE-A-2021-16233", "BOE-A-2023-12203"] as const;
export const INE_PILOT = {
  IPVA4962: { name: "Total Nacional. Total. Índice.", code: "ES", label: "España", level: "national" as const },
  IPVA4920: { name: "Murcia, Región de. Total. Índice.", code: "14", label: "Región de Murcia", level: "region" as const },
};
export const boeUrl = (id: string) => `https://www.boe.es/diario_boe/xml.php?id=${id}`;
export const ineUrl = (code: string) => `https://servicios.ine.es/wstempus/js/es/DATOS_SERIE/${code}?nult=5`;
const allowedUrls = new Set([...BOE_PILOT.map(boeUrl), ...Object.keys(INE_PILOT).map(ineUrl)]);

/** Fixed public resources; redirects and oversized responses fail before publication. */
export async function fetchPilotSource(url: string): Promise<string> {
  if (!allowedUrls.has(url)) throw Error("Fuente fuera del piloto");
  const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(25000) });
  if (!response.ok) throw Error(`No se pudo consultar la fuente (${response.status})`);
  if (Number(response.headers.get("content-length")) > 2500000) throw Error("Respuesta demasiado grande");
  const reader = response.body?.getReader();
  if (!reader) throw Error("Respuesta vacía");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2500000) throw Error("Respuesta demasiado grande");
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  return new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
}

function orderedText(nodes: unknown): string {
  if (!Array.isArray(nodes)) return "";
  return nodes.map((node: Record<string, unknown>) => Object.entries(node)
    .filter(([key]) => key !== ":@")
    .map(([key, value]) => key === "#text" ? String(value) :
      `${orderedText(value)}${["p", "tr", "h1", "h2", "h3"].includes(key) ? "\n" : " "}`)
    .join("")).join("");
}

export function parsePilotBoe(xml: string, id: string, observedAt: string): KnowledgeInput {
  if (!BOE_PILOT.some((candidate) => candidate === id) || xml.length > 2500000 ||
    /<!DOCTYPE|<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true) throw Error("XML BOE no válido");
  const document = new XMLParser({ parseTagValue: false }).parse(xml)?.documento;
  const metadata = document?.metadatos;
  if (metadata?.identificador !== id || typeof metadata?.titulo !== "string" ||
    !/^\d{8}$/.test(metadata?.fecha_publicacion ?? "") || !document?.texto) throw Error("Documento BOE no coincide");
  const rawDate = metadata.fecha_publicacion as string;
  const publishedAt = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
  if (new Date(publishedAt).toISOString().slice(0, 10) !== publishedAt) throw Error("Fecha BOE no válida");
  const ordered = new XMLParser({ preserveOrder: true, parseTagValue: false, trimValues: false }).parse(xml);
  const body = ordered.find((n: Record<string, unknown>) => n.documento)?.documento
    ?.find((n: Record<string, unknown>) => n.texto)?.texto;
  const content = orderedText(body).replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (content.length < 100 || content.length > 1900000) throw Error("Texto BOE vacío o demasiado grande");
  // This is the daily publication, never a claim about the consolidated/current law.
  return { kind: "norma", title: metadata.titulo, sourceUrl: `https://www.boe.es/diario_boe/txt.php?id=${id}`,
    publisher: "Agencia Estatal Boletín Oficial del Estado", observedAt, publishedAt, content, contentKind: "texto_completo" };
}

export function parsePilotIne(raw: string, seriesCode: keyof typeof INE_PILOT, observedAt: string) {
  const definition = INE_PILOT[seriesCode];
  if (!definition || raw.length > 2500000) throw Error("Serie fuera del piloto");
  const source = JSON.parse(raw);
  if (source?.COD !== seriesCode || source.Nombre?.trim() !== definition.name || source.FK_Unidad !== 133 ||
    source.FK_Escala !== 1 || !Array.isArray(source.Data) || !source.Data.length || source.Data.length > 5) throw Error("Metadatos INE distintos de los revisados");
  const seen = new Set<number>();
  const observations = source.Data.map((point: Record<string, unknown>) => {
    if (!Number.isInteger(point.Anyo) || Number(point.Anyo) < 2015 || Number(point.Anyo) > new Date(observedAt).getUTCFullYear() ||
      point.FK_Periodo !== 28 || point.FK_TipoDato !== 1 || typeof point.Secreto !== "boolean" ||
      (point.Valor !== null && (typeof point.Valor !== "number" || !Number.isFinite(point.Valor))) || seen.has(Number(point.Anyo)))
      throw Error("Observación INE no válida o revisable");
    seen.add(Number(point.Anyo));
    return { period: String(point.Anyo), value: point.Secreto ? null : point.Valor as number | null };
  }).sort((a: {period: string}, b: {period: string}) => a.period.localeCompare(b.period));
  const territory = { role: "measured" as const, code: definition.code, label: definition.label, level: definition.level };
  const statistic = { seriesCode, unit: "Índice (base 2015 = 100)", frequency: "anual", observations };
  const input: KnowledgeInput = { kind: "reporte", title: `Índice de precios de la vivienda en alquiler · ${definition.label}`,
    sourceUrl: ineUrl(seriesCode), publisher: "Instituto Nacional de Estadística", observedAt,
    content: JSON.stringify({ ...statistic, territory }), contentKind: "derivado" };
  return { input, statistic, territory };
}

/** Ignore only retrieval time. Identical content/metadata is an observation, not a new version. */
export async function captureIfChanged(vault: KnowledgeVault, input: KnowledgeInput): Promise<KnowledgeRecord> {
  input = parseInput(input);
  const id = digest(`${input.kind}\n${input.sourceUrl}`).slice(0, 32);
  const previous = (await vault.list({ latest: true })).find((r) => r.id === id);
  const stable = (value: KnowledgeInput) => JSON.stringify({ kind: value.kind, title: value.title,
    sourceUrl: value.sourceUrl, publisher: value.publisher, publishedAt: value.publishedAt,
    content: value.content, contentKind: value.contentKind, relatedTo: value.relatedTo });
  return previous && stable(previous) === stable(input) ? previous : vault.put(input);
}

export function publication(record: KnowledgeRecord, annotation: Omit<PublicationEntry, "recordId" | "recordVersion" | "contentHash" | "visibility">): PublicationEntry {
  return { ...annotation, recordId: record.id, recordVersion: record.version, contentHash: record.contentHash, visibility: "public" };
}
