import { ArrowUpRight } from "lucide-react";
import { getMandateAccountability } from "@/lib/mandate/accountability";
import { ASSESSMENT_LABELS, type Calibration, type Commitment } from "@/lib/mandate/model";

const percent = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function MandateAccountability({ commitments, calibration, onReview, onAssessment }: {
  commitments: Commitment[];
  calibration: Calibration;
  onReview: (status: Commitment["review"]["status"]) => void;
  onAssessment: (verdict: Commitment["assessment"]["verdict"]) => void;
}) {
  const accountability = getMandateAccountability(commitments);
  const states = [
    { status: "documented" as const, count: accountability.documented, label: "Actuaciones documentadas" },
    { status: "partial" as const, count: accountability.partial, label: "Contrastes parciales" },
    { status: "pending" as const, count: accountability.pending, label: "Pendientes de contraste" },
  ];
  return <section id="honestidad" className="mn-accountability" aria-labelledby="accountability-heading">
    <header className="mn-accountability-heading">
      <div><p className="mn-eyebrow">Lo prometido frente a lo documentado</p><h2 id="accountability-heading">Honestidad y compromisos</h2></div>
      <p>Selección completa · {accountability.total} compromisos<br />Este bloque no cambia con los filtros.</p>
    </header>
    <div className="mn-accountability-body">
      <div className="mn-accountability-score">
        <span>Cumplimiento verificable</span>
        <strong>Sin calcular</strong>
        <p>Cada ficha explica qué se esperaba, qué se acredita y qué falta. Las conclusiones tienen distinto alcance y no se suman en una nota global. Tampoco miden la intención de engañar.</p>
      </div>
      <div className="mn-accountability-coverage">
        <div className="mn-coverage-heading"><h3>Cobertura de contraste documental</h3><strong>{accountability.coveragePercent === null ? "No disponible" : `${percent.format(accountability.coveragePercent)} %`}</strong></div>
        {accountability.coveragePercent !== null ? <progress max={100} value={accountability.coveragePercent} aria-label="Cobertura de contraste documental" aria-valuetext={`${accountability.contrasted} de ${accountability.total} compromisos, ${percent.format(accountability.coveragePercent)} por ciento`} /> : null}
        <p className="mn-coverage-description"><strong>{accountability.contrasted} de {accountability.total}</strong> con actuación documentada o contraste parcial. De esta selección, no de todas las promesas.</p>
        <p className="mn-coverage-note">Es el alcance de nuestra revisión, no una puntuación de honestidad ni de cumplimiento.</p>
        <div className="mn-accountability-states" aria-label="Explorar por estado documental">
          {states.map((state) => <button key={state.status} onClick={() => onReview(state.status)} aria-label={`${state.count} ${state.label.toLocaleLowerCase("es")}`}><strong>{state.count}</strong><span>{state.label}</span><ArrowUpRight size={13} aria-hidden="true" /></button>)}
        </div>
      </div>
    </div>
    <div className="mn-findings" aria-label="Conclusiones de los compromisos revisados">
      <h3>Qué permite concluir la revisión</h3>
      <p>Abre un grupo para ver los compromisos y sus pruebas. Una medida aprobada no equivale a un resultado conseguido.</p>
      <div className="mn-findings-grid">{(Object.entries(ASSESSMENT_LABELS) as [Commitment["assessment"]["verdict"], string][]).map(([value,label]) => {
        const count = commitments.filter(item => item.assessment.verdict === value).length;
        return <button key={value} onClick={() => onAssessment(value)} data-verdict={value}><strong>{count}</strong><span>{label}</span><ArrowUpRight size={13} aria-hidden="true" /></button>;
      })}</div>
    </div>
    <section className="mn-quality-summary" aria-labelledby="quality-heading">
      <h3 id="quality-heading">Cómo de sólida es esta revisión</h3>
      <p><strong>Exactitud todavía no medida.</strong> Segunda pasada de {calibration.reviewer}, el mismo agente que preparó las fichas. No es una revisión independiente ni ciega; la revisión humana independiente sigue pendiente.</p>
      <p>{commitments.length} fichas desglosadas en {commitments.reduce((sum,item) => sum + item.quality.components.length,0)} comprobaciones. Se ha corregido {commitments.filter(item => item.quality.correction?.kind === "error").length} error de redacción factual y se han aclarado o ampliado otras {commitments.filter(item => item.quality.correction && item.quality.correction.kind !== "error").length} fichas. Esto no permite calcular una tasa de errores del conjunto.</p>
      <p><strong>{calibration.selection.selectedCount} de {calibration.selection.totalAvailable} compromisos del inventario de referencia.</strong> {calibration.selection.method} {calibration.selection.limitation}</p>
      <details><summary>Reglas, actualización y correcciones</summary><ul>{calibration.rules.map(rule => <li key={rule}>{rule}</li>)}</ul><p>Las fuentes mantienen sus fechas de publicación y captura. «Revisar cuando» indica el trabajo necesario ante cambios; no hay actualización automática.</p><p>En cada ficha modificada puedes leer el texto anterior, el nuevo y el motivo.</p></details>
    </section>
    <details className="mn-accountability-criteria"><summary>Qué falta para valorar el cumplimiento</summary><div>
      <p>Antes de clasificar un compromiso como cumplido, parcialmente cumplido o incumplido, hay que contrastar estos elementos:</p>
      <dl><div><dt>Resultado</dt><dd>Qué se prometió y qué se ha entregado o conseguido.</dd></div><div><dt>Alcance</dt><dd>A quién, dónde y en qué medida debía aplicarse.</dd></div><div><dt>Plazo</dt><dd>Si había una fecha comprometida y si ya venció.</dd></div><div><dt>Evidencia</dt><dd>Qué documentos y registros permiten comprobarlo.</dd></div><div><dt>Actualidad</dt><dd>Si las fuentes siguen vigentes y reflejan el periodo evaluado.</dd></div></dl>
      <p className="mn-accountability-limit">Pendiente de contraste no demuestra incumplimiento. La existencia de una actuación tampoco prueba por sí sola que se haya entregado todo el resultado prometido.</p>
    </div></details>
  </section>;
}
