/** Public, source-backed projection. Original captures stay outside this model. */
export type Evidence = {
  id: string;
  title: string;
  url: string;
  producer: string;
  publishedAt: string | null;
  retrievedAt: string;
  locator: string;
  excerpt: string;
  role: "promise" | "government" | "action" | "indicator" | "method";
  sha256?: string;
  captureNote?: string;
};
export const ASSESSMENT_LABELS = {
  measures: "Medidas acreditadas; efecto por verificar",
  partial: "Resultado parcial documentado",
  not_met: "Objetivo no alcanzado en el plazo",
  inconclusive: "Resultado no concluyente",
} as const;
export type CommitmentAssessment = {
  verdict: keyof typeof ASSESSMENT_LABELS;
  expected: string;
  observed: string;
  practicalEffect: string;
  missingEvidence: string;
  temporalScope: string;
  scope: string;
  reviewedAt: string;
  evidenceIds: string[];
};
export const COMPONENT_STATE_LABELS = {
  documented: "Hecho documentado",
  reported: "Información del organismo",
  contradicted: "Evidencia contraria a la meta",
  unknown: "No demostrado con estas fuentes",
} as const;
export const EVIDENCE_STAGE_LABELS = { rule: "Norma o instrumento", delivery: "Ejecución", outcome: "Resultado" } as const;
export type CommitmentQuality = {
  reviewedAt: string;
  components: { id: string; label: string; criterion: string; stage: keyof typeof EVIDENCE_STAGE_LABELS; state: keyof typeof COMPONENT_STATE_LABELS; finding: string; evidenceIds: string[] }[];
  challenge: string;
  refreshTrigger: string;
  overlaps: string[];
  correction: null | { kind: "error" | "precision" | "scope" | "attribution" | "new_evidence" | "context"; reason: string; changes: { field: string; before: string; after: string }[] };
};
export type Calibration = {
  revision: string; reviewedAt: string; reviewer: string;
  reviewMode: "same-author-second-pass"; independentReview: "pending"; blind: false; accuracyRate: null;
  initialSample: string[];
  selection: { totalAvailable: number; selectedCount: number; method: string; limitation: string };
  rules: string[];
};
export type Commitment = {
  id: string;
  officialId: string;
  title: string;
  text: string;
  topics: string[];
  origin: string;
  originDate: string | null;
  originNote: string;
  deadline: string;
  competence: string;
  governmentAssessment: { label: string; date: string };
  review: {
    status: "pending" | "documented" | "partial";
    label: string;
    conclusion: string;
    criterion: string;
    date: string;
  };
  evidence: Evidence[];
  indicatorIds: string[];
  simpleExplanation: string;
  assessment: CommitmentAssessment;
  quality: CommitmentQuality;
};
export type Observation = { period: string; value: number | null; date?: string; status?: string; sourcePeriod?: string };
export type Indicator = {
  id: string;
  label: string;
  topic: string;
  unit: string;
  geography: string;
  frequency: string;
  observations: Observation[];
  baseline: Observation;
  latest: Observation;
  source: Evidence;
  caveats: string[];
  explanation: string;
};
export type Interpretation = {
  id: string;
  title: string;
  text: string;
  commitmentIds: string[];
  indicatorIds: string[];
  createdAt: string;
  kind: "ai-editorial";
  limitations: string;
};
export type Election = { date: string; timeZone: string; source: Evidence };
export type MandateSnapshot = {
  schemaVersion: 1;
  asOf: string;
  mandate: { id: string; label: string; start: string; scope: string };
  election: Election;
  selection: string;
  commitments: Commitment[];
  indicators: Indicator[];
  methodology: string[];
  commentary: Interpretation[];
  calibration: Calibration;
};
export type MandateAnswer = {
  mode: "documental" | "ia" | "no-evidence";
  paragraphs: { text: string; citations: string[] }[];
  sources: Evidence[];
  commitmentIds: string[];
  indicatorIds: string[];
  note: string;
};
export const MANDATE_TOPICS: Record<string, string> = {
  empleo: "Empleo y salarios",
  vivienda: "Vivienda",
  economia: "Economía y deuda",
  fiscalidad: "Impuestos y gasto",
  bienestar: "Bienestar y cuidados",
  sanidad: "Sanidad",
  salud: "Sanidad",
  educacion: "Educación",
  transparencia: "Transparencia",
  politica: "Instituciones",
  igualdad: "Igualdad",
  medioambiente: "Medioambiente",
};
export function normalizeMandateText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
/** Calendar days in Spain; never a negative countdown or implied election result. */
export function electionCountdown(election: Election, now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: election.timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)!.value;
  const today = `${part("year")}-${part("month")}-${part("day")}`;
  const days = Math.round((Date.parse(`${election.date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
  return { days: Math.max(0, days), phase: days > 0 ? "before" as const : days === 0 ? "today" as const : "after" as const };
}
