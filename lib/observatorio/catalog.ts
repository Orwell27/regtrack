export interface SourceCatalogEntry {
  id: string;
  name: string;
  role: "fuente_primaria" | "referente" | "vocabulario";
  description: string;
  coverage: string;
  granularity: string;
  access: string;
  license: {
    label: string;
    url?: string;
    checkedAt: string;
    redistribution:
      | "permitida_con_condiciones"
      | "por_dataset"
      | "pendiente";
  };
  state: "piloto" | "candidato" | "referencia";
  documentationUrl: string;
  versionStrategy: string;
  limitations: string[];
}

// This is a reviewed catalogue, not an ingestion schedule or evidence of a fetch.
// "piloto" identifies the sources selected for manual, versioned snapshots.
const REVIEWED_AT = "2026-10-07";

export const SOURCE_CATALOG: readonly SourceCatalogEntry[] = [
  {
    id: "boe",
    name: "Boletín Oficial del Estado",
    role: "fuente_primaria",
    description:
      "Documentos regulatorios originales y versiones consolidadas para explicar qué cambia y conservar la evidencia.",
    coverage: "España; el ámbito de aplicación se comprueba en cada documento.",
    granularity: "Disposición, artículo y versión; identificadores BOE y ELI.",
    access: "API oficial y XML. Piloto de importación manual de documentos seleccionados.",
    license: {
      label: "Condiciones de reutilización de la AEBOE, vigentes desde el 28/06/2024.",
      url: "https://www.boe.es/informacion/aviso_legal/index.php",
      checkedAt: REVIEWED_AT,
      redistribution: "permitida_con_condiciones",
    },
    state: "piloto",
    documentationUrl: "https://www.boe.es/datosabiertos/api/api.php",
    versionStrategy:
      "Conservar BOE ID, ELI, fecha de versión, fecha de recuperación y huella del contenido; no sobrescribir las capturas anteriores.",
    limitations: [
      "Atribuir la fuente e identificar las transformaciones propias. Los textos consolidados tienen carácter informativo.",
      "Hay documentos con condiciones específicas; la Biblioteca Jurídica Digital queda fuera de este piloto.",
      "Una publicación o una ayuda histórica no acredita que el plazo siga abierto.",
    ],
  },
  {
    id: "ine",
    name: "Instituto Nacional de Estadística",
    role: "fuente_primaria",
    description:
      "Indicadores oficiales para aportar contexto económico, demográfico y de vivienda a los documentos regulatorios.",
    coverage: "España; cobertura y periodos propios de cada operación estadística.",
    granularity: "Nacional, autonómica, provincial o municipal según tabla; no todas las series permiten todas las escalas.",
    access: "API JSON y descargas. Piloto de importación manual de un subconjunto documentado.",
    license: {
      label: "CC BY 4.0 para la información estadística, salvo indicación contraria.",
      url: "https://www.ine.es/aviso_legal/",
      checkedAt: REVIEWED_AT,
      redistribution: "permitida_con_condiciones",
    },
    state: "piloto",
    documentationUrl: "https://www.ine.es/datosabiertos/",
    versionStrategy:
      "Registrar operación, tabla, serie y dimensiones, periodo observado, publicación, recuperación y huella; conservar revisiones.",
    limitations: [
      "Comprobar la licencia y metodología de la tabla elegida; conservar unidades, valores ausentes y notas.",
      "Un indicador territorial aporta contexto; no demuestra el efecto de una norma ni la elegibilidad de un hogar.",
      "La periodicidad y el retraso de publicación dependen de cada operación.",
    ],
  },
  {
    id: "pordata",
    name: "PORDATA · Fundação Francisco Manuel dos Santos",
    role: "referente",
    description:
      "Referencia para organizar estadísticas por temas comprensibles, comparar territorios y ofrecer glosarios y fuentes.",
    coverage: "Portugal, sus municipios y comparación europea; no sustituye las estadísticas municipales españolas.",
    granularity: "Municipal en Portugal y comparación por países según indicador.",
    access: "Consulta web y exportación visibles. API pública y condiciones de redistribución no verificadas.",
    license: {
      label: "Pendiente de verificar las condiciones específicas de reutilización.",
      checkedAt: REVIEWED_AT,
      redistribution: "pendiente",
    },
    state: "referencia",
    documentationUrl: "https://www.pordata.pt/portugal",
    versionStrategy:
      "Si se habilita una integración, conservar fuente original, indicador, fecha de actualización y captura de sus metadatos.",
    limitations: [
      "La consulta gratuita no acredita permiso para redistribuir una base de datos.",
      "La página de condiciones no pudo recuperarse en esta revisión; no se ha autorizado una ingesta por esa ausencia.",
    ],
  },
  {
    id: "owid",
    name: "Our World in Data",
    role: "referente",
    description:
      "Referencia de explicación con evidencia y posible proveedor secundario de indicadores con metadatos y fuentes originales.",
    coverage: "Internacional; disponibilidad española a comprobar por indicador.",
    granularity: "Principalmente países y periodos; depende del conjunto.",
    access: "Chart Data API, CSV y metadatos JSON; catálogo con rutas versionadas.",
    license: {
      label: "Material propio bajo CC BY; datos de terceros sujetos a su licencia original.",
      url: "https://ourworldindata.org/faqs",
      checkedAt: REVIEWED_AT,
      redistribution: "por_dataset",
    },
    state: "candidato",
    documentationUrl: "https://docs.owid.io/projects/etl/api/",
    versionStrategy:
      "Conservar identificador y versión del conjunto, metadatos, proveedor original, transformaciones y fecha de recuperación.",
    limitations: [
      "Revisar los derechos de cada indicador y atribuir tanto OWID como el proveedor original cuando corresponda.",
      "El software Grapher actual requiere permiso de reutilización; esa condición no equivale a la licencia de sus datos o artículos.",
      "No se ha seleccionado ni importado un conjunto de datos de OWID en este piloto.",
    ],
  },
  {
    id: "oecd",
    name: "OCDE",
    role: "referente",
    description:
      "Marco de bienestar e indicadores comparables para relacionar vivienda, empleo, salud, educación y condiciones de vida.",
    coverage: "Países OCDE y asociados; España según conjunto e indicador.",
    granularity: "País y, en determinados conjuntos, región; no presumir cobertura municipal.",
    access: "API SDMX gratuita con límites de uso; el registro para avisos técnicos es voluntario.",
    license: {
      label: "Reutilización, incluso comercial, salvo restricciones del conjunto o derechos de terceros; atribución obligatoria.",
      url: "https://www.oecd.org/en/about/terms-conditions.html",
      checkedAt: REVIEWED_AT,
      redistribution: "por_dataset",
    },
    state: "candidato",
    documentationUrl: "https://www.oecd.org/en/data/insights/data-explainers/2024/09/api.html",
    versionStrategy:
      "Conservar agencia, dataflow, versión de estructura, dimensiones, atributos, cita y huella de cada extracción.",
    limitations: [
      "La disponibilidad de una API no verifica la licencia ni la cobertura de todas sus series.",
      "Consultar frecuencia y revisiones de cada conjunto; no aplicar una periodicidad global a toda la OCDE.",
      "No hay conector OCDE activo en este piloto.",
    ],
  },
  {
    id: "ivie",
    name: "Ivie / Fundación BBVA",
    role: "referente",
    description:
      "Investigación económica y métodos de comparación territorial, con bases sobre capital, productividad y desarrollo.",
    coverage: "España; alcance y periodos específicos de cada base.",
    granularity: "Nacional, autonómica y provincial en la base de capital; otras bases tienen coberturas distintas.",
    access: "Consulta y descargas por publicación. No se ha verificado una API general.",
    license: {
      label: "Integración pendiente de permiso o de una licencia específica que autorice el uso previsto.",
      url: "https://www.ivie.es/es_ES/aviso-legal/",
      checkedAt: REVIEWED_AT,
      redistribution: "pendiente",
    },
    state: "referencia",
    documentationUrl: "https://www.ivie.es/es_ES/bases-de-datos/capitalizacion-y-crecimiento/el-stock-y-los-servicios-de-capital/",
    versionStrategy:
      "Registrar edición, método, cita y periodo; distinguir observaciones de estimaciones y proyecciones.",
    limitations: [
      "El aviso general de Ivie restringe el uso profesional y comercial sin permiso; revisar también los términos de Fundación BBVA.",
      "Una descarga pública no concede por sí sola permiso para redistribuirla.",
      "No se han importado sus datos ni se ha solicitado autorización a las instituciones.",
    ],
  },
  {
    id: "ess",
    name: "European Social Survey",
    role: "referente",
    description:
      "Referencia metodológica para incorporar percepción ciudadana conservando preguntas, muestras, ponderaciones y fechas de campo.",
    coverage: "Países europeos, incluida España; participación y variables diferentes según ronda.",
    granularity: "Encuesta y población objetivo de cada ronda; no equivale a representatividad municipal.",
    access: "Portal de datos y documentación por rondas y ediciones; requisito actual de registro no comprobado.",
    license: {
      label: "Datos CC BY-NC-SA 4.0; documentación CC BY-SA 4.0. Uso comercial pendiente de permiso.",
      url: "https://www.europeansocialsurvey.org/contact/disclaimer",
      checkedAt: REVIEWED_AT,
      redistribution: "pendiente",
    },
    state: "referencia",
    documentationUrl: "https://www.europeansocialsurvey.org/data-portal",
    versionStrategy:
      "Conservar ronda, edición, país, cuestionario, variables, pesos y fechas de campo; no mezclar ediciones sin documentarlo.",
    limitations: [
      "ESS recomienda enlazar sus conjuntos en el portal en vez de republicarlos externamente.",
      "La licencia de documentación no sustituye a la licencia de los microdatos.",
      "No trasladar una estimación nacional a un municipio como si se hubiera medido allí.",
    ],
  },
  {
    id: "elcano",
    name: "Real Instituto Elcano",
    role: "referente",
    description:
      "Estudios firmados y métodos para contextualizar asuntos internacionales e interpretar índices geopolíticos.",
    coverage: "Internacional, incluida España; países y periodos según publicación.",
    granularity: "Estudio, país, componente e índice; no sustituye un dato primario de cada componente.",
    access: "Consulta de publicaciones y metodología. API y licencia del archivo de datos actual no verificadas.",
    license: {
      label: "Integración pendiente de permiso o condiciones específicas del contenido.",
      url: "https://www.realinstitutoelcano.org/en/descargo-de-responsabilidad/",
      checkedAt: REVIEWED_AT,
      redistribution: "pendiente",
    },
    state: "referencia",
    documentationUrl: "https://www.realinstitutoelcano.org/documento-de-trabajo/indice-elcano-de-presencia-global-metodologia/",
    versionStrategy:
      "Conservar autor, publicación, edición del índice y versión metodológica, incluidos cambios en componentes y ponderaciones.",
    limitations: [
      "El aviso general restringe la reutilización sin permiso, salvo condiciones específicas o excepciones aplicables.",
      "Algunos componentes del Índice de Presencia Global proceden de fuentes que no son abiertas.",
      "El catálogo enlaza referencias; no declara importados los estudios ni los datos del índice.",
    ],
  },
  {
    id: "eurovoc",
    name: "EuroVoc · Oficina de Publicaciones de la UE",
    role: "vocabulario",
    description:
      "Tesauro multilingüe candidato para enlazar materias oficiales con los temas comprensibles de RegTrack.",
    coverage: "Materias de actividad de la UE, con etiquetas en español y otras lenguas.",
    granularity: "Concepto identificado mediante URI oficial y relaciones semánticas.",
    access: "Distribuciones RDF/SKOS y consultas mediante Cellar; paquete concreto pendiente de verificación.",
    license: {
      label: "Licencia de la distribución elegida pendiente de verificar; no se presupone por pertenecer a la UE.",
      checkedAt: REVIEWED_AT,
      redistribution: "pendiente",
    },
    state: "candidato",
    documentationUrl: "https://op.europa.eu/en/web/eu-vocabularies",
    versionStrategy:
      "Fijar URI oficial, versión de distribución, notas de publicación y huella; mantener correspondencias revisadas con la taxonomía local.",
    limitations: [
      "La página oficial anuncia EuroVoc 4.24; no se ha recuperado ni validado ese paquete en el piloto.",
      "No hay conceptos oficiales importados ni correspondencias validadas todavía; no se generan identificadores EuroVoc desde etiquetas.",
      "Una consulta al catálogo devolvió un límite de peticiones; conservar la verificación pendiente.",
    ],
  },
];
