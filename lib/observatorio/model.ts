export type Territory = {
  id: string;
  name: string;
  level: "region" | "province" | "municipality";
  region: string;
  province: string;
  code: string;
};
export type MapShape = { id: string; d: string; bounds: number[] };
export type SourceKind = "oficial" | "noticia" | "analisis";
export type Source = {
  id: string;
  name: string;
  kind: SourceKind;
  url: string;
  feed?: string;
  hosts: string[];
  description: string;
  region?: string;
};
export type Story = {
  id: string;
  title: string;
  excerpt: string;
  url: string;
  sourceId: string;
  source: string;
  kind: SourceKind;
  author: string | null;
  /** Server-composed interpretation, kept separate from the source's own extract. */
  editorialContext?: string;
  publishedAt: string | null;
  topics: string[];
  territories: string[];
  national: boolean;
  /** Explicitly published snapshot, separate from the private memory. */
  libraryKey?: string;
  /** Identifiers only; never the full syndicated article. */
  documentReferences?: string[];
  relatedDocuments?: {
    id: string;
    title: string;
    url: string;
    reason: string;
    libraryKey?: string;
  }[];
};
export type SourceStatus = {
  id: string;
  name: string;
  url: string;
  kind: SourceKind;
  state: "ok" | "empty" | "error" | "stale";
  count: number;
  includedCount?: number;
  checkedAt: string;
  latest: string | null;
};
export type Bulletin = {
  stories: Story[];
  sources: SourceStatus[];
  checkedAt: string;
};
export type Filters = {
  territory: string;
  topic: string;
  kind: string;
  source: string;
  days: number;
  includeNational: boolean;
};
export const DEFAULT_FILTERS: Filters = {
  territory: "",
  topic: "",
  kind: "",
  source: "",
  days: 7,
  includeNational: false,
};

export const TOPICS = [
  {
    id: "vivienda",
    name: "Vivienda",
    words: "vivienda|alquiler|hipoteca|inquilino|arrendamiento|inmobiliari",
  },
  {
    id: "economia",
    name: "Economía",
    words:
      "economia|economico|inflacion|pib|deuda|banco|financier|inversion|mercados|presupuesto",
  },
  {
    id: "politica",
    name: "Política e instituciones",
    words:
      "politica|eleccion|gobierno|congreso|senado|parlamento|democracia|presidente|ministro",
  },
  {
    id: "empleo",
    name: "Empleo",
    words:
      "empleo|laboral|trabajador|salario|paro|oposicion|concurso|funcionario|personal|nombramiento",
  },
  {
    id: "fiscalidad",
    name: "Impuestos",
    words: "impuesto|fiscal|tributari|irpf|hacienda|iva",
  },
  {
    id: "salud",
    name: "Salud",
    words:
      "salud|sanidad|sanitari|hospital|medicamento|medic[oa]|enfermedad|vacuna",
  },
  {
    id: "educacion",
    name: "Educación",
    words:
      "educacion|educativ|universidad|universitari|escuela|colegio|beca|docente|alumno",
  },
  {
    id: "justicia",
    name: "Justicia y derechos",
    words:
      "justicia|judicial|tribunal|juez|jueces|derecho|constitucional|amnistia|sentencia",
  },
  {
    id: "energia",
    name: "Energía",
    words:
      "energia|energetic|electric|renovable|gas |petroleo|combustible|solar",
  },
  {
    id: "medioambiente",
    name: "Medioambiente",
    words:
      "medio ambiente|ambiental|clima|climatic|agua|sequia|residuo|incendio|biodiversidad",
  },
  {
    id: "transporte",
    name: "Movilidad y transporte",
    words:
      "transporte|movilidad|tren|ferroviari|carretera|trafico|aeropuerto|aviacion",
  },
  {
    id: "turismo",
    name: "Turismo",
    words: "turismo|turistic|hotel|viajero|alojamiento|vacacional",
  },
  {
    id: "tecnologia",
    name: "Tecnología y datos",
    words:
      "tecnologia|tecnologic|digital|inteligencia artificial|ciber|proteccion de datos|telecomunicacion",
  },
  {
    id: "ciencia",
    name: "Ciencia e investigación",
    words: "ciencia|cientific|investigacion|espacial|innovacion|csic",
  },
  {
    id: "agricultura",
    name: "Campo y alimentación",
    words: "agricultura|agricol|ganader|pesca|aliment|rural|regadio|cultivo",
  },
  {
    id: "empresa",
    name: "Empresas y comercio",
    words: "empresa|comercio|comercial|autonomo|pyme|industria|emprend",
  },
  {
    id: "proteccion-social",
    name: "Protección social",
    words:
      "pension|dependencia|seguridad social|prestacion|discapacidad|servicios sociales|vulnerab",
  },
  {
    id: "cultura",
    name: "Cultura",
    words: "cultura|cine|musica|museo|patrimonio|literatura|teatro|libro",
  },
  {
    id: "deporte",
    name: "Deporte",
    words: "deporte|deportiv|futbol|olimpic|baloncesto|tenis",
  },
  {
    id: "seguridad",
    name: "Seguridad y defensa",
    words:
      "seguridad|defensa|policia|militar|ejercito|guardia civil|emergencia",
  },
  {
    id: "internacional",
    name: "Europa e internacional",
    words:
      "europa|europeo|union europea|internacional|geopolitic|exterior|guerra|otan|ucrania",
  },
  {
    id: "igualdad",
    name: "Igualdad y sociedad",
    words:
      "igualdad|mujer|genero|migracion|inmigracion|familia|infancia|juventud|discriminacion",
  },
  {
    id: "ayudas",
    name: "Ayudas y contratación",
    words: "ayuda|subvencion|licitacion|contratacion|concesion|convenio",
  },
  {
    id: "urbanismo",
    name: "Territorio y urbanismo",
    words:
      "urbanismo|urbanistic|suelo|ordenacion|infraestructura|municipal|ayuntamiento",
  },
  { id: "otros", name: "Otros asuntos", words: "" },
] as const;
export function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Shorten procedural boilerplate, keeping the operative clause verbatim.
// The original title is always available beside this reading aid.
export function readableTitle(story: Story) {
  if (story.kind !== "oficial") return story.title;
  const match = story.title.match(/\bpor (?:la|el) que (se .+)$/i);
  return match ? match[1][0].toUpperCase() + match[1].slice(1) : story.title;
}
const topicPatterns = TOPICS.filter((t) => t.words).map((t) => ({
  id: t.id,
  re: new RegExp(`\\b(?:${t.words})`),
}));
export function classifyTopics(value: string) {
  const text = normalize(value);
  const ids = topicPatterns.filter((t) => t.re.test(text)).map((t) => t.id);
  return ids.length ? ids : ["otros"];
}
export function matchesTerritory(
  story: Story,
  id: string,
  includeNational = false,
) {
  return (
    !id || story.territories.includes(id) || (includeNational && story.national)
  );
}
export function filterStories(
  stories: Story[],
  filters: Filters,
  now = Date.now(),
) {
  return stories.filter(
    (s) =>
      matchesTerritory(s, filters.territory, filters.includeNational) &&
      (!filters.topic || s.topics.includes(filters.topic)) &&
      (!filters.kind || s.kind === filters.kind) &&
      (!filters.source || s.sourceId === filters.source) &&
      (!filters.days ||
        (s.publishedAt !== null &&
          Date.parse(s.publishedAt) <= now + 60000 &&
          Date.parse(s.publishedAt) >= now - filters.days * 86400000)),
  );
}
export function popularTopics(stories: Story[]) {
  const counts = new Map<string, number>();
  for (const s of stories)
    for (const topic of new Set(s.topics))
      counts.set(topic, (counts.get(topic) ?? 0) + 1);
  return TOPICS.filter((t) => t.id !== "otros" && counts.has(t.id))
    .map((t) => ({ ...t, count: counts.get(t.id)! }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}
const stop = new Set(
  "que qué como cómo cuando cuándo donde dónde quien quién para por del las los una unos unas sobre hay esta este esto estos estas puedo puede tengo hacer afecta novedades cambios saber quiero cuáles cuales cuanto cuánto desde hasta en el la un de y o a me mi es se al con sin lo nos son"
    .split(" ")
    .map(normalize),
);
export function searchStories(stories: Story[], query: string) {
  const terms = [
    ...new Set(
      normalize(query)
        .split(" ")
        .filter((t) => t.length > 2 && !stop.has(t)),
    ),
  ];
  if (!terms.length) return [];
  const topics = classifyTopics(query).filter((t) => t !== "otros");
  return stories
    .map((story) => {
      const title = normalize(story.title),
        body = normalize(story.excerpt);
      const matches = terms.filter(
        (t) => title.includes(t) || body.includes(t),
      );
      const score =
        matches.reduce((n, t) => n + (title.includes(t) ? 3 : 1), 0) +
        topics.filter((t) => story.topics.includes(t)).length;
      return { story, score, matches: matches.length };
    })
    .filter((x) => x.matches > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((x) => x.story);
}
export const KIND_LABELS: Record<SourceKind, string> = {
  oficial: "Fuente oficial",
  noticia: "Información periodística",
  analisis: "Análisis y opinión",
};
