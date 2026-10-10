import { test, expect, type APIRequestContext } from "@playwright/test";
import type { MandateSnapshot } from "../lib/mandate/model";
import { ASSESSMENT_LABELS } from "../lib/mandate/model";

async function readSnapshot(request: APIRequestContext) {
  const response = await request.get("/api/observatorio/mandato");
  expect(response.status()).toBe(200);
  return await response.json() as MandateSnapshot;
}
const number = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 10 });

test("las treinta y ocho fichas explican promesa, efecto, periodo y lagunas con sus fuentes", async ({ page, request }) => {
  const snapshot = await readSnapshot(request);
  await page.goto("/observatorio/mandato");
  for (const item of snapshot.commitments) {
    const card = page.locator(`[id="compromiso-${item.id}"]`);
    await expect(card).toContainText(item.assessment.expected);
    await expect(card.locator(".mn-practical-effect")).toContainText(item.assessment.practicalEffect);
    await expect(card.locator(".mn-assessment-period")).toContainText(item.assessment.temporalScope);
    await card.locator("summary").click();
    await expect(card.locator(".mn-assessment-missing")).toHaveText(item.assessment.missingEvidence);
    await expect(card.locator(".mn-quality-parts > ol > li")).toHaveCount(item.quality.components.length);
    for (const part of item.quality.components) {
      const component = card.locator(".mn-quality-parts > ol > li").filter({ has: page.getByRole("heading", { name: part.label, exact: true }) });
      await expect(component).toContainText(part.criterion);
      await expect(component).toContainText(part.finding);
      for (const id of part.evidenceIds) {
        const source = item.evidence.find(source => source.id === id)!;
        await expect(component.getByRole("link", { name: source.title, exact: true })).toHaveAttribute("href", source.url);
      }
    }
    for (const id of item.assessment.evidenceIds) {
      const source = item.evidence.find(source => source.id === id)!;
      await expect(card.locator(".mn-source-list a").filter({ hasText: source.title }).first()).toHaveAttribute("href", source.url);
    }
    await card.locator("summary").click();
  }
});

test("los grupos de conclusiones llevan a sus pruebas y la ficha móvil conserva sus límites", async ({ page, request }) => {
  const snapshot = await readSnapshot(request);
  await page.goto("/observatorio/mandato");
  await page.getByLabel("Buscar en el balance", { exact: true }).fill("becas");
  for (const [verdict, label] of Object.entries(ASSESSMENT_LABELS)) {
    const count = snapshot.commitments.filter(item => item.assessment.verdict === verdict).length;
    await page.locator(".mn-findings-grid").getByRole("button", { name: `${count} ${label}` }).click();
    await expect(page.getByLabel("Conclusión del contraste", { exact: true })).toHaveValue(verdict);
    await expect(page.getByLabel("Buscar en el balance", { exact: true })).toHaveValue("");
    await expect(page.locator(".mn-commitment:visible")).toHaveCount(count);
    await expect(page.locator("#ledger-heading")).toBeFocused();
  }
  await page.getByRole("button", { name: "Limpiar filtros", exact: true }).click();
  await page.getByLabel("Tu pregunta sobre el mandato", { exact: true }).fill("¿Cómo me afectan las viviendas públicas?");
  await page.getByRole("button", { name: "Consultar", exact: true }).click();
  await expect(page.locator(".mn-answer")).toContainText("184.000");
  await expect(page.locator(".mn-answer")).toContainText("Qué cambia en la práctica");
  await expect(page.locator(".mn-answer")).toContainText("Qué falta:");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/observatorio/mandato#compromiso-c-170");
  const card = page.locator("#compromiso-c-170");
  await card.locator("summary").click();
  await expect(card).toContainText("Objetivo no alcanzado en el plazo");
  await expect(card.locator(".mn-assessment-missing")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await card.screenshot({ path: ".artifacts/observatorio/revision-jornada-mobile.png" });
});

test("la calibración distingue exactitud desconocida y muestra la corrección con versión anterior", async ({ page, request }) => {
  const snapshot = await readSnapshot(request);
  await page.goto("/observatorio/mandato");
  const quality = page.locator(".mn-quality-summary");
  await expect(quality).toContainText("Exactitud todavía no medida");
  await expect(quality).toContainText("revisión humana independiente sigue pendiente");
  await expect(quality).toContainText("38 fichas desglosadas en 82 comprobaciones");
  await expect(quality).toContainText("38 de 203");
  await quality.getByText("Reglas, actualización y correcciones", { exact: true }).click();
  await expect(quality).toContainText("no hay actualización automática");
  await quality.screenshot({ path: ".artifacts/observatorio/calibracion-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/observatorio/mandato#compromiso-c-78");
  const card = page.locator("#compromiso-c-78");
  await card.locator("summary").click();
  const correction = snapshot.commitments.find(item => item.id === "c-78")!.quality.correction!;
  await expect(card.locator(".mn-correction")).toContainText(correction.reason);
  for (const change of correction.changes) {
    await expect(card.locator(".mn-correction")).toContainText(change.before);
    await expect(card.locator(".mn-correction")).toContainText(change.after);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await card.locator(".mn-correction").screenshot({ path: ".artifacts/observatorio/correccion-mobile.png" });
});

test("el balance entrega 38 compromisos, al menos 12 indicadores y distingue información y contraste", async ({ page, request }) => {
  const snapshot = await readSnapshot(request);
  expect(snapshot.commitments).toHaveLength(38);
  expect(snapshot.indicators.length).toBeGreaterThanOrEqual(12);
  expect(snapshot.election.date).toBe("2026-11-29");
  expect(new URL(snapshot.election.source.url).hostname).toBe("www.boe.es");
  const response = await request.get("/observatorio/mandato");
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain(snapshot.election.source.url);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/observatorio/mandato");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/De los compromisos\s+a la evidencia\./);
  await expect(page.locator(".mn-commitment:visible")).toHaveCount(38);
  const first = snapshot.commitments[0];
  const card = page.locator(`[id="compromiso-${first.id}"]`);
  await expect(card.locator(".mn-dual-status")).toContainText("Información del Gobierno");
  await expect(card.locator(".mn-dual-status")).toContainText("Contraste RegTrack · piloto");
  await expect(card.locator(".mn-dual-status")).toContainText(first.governmentAssessment.label);
  await expect(card.locator(".mn-dual-status")).toContainText(first.review.label);
  await card.locator("summary").click();
  await expect(card.locator(".mn-evidence-body")).toContainText(first.review.criterion);
  await expect(card.locator(".mn-evidence-body")).toContainText("Texto del inventario");
  await expect(card.locator(".mn-origin-note")).toHaveText(first.originNote);
  await expect(card.locator(".mn-origin-date")).toContainText("Documento de origen atribuido:");
  await expect(card.locator(".mn-source-list a").first()).toHaveAttribute("href", first.evidence[0].url);
  await card.locator("summary").click();
  const selectedTopic = first.topics[0];
  await page.getByLabel("Tema del balance", { exact: true }).selectOption(selectedTopic);
  await expect(page.locator(".mn-commitment:visible")).toHaveCount(snapshot.commitments.filter((item) => item.topics.includes(selectedTopic)).length);
  await page.getByLabel("Tema del balance", { exact: true }).selectOption("");
  await page.getByLabel("Estado de revisión RegTrack", { exact: true }).selectOption(first.review.status);
  await expect(page.locator(".mn-commitment:visible")).toHaveCount(snapshot.commitments.filter((item) => item.review.status === first.review.status).length);
  await page.getByRole("button", { name: "Limpiar filtros", exact: true }).click();
  await page.getByLabel("Buscar en el balance", { exact: true }).fill("sincoincidenciasdocumentalesxyz");
  await expect(page.locator(".mn-commitment:visible")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "No hay fichas con esta selección" })).toBeVisible();
  await page.getByRole("button", { name: "Ver todas las fichas", exact: true }).click();
  await expect(page.locator(".mn-commitment:visible")).toHaveCount(38);
  await expect(page.locator(".mn-interpretation")).toHaveCount(snapshot.commentary.length);
  expect(snapshot.commentary.length).toBeGreaterThan(0);
  for (const comment of snapshot.commentary) {
    const block = page.locator(".mn-interpretation").filter({ has: page.getByRole("heading", { name: comment.title, exact: true }) });
    await expect(block).toContainText("Interpretación preparada con IA");
    await expect(block).toContainText("no se genera en directo");
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: ".artifacts/observatorio/mandato-preview.png" });
  expect(errors).toEqual([]);
});

test("los indicadores conservan unidades, periodos, ausencias y vínculos a sus fuentes", async ({ page, request }) => {
  const snapshot = await readSnapshot(request);
  await page.goto("/observatorio/mandato");
  await page.getByRole("button", { name: `Indicadores ${snapshot.indicators.length}`, exact: true }).click();
  await expect(page.locator(".mn-indicator:visible")).toHaveCount(snapshot.indicators.length);
  await expect(page.locator(".mn-indicator:visible .mn-trend svg")).toHaveCount(snapshot.indicators.filter((indicator) => indicator.observations.some((observation) => observation.value !== null)).length);
  await expect(page.getByLabel("Estado de revisión RegTrack", { exact: true })).toBeDisabled();
  for (const indicator of snapshot.indicators) {
    const card = page.locator(`[id="indicador-${indicator.id}"]`);
    await expect(card.locator(".mn-indicator-value strong")).toHaveText(indicator.latest.value === null ? "No disponible" : number.format(indicator.latest.value));
    await expect(card.locator(".mn-indicator-value span")).toContainText(indicator.unit);
    await expect(card.locator(".mn-indicator-value span")).toContainText(indicator.latest.period);
    await expect(card.getByRole("link", { name: "Fuente original", exact: true })).toHaveAttribute("href", indicator.source.url);
    await expect(card.locator(".mn-trend-scale")).toContainText(indicator.unit);
    await expect(card.locator(".mn-trend figcaption")).toContainText(indicator.observations[0].period);
    await expect(card.locator(".mn-trend figcaption")).toContainText(indicator.observations.at(-1)!.period);
    await expect(card.locator(".mn-trend-point")).toHaveCount(indicator.observations.filter((observation) => observation.value !== null).length);
    if (indicator.latest.sourcePeriod) await expect(card.locator(".mn-source-period")).toContainText(indicator.latest.sourcePeriod);
  }
  const first = snapshot.indicators[0];
  const card = page.locator(`[id="indicador-${first.id}"]`);
  await card.locator("summary").click();
  await expect(card.locator("caption")).toContainText("no como cero");
  await expect(card.locator("tbody tr")).toHaveCount(first.observations.length);
  for (const observation of first.observations) {
    const row = card.getByRole("row").filter({ has: page.getByRole("rowheader", { name: observation.period, exact: true }) });
    await expect(row.getByRole("cell").first()).toHaveText(observation.value === null ? "No disponible" : number.format(observation.value));
    await expect(row.getByRole("cell").nth(1)).toHaveText(observation.status === "p" ? "Provisional (p)" : observation.status === "avance" ? "Avance" : observation.status === "definitivo" ? "Definitivo" : observation.status || "Sin marca adicional");
  }
  await page.getByLabel("Tema del balance", { exact: true }).selectOption(first.topic);
  await expect(page.locator(".mn-indicator:visible")).toHaveCount(snapshot.indicators.filter((item) => item.topic === first.topic).length);
});

test("la consulta documental cita fuentes y reconoce cuando no hay evidencia", async ({ page }) => {
  await page.goto("/observatorio/mandato");
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await page.getByLabel("Tu pregunta sobre el mandato", { exact: true }).fill("¿Qué está documentado sobre vivienda?");
  const sent = page.waitForRequest((request) => request.url().endsWith("/api/observatorio/mandato/preguntar") && request.method() === "POST");
  await page.getByRole("button", { name: "Consultar", exact: true }).click();
  expect((await sent).postDataJSON().mode).toBe("documental");
  await expect(page.locator(".mn-answer")).toContainText("Respuesta documental");
  await expect(page.locator(".mn-answer > .mn-answer-sources a").first()).toBeVisible();
  await expect(page.locator(".mn-answer")).toContainText("no una prueba de causalidad");
  await page.getByLabel("Tu pregunta sobre el mandato", { exact: true }).fill("sincoincidenciasdocumentalesxyz");
  await page.getByRole("button", { name: "Consultar", exact: true }).click();
  await expect(page.locator(".mn-answer")).toContainText("Evidencia insuficiente");
  await expect(page.locator(".mn-answer-sources a")).toHaveCount(0);
  await expect(page.locator(".mn-answer")).toContainText("La falta de datos no demuestra incumplimiento");
});

test("el calendario cambia el día de las elecciones y después sin inventar resultados", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-28T12:00:00Z") });
  await page.goto("/observatorio/mandato");
  await page.clock.runFor(1_000);
  await expect(page.locator(".mn-countdown")).toHaveAttribute("data-phase", "before");
  await expect(page.locator(".mn-countdown-value")).toHaveText("1");
  await expect(page.locator(".mn-countdown-date")).toContainText("29 de noviembre de 2026");
  await page.clock.setSystemTime(new Date("2026-11-29T12:00:00Z"));
  await page.clock.runFor(60_001);
  await expect(page.locator(".mn-countdown")).toHaveAttribute("data-phase", "today");
  await expect(page.locator(".mn-countdown")).toContainText("Jornada electoral");
  await page.clock.setSystemTime(new Date("2026-11-30T12:00:00Z"));
  await page.clock.runFor(60_001);
  await expect(page.locator(".mn-countdown")).toHaveAttribute("data-phase", "after");
  await expect(page.locator(".mn-countdown")).toContainText("Fecha electoral alcanzada");
  await expect(page.locator(".mn-countdown")).toContainText("no incorpora resultados electorales");
  await expect(page.locator(".mn-countdown-value")).toHaveCount(0);
});

test("los enlaces de contexto abren el indicador y el móvil no desborda", async ({ page, request }) => {
  const snapshot = await readSnapshot(request);
  const linked = snapshot.commitments.find((item) => item.indicatorIds.length > 0);
  expect(linked).toBeDefined();
  const target = snapshot.indicators.find((item) => item.id === linked!.indicatorIds[0])!;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/observatorio/mandato");
  const noOverflow = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(await noOverflow()).toBe(true);
  const card = page.locator(`[id="compromiso-${linked!.id}"]`);
  await card.locator("summary").click();
  await expect(card.locator(".mn-correlation")).toContainText("No demuestra");
  expect(await noOverflow()).toBe(true);
  await card.locator(".mn-correlation").getByRole("link", { name: target.label }).click();
  await expect(page).toHaveURL(new RegExp(`#indicador-${target.id}$`));
  await expect(page.getByRole("button", { name: `Indicadores ${snapshot.indicators.length}`, exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(`[id="indicador-${target.id}"]`)).toBeInViewport();
  expect(await noOverflow()).toBe(true);
  await page.reload();
  await expect(page.locator(`[id="indicador-${target.id}"]`)).toBeVisible();
  await expect(page.getByRole("button", { name: `Indicadores ${snapshot.indicators.length}`, exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: ".artifacts/observatorio/mandato-mobile.png" });
});

test("honestidad separa cumplimiento sin calcular de cobertura documental y permite revisar cada estado", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/observatorio/mandato");
  await page.getByRole("link", { name: "Honestidad", exact: true }).click();
  const block = page.locator("#honestidad");
  await expect(block.getByRole("heading", { name: "Honestidad y compromisos", exact: true })).toBeVisible();
  await expect(block).toContainText("Lo prometido frente a lo documentado");
  await expect(block.locator(".mn-accountability-score > strong")).toHaveText("Sin calcular");
  await expect(block.locator(".mn-accountability-score")).toContainText("Cumplimiento verificable");
  await expect(block.locator(".mn-accountability-score")).toContainText("Tampoco miden la intención de engañar");
  await expect(block.locator(".mn-coverage-heading")).toContainText("100,0 %");
  await expect(block.locator(".mn-coverage-description")).toContainText("38 de 38");
  await expect(block.locator(".mn-coverage-description")).toContainText("De esta selección, no de todas las promesas");
  await expect(block.getByRole("progressbar", { name: "Cobertura de contraste documental" })).toHaveAttribute("value", "100");
  await expect(block).toContainText("Este bloque no cambia con los filtros");

  await page.getByRole("button", { name: /^Indicadores \d+$/ }).click();
  await page.getByLabel("Tema del balance", { exact: true }).selectOption("vivienda");
  await page.getByLabel("Buscar en el balance", { exact: true }).fill("sincoincidenciasdocumentalesxyz");
  await expect(block.locator(".mn-coverage-description")).toContainText("38 de 38");
  for (const state of [
    { name: "26 actuaciones documentadas", status: "documented", count: 26 },
    { name: "12 contrastes parciales", status: "partial", count: 12 },
    { name: "0 pendientes de contraste", status: "pending", count: 0 },
  ]) {
    await block.getByRole("button", { name: state.name, exact: true }).click();
    await expect(page).toHaveURL(/#balance-documental$/);
    await expect(page.getByRole("button", { name: "Compromisos 38", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByLabel("Buscar en el balance", { exact: true })).toHaveValue("");
    await expect(page.getByLabel("Tema del balance", { exact: true })).toHaveValue("");
    await expect(page.getByLabel("Estado de revisión RegTrack", { exact: true })).toHaveValue(state.status);
    await expect(page.locator(".mn-commitment:visible")).toHaveCount(state.count);
    await expect(page.locator("#ledger-heading")).toBeFocused();
    await expect(block.locator(".mn-accountability-score > strong")).toHaveText("Sin calcular");
    await expect(block.locator(".mn-coverage-description")).toContainText("38 de 38");
  }
  await page.getByRole("button", { name: "Limpiar filtros", exact: true }).click();
  await expect(page.locator(".mn-commitment:visible")).toHaveCount(38);
  await block.locator(".mn-accountability-criteria > summary").click();
  for (const criterion of ["Resultado", "Alcance", "Plazo", "Evidencia", "Actualidad"]) {
    await expect(block.getByRole("term").filter({ hasText: criterion })).toBeVisible();
  }
  await expect(block.locator(".mn-accountability-limit")).toContainText("Pendiente de contraste no demuestra incumplimiento");
  await block.locator(".mn-accountability-criteria > summary").click();
  await page.getByRole("button", { name: "¿Cómo se mide la honestidad?", exact: true }).click();
  await expect(page.locator(".mn-answer")).toContainText("sigue sin calcular");
  await expect(page.locator(".mn-answer")).toContainText("100 % (38 de 38)");
  await expect(page.locator(".mn-answer > .mn-answer-sources a").first()).toBeVisible();
  await block.screenshot({ path: ".artifacts/observatorio/honestidad-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await block.scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(block.locator(".mn-accountability-score > strong")).toBeVisible();
  await block.screenshot({ path: ".artifacts/observatorio/honestidad-mobile.png" });
});
