import { ASSESSMENT_LABELS, COMPONENT_STATE_LABELS, EVIDENCE_STAGE_LABELS, type Evidence, type MandateSnapshot, type Observation } from "./model";
const fail = (message: string): never => { throw Error(`Archivo de mandato inválido: ${message}`); };
function text(value: unknown, label: string) { if (typeof value !== "string" || !value.trim()) fail(label); }
function date(value: unknown, label: string) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(value) || !Number.isFinite(Date.parse(value))) fail(label);
}
function source(value: Evidence) {
  text(value.id, "fuente sin id"); text(value.title, "fuente sin título"); text(value.producer, "fuente sin productor");
  text(value.locator, "fuente sin localizador"); text(value.excerpt, "fuente sin evidencia");
  let url;
  try { url = new URL(value.url); } catch { fail("URL de fuente"); }
  if (url!.protocol !== "https:" || url!.username || url!.password) fail("URL de fuente no pública");
  date(value.retrievedAt, "fecha de captura");
  if (value.publishedAt !== null) date(value.publishedAt, "fecha de publicación");
  if (!value.sha256 || !/^[a-f0-9]{64}$/.test(value.sha256)) fail("huella de fuente");
}
function observation(value: Observation) {
  text(value.period, "periodo observado");
  if (value.value !== null && (typeof value.value !== "number" || !Number.isFinite(value.value))) fail("valor observado");
}
export function validateMandateSnapshot(snapshot: MandateSnapshot): void {
  if (snapshot.schemaVersion !== 1) fail("versión");
  date(snapshot.asOf, "fecha de evaluación"); date(snapshot.election.date, "fecha electoral"); source(snapshot.election.source);
  if (snapshot.election.timeZone !== "Europe/Madrid") fail("zona horaria electoral");
  if (!snapshot.commitments.length || !snapshot.indicators.length) fail("cobertura vacía");
  const commitments = new Set<string>(), indicators = new Set<string>();
  for (const indicator of snapshot.indicators) {
    if (indicators.has(indicator.id)) fail("indicador duplicado");
    indicators.add(indicator.id); text(indicator.id, "id indicador"); text(indicator.unit, "unidad");
    text(indicator.geography, "territorio"); source(indicator.source);
    if (!indicator.observations.length || !indicator.caveats.length) fail("serie sin observaciones o límites");
    const periods = new Set<string>();
    for (const item of indicator.observations) {
      observation(item);
      if (periods.has(item.period)) fail("periodo duplicado");
      periods.add(item.period);
    }
    observation(indicator.baseline); observation(indicator.latest);
    if (!indicator.observations.some((item) => item.period === indicator.baseline.period && item.value === indicator.baseline.value)) fail("base fuera de la serie");
    if (JSON.stringify(indicator.latest) !== JSON.stringify(indicator.observations.at(-1))) fail("último dato incoherente");
  }
  for (const item of snapshot.commitments) {
    if (commitments.has(item.id)) fail("compromiso duplicado");
    commitments.add(item.id); text(item.text, "texto original"); text(item.origin, "origen del compromiso");
    text(item.originNote, "alcance de la atribución de origen");
    if (item.originDate !== null) date(item.originDate, "fecha del documento de origen");
    if (!["pending", "partial", "documented"].includes(item.review.status)) fail("estado de contraste");
    if (!item.evidence.length || !item.evidence.some((entry) => entry.role === "government")) fail("compromiso sin origen");
    if (item.review.status !== "pending" && !item.evidence.some((entry) => entry.id.startsWith(`${item.id}-evidence-`))) fail("contraste sin evidencia adicional");
    text(item.review.conclusion, "conclusión"); text(item.review.criterion, "criterio de contraste");
    date(item.review.date, "fecha de contraste");
    item.evidence.forEach(source);
    const assessment = item.assessment;
    if (!assessment || !Object.hasOwn(ASSESSMENT_LABELS, assessment.verdict)) fail("evaluación sin estado válido");
    for (const key of ["expected", "observed", "practicalEffect", "missingEvidence", "temporalScope", "scope"] as const) text(assessment[key], `evaluación sin ${key}`);
    date(assessment.reviewedAt, "fecha de evaluación individual");
    if (assessment.reviewedAt !== item.review.date || assessment.reviewedAt > snapshot.asOf) fail("fechas de revisión incompatibles");
    if (!assessment.evidenceIds.length || assessment.evidenceIds.some(id => !item.evidence.some(entry => entry.id === id))) fail("evaluación con evidencia inexistente");
    if (new Set(assessment.evidenceIds).size !== assessment.evidenceIds.length) fail("evaluación con evidencia duplicada");
    const quality = item.quality;
    if (!quality?.components.length) fail("calibración sin componentes");
    date(quality.reviewedAt, "fecha de calibración");
    if (quality.reviewedAt > snapshot.asOf) fail("calibración posterior al corte");
    text(quality.challenge, "calibración sin contraste adicional");
    text(quality.refreshTrigger, "calibración sin criterio de actualización");
    const parts = new Set<string>();
    for (const part of quality.components) {
      if (parts.has(part.id) || !part.id.startsWith(`${item.id}-part-`)) fail("componente duplicado o ajeno");
      parts.add(part.id);
      text(part.label, "componente sin nombre"); text(part.criterion, "componente sin criterio"); text(part.finding, "componente sin resultado de revisión");
      if (!Object.hasOwn(COMPONENT_STATE_LABELS,part.state) || !Object.hasOwn(EVIDENCE_STAGE_LABELS,part.stage)) fail("componente sin estado o etapa válidos");
      if (part.evidenceIds.some(id => !item.evidence.some(source => source.id === id))) fail("componente con evidencia inexistente");
      if (new Set(part.evidenceIds).size !== part.evidenceIds.length) fail("componente con evidencia duplicada");
      const refs = item.evidence.filter(source => part.evidenceIds.includes(source.id));
      if (part.state !== "unknown" && !refs.length) fail("afirmación de componente sin evidencia");
      if (["documented","contradicted"].includes(part.state) && !refs.some(source => source.role === "action" || source.role === "indicator")) fail("afirmación directa basada solo en promesa o declaración");
    }
    if (assessment.verdict === "not_met" && !quality.components.some(part => part.state === "contradicted")) fail("objetivo fuera de plazo sin evidencia contraria");
    if (quality.correction) {
      text(quality.correction.reason, "corrección sin motivo");
      if (!["error","precision","scope","attribution","new_evidence","context"].includes(quality.correction.kind) || !quality.correction.changes.length) fail("corrección sin tipo o cambios");
      for (const change of quality.correction.changes) {
        if (!["expected","observed","practicalEffect","missingEvidence","temporalScope","scope","verdict"].includes(change.field)) fail("campo de corrección desconocido");
        text(change.before, "corrección sin versión anterior"); text(change.after, "corrección sin versión nueva");
        if (change.before === change.after || assessment[change.field as keyof typeof assessment] !== change.after) fail("historial de corrección incoherente");
      }
    }
    if (item.indicatorIds.some((id) => !indicators.has(id))) fail("relación con indicador inexistente");
  }
  const calibration = snapshot.calibration;
  if (!calibration || calibration.reviewMode !== "same-author-second-pass" || calibration.independentReview !== "pending" || calibration.blind !== false || calibration.accuracyRate !== null) fail("no atribuir independencia o exactitud no medidas");
  date(calibration.reviewedAt, "fecha de protocolo"); text(calibration.revision, "protocolo sin versión"); text(calibration.reviewer, "revisor ausente");
  if (calibration.reviewedAt > snapshot.asOf || !calibration.rules.length) fail("protocolo sin reglas o posterior al corte");
  calibration.rules.forEach(rule => text(rule, "regla vacía"));
  const selection = calibration.selection;
  if (!Number.isInteger(selection.totalAvailable) || selection.totalAvailable < snapshot.commitments.length || selection.selectedCount !== snapshot.commitments.length) fail("universo de selección incoherente");
  text(selection.method, "selección sin método"); text(selection.limitation, "selección sin límites");
  if (new Set(calibration.initialSample).size !== calibration.initialSample.length || calibration.initialSample.some(id => !commitments.has(id))) fail("muestra de calibración inválida");
  for (const item of snapshot.commitments) if (item.quality.overlaps.some(id => id === item.id || !commitments.has(id))) fail("solapamiento de promesas inválido");
  for (const item of snapshot.commentary) {
    if (item.kind !== "ai-editorial") fail("interpretación sin autoría IA");
    if (!item.commitmentIds.length && !item.indicatorIds.length) fail("interpretación sin referencias");
    if (item.commitmentIds.some((id) => !commitments.has(id)) || item.indicatorIds.some((id) => !indicators.has(id))) fail("interpretación con referencia inexistente");
    text(item.limitations, "interpretación sin límites"); date(item.createdAt, "fecha de interpretación");
  }
}
