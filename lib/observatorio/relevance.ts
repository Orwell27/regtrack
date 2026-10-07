import { normalize, type Story } from "./model";

/** Explicit citations only. Topic similarity is not documentary evidence. */
export function documentReferences(text: string): string[] {
  const boe = text.match(/\bBOE-[AB]-\d{4}-\d+\b/gi) ?? [];
  const normalized = normalize(text);
  const laws = [...normalized.matchAll(
    /\b(real decreto(?: ley| legislativo)?|ley organica|ley) (\d+) (\d{4})(?: de (\d{1,2}) de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre))?\b/g,
  )].flatMap((m) => {
    // A plain Ley number/year can collide across autonomous communities.
    // Require its full date, then require a unique document in the index.
    if (m[1] === "ley" && !m[4]) return [];
    return [`norma:${m[1]}:${Number(m[2])}/${m[3]}${m[1] === "ley" ? `:${Number(m[4])}:${m[5]}` : ""}`];
  });
  return [...new Set([...boe.map((id) => id.toUpperCase()), ...laws])].slice(0, 40);
}

export function relatedBulletin(stories: Story[], citedDocuments: Story[] = []): Story[] {
  const official = [...new Map([...stories, ...citedDocuments]
    .filter((s) => s.kind === "oficial").map((s) => [s.id, s])).values()];
  const index = new Map<string, Story[]>();
  for (const record of official) {
    // Use the document's own identity, not laws cited inside its contents.
    const keys = documentReferences(`${record.id} ${record.url}`);
    if (/^(?:real decreto|ley)\b/.test(normalize(record.title))) {
      const first = documentReferences(record.title).find((r) => r.startsWith("norma:"));
      if (first) keys.push(first);
    }
    for (const key of new Set(keys)) index.set(key, [...(index.get(key) ?? []), record]);
  }
  return stories.flatMap((story) => {
    if (story.kind === "oficial") return [story];
    const references = new Set([
      ...documentReferences(`${story.title} ${story.excerpt}`),
      ...(story.documentReferences ?? []),
    ]);
    const related = new Map<string, NonNullable<Story["relatedDocuments"]>[number]>();
    for (const ref of references) {
      const matches = index.get(ref);
      // An ambiguous citation never admits an article automatically.
      if (matches?.length !== 1) continue;
      const record = matches[0];
      related.set(record.id, {
        id: record.id, title: record.title, url: record.url,
        ...(record.libraryKey ? { libraryKey: record.libraryKey } : {}),
        reason: ref.startsWith("BOE-")
          ? `El canal cita la publicación ${ref}.`
          : `El canal cita la misma norma: ${ref.slice(6).replaceAll(":", " · ")}.`,
      });
    }
    return related.size ? [{ ...story, relatedDocuments: [...related.values()] }] : [];
  });
}
