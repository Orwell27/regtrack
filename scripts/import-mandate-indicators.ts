/** Public, credential-free statistical import. Offline replay is the default. */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

type Frequency = "monthly" | "quarterly" | "annual";
type Direction = "higher" | "lower" | "context";
export type Observation = { period: string; date: string; value: number | null; status?: string; sourcePeriod?: string };
type CommonSpec = {
  id: string; label: string; topic: string; unit: string; frequency: Frequency;
  direction: Direction; directionNote: string; caveats: string[];
};
type IneSpec = CommonSpec & { provider: "ine"; seriesCode: string; expectedName: string; ineUnit: number; ineScale: number; incomeYear?: boolean };
type EurostatSpec = CommonSpec & { provider: "eurostat"; datasetCode: string; dimensions: Record<string, string> };
export type IndicatorSpec = IneSpec | EurostatSpec;
type Capture = { id: string; url: string; retrievedAt: string; evidencePath: string; sha256: string };
export type CaptureManifest = { schemaVersion: 1; captures: Capture[] };
const EVIDENCE = "data/mandate/evidence/indicators";
const ANNUAL = "La referencia anual 2023 mezcla meses anteriores y posteriores a la investidura; no representa una medición al 17 de noviembre.";
const ECV = "Año de la encuesta ECV: sus variables de ingresos se refieren al año natural anterior. No es una medición de todos los componentes en el mismo momento.";
const EPA = "EPA: estimación de encuesta, población de 16 o más años en viviendas familiares. Serie sin desestacionalizar; el trimestre de comparación afecta al resultado. Se conserva la serie oficial vigente, susceptible de revisiones poblacionales.";
const DEBT = "Deuda bruta consolidada PDE del conjunto de las Administraciones Públicas (S13), a fin de trimestre. Incluye administraciones central, autonómica, local y Seguridad Social: no atribuir el total únicamente al Gobierno central.";

export const INDICATOR_SPECS: IndicatorSpec[] = [
  { id: "epa-employment", label: "Personas ocupadas", topic: "empleo", unit: "miles de personas", frequency: "quarterly", direction: "higher", directionNote: "Un aumento indica más ocupados; no mide por sí solo la tasa de empleo, horas, productividad o calidad laboral.", caveats: [EPA], provider: "ine", seriesCode: "EPA387796", expectedName: "Total Nacional. Ambos sexos. Total. Ocupados. Valor absoluto.", ineUnit: 3, ineScale: 4 },
  { id: "epa-unemployment", label: "Tasa de paro", topic: "empleo", unit: "% de población activa", frequency: "quarterly", direction: "lower", directionNote: "Una caída indica una menor proporción de desempleados entre la población activa; puede variar también por cambios de actividad.", caveats: [EPA, "El denominador es la población activa, no toda la población. No equivale al paro registrado del SEPE."], provider: "ine", seriesCode: "EPA423474", expectedName: "Total Nacional. Tasa de paro de la población. Ambos sexos. Total.", ineUnit: 135, ineScale: 1 },
  { id: "cpi-level", label: "Nivel de precios de consumo", topic: "economia", unit: "índice, base 2025 = 100", frequency: "monthly", direction: "context", directionNote: "El índice mide el nivel de precios. Una inflación menor puede coexistir con un nivel de precios mayor.", caveats: ["IPC general nacional, misma base 2025 en toda la serie. El índice no es un importe en euros ni mide la cesta particular de cada hogar."], provider: "ine", seriesCode: "IPC290751", expectedName: "Nacional. Índice general. Índice.", ineUnit: 133, ineScale: 1 },
  { id: "cpi-inflation", label: "Inflación interanual", topic: "economia", unit: "% respecto al mismo mes del año anterior", frequency: "monthly", direction: "context", directionNote: "Mide la velocidad de variación de los precios, no su nivel. Una tasa negativa no se califica automáticamente como mejora.", caveats: ["IPC general nacional. La tasa incluye efectos base y choques externos; no es una medida causal de la política nacional.", "Las observaciones marcadas como avance están sujetas a confirmación. El último periodo de la tasa puede ser posterior al del índice; no se imputa un nivel de precios para completar ese desfase."], provider: "ine", seriesCode: "IPC290750", expectedName: "Nacional. Índice general. Variación anual.", ineUnit: 135, ineScale: 1 },
  { id: "income-person", label: "Renta neta media por persona", topic: "bienestar", unit: "euros corrientes por persona y año", frequency: "annual", direction: "context", directionNote: "Es una media nominal: su aumento no demuestra por sí solo una mejora del poder adquisitivo ni de la renta mediana.", caveats: [ANNUAL, "El periodo mostrado es el año al que pertenecen los ingresos, un año anterior al de la ECV. Se conserva sourcePeriod con el año original de la encuesta.", "No incluye alquiler imputado. No se deflacta ni se presenta como renta real."], provider: "ine", seriesCode: "ECV3763", expectedName: "Ambos sexos. Total. Total Nacional. Renta neta media por persona. Base 2013.", ineUnit: 7, ineScale: 1, incomeYear: true },
  { id: "arope", label: "Riesgo de pobreza o exclusión social", topic: "bienestar", unit: "% de población", frequency: "annual", direction: "lower", directionNote: "Una caída indica menor proporción de población incluida en al menos uno de los componentes AROPE.", caveats: [ANNUAL, ECV, "Definición AROPE Europa 2030. Sus tres componentes se solapan: no deben sumarse. No mezclar con la antigua definición Europa 2020."], provider: "ine", seriesCode: "ECV6190", expectedName: "Ambos sexos. Total. Total Nacional. Tasa de riesgo de pobreza o exclusión social (indicador AROPE). Base 2013.", ineUnit: 101, ineScale: 1 },
  { id: "poverty-risk", label: "Riesgo de pobreza relativa", topic: "bienestar", unit: "% de población", frequency: "annual", direction: "lower", directionNote: "Una caída indica menos personas bajo el umbral relativo; no demuestra que el poder adquisitivo de todos los hogares haya mejorado.", caveats: [ANNUAL, ECV, "Ingresos por debajo del 60% de la mediana nacional equivalente, después de transferencias. El umbral cambia con la distribución de ingresos; no es pobreza absoluta."], provider: "ine", seriesCode: "ECV5416", expectedName: "Ambos sexos. Total. Total Nacional. En riesgo de pobreza (renta año anterior a la entrevista). Base 2013.", ineUnit: 101, ineScale: 1 },
  { id: "severe-deprivation", label: "Carencia material y social severa", topic: "bienestar", unit: "% de población", frequency: "annual", direction: "lower", directionNote: "Una caída indica menos población que no puede permitirse el número de elementos definido por esta medida de privación.", caveats: [ANNUAL, "Componente AROPE Europa 2030: carencia de al menos 7 de 13 elementos. Se refiere al año de la encuesta; no a los ingresos del año anterior.", "No mezclar con la antigua carencia material severa de Europa 2020."], provider: "ine", seriesCode: "ECV6189", expectedName: "Ambos sexos. Total. Total Nacional. Con carencia material y social severa. Base 2013.", ineUnit: 101, ineScale: 1 },
  { id: "gini", label: "Desigualdad de renta (Gini)", topic: "bienestar", unit: "puntos, escala 0–100", frequency: "annual", direction: "lower", directionNote: "Una caída indica menor desigualdad relativa de ingresos en esta medida; no informa del nivel de renta o riqueza.", caveats: [ANNUAL, ECV, "Renta sin alquiler imputado. El índice de Gini de ingresos no mide la desigualdad de patrimonio."], provider: "ine", seriesCode: "ECV7186", expectedName: "Total Nacional. Ambos sexos. Total. Gini. Base 2013.", ineUnit: 123, ineScale: 1 },
  { id: "house-prices", label: "Precio de compra de vivienda", topic: "vivienda", unit: "índice, base 2025 = 100", frequency: "quarterly", direction: "context", directionNote: "Un alza encarece la compra y eleva el valor del activo de sus propietarios; no se asigna una valoración única.", caveats: ["IPV general: viviendas nuevas y usadas adquiridas por hogares. Misma base 2025 en toda la serie. No mide alquileres, vivienda ofertada o esfuerzo de acceso.", "Sin ajuste estacional. La evolución depende también de condiciones financieras, oferta local y composición de las compraventas."], provider: "ine", seriesCode: "IPV1209", expectedName: "Nacional. General. Índice.", ineUnit: 133, ineScale: 1 },
  { id: "rental-prices", label: "Precio del alquiler residencial", topic: "vivienda", unit: "índice, base 2015 = 100", frequency: "annual", direction: "context", directionNote: "Describe la evolución de las rentas de alquiler observadas; su impacto difiere entre inquilinos y arrendadores.", caveats: [ANNUAL, "IPVA: estadística experimental basada en fuentes tributarias sobre arrendamientos de vivienda habitual. No es un índice de ofertas inmobiliarias ni el índice legal de actualización de contratos.", "La cobertura territorial excluye País Vasco y Navarra por el régimen fiscal foral. El agregado etiquetado Total Nacional no representa esos territorios."], provider: "ine", seriesCode: "IPVA4962", expectedName: "Total Nacional. Total. Índice.", ineUnit: 133, ineScale: 1 },
  { id: "gdp-real-per-capita", label: "PIB real por habitante", topic: "economia", unit: "euros por habitante, volumen encadenado de 2020", frequency: "annual", direction: "higher", directionNote: "Un aumento indica más producción real por habitante; no equivale a renta disponible mediana ni es una medida completa de bienestar.", caveats: [ANNUAL, "Volumen encadenado de referencia 2020: se elimina el efecto agregado de precios. El denominador es la población media anual.", "Se conservan las banderas provisionales de Eurostat. Las cuentas nacionales pueden revisarse."], provider: "eurostat", datasetCode: "sdg_08_10", dimensions: { freq: "A", unit: "CLV20_EUR_HAB", na_item: "B1GQ", geo: "ES" } },
  { id: "debt-stock", label: "Deuda pública: volumen", topic: "economia", unit: "millones de euros corrientes", frequency: "quarterly", direction: "context", directionNote: "El importe nominal debe leerse junto al porcentaje del PIB y a los costes de financiación; no es el déficit del periodo.", caveats: [DEBT, "Fuente armonizada Eurostat, alimentada por los datos nacionales del procedimiento de déficit excesivo. La última observación disponible aquí puede ir por detrás de las publicaciones del Banco de España."], provider: "eurostat", datasetCode: "gov_10q_ggdebt", dimensions: { freq: "Q", na_item: "GD", sector: "S13", unit: "MIO_EUR", geo: "ES" } },
  { id: "debt-gdp", label: "Deuda pública sobre el PIB", topic: "economia", unit: "% del PIB", frequency: "quarterly", direction: "context", directionNote: "La ratio puede bajar aunque aumente la deuda en euros si crece el PIB nominal. Leer ambas series conjuntamente.", caveats: [DEBT, "El denominador es el PIB nominal acumulado de los cuatro últimos trimestres. La inflación y las revisiones del PIB afectan a la ratio.", "Serie de la misma fuente y captura que el volumen de deuda; las observaciones provisionales se conservan."], provider: "eurostat", datasetCode: "gov_10q_ggdebt", dimensions: { freq: "Q", na_item: "GD", sector: "S13", unit: "PC_GDP", geo: "ES" } },
  { id: "public-balance", label: "Saldo de las Administraciones Públicas", topic: "economia", unit: "% del PIB", frequency: "annual", direction: "context", directionNote: "Los valores negativos son déficit y los positivos superávit. Es un flujo anual; su valoración requiere contexto económico y presupuestario.", caveats: [ANNUAL, "Capacidad (+) o necesidad (−) de financiación B9 del conjunto S13 en contabilidad nacional SEC 2010. No es la ejecución mensual de caja del Estado ni la deuda acumulada.", "No se excluyen medidas extraordinarias ni se presenta como saldo estructural. Distinguir competencias de cada administración."], provider: "eurostat", datasetCode: "gov_10dd_edpt1", dimensions: { freq: "A", unit: "PC_GDP", sector: "S13", na_item: "B9", geo: "ES" } },
];

function object(value: unknown, context: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${context}: expected object`);
  return value as Record<string, unknown>;
}
function failUnless(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
export function sha256(raw: string): string { return createHash("sha256").update(raw, "utf8").digest("hex"); }
export function sourceUrl(spec: IndicatorSpec): string {
  if (spec.provider === "ine") return `https://servicios.ine.es/wstempus/js/ES/DATOS_SERIE/${spec.seriesCode}?nult=${spec.frequency === "monthly" ? 60 : spec.frequency === "quarterly" ? 20 : 10}`;
  const query = new URLSearchParams({ ...spec.dimensions, sinceTimePeriod: spec.frequency === "quarterly" ? "2023-Q1" : "2023" });
  return `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/${spec.datasetCode}?${query}`;
}
export function periodDate(period: string): string {
  if (/^\d{4}$/.test(period)) return `${period}-01-01`;
  const quarter = /^(\d{4})-Q([1-4])$/.exec(period);
  if (quarter) return `${quarter[1]}-${String((Number(quarter[2]) - 1) * 3 + 1).padStart(2, "0")}-01`;
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return `${period}-01`;
  throw new Error(`Invalid statistical period: ${period}`);
}
function numeric(value: unknown): number | null {
  if (value === null) return null;
  failUnless(typeof value === "number" && Number.isFinite(value), "Non-numeric observation (missing data must be null)");
  return value;
}
function checkObservations(observations: Observation[], frequency: Frequency): Observation[] {
  const seen = new Set<string>();
  const sorted = observations.filter(point => Number(point.period.slice(0, 4)) >= 2023).sort((a, b) => a.period.localeCompare(b.period));
  for (const point of sorted) {
    failUnless(!seen.has(point.period), `Duplicate period ${point.period}`);
    seen.add(point.period);
    failUnless(frequency === "monthly" ? /^\d{4}-\d{2}$/.test(point.period) : frequency === "quarterly" ? /^\d{4}-Q[1-4]$/.test(point.period) : /^\d{4}$/.test(point.period), "Frequency mismatch");
    failUnless(point.date === periodDate(point.period), "Date/period mismatch");
  }
  failUnless(sorted.length >= 2, "Insufficient observations since 2023");
  // A disappeared period is a broken extraction, not a zero or a line to interpolate.
  for (let i = 1; i < sorted.length; i++) {
    const previous = new Date(`${sorted[i - 1].date}T00:00:00Z`);
    previous.setUTCMonth(previous.getUTCMonth() + (frequency === "monthly" ? 1 : frequency === "quarterly" ? 3 : 12));
    failUnless(previous.toISOString().slice(0, 10) === sorted[i].date, `Missing period before ${sorted[i].period}`);
  }
  return sorted;
}
export function normalizeIne(value: unknown, spec: IneSpec): Observation[] {
  const series = object(value, spec.id);
  failUnless(series.COD === spec.seriesCode && typeof series.Nombre === "string" && series.Nombre.trim() === spec.expectedName, `${spec.id}: source series/dimensions changed`);
  failUnless(series.FK_Unidad === spec.ineUnit && series.FK_Escala === spec.ineScale, `${spec.id}: source unit/scale changed`);
  failUnless(Array.isArray(series.Data), `${spec.id}: missing Data`);
  const points = series.Data.map(item => {
    const point = object(item, spec.id);
    failUnless(Number.isInteger(point.Anyo) && Number.isInteger(point.FK_Periodo), "Invalid INE year/period");
    const year = Number(point.Anyo);
    const p = Number(point.FK_Periodo);
    let sourcePeriod: string;
    if (spec.frequency === "annual") { failUnless(p === 28, "Unexpected annual period"); sourcePeriod = String(year); }
    else if (spec.frequency === "quarterly") { failUnless(p >= 19 && p <= 22, "Unexpected quarter"); sourcePeriod = `${year}-Q${p - 18}`; }
    else { failUnless(p >= 1 && p <= 12, "Unexpected month"); sourcePeriod = `${year}-${String(p).padStart(2, "0")}`; }
    failUnless(typeof point.Fecha === "number" && Number.isFinite(point.Fecha), "Missing INE timestamp");
    const dateParts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(point.Fecha));
    const datePart = (key: string) => dateParts.find(item => item.type === key)?.value;
    failUnless(`${datePart("year")}-${datePart("month")}-${datePart("day")}` === periodDate(sourcePeriod), "INE timestamp disagrees with statistical period");
    const period = spec.incomeYear ? String(year - 1) : sourcePeriod;
    failUnless(typeof point.Secreto === "boolean" && Number.isInteger(point.FK_TipoDato), "INE observation status missing");
    // Verified against the same series/periods with tip=A; see ine-status-reference.json.
    const status = point.Secreto ? "confidencial" : point.FK_TipoDato === 3 ? "avance" : point.FK_TipoDato === 1 ? "definitivo" : `INE tipo ${point.FK_TipoDato}`;
    return { period, date: periodDate(period), value: point.Secreto ? null : numeric(point.Valor), ...(status ? { status } : {}), ...(spec.incomeYear ? { sourcePeriod } : {}) };
  });
  return checkObservations(points, spec.frequency);
}
export function normalizeEurostat(value: unknown, spec: EurostatSpec): Observation[] {
  const dataset = object(value, spec.id);
  failUnless(dataset.class === "dataset" && dataset.version === "2.0" && dataset.source === "ESTAT", "Expected Eurostat JSON-stat dataset");
  const dimensions = object(dataset.dimension, "dimensions");
  failUnless(Array.isArray(dataset.id) && Array.isArray(dataset.size), "Missing JSON-stat dimensions");
  const expected = [...Object.keys(spec.dimensions), "time"].sort();
  failUnless(JSON.stringify([...dataset.id].sort()) === JSON.stringify(expected), `${spec.id}: dimension set changed`);
  for (const [key, expectedCode] of Object.entries(spec.dimensions)) {
    const category = object(object(dimensions[key], key).category, key);
    const index = object(category.index, key);
    failUnless(Object.keys(index).length === 1 && index[expectedCode] === 0 && dataset.size[dataset.id.indexOf(key)] === 1, `${spec.id}: unexpected ${key}`);
  }
  const time = object(object(dimensions.time, "time").category, "time category");
  const index = object(time.index, "time index");
  failUnless(dataset.size[dataset.id.indexOf("time")] === Object.keys(index).length, "Invalid time cardinality");
  const values = object(dataset.value, "values");
  const statuses = dataset.status === undefined ? {} : object(dataset.status, "status");
  const indexes = Object.values(index).sort((a, b) => Number(a) - Number(b));
  failUnless(indexes.every((v, i) => v === i), "Invalid time offsets");
  failUnless(Object.keys(values).every(key => /^(0|[1-9]\d*)$/.test(key) && Number(key) < indexes.length), "Unexpected value offset");
  const points = Object.entries(index).map(([period, offset]) => {
    const key = String(offset);
    const status = statuses[key];
    failUnless(status === undefined || typeof status === "string", "Unexpected Eurostat flag");
    failUnless(typeof status !== "string" || !status.split(/\s+/).includes("f"), "Forecast is not a measured observation");
    return { period, date: periodDate(period), value: Object.hasOwn(values, key) ? numeric(values[key]) : null, ...(status ? { status } : {}) };
  });
  return checkObservations(points, spec.frequency);
}

export function buildIndicators(captures: CaptureManifest, read: (path: string) => string) {
  failUnless(captures.schemaVersion === 1 && captures.captures.length === INDICATOR_SPECS.length, "Unexpected capture manifest");
  failUnless(new Set(captures.captures.map(item => item.id)).size === INDICATOR_SPECS.length, "Duplicate capture");
  const indicators = INDICATOR_SPECS.map(spec => {
    const capture = captures.captures.find(item => item.id === spec.id);
    failUnless(capture && capture.url === sourceUrl(spec) && /^\d{4}-\d{2}-\d{2}T/.test(capture.retrievedAt) && Number.isFinite(Date.parse(capture.retrievedAt)), `${spec.id}: invalid source capture`);
    failUnless(capture.evidencePath === `${EVIDENCE}/${spec.id}.json`, "Unexpected evidence path");
    const raw = read(capture.evidencePath);
    failUnless(sha256(raw) === capture.sha256, `${spec.id}: evidence hash mismatch`);
    const parsed: unknown = JSON.parse(raw);
    const observations = spec.provider === "ine" ? normalizeIne(parsed, spec) : normalizeEurostat(parsed, spec);
    failUnless(observations.every(point => point.date <= capture.retrievedAt.slice(0, 10)), `${spec.id}: future observation`);
    const baselinePeriod = spec.frequency === "monthly" ? "2023-10" : spec.frequency === "quarterly" ? "2023-Q3" : "2023";
    const baseline = observations.find(point => point.period === baselinePeriod);
    failUnless(baseline && baseline.value !== null, `${spec.id}: baseline unavailable`);
    const title = spec.provider === "ine" ? spec.expectedName : String(object(parsed, spec.id).label);
    const source = { ...capture, title, producer: spec.provider === "ine" ? "Instituto Nacional de Estadística (INE)" : "Eurostat", ...(spec.provider === "ine" ? { seriesCode: spec.seriesCode } : { datasetCode: spec.datasetCode, updatedAt: String(object(parsed, spec.id).updated) }) };
    return {
      id: spec.id, label: spec.label, topic: spec.topic, unit: spec.unit, frequency: spec.frequency,
      geography: { code: "ES", label: spec.id === "rental-prices" ? "España, excepto País Vasco y Navarra" : "España", level: "national" as const },
      source, baseline, observations, direction: spec.direction, directionNote: spec.directionNote, caveats: spec.caveats,
      transformation: spec.provider === "ine" ? `Serie ${spec.seriesCode}; se conservan los valores y la escala de origen, se ordenan los periodos desde 2023 y no se interpolan huecos.${spec.incomeYear ? " Se resta un año al periodo ECV para mostrar el año de ingresos; sourcePeriod conserva el periodo original." : ""}` : `Selección exacta de dimensiones ${JSON.stringify(spec.dimensions)}. Se conservan valores, unidad y banderas; ausencia de celda = null.`,
    };
  });
  return {
    schemaVersion: 1 as const,
    retrievedAt: captures.captures.map(item => item.retrievedAt).sort().at(-1)!,
    coverage: "15 indicadores oficiales de ámbito nacional desde 2023. Fechas de cierre diferentes según la operación; el IPVA excluye los territorios forales. Piloto de contexto, sin índice global ni atribución causal al Gobierno.",
    caveats: ["Periodo político de referencia: investidura de noviembre de 2023. Las series mensuales y trimestrales toman como base octubre y tercer trimestre de 2023; el año 2023 es una referencia mixta en las anuales.", "date es el primer día del periodo estadístico, no la fecha de publicación, entrevista o captura. retrievedAt identifica la descarga; sourcePeriod conserva la referencia ECV cuando se transforma el año de ingresos.", "Las variaciones describen evolución observada. No prueban cumplimiento de promesas ni que una administración sea su causa.", "Se muestra el último periodo devuelto por cada fuente seleccionada, no se supone que todas las fuentes estén actualizadas a la misma fecha. No hay actualización automática remota configurada."],
    indicators,
  };
}

function atomicWrite(path: string, value: string) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, value, "utf8");
  renameSync(temporary, path);
}
export async function importIndicators(root: string, refresh: boolean) {
  const manifestPath = join(root, EVIDENCE, "manifest.json");
  let manifest: CaptureManifest;
  if (refresh) {
    const downloads: { capture: Capture; raw: string }[] = [];
    for (const spec of INDICATOR_SPECS) {
      const url = sourceUrl(spec);
      const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(60_000), headers: { Accept: "application/json" } });
      failUnless(response.ok, `${spec.id}: HTTP ${response.status}`);
      const raw = await response.text();
      failUnless(Buffer.byteLength(raw) < 2_000_000, `${spec.id}: oversized response`);
      const parsed: unknown = JSON.parse(raw);
      if (spec.provider === "ine") normalizeIne(parsed, spec); else normalizeEurostat(parsed, spec);
      downloads.push({ capture: { id: spec.id, url, retrievedAt: new Date().toISOString(), evidencePath: `${EVIDENCE}/${spec.id}.json`, sha256: sha256(raw) }, raw });
    }
    manifest = { schemaVersion: 1, captures: downloads.map(item => item.capture) };
    const rawByPath = new Map(downloads.map(item => [item.capture.evidencePath, item.raw]));
    // Validate every series and baseline before replacing any public artifact.
    const next = buildIndicators(manifest, path => { const raw = rawByPath.get(path); failUnless(raw, "Missing staged capture"); return raw; });
    // Archive the previous coherent revision locally before replacing public files.
    if (existsSync(manifestPath)) {
      const old = JSON.parse(readFileSync(manifestPath, "utf8")) as CaptureManifest;
      buildIndicators(old, path => readFileSync(join(root, path), "utf8"));
      const archive = join(root, ".artifacts/mandate-indicators", sha256(JSON.stringify(old)));
      for (const capture of old.captures) atomicWrite(join(archive, `${capture.id}.json`), readFileSync(join(root, capture.evidencePath), "utf8"));
      atomicWrite(join(archive, "manifest.json"), JSON.stringify(old, null, 2) + "\n");
    }
    for (const item of downloads) atomicWrite(join(root, item.capture.evidencePath), item.raw);
    atomicWrite(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    atomicWrite(join(root, "data/mandate/indicators.json"), JSON.stringify(next, null, 2) + "\n");
    return next;
  }
  manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as CaptureManifest;
  const collection = buildIndicators(manifest, path => readFileSync(join(root, path), "utf8"));
  atomicWrite(join(root, "data/mandate/indicators.json"), JSON.stringify(collection, null, 2) + "\n");
  return collection;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== "--refresh")) throw new Error("Usage: tsx scripts/import-mandate-indicators.ts [--refresh]");
  importIndicators(process.cwd(), args.includes("--refresh")).then(result => {
    console.log(JSON.stringify({ count: result.indicators.length, retrievedAt: result.retrievedAt, latest: result.indicators.map(item => ({ id: item.id, period: item.observations.at(-1)?.period })) }, null, 2));
  }).catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
}
