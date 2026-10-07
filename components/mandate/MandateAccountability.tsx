import { ArrowUpRight } from "lucide-react";
import { getMandateAccountability } from "@/lib/mandate/accountability";
import type { Commitment } from "@/lib/mandate/model";

const percent = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function MandateAccountability({ commitments, onReview }: {
  commitments: Commitment[];
  onReview: (status: Commitment["review"]["status"]) => void;
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
        <p>Los datos disponibles aún no permiten una nota global de cumplimiento. Tampoco miden la intención de engañar.</p>
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
    <details className="mn-accountability-criteria"><summary>Qué falta para valorar el cumplimiento</summary><div>
      <p>Antes de clasificar un compromiso como cumplido, parcialmente cumplido o incumplido, hay que contrastar estos elementos:</p>
      <dl><div><dt>Resultado</dt><dd>Qué se prometió y qué se ha entregado o conseguido.</dd></div><div><dt>Alcance</dt><dd>A quién, dónde y en qué medida debía aplicarse.</dd></div><div><dt>Plazo</dt><dd>Si había una fecha comprometida y si ya venció.</dd></div><div><dt>Evidencia</dt><dd>Qué documentos y registros permiten comprobarlo.</dd></div><div><dt>Actualidad</dt><dd>Si las fuentes siguen vigentes y reflejan el periodo evaluado.</dd></div></dl>
      <p className="mn-accountability-limit">Pendiente de contraste no demuestra incumplimiento. La existencia de una actuación tampoco prueba por sí sola que se haya entregado todo el resultado prometido.</p>
    </div></details>
  </section>;
}
