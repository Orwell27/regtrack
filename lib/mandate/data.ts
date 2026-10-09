import commitmentsInput from "@/data/mandate/commitments.json";
import indicatorsInput from "@/data/mandate/indicators.json";
import electionInput from "@/data/mandate/election.json";
import { type Commitment, type CommitmentAssessment, type Election, type Evidence, type Indicator, type MandateSnapshot, type Observation } from "./model";
import { validateMandateSnapshot } from "./validate";

type RawSource = { id: string; url: string; title: string; organisation: string; publishedAt: string | null; capturedAt: string; sha256: string; captureType?: string };
type RawCommitment = {
  id: string; officialId: string; title?: string; text: string; simpleExplanation?: string;
  origin: string; originDate?: string; topics: string[]; officialDeadline: { text: string; date?: string | null; sourceId?: string; locator?: string; scope?: string } | null;
  originSourceId?: string; originVerification?: { dateBasis: string; note: string };
  competence: { level: string; note: string };
  governmentAssessment: { text: string; asOf: string; sourceId: string; locator: string };
  governmentMeasures?: { text: string; sourceId: string; locator: string }[];
  review: { status: string; asOf: string; criterion: string; conclusion: string; evidence: { sourceId: string; locator: string; paraphrase: string; relation: string }[] };
  assessment: Omit<CommitmentAssessment, "evidenceIds"> & { evidenceSourceIds: string[] };
};
type RawCommitments = { cutoffDate: string; selection: { description: string }; sources: RawSource[]; commitments: RawCommitment[] };
type RawIndicator = {
  id: string; label: string; topic: string; unit: string; frequency: string;
  geography: { label: string }; observations: Observation[]; baseline: Observation;
  source: { url: string; title: string; producer: string; retrievedAt: string; sha256: string; seriesCode?: string; datasetCode?: string };
  caveats: string[]; transformation: string; directionNote?: string;
};
const rawCommitments = commitmentsInput as unknown as RawCommitments;
const rawIndicators = indicatorsInput as unknown as { indicators: RawIndicator[] };
function evidence(sourceId: string, id: string, locator: string, excerpt: string, role: Evidence["role"]): Evidence {
  const source = rawCommitments.sources.find((item) => item.id === sourceId);
  if (!source) throw Error(`Falta fuente pública: ${sourceId}`);
  return { id, title: source.title, url: source.url, producer: source.organisation,
    publishedAt: source.publishedAt, retrievedAt: source.capturedAt, sha256: source.sha256,
    locator, excerpt, role,
    captureNote: source.captureType === "parafrasis_editorial" ? "La huella identifica el extracto editorial conservado, no el PDF original. El enlace permite consultar el documento de origen." : "Huella de la captura original conservada en esta revisión.",
  };
}
function indicatorProjection(item: RawIndicator): Indicator {
  if (!item.observations.length) throw Error(`Serie sin observaciones: ${item.id}`);
  return {
    id: item.id, label: item.label, topic: item.topic, unit: item.unit,
    geography: item.geography.label, frequency: item.frequency,
    baseline: item.baseline, latest: item.observations.at(-1)!, observations: item.observations,
    source: { id: `indicator-${item.id}`, title: item.source.title, url: item.source.url,
      producer: item.source.producer, publishedAt: null, retrievedAt: item.source.retrievedAt,
      sha256: item.source.sha256, locator: [item.source.datasetCode, item.source.seriesCode].filter(Boolean).join(" · ") || item.id,
      excerpt: `${item.label}. ${item.transformation}`, role: "indicator" },
    caveats: item.caveats, explanation: item.directionNote ?? item.transformation,
  };
}
function commitmentProjection(item: RawCommitment, indicators: Indicator[]): Commitment {
  const status = item.review.status === "actuacion_documentada" ? "documented" : item.review.status === "contraste_parcial" ? "partial" : "pending";
  const labels = { documented: "Actuación documentada", partial: "Contraste parcial", pending: "Pendiente de contraste" };
  return {
    id: item.id, officialId: item.officialId, title: item.title ?? item.text,
    text: item.text, topics: item.topics, origin: item.origin,
    originDate: item.originDate ?? null,
    originNote: item.originVerification ? `${item.originVerification.dateBasis} ${item.originVerification.note}` : "Origen atribuido por el inventario; no se ha auditado su primera formulación.",
    deadline: item.officialDeadline ? `${item.officialDeadline.text}. ${item.officialDeadline.scope ?? ""}`.trim() : "El inventario no especifica un plazo individual. No se presupone vencido.",
    competence: item.competence.note,
    governmentAssessment: { label: item.governmentAssessment.text, date: item.governmentAssessment.asOf },
    review: { status, label: labels[status], conclusion: item.review.conclusion, criterion: item.review.criterion, date: item.review.asOf },
    evidence: [
      evidence(item.governmentAssessment.sourceId, `${item.id}-commitment`, item.governmentAssessment.locator,
        `${item.text} Origen consignado: ${item.origin}. ${(item.governmentMeasures ?? []).map((measure) => measure.text).join(" ")}`, "government"),
      ...(item.originSourceId ? [evidence(item.originSourceId, `${item.id}-origin`, `Documento de origen atribuido a la fila ${item.officialId} del inventario`, item.originVerification?.note ?? "Origen atribuido por el inventario, pendiente de correspondencia literal completa.", "promise")] : []),
      ...(item.officialDeadline?.sourceId ? [evidence(item.officialDeadline.sourceId, `${item.id}-deadline`, item.officialDeadline.locator ?? item.governmentAssessment.locator,
        `${item.officialDeadline.text}. ${item.officialDeadline.scope ?? ""}`, "promise")] : []),
      ...item.review.evidence.map((entry, index) => evidence(entry.sourceId, `${item.id}-evidence-${index}`, entry.locator, entry.paraphrase, entry.sourceId === "coalicion-2023" ? "promise" : entry.relation === "resultado_estadistico" ? "indicator" : entry.relation === "declaracion_de_actuacion" ? "government" : "action")),
    ],
    // These links are visibly labelled as thematic context, never proof of fulfilment.
    indicatorIds: indicators.filter((indicator) => item.topics.includes(indicator.topic)).slice(0, 4).map((indicator) => indicator.id),
    simpleExplanation: item.simpleExplanation ?? item.review.criterion,
    assessment: {
      verdict: item.assessment.verdict, expected: item.assessment.expected,
      observed: item.assessment.observed, practicalEffect: item.assessment.practicalEffect,
      missingEvidence: item.assessment.missingEvidence, temporalScope: item.assessment.temporalScope,
      scope: item.assessment.scope, reviewedAt: item.assessment.reviewedAt,
      evidenceIds: item.review.evidence.flatMap((entry, index) => item.assessment.evidenceSourceIds.includes(entry.sourceId) ? [`${item.id}-evidence-${index}`] : []),
    },
  };
}

export function getMandateSnapshot(): MandateSnapshot {
  const indicators = rawIndicators.indicators.map(indicatorProjection);
  const commitments = rawCommitments.commitments.map((item) => commitmentProjection(item, indicators));
  const forTopic = (topic: string) => ({ commitmentIds: commitments.filter((item) => item.topics.includes(topic)).slice(0, 3).map((item) => item.id), indicatorIds: indicators.filter((item) => item.topic === topic).slice(0, 4).map((item) => item.id) });
  const snapshot: MandateSnapshot = {
    schemaVersion: 1, asOf: rawCommitments.cutoffDate,
    mandate: { id: "es-2023", label: "Gobierno de Pedro Sánchez · mandato desde 2023", start: "2023-11-17", scope: "Selección documental del Gobierno de España. No representa todas sus promesas ni una valoración global. Los datos territoriales de este piloto son nacionales." },
    election: electionInput as Election,
    selection: rawCommitments.selection.description,
    commitments, indicators,
    methodology: [
      "El inventario Cumpliendo pertenece al Gobierno. Su información se atribuye a esa fuente y se contrasta por separado con documentos originales.",
      "Origen de los datos de compromisos: sitio web de lamoncloa.gob.es. Ministerio de la Presidencia. Entrega publicada el 28 de julio de 2026, con corte al 30 de junio; la revisión del piloto no amplía ese corte.",
      "Una norma acredita una actuación, no necesariamente una entrega o el resultado prometido. No se publica un porcentaje global de cumplimiento a partir de esta selección.",
      "Los 30 compromisos tienen una revisión fechada de qué se esperaba, qué acredita la evidencia, su alcance temporal, el efecto práctico y lo que falta. Completar la revisión no convierte las medidas aprobadas en resultados ni elimina la incertidumbre.",
      "Medidas acreditadas señala instrumentos o decisiones publicados, incluidos anuncios atribuidos al organismo. Resultado parcial documentado señala un componente o evolución comprobables. Objetivo no alcanzado en el plazo requiere meta y plazo explícitos y evidencia contraria. Resultado no concluyente significa que las fuentes no bastan para juzgar el resultado prometido.",
      "Las revisiones anteriores se conservan en el archivo. Las fuentes estadísticas retienen sus periodos y fecha de captura: la revisión del 10 de octubre no las convierte en observaciones de ese día. Las normas recientes deben revisarse de nuevo tras su convalidación o modificación.",
      "Pendiente de contraste significa que falta revisión documental. No significa promesa incumplida. Se conserva el plazo original cuando consta.",
      "Las series tienen diferentes periodos de referencia, fechas de publicación y revisiones. Un dato provisional o antiguo se muestra como tal.",
      "La referencia inicial es el tercer trimestre u octubre de 2023; las series anuales usan 2023 y mezclan meses anteriores y posteriores a la investidura. No es una medición exacta del día de comienzo.",
      "Compartir tema permite contextualizar una promesa. No demuestra correlación estadística ni causalidad. No se atribuye todo cambio al Gobierno central.",
      "La interpretación de IA preparada para el piloto se conserva con fecha y referencias. Las consultas documentales recuperan fichas; no sustituyen una auditoría ni recomiendan el voto.",
    ],
    commentary: [
      { id: "employment-context", title: "Una subida salarial y una garantía legal son cosas distintas", text: "Para comprobar una promesa sobre salarios hay que leer qué se prometió exactamente: aprobar una cantidad para un año y garantizar una regla permanente son actuaciones diferentes. Las cifras de empleo y paro aportan contexto, pero por sí solas no prueban el cumplimiento de esa garantía.", commitmentIds: ["c-107"], indicatorIds: ["epa-employment", "epa-unemployment"], createdAt: "2026-10-07", kind: "ai-editorial", limitations: "Interpretación preparada por IA a partir de las fichas enlazadas. No determina la honestidad de una persona ni mide un efecto causal." },
      { id: "housing-context", title: "Del anuncio a una vivienda disponible", text: "Una medida aprobada es un paso que puede comprobarse en su documento. Para saber cuántas viviendas llegaron a estar disponibles hacen falta registros de ejecución y entrega. Los índices de precios ayudan a entender el contexto, pero no completan esos registros ni prueban el efecto de una medida concreta.", ...forTopic("vivienda"), createdAt: "2026-10-07", kind: "ai-editorial", limitations: "Interpretación de evidencia limitada. No se ha auditado un inventario nacional de viviendas entregadas." },
      { id: "public-finance-context", title: "La deuda tiene dos lecturas", text: "La deuda en euros muestra el saldo pendiente; el porcentaje del PIB lo compara con el tamaño de la economía. Pueden moverse en direcciones distintas. El déficit describe ingresos y gastos de un periodo. Conviene leer los tres datos juntos y comprobar si abarcan al Estado o a todas las administraciones.", commitmentIds: [], indicatorIds: ["debt-stock", "debt-gdp", "public-balance"], createdAt: "2026-10-07", kind: "ai-editorial", limitations: "Explicación de las unidades de las series, no atribución de responsabilidad política. Cada dato conserva su periodo y sus revisiones." },
    ].filter((item) => item.commitmentIds.length || item.indicatorIds.length) as MandateSnapshot["commentary"],
  };
  validateMandateSnapshot(snapshot);
  return snapshot;
}
