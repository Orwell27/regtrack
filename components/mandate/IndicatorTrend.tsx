import type { Indicator } from "@/lib/mandate/model";

const format = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 6 });

function periodPosition(period: string, frequency: string): number | null {
  if (frequency === "annual" && /^\d{4}$/.test(period)) return Number(period);
  const quarter = /^(\d{4})-Q([1-4])$/.exec(period);
  if (frequency === "quarterly" && quarter) return Number(quarter[1]) * 4 + Number(quarter[2]) - 1;
  const month = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(period);
  if (frequency === "monthly" && month) return Number(month[1]) * 12 + Number(month[2]) - 1;
  return null;
}

/** The table is the accessible source of exact values. The line never fills gaps. */
export function IndicatorTrend({ indicator }: { indicator: Indicator }) {
  const values = indicator.observations.flatMap((observation) => observation.value === null ? [] : [observation.value]);
  if (!values.length) return <p className="mn-trend-empty">No hay valores disponibles para representar esta serie.</p>;
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const flatPadding = Math.max(Math.abs(minimum) * .05, 1);
  const lower = minimum === maximum ? minimum - flatPadding : minimum;
  const upper = minimum === maximum ? maximum + flatPadding : maximum;
  const positions = indicator.observations.map((observation) => periodPosition(observation.period, indicator.frequency));
  const regular = positions.every((position) => position !== null);
  const xs = positions.map((position, index) => regular ? position! : index);
  const first = Math.min(...xs);
  const last = Math.max(...xs);
  const segments: string[][] = [];
  let segment: string[] = [];
  const points: { x: number; y: number; index: number }[] = [];
  for (let index = 0; index < indicator.observations.length; index++) {
    const observation = indicator.observations[index];
    if (observation.value === null || (regular && index > 0 && xs[index] - xs[index - 1] > 1)) {
      if (segment.length) segments.push(segment);
      segment = [];
    }
    if (observation.value === null) continue;
    const x = first === last ? 200 : 8 + ((xs[index] - first) / (last - first)) * 384;
    const y = 88 - ((observation.value - lower) / (upper - lower)) * 76;
    segment.push(`${segment.length ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`);
    points.push({ x, y, index });
  }
  if (segment.length) segments.push(segment);
  const titleId = `trend-${indicator.id}`;
  return <figure className="mn-trend">
    <p className="mn-trend-scale">Escala propia: {format.format(lower)} — {format.format(upper)} {indicator.unit}</p>
    <svg viewBox="0 0 400 100" role="img" aria-labelledby={titleId} preserveAspectRatio="none">
      <title id={titleId}>{`${indicator.label}: evolución de ${indicator.observations[0].period} a ${indicator.observations.at(-1)!.period}. Escala de ${format.format(lower)} a ${format.format(upper)} ${indicator.unit}. Consulta los valores exactos en la tabla.`}</title>
      <path className="mn-trend-grid" d="M8,12 H392 M8,88 H392" fill="none" vectorEffect="non-scaling-stroke" />
      {segments.map((path, index) => <path className="mn-trend-line" key={index} d={path.join(" ")} fill="none" vectorEffect="non-scaling-stroke" />)}
      {points.map((point) => {
        const observation = indicator.observations[point.index];
        return <circle className="mn-trend-point" key={observation.period} cx={point.x} cy={point.y} r={point.index === indicator.observations.length - 1 ? 3.4 : 2.1} vectorEffect="non-scaling-stroke"><title>{`${observation.period}: ${format.format(observation.value!)} ${indicator.unit}`}</title></circle>;
      })}
    </svg>
    <figcaption><span>{indicator.observations[0].period}</span><span>{indicator.observations.at(-1)!.period}</span></figcaption>
    <p className="mn-trend-note">Cada gráfico usa su propia escala. Los huecos no se conectan.{!regular ? " Observaciones en orden de la fuente." : ""}</p>
  </figure>;
}
