import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ALL_SOURCES } from "./sources";
import { parseFeed, parseBoe, territoryMatcher } from "./ingest";
import type { Bulletin, Source, Story, SourceStatus, Territory } from "./model";

async function fetchText(url: string) {
  const res = await fetch(url, {
    headers: {
      Accept: url.startsWith("https://www.boe.es/")
        ? "application/json"
        : "application/rss+xml,application/xml",
    },
    next: { revalidate: 900 },
    signal: AbortSignal.timeout(7000),
  });
  if (!res.ok) throw Error(`HTTP ${res.status}`);
  if (Number(res.headers.get("content-length")) > 2500000)
    throw Error("Fuente demasiado grande");
  const reader = res.body?.getReader();
  if (!reader) throw Error("Respuesta vacía");
  let size = 0,
    text = "";
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2500000) throw Error("Fuente demasiado grande");
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return text;
  } finally {
    await reader.cancel();
  }
}
export function spanishDay(date: Date) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
async function collect(
  source: Source,
  now: Date,
): Promise<{ stories: Story[]; status: SourceStatus }> {
  let stories: Story[] = [];
  let failed = false;
  try {
    if (source.id === "boe") {
      // Look back over a weekend without inventing a fresh publication date.
      for (let day = 0; day < 3; day++) {
        const date = spanishDay(new Date(now.getTime() - day * 86400000));
        try {
          stories = parseBoe(
            JSON.parse(
              await fetchText(
                `https://www.boe.es/datosabiertos/api/boe/sumario/${date.replaceAll("-", "")}`,
              ),
            ),
            source,
            date,
          );
        } catch {
          if (day === 2) failed = true;
        }
        if (stories.length) break;
      }
    } else stories = parseFeed(await fetchText(source.feed!), source);
  } catch {
    failed = true;
  }
  stories = stories.filter(
    (s) => !s.publishedAt || Date.parse(s.publishedAt) <= now.getTime() + 60000,
  );
  const latest =
    stories
      .map((s) => s.publishedAt)
      .filter((d): d is string => Boolean(d))
      .sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null;
  const state = failed
    ? "error"
    : !stories.length
      ? "empty"
      : latest && now.getTime() - Date.parse(latest) > 30 * 86400000
        ? "stale"
        : "ok";
  return {
    stories,
    status: {
      id: source.id,
      name: source.name,
      url: source.url,
      kind: source.kind,
      state,
      count: stories.length,
      checkedAt: now.toISOString(),
      latest,
    },
  };
}
export async function loadBulletin(): Promise<Bulletin> {
  const now = new Date();
  const territories: Territory[] = JSON.parse(
    await readFile(
      join(process.cwd(), "public/observatorio/geo/territories.json"),
      "utf8",
    ),
  );
  const locate = territoryMatcher(territories);
  // Bound simultaneous network reads; a slow channel must not starve all others.
  const results: Awaited<ReturnType<typeof collect>>[] = [];
  for (let i = 0; i < ALL_SOURCES.length; i += 6)
    results.push(
      ...(await Promise.all(
        ALL_SOURCES.slice(i, i + 6).map((s) => collect(s, now)),
      )),
    );
  const merged = new Map<string, Story>();
  for (const { stories } of results)
    for (const story of stories) {
      const located = locate(story),
        previous = merged.get(story.url);
      if (previous)
        previous.territories = [
          ...new Set([...previous.territories, ...located.territories]),
        ];
      else merged.set(story.url, located);
    }
  return {
    checkedAt: now.toISOString(),
    sources: results.map((r) => r.status),
    stories: [...merged.values()].sort(
      (a, b) =>
        (Date.parse(b.publishedAt ?? "") || 0) -
        (Date.parse(a.publishedAt ?? "") || 0),
    ),
  };
}
