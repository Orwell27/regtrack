import { describe, expect, it, vi, afterEach } from "vitest";
import { documentReferences, relatedBulletin } from "@/lib/observatorio/relevance";
import { parseBoeDocument, parseFeed } from "@/lib/observatorio/ingest";
import type { Story, Source } from "@/lib/observatorio/model";

const boe: Source = { id: "boe", name: "BOE", url: "https://www.boe.es", hosts: ["boe.es"], kind: "oficial", description: "" };
const media: Source = { id: "medio", name: "Medio", url: "https://medio.es", feed: "https://medio.es/rss", hosts: ["medio.es"], kind: "noticia", description: "" };
const law: Story = {
  id: "BOE-A-2023-12203", title: "Ley 12/2023, de 24 de mayo, por el derecho a la vivienda.",
  excerpt: "", url: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2023-12203", sourceId: "boe", source: "BOE", kind: "oficial",
  author: null, publishedAt: "2023-05-25T00:00:00Z", topics: ["vivienda"], territories: [], national: false,
};
const news = (title: string, extra: Partial<Story> = {}): Story => ({ ...law, id: title, title, url: `https://medio.es/${encodeURIComponent(title)}`, kind: "noticia", sourceId: "medio", ...extra });
const xml = `<documento><metadatos><identificador>${law.id}</identificador><titulo>${law.title}</titulo><fecha_publicacion>20230525</fecha_publicacion></metadatos></documento>`;

describe("selección documental de noticias", () => {
  it("excluye coincidencias de tema, territorio y actualidad general, también opiniones", () => {
    const candidates = [law, news("Sube el precio de la vivienda"), news("Un gol decide el partido en Madrid"), news("Fallece una actriz"), news("Opinión sobre el alquiler", { kind: "analisis" })];
    expect(relatedBulletin(candidates)).toEqual([law]);
  });
  it("vincula una cita exacta y conserva título, URL y motivo del documento", () => {
    const selected = relatedBulletin([law, news("Consecuencias del BOE-A-2023-12203")]);
    expect(selected[1].relatedDocuments).toEqual([{ id: law.id, title: law.title, url: law.url, reason: `El canal cita la publicación ${law.id}.` }]);
  });
  it("reconoce la ley con fecha completa, pero no una ley ambigua por número", () => {
    expect(relatedBulletin([law, news("Análisis de la Ley 12/2023")])).toHaveLength(1);
    expect(relatedBulletin([law, news("Análisis de la Ley 12/2023, de 24 de mayo")])).toHaveLength(2);
    const regionalCollision = { ...law, id: "BOE-A-2023-555", url: "https://www.boe.es/otra" };
    expect(relatedBulletin([law, regionalCollision, news(law.title)])).toHaveLength(2);
  });
  it("diferencia el rango y el año de los reales decretos", () => {
    expect(documentReferences("Real Decreto-ley 8/2026")).toEqual(["norma:real decreto ley:8/2026"]);
    const royal = { ...law, title: "Real Decreto 8/2026, de 2 de enero, sobre vivienda" };
    expect(relatedBulletin([royal, news("Real Decreto-ley 8/2026"), news("Real Decreto 8/2025")])).toHaveLength(1);
    expect(relatedBulletin([royal, news("Real Decreto 8/2026")])).toHaveLength(2);
  });
  it("una noticia no valida otra noticia ni un vínculo previamente suministrado", () => {
    expect(relatedBulletin([news(law.title), news("Otra noticia", { relatedDocuments: [{ id: law.id, title: law.title, url: law.url, reason: "sin comprobar" }] })])).toEqual([]);
    expect(relatedBulletin([news(law.id)], [news(law.title)])).toEqual([]);
  });
  it("extrae citas de enlaces y contenido RSS sin publicar el cuerpo completo", () => {
    const feed = `<rss><channel><item><title>Análisis</title><link>https://medio.es/analisis</link><description>Un resumen breve.</description><content:encoded><![CDATA[${"palabra ".repeat(50)}<a href="${law.url}">La norma</a>]]></content:encoded></item></channel></rss>`;
    const parsed = parseFeed(feed, media);
    expect(parsed[0].documentReferences).toEqual([law.id]);
    expect(parsed[0].excerpt).toBe("Un resumen breve.");
    expect(relatedBulletin(parsed, [law])[0].relatedDocuments?.[0].id).toBe(law.id);
  });
  it("no confunde leyes citadas por una resolución con la identidad de la resolución", () => {
    expect(relatedBulletin([{ ...law, title: `Resolución que aplica la ${law.title}` }, news(law.title)])).toHaveLength(1);
  });
  it("comprueba identidad y fecha del documento BOE recuperado", () => {
    expect(parseBoeDocument(xml, law.id, boe)?.title).toBe(law.title);
    expect(parseBoeDocument(xml, "BOE-A-2023-999", boe)).toBeNull();
    expect(parseBoeDocument(xml.replace("20230525", "20230231"), law.id, boe)).toBeNull();
    expect(parseBoeDocument("<html>Error</html>", law.id, boe)).toBeNull();
    expect(parseBoeDocument(`<!DOCTYPE x>${xml}`, law.id, boe)).toBeNull();
  });
});

vi.mock("@/lib/observatorio/sources", () => ({ ALL_SOURCES: [
  { id: "boe", name: "BOE", url: "https://www.boe.es", hosts: ["boe.es"], kind: "oficial" },
  { id: "medio", name: "Medio", url: "https://medio.es", feed: "https://medio.es/rss", hosts: ["medio.es"], kind: "noticia" },
] }));
vi.mock("@/lib/observatorio/published-library", () => ({ publishedStories: () => [] }));
afterEach(() => vi.unstubAllGlobals());
describe("el boletín público aplica el filtro antes de devolver datos", () => {
  it.each([true, false])("referencia antigua disponible: %s; nunca admite actualidad sin relación", async (available) => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/sumario/")) return new Response(JSON.stringify({}));
      if (url.includes("xml.php")) return new Response(available ? xml : "unavailable", { status: available ? 200 : 503 });
      return new Response(`<rss><channel><item><title>La norma ${law.id}</title><link>https://medio.es/relacionada</link></item><item><title>Resultados de fútbol</title><link>https://medio.es/deporte</link></item></channel></rss>`);
    });
    vi.stubGlobal("fetch", fetchMock);
    const { loadBulletin } = await import("@/lib/observatorio/feed");
    const result = await loadBulletin();
    expect(result.stories).toHaveLength(available ? 1 : 0);
    expect(result.stories.some((s) => s.title.includes("fútbol"))).toBe(false);
    expect(result.sources.find((s) => s.id === "medio")).toMatchObject({ count: 2, includedCount: available ? 1 : 0 });
    if (available) expect(result.stories[0].relatedDocuments?.[0].url).toBe(law.url);
    expect(fetchMock.mock.calls.some(([url]) => url === `https://www.boe.es/diario_boe/xml.php?id=${law.id}`)).toBe(true);
  });
});
