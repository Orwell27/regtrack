import { XMLParser } from "fast-xml-parser";
import { documentReferences } from "./relevance";
import {
  classifyTopics,
  normalize,
  type Story,
  type Source,
  type Territory,
} from "./model";
export function plain(value: unknown): string {
  const raw =
    typeof value === "string"
      ? value
      : typeof value === "number"
        ? String(value)
        : value && typeof value === "object"
          ? "#text" in value
            ? String(value["#text"])
            : ""
          : "";
  return raw
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(
      /&(?:nbsp|amp|quot|apos|lt|gt);/g,
      (s) =>
        ({
          "&nbsp;": " ",
          "&amp;": "&",
          "&quot;": '"',
          "&apos;": "'",
          "&lt;": "<",
          "&gt;": ">",
        })[s] ?? s,
    )
    .replace(/\s+/g, " ")
    .trim();
}
export function safeSourceUrl(value: unknown, source: Source) {
  try {
    const u = new URL(plain(value));
    if (!["https:", "http:"].includes(u.protocol) || u.username || u.password)
      return null;
    if (
      !source.hosts.some(
        (h) => u.hostname === h || u.hostname.endsWith("." + h),
      )
    )
      return null;
    u.hash = "";
    return u.href;
  } catch {
    return null;
  }
}
export function isoDate(value: unknown) {
  const raw = plain(value);
  const time = Date.parse(raw);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}
const asArray = (v: unknown): Record<string, unknown>[] =>
  !v
    ? []
    : ((Array.isArray(v) ? v : [v]).filter(
        (x) => x && typeof x === "object",
      ) as Record<string, unknown>[]);
export function parseFeed(xml: string, source: Source): Story[] {
  if (xml.length > 2500000 || /<!DOCTYPE|<!ENTITY/i.test(xml))
    throw Error("Feed no aceptado");
  const doc = new XMLParser({
    ignoreAttributes: false,
    processEntities: false,
  }).parse(xml);
  if (!doc.rss?.channel && !doc.feed)
    throw Error("El origen no devolvió RSS o Atom");
  const entries = asArray(doc.rss?.channel?.item ?? doc.feed?.entry);
  return entries.slice(0, source.region ? 12 : 30).flatMap((item) => {
    const link =
      typeof item.link === "string"
        ? item.link
        : asArray(item.link).find(
            (l) => !l["@_rel"] || l["@_rel"] === "alternate",
          )?.["@_href"];
    const url = safeSourceUrl(link, source),
      title = plain(item.title).slice(0, 500);
    if (!url || !title) return [];
    const excerpt = plain(item.description ?? item.summary)
      .split(" ")
      .slice(0, 24)
      .join(" ")
      .slice(0, 250);
    const author =
      plain(
        item["dc:creator"] ?? (item.author as Record<string, unknown>)?.name,
      ).slice(0, 160) || null;
    const categories =
      asArray(item.category)
        .map((x) => plain(x))
        .join(" ") +
      " " +
      (Array.isArray(item.category)
        ? item.category.map(plain).join(" ")
        : plain(item.category));
    const opinion =
      /\b(opinion|editorial|columna)\b/.test(normalize(categories)) ||
      /\/opinion\//.test(url);
    return [
      {
        id: url,
        title,
        excerpt,
        url,
        sourceId: source.id,
        source: source.name,
        kind: opinion ? "analisis" : source.kind,
        author,
        publishedAt: isoDate(item.pubDate ?? item.published ?? item.updated),
        topics: classifyTopics(title + " " + excerpt + " " + categories),
        territories: source.region ? [source.region] : [],
        national: false,
        documentReferences: documentReferences(
          `${title} ${plain(item.description ?? item.summary)} ${typeof (item.description ?? item.summary) === "string" ? item.description ?? item.summary : ""} ${typeof item["content:encoded"] === "string" ? item["content:encoded"] : ""}`,
        ),
      },
    ];
  });
}
export function parseBoe(data: unknown, source: Source, date: string): Story[] {
  const stories: Story[] = [];
  function walk(node: unknown, department = "") {
    if (Array.isArray(node)) {
      for (const value of node) walk(value, department);
      return;
    }
    if (!node || typeof node !== "object") return;
    const n = node as Record<string, unknown>;
    if (n.identificador && n.titulo && n.url_html) {
      const url = safeSourceUrl(
        typeof n.url_html === "object"
          ? (n.url_html as Record<string, unknown>).texto
          : n.url_html,
        source,
      );
      if (url)
        stories.push({
          id: String(n.identificador),
          title: plain(n.titulo),
          excerpt: department
            ? `Publicado por ${department}. Consulta el texto oficial para conocer requisitos, fechas y excepciones.`
            : "Consulta el texto oficial para conocer requisitos, fechas y excepciones.",
          url,
          sourceId: source.id,
          source: source.name,
          kind: "oficial",
          author: department || null,
          publishedAt: date + "T00:00:00+02:00",
          topics: classifyTopics(plain(n.titulo) + " " + department),
          territories: [],
          national: false,
        });
      return;
    }
    for (const [key, value] of Object.entries(n)) {
      if (key === "departamento") {
        for (const dep of asArray(value))
          walk(dep, plain(dep.nombre ?? dep.titulo));
      } else walk(value, department);
    }
  }
  walk(data);
  return stories;
}
/** Verify a cited older BOE record without retaining its full legal text. */
export function parseBoeDocument(xml: string, expectedId: string, source: Source): Story | null {
  if (xml.length > 2500000 || /<!DOCTYPE|<!ENTITY/i.test(xml)) return null;
  const metadata = new XMLParser({ ignoreAttributes: false, processEntities: false })
    .parse(xml)?.documento?.metadatos;
  if (!metadata || plain(metadata.identificador) !== expectedId) return null;
  const title = plain(metadata.titulo);
  const rawDate = plain(metadata.fecha_publicacion);
  if (!title || !/^\d{8}$/.test(rawDate)) return null;
  const date = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
  if (!Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) return null;
  return {
    id: expectedId, title, excerpt: "Documento oficial citado por un canal del observatorio.",
    url: `https://www.boe.es/diario_boe/txt.php?id=${expectedId}`,
    sourceId: source.id, source: source.name, kind: "oficial",
    author: plain(metadata.departamento) || null,
    publishedAt: `${date}T00:00:00Z`, topics: classifyTopics(title), territories: [], national: false,
  };
}
export function territoryMatcher(territories: Territory[]) {
  const aliases = new Map<string, Territory[]>(),
    byId = new Map(territories.map((t) => [t.id, t]));
  for (const t of territories) {
    const names = t.name.split("/").map(normalize);
    for (const n of names) {
      if (n.length < 5) continue;
      const a = aliases.get(n) ?? [];
      a.push(t);
      aliases.set(n, a);
    }
  }
  const extras: Record<string, string> = {
    asturias: "r-03",
    baleares: "r-04",
    cataluna: "r-09",
    "comunidad valenciana": "r-10",
    madrid: "r-13",
    murcia: "r-14",
    navarra: "r-15",
    "pais vasco": "r-16",
    euskadi: "r-16",
    ceuta: "r-18",
    melilla: "r-19",
  };
  for (const [name, id] of Object.entries(extras)) {
    const t = byId.get(id);
    if (t) aliases.set(name, [t]);
  }
  return (story: Story): Story => {
    const ids = new Set(story.territories),
      words = normalize(story.title + " " + story.excerpt).split(" ");
    for (let i = 0; i < words.length; i++)
      for (let len = 1; len <= 8 && i + len <= words.length; len++) {
        const found = aliases.get(words.slice(i, i + len).join(" "));
        if (!found || found.length !== 1) continue;
        const t = found[0];
        ids.add(t.id);
        ids.add(t.region);
        if (t.level === "municipality") ids.add(t.province);
      }
    // BOE is the publication channel, not a nationwide applicability label.
    const national =
      /\b(espana|estatal|nacional|general del estado)\b/.test(
        normalize(story.title),
      ) && ids.size === 0;
    return { ...story, territories: [...ids], national };
  };
}
