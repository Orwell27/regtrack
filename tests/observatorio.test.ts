import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  DEFAULT_FILTERS,
  classifyTopics,
  filterStories,
  popularTopics,
  searchStories,
  type Story,
  type Territory,
  type MapShape,
} from "@/lib/observatorio/model";
import {
  parseBoe,
  parseFeed,
  safeSourceUrl,
  territoryMatcher,
} from "@/lib/observatorio/ingest";
import { SOURCES } from "@/lib/observatorio/sources";
import { spanishDay } from "@/lib/observatorio/feed";
const base: Story = {
  id: "1",
  title: "Ayudas para rehabilitar vivienda en Cartagena",
  excerpt: "Abierto el plazo para solicitar las ayudas.",
  url: "https://www.boe.es/diario_boe/txt.php?id=1",
  sourceId: "boe",
  source: "BOE",
  kind: "oficial",
  author: null,
  publishedAt: "2026-10-06T10:00:00Z",
  topics: ["vivienda", "ayudas"],
  territories: ["m-30016", "p-30", "r-14"],
  national: false,
};
const now = Date.parse("2026-10-07T10:00:00Z");
describe("observatorio: cobertura y procedencia", () => {
  it("clasifica varios temas y conserva otros asuntos cuando no hay coincidencia", () => {
    expect(
      classifyTopics("Ayudas al alquiler y eficiencia energética"),
    ).toEqual(expect.arrayContaining(["vivienda", "energia", "ayudas"]));
    expect(classifyTopics("Aviso sin clasificar")).toEqual(["otros"]);
  });
  it("combina territorio, tema, tipo, fuente y fecha sin colar otras provincias", () => {
    const other = { ...base, id: "2", territories: ["r-13"] };
    expect(
      filterStories(
        [base, other],
        {
          ...DEFAULT_FILTERS,
          territory: "p-30",
          topic: "vivienda",
          kind: "oficial",
          source: "boe",
        },
        now,
      ),
    ).toEqual([base]);
    expect(
      filterStories([base], { ...DEFAULT_FILTERS, topic: "salud" }, now),
    ).toEqual([]);
  });
  it("no trata como recientes fechas desconocidas, futuras ni archivos antiguos", () => {
    const stories = [
      { ...base, publishedAt: null },
      { ...base, publishedAt: "2022-01-01" },
      { ...base, publishedAt: "2027-01-01" },
    ];
    expect(filterStories(stories, DEFAULT_FILTERS, now)).toHaveLength(0);
    expect(
      filterStories(stories, { ...DEFAULT_FILTERS, days: 0 }, now),
    ).toHaveLength(3);
  });
  it("no confunde una referencia nacional con una noticia local", () => {
    const national = { ...base, territories: [], national: true };
    expect(
      filterStories(
        [national],
        { ...DEFAULT_FILTERS, territory: "m-30016" },
        now,
      ),
    ).toHaveLength(0);
    expect(
      filterStories(
        [national],
        { ...DEFAULT_FILTERS, territory: "m-30016", includeNational: true },
        now,
      ),
    ).toHaveLength(1);
  });
  it("no presenta una pregunta genérica o sin evidencia como una respuesta", () => {
    expect(searchStories([base], "¿Puedes decirme qué hay?")).toHaveLength(0);
    expect(searchStories([base], "materia oscura")).toHaveLength(0);
    expect(searchStories([base], "¿Qué ayudas hay para vivienda?")).toEqual([
      base,
    ]);
  });
  it("las tendencias cuentan documentos, no personas ni etiquetas duplicadas", () => {
    expect(
      popularTopics([{ ...base, topics: ["vivienda", "vivienda"] }])[0].count,
    ).toBe(1);
  });
  it("rechaza enlaces inyectados y conserva autor, fecha y etiqueta de opinión", () => {
    const source = SOURCES.find((s) => s.id === "elpais")!;
    expect(safeSourceUrl("javascript:alert(1)", source)).toBeNull();
    expect(
      safeSourceUrl("https://elpais.com.evil.test/articulo", source),
    ).toBeNull();
    const xml =
      "<rss><channel><item><title>Un análisis</title><link>https://elpais.com/opinion/a</link><dc:creator>Autora</dc:creator><pubDate>Tue, 06 Oct 2026 10:00:00 GMT</pubDate><description><![CDATA[<script>alert(1)</script>Un extracto.]]></description></item></channel></rss>";
    const [story] = parseFeed(xml, source);
    expect(story.author).toBe("Autora");
    expect(story.kind).toBe("analisis");
    expect(story.excerpt).toBe("Un extracto.");
    expect(story.publishedAt).toBe("2026-10-06T10:00:00.000Z");
  });
  it("no acepta HTML de error como un canal vacío correcto", () => {
    expect(() =>
      parseFeed("<html>Error de acceso</html>", SOURCES[1]),
    ).toThrow();
    expect(() =>
      parseFeed('<!DOCTYPE rss [<!ENTITY e "bad">]><rss/>', SOURCES[1]),
    ).toThrow();
  });
  it("lee secciones y documentos BOE aunque no tengan epígrafe ni arrays", () => {
    const input = {
      data: {
        sumario: {
          diario: {
            seccion: [
              {
                codigo: "2",
                departamento: {
                  nombre: "Ministerio de Educación",
                  item: {
                    identificador: "BOE-A-test",
                    titulo: "Convocatoria de empleo docente",
                    url_html: { texto: base.url },
                  },
                },
              },
              {
                codigo: "5",
                departamento: {
                  nombre: "Entidad",
                  epigrafe: {
                    item: {
                      identificador: "BOE-B-test",
                      titulo: "Licitación",
                      url_html: base.url,
                    },
                  },
                },
              },
            ],
          },
        },
      },
    };
    const stories = parseBoe(input, SOURCES[0], "2026-10-06");
    expect(stories).toHaveLength(2);
    expect(stories[0].author).toBe("Ministerio de Educación");
    expect(stories[0].topics).toContain("empleo");
    expect(stories.every((s) => !s.national)).toBe(true);
  });
  it("usa la fecha de Madrid, incluso junto a medianoche y en invierno", () => {
    expect(spanishDay(new Date("2026-10-06T22:30:00Z"))).toBe("2026-10-07");
    expect(spanishDay(new Date("2026-12-01T23:30:00Z"))).toBe("2026-12-02");
  });
});
describe("cartografía oficial y menciones territoriales", () => {
  const territories: Territory[] = JSON.parse(
    readFileSync("public/observatorio/geo/territories.json", "utf8"),
  );
  it("ofrece 19 autonomías/ciudades, 52 provincias y todos los municipios de su índice", () => {
    expect(territories.filter((t) => t.level === "region")).toHaveLength(19);
    const provinces = territories.filter((t) => t.level === "province");
    expect(provinces).toHaveLength(52);
    expect(new Set(territories.map((t) => t.id)).size).toBe(territories.length);
    for (const province of provinces) {
      const shapes: MapShape[] = JSON.parse(
        readFileSync(`public/observatorio/geo/${province.id}.json`, "utf8"),
      );
      const ids = new Set(shapes.map((s) => s.id));
      const expected = territories.filter(
        (t) => t.level === "municipality" && t.province === province.id,
      );
      expect(shapes.length).toBe(expected.length);
      expect(expected.every((t) => ids.has(t.id))).toBe(true);
      expect(
        shapes.every(
          (s) => s.d.startsWith("M") && s.bounds.every(Number.isFinite),
        ),
      ).toBe(true);
    }
  });
  it("localiza Cartagena y sus ascendientes sin convertir el BOE en alcance nacional", () => {
    const locate = territoryMatcher(territories);
    const story = locate({ ...base, territories: [] });
    expect(story.territories).toEqual(
      expect.arrayContaining(["m-30016", "p-30", "r-14"]),
    );
    expect(story.national).toBe(false);
    expect(
      locate({
        ...base,
        title: "Resolución de una convocatoria",
        excerpt: "",
        territories: [],
      }).territories,
    ).toHaveLength(0);
  });
});
