import { afterEach, describe, expect, it, vi } from "vitest";
import { publishedLibrary, publishedStories } from "@/lib/observatorio/published-library";
import { filterStories, searchStories, DEFAULT_FILTERS } from "@/lib/observatorio/model";
import { GET } from "@/app/api/observatorio/biblioteca/route";
vi.mock("@/lib/observatorio/sources", () => ({ ALL_SOURCES: [
  { id: "boe", name: "BOE", url: "https://www.boe.es", hosts: ["boe.es"], kind: "oficial" },
  { id: "medio", name: "Medio", url: "https://medio.es", feed: "https://medio.es/rss", hosts: ["medio.es"], kind: "noticia" },
] }));
afterEach(() => vi.unstubAllGlobals());
describe("lector público conectado al archivo conservado", () => {
  it("sirve solo la proyección validada y hace recuperable cada evidencia por clave", async () => {
    const response = await GET();
    const data = await response.json();
    expect(data).toEqual(publishedLibrary);
    expect(data.documents).toHaveLength(4);
    expect(data.documents.every((d: {visibility: string}) => d.visibility === "public")).toBe(true);
    expect(JSON.stringify(data)).not.toContain(".artifacts");
    expect(publishedStories()).toHaveLength(2);
  });
  it("archivo histórico no aumenta tendencias recientes y sí participa en búsquedas sin límite temporal", () => {
    const stories = publishedStories();
    expect(filterStories(stories, DEFAULT_FILTERS, Date.parse("2026-10-07"))).toEqual([]);
    const historical = filterStories(stories, { ...DEFAULT_FILTERS, days: 0 }, Date.parse("2026-10-07"));
    expect(searchStories(historical, "vivienda").length).toBeGreaterThan(0);
    expect(stories.every((s) => s.libraryKey && s.national && !s.territories.length)).toBe(true);
  });
  it("valida una noticia citada aunque falle BOE, sin aceptar noticias generales ni contar el archivo como canal actualizado", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => url.includes("medio.es")
      ? new Response(`<rss><channel><item><title>Lectura de BOE-A-2023-12203</title><link>https://medio.es/relacionada</link></item><item><title>Sube el alquiler</title><link>https://medio.es/general</link></item></channel></rss>`)
      : new Response("No disponible", { status: 503 })));
    const { loadBulletin } = await import("@/lib/observatorio/feed");
    const result = await loadBulletin();
    expect(result.stories).toHaveLength(3);
    const news = result.stories.find((story) => story.kind === "noticia")!;
    expect(news.relatedDocuments?.[0].libraryKey).toBe(publishedLibrary.documents.find((d) => d.documentId === "BOE-A-2023-12203")?.key);
    expect(result.sources.find((source) => source.id === "boe")).toMatchObject({ state: "error", count: 0, includedCount: 0 });
  });
});
