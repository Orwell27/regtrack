import type { Source } from "./model";
export const SOURCES: Source[] = [
  {
    id: "boe",
    name: "BOE",
    kind: "oficial",
    url: "https://www.boe.es",
    hosts: ["boe.es"],
    description:
      "Sumario oficial completo. Publicar una disposición no acredita su vigencia ni su aplicación a un caso.",
  },
  {
    id: "rtve",
    name: "RTVE · archivo RSS",
    kind: "noticia",
    url: "https://www.rtve.es/noticias/",
    feed: "https://www.rtve.es/rss/temas_noticias.xml",
    hosts: ["rtve.es"],
    description:
      "El RSS verificado devuelve un archivo antiguo. Se conserva su fecha original y queda fuera de los periodos recientes.",
  },
  {
    id: "europapress",
    name: "Europa Press",
    kind: "noticia",
    url: "https://www.europapress.es",
    feed: "https://www.europapress.es/rss/rss.aspx",
    hosts: ["europapress.es"],
    description:
      "Titulares de agencia y canales territoriales. Se enlaza siempre a la publicación original.",
  },
  {
    id: "elpais",
    name: "El País",
    kind: "noticia",
    url: "https://elpais.com",
    feed: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada",
    hosts: ["elpais.com"],
    description:
      "Portada y firmas del medio. Algunos originales requieren suscripción.",
  },
  {
    id: "elmundo",
    name: "El Mundo",
    kind: "noticia",
    url: "https://www.elmundo.es",
    feed: "https://e00-elmundo.uecdn.es/elmundo/rss/portada.xml",
    hosts: ["elmundo.es"],
    description:
      "Portada y firmas del medio. Algunos originales requieren suscripción.",
  },
  {
    id: "hayderecho",
    name: "Hay Derecho",
    kind: "analisis",
    url: "https://www.hayderecho.com",
    feed: "https://www.hayderecho.com/feed/",
    hosts: ["hayderecho.com"],
    description:
      "Análisis jurídico e institucional y opinión firmada. No equivale a una resolución judicial.",
  },
  {
    id: "elcano",
    name: "Real Instituto Elcano",
    kind: "analisis",
    url: "https://www.realinstitutoelcano.org",
    feed: "https://www.realinstitutoelcano.org/feed/",
    hosts: ["realinstitutoelcano.org"],
    description:
      "Análisis de política internacional, economía y relaciones exteriores.",
  },
  {
    id: "nadaesgratis",
    name: "Nada es Gratis · archivo",
    kind: "analisis",
    url: "https://nadaesgratis.es",
    feed: "https://nadaesgratis.es/feed",
    hosts: ["nadaesgratis.es"],
    description:
      "Archivo de análisis económico. El canal verificado no tiene publicaciones recientes; no se presenta como actualidad.",
  },
  {
    id: "funcas",
    name: "Funcas · blog",
    kind: "analisis",
    url: "https://blog.funcas.es",
    feed: "https://blog.funcas.es/feed/",
    hosts: ["funcas.es"],
    description:
      "Análisis firmados sobre economía, políticas públicas y coyuntura.",
  },
];
const REGIONAL_FEEDS: Record<string, [string, string]> = {
  "01": ["Andalucía", "andalucia"],
  "02": ["Aragón", "aragon"],
  "03": ["Asturias", "asturias"],
  "04": ["Illes Balears", "illes-balears"],
  "05": ["Canarias", "canarias"],
  "06": ["Cantabria", "cantabria"],
  "07": ["Castilla y León", "castilla-leon"],
  "08": ["Castilla-La Mancha", "castilla-mancha"],
  "09": ["Cataluña", "cataluna"],
  "10": ["Comunitat Valenciana", "comunidad-valenciana"],
  "11": ["Extremadura", "extremadura"],
  "12": ["Galicia", "galicia"],
  "13": ["Madrid", "comunidad-madrid"],
  "14": ["Murcia", "region-murcia"],
  "15": ["Navarra", "navarra"],
  "16": ["País Vasco", "pais-vasco"],
  "17": ["La Rioja", "rioja"],
  "18": ["Ceuta", "ceuta"],
  "19": ["Melilla", "melilla"],
};
const EP_CHANNELS: Record<string, number> = {
  "01": 279,
  "02": 280,
  "03": 294,
  "04": 288,
  "05": 287,
  "06": 281,
  "07": 283,
  "08": 282,
  "09": 284,
  "10": 292,
  "11": 285,
  "12": 286,
  "13": 289,
  "14": 295,
  "15": 293,
  "16": 290,
  "17": 291,
  "18": 310,
};
const EP_PATHS: Record<string, string> = {
  "04": "illes-balears",
  "05": "islas-canarias",
  "07": "castilla-y-leon",
  "08": "castilla-la-mancha",
  "09": "catalunya",
  "10": "comunitat-valenciana",
  "13": "madrid",
  "14": "murcia",
  "16": "euskadi",
  "17": "la-rioja",
  "18": "ceuta",
};
export const REGIONAL_SOURCES: Source[] = Object.entries(EP_CHANNELS).map(
  ([id, channel]) => ({
    id: `ep-${id}`,
    name: `Europa Press · ${id === "18" ? "Ceuta y Melilla" : REGIONAL_FEEDS[id][0]}`,
    kind: "noticia",
    region: id === "18" ? undefined : `r-${id}`,
    url: `https://www.europapress.es/${EP_PATHS[id] ?? REGIONAL_FEEDS[id][1]}/`,
    feed: `https://www.europapress.es/rss/rss.aspx?ch=${channel}`,
    hosts: ["europapress.es"],
    description:
      "Canal territorial de la agencia. Las menciones a lugares no demuestran aplicabilidad jurídica.",
  }),
);
export const ALL_SOURCES = [...SOURCES, ...REGIONAL_SOURCES];
export const REFERENCE_DIRECTORY = [
  {
    name: "INE",
    url: "https://www.ine.es",
    description: "Estadísticas oficiales para contrastar cifras.",
  },
  {
    name: "Banco de España",
    url: "https://www.bde.es",
    description: "Estadísticas y análisis económicos del banco central.",
  },
  {
    name: "AIReF",
    url: "https://www.airef.es",
    description: "Evaluación de políticas públicas y sostenibilidad fiscal.",
  },
  {
    name: "EUR-Lex",
    url: "https://eur-lex.europa.eu",
    description: "Derecho y Diario Oficial de la Unión Europea.",
  },
  {
    name: "CGPJ · CENDOJ",
    url: "https://www.poderjudicial.es/search/",
    description: "Consulta de resoluciones judiciales.",
  },
  {
    name: "Sistema Nacional de Publicidad de Subvenciones",
    url: "https://www.infosubvenciones.es",
    description: "Convocatorias y ayudas públicas.",
  },
];
