import { expect, test } from "@playwright/test";

test("Ávila distingue aperturas, previsiones y atribución municipal en móvil", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/observatorio/mandato/cobertura");
  await page.getByLabel("Buscar administración").fill("Ávila");
  await page.getByRole("link", { name: "Leer inventario y revisiones territoriales" }).click();
  await expect(page).toHaveURL(/\/territorios\/m-05019$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ávila · programa municipal 2023–2027");
  await expect(page.locator(".mt-review")).toHaveCount(3);
  await expect(page.locator("#compromiso-m-05019-p11-01")).toContainText("documentación preparatoria");
  await expect(page.locator("#compromiso-m-05019-p18-01")).toContainText("no hogares atendidos");
  await expect(page.locator("#compromiso-m-05019-p51-01")).toContainText("No se atribuye su ejecución al Ayuntamiento");
  await page.getByRole("combobox", { name: "Revisión", exact: true }).selectOption("pending");
  await expect(page.getByRole("status")).toContainText("160 resultados");
  await page.getByLabel("Buscar sección municipal").fill("Vicolozano");
  await expect(page.getByRole("status")).toContainText("1 resultado");
  await expect(page.locator("#territorial-inventory").getByRole("link", { name: /página 37/ })).toHaveAttribute("href", /CUMPLIMOS\.pdf#page=37$/);
  await expect(page.locator("#territorial-inventory")).toContainText("no es un número oficial");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/avila-mobile-evidence.png" });
});

test("Almería separa viviendas previstas, reconocimiento y desistimiento en móvil", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/observatorio/mandato/cobertura");
  await page.getByLabel("Buscar administración").fill("Almería");
  await page.getByRole("link", { name: "Leer inventario y revisiones territoriales" }).click();
  await expect(page).toHaveURL(/\/territorios\/m-04013$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Almería · programa municipal 2023–2027");
  await expect(page.locator(".mt-review")).toHaveCount(3);
  await expect(page.locator("#compromiso-m-04013-p15-07")).toContainText("no se suman 203 y 92");
  await expect(page.locator("#compromiso-m-04013-p08-07")).toContainText("UNICEF");
  await expect(page.locator("#compromiso-m-04013-p17-11")).toContainText("No pertenece a la tabla de remanentes incorporados");
  await page.getByRole("combobox", { name: "Revisión", exact: true }).selectOption("pending");
  await expect(page.getByRole("status")).toContainText("152 resultados");
  await page.getByLabel("Buscar sección municipal").fill("Mercado Central");
  await expect(page.getByRole("status")).toContainText("1 resultado");
  await expect(page.locator("#territorial-inventory")).toContainText("no es un número oficial");
  await expect(page.locator("#territorial-inventory")).not.toContainText("apartados con viñeta");
  await expect(page.locator("#territorial-inventory").getByRole("link", { name: /página 19/ })).toHaveAttribute("href", /Programa-Electoral-MMV\.pdf#page=19$/);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/almeria-mobile-evidence.png" });
});

test("Albacete distingue apartados, compromisos éticos y pruebas de ejecución en móvil", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/observatorio/mandato/cobertura");
  await page.getByLabel("Buscar administración").fill("Albacete");
  await page.getByRole("link", { name: "Leer inventario y revisiones territoriales" }).click();
  await expect(page).toHaveURL(/\/territorios\/m-02003$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Albacete · programa municipal 2023–2027");
  await expect(page.locator(".mt-review")).toHaveCount(3);
  await expect(page.locator("#compromiso-m-02003-3")).toContainText("360.000");
  await expect(page.locator("#compromiso-m-02003-108")).toContainText("Comercia y Ferimotor");
  await page.getByRole("combobox", { name: "Revisión", exact: true }).selectOption("pending");
  await expect(page.getByRole("status")).toContainText("250 resultados");
  await page.getByLabel("Buscar medida municipal").fill("Ético");
  await expect(page.getByRole("status")).toContainText("3 resultados");
  await expect(page.locator("#territorial-inventory")).toContainText("Sin conclusión de RegTrack");
  await expect(page.locator("#territorial-inventory").getByRole("link", { name: /página 26/ })).toHaveCount(3);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/albacete-mobile-evidence.png" });
});

test("Huesca conserva el alcance resumido, las pruebas y los pendientes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/observatorio/mandato/cobertura");
  await page.getByLabel("Buscar administración").fill("Huesca");
  await page.getByRole("link", { name: "Leer inventario y revisiones territoriales" }).click();
  await expect(page).toHaveURL(/\/territorios\/m-22125$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Huesca · mandato municipal iniciado el 17/06/2023");
  await expect(page.locator(".mc-intro")).toContainText("subconjunto del programa");
  await expect(page.locator(".mt-review")).toHaveCount(3);
  await expect(page.locator("#compromiso-m-22125-2")).toContainText("2029–2030");
  await expect(page.locator("#compromiso-m-22125-5")).toContainText("tramos de empleados");
  await page.getByRole("combobox", { name: "Revisión", exact: true }).selectOption("pending");
  await expect(page.getByRole("status")).toContainText("2 resultados");
  await expect(page.locator("#territorial-inventory .mc-card")).toHaveCount(2);
  await expect(page.locator("#territorial-inventory")).toContainText("Sin conclusión de RegTrack");
  const housing = page.locator("#compromiso-m-22125-1");
  await housing.getByText("Medida inicial y página de origen", { exact: true }).click();
  await expect(housing.getByRole("link", { name: "Selección electoral de cinco puntos · resumen editorial · página 2", exact: true })).toHaveAttribute("href", /20230518162522.*PP\.pdf#page=2$/);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/huesca-mobile-evidence.png" });
});

test("Zaragoza municipal consulta las juntas y sus pendientes", async ({ page }) => {
  await page.goto("/observatorio/mandato/cobertura");
  await page.getByLabel("Buscar administración").fill("Zaragoza");
  await page.getByRole("combobox", { name: "Ámbito", exact: true }).selectOption("municipality");
  await page.getByRole("link", { name: "Leer inventario y revisiones territoriales" }).click();
  await expect(page).toHaveURL(/\/territorios\/m-50297$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Zaragoza · mandato municipal 2023–2027");
  await expect(page.locator(".mt-review")).toHaveCount(3);
  await expect(page.locator(".mn-summary-grid")).toContainText("secciones del programa del documento importadas");
  await expect(page.locator(".mc-intro")).not.toContainText("Apartados con viñeta");
  await page.getByRole("combobox", { name: "Revisión", exact: true }).selectOption("pending");
  await expect(page.getByRole("status")).toContainText("34 resultados");
  await page.getByLabel("Buscar sección municipal").fill("Alfocea");
  await expect(page.getByRole("status")).toContainText("1 resultados");
  await expect(page.locator("#territorial-inventory")).toContainText("Sin conclusión de RegTrack");
  const housing = page.locator("#compromiso-m-50297-7");
  await housing.getByText("Apartado del programa y página de origen", { exact: true }).click();
  await expect(housing.getByRole("link", { name: "Programa electoral de Natalia Chueca · 2023 · página 32–33", exact: true })).toHaveAttribute("href", /Programa-electoral-Natalia-Chueca.pdf#page=32$/);
});

test("Zaragoza municipal conserva discrepancias y límites en móvil", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/observatorio/mandato/territorios/m-50297");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.screenshot({ path: "test-results/zaragoza-mobile-intro.png" });
  await expect(page.locator("#compromiso-m-50297-3")).toContainText("Zaragoza en 2027 y Nápoles en 2026");
  await expect(page.locator("#compromiso-m-50297-6")).toContainText("no fija por sí solo un plazo contractual");
  await expect(page.locator("#compromiso-m-50297-7")).toContainText("anterior a la elección de Chueca");
  const housing = page.locator("#compromiso-m-50297-7");
  await expect(housing).toContainText("no son gasto ejecutado");
  await expect(housing).toContainText("el primer plazo ha pasado y el segundo aún no");
  await housing.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/zaragoza-mobile-housing.png" });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("Murcia municipal distingue el municipio de la región y filtra el discurso", async ({ page }) => {
  await page.goto("/observatorio/mandato/cobertura");
  await page.getByLabel("Buscar administración").fill("Murcia");
  await page.getByRole("combobox", { name: "Ámbito", exact: true }).selectOption("municipality");
  await page.getByRole("link", { name: "Leer inventario y revisiones territoriales" }).click();
  await expect(page).toHaveURL(/\/territorios\/m-30030$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Murcia · mandato municipal 2023–2027");
  await expect(page.locator(".mt-review")).toHaveCount(3);
  await page.getByRole("combobox", { name: "Revisión", exact: true }).selectOption("pending");
  await expect(page.getByRole("status")).toContainText("8 resultados");
  await page.getByLabel("Buscar medida municipal").fill("pluralidad");
  await expect(page.getByRole("status")).toContainText("1 resultados");
  await expect(page.locator("#territorial-inventory")).toContainText("Sin conclusión de RegTrack");
  const housing = page.locator("#compromiso-m-30030-8");
  await housing.getByText("Promesa y página de origen", { exact: true }).click();
  await expect(housing.getByRole("link", { name: "Discurso de investidura municipal · 17/06/2023 · página 19", exact: true })).toHaveAttribute("href", /acta-sesion-constitutiva-17-junio.pdf#page=19$/);
});

test("Murcia municipal conserva los límites de inversión y vivienda en móvil", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/observatorio/mandato/territorios/m-30030");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.screenshot({ path: "test-results/murcia-city-mobile-intro.png" });
  await expect(page.locator("#compromiso-m-30030-6")).toContainText("13 proyectos");
  await expect(page.locator("#compromiso-m-30030-7")).toContainText("fase I en 2019");
  const housing = page.locator("#compromiso-m-30030-8");
  await expect(housing).toContainText("sin ofertas");
  await expect(housing).toContainText("No acredita que se hayan entregado las 25");
  await housing.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/murcia-city-mobile-housing.png" });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("Castellón municipal permite consultar el pacto y sus pendientes", async ({ page }) => {
  await page.goto("/observatorio/mandato/cobertura");
  await page.getByLabel("Buscar administración").fill("Castell");
  await page.getByRole("combobox", { name: "Ámbito", exact: true }).selectOption("municipality");
  await page.getByRole("link", { name: "Leer inventario y revisiones territoriales" }).click();
  await expect(page).toHaveURL(/\/territorios\/m-12040$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Castellón · mandato municipal 2023–2027");
  await expect(page.locator(".mt-review")).toHaveCount(3);
  await page.getByRole("combobox", { name: "Revisión", exact: true }).selectOption("pending");
  await expect(page.getByRole("status")).toContainText("87 resultados");
  await page.getByLabel("Buscar medida municipal").fill("Menjar");
  await expect(page.getByRole("status")).toContainText("1 resultados");
  await expect(page.locator("#territorial-inventory")).toContainText("Sin conclusión de RegTrack");
  const police = page.locator("#compromiso-m-12040-6");
  await police.getByText("Apartado del programa y página de origen", { exact: true }).click();
  await expect(police.getByRole("link", { name: "Pacto municipal PP–VOX · agosto de 2023 · página 2", exact: true })).toHaveAttribute("href", /pacto-pp-vox-ayuntamiento-de-castello-pdf.pdf#page=2$/);
});

test("Castellón municipal conserva el contraste en móvil", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/observatorio/mandato/territorios/m-12040");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.screenshot({ path: "test-results/castellon-mobile-intro.png" });
  await expect(page.locator("#compromiso-m-12040-6")).toContainText("no son directamente comparables");
  await expect(page.locator("#compromiso-m-12040-55")).toContainText("no es gasto ejecutado");
  const toponym = page.locator("#compromiso-m-12040-63");
  await expect(toponym).toContainText("no se afirma firmeza");
  await toponym.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/castellon-mobile-toponym.png" });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("Alicante municipal permite consultar el programa y sus pendientes", async ({ page }) => {
  await page.goto("/observatorio/mandato/cobertura");
  await page.getByLabel("Buscar administración").fill("Alicante");
  await page.getByRole("combobox", { name: "Ámbito", exact: true }).selectOption("municipality");
  await page.getByRole("link", { name: "Leer inventario y revisiones territoriales" }).click();
  await expect(page).toHaveURL(/\/territorios\/m-03014$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Alicante · mandato municipal iniciado en 2023");
  await expect(page.locator(".mt-review")).toHaveCount(3);
  await page.getByRole("combobox", { name: "Revisión", exact: true }).selectOption("pending");
  await expect(page.getByRole("status")).toContainText("898 resultados");
  await page.getByLabel("Buscar medida municipal").fill("bullying");
  await expect(page.getByRole("status")).toContainText("1 resultados");
  await expect(page.locator("#territorial-inventory")).toContainText("Sin conclusión de RegTrack");
  const tax = page.locator("#compromiso-m-03014-43");
  await tax.getByText("Apartado del programa y página de origen", { exact: true }).click();
  await expect(tax.getByRole("link", { name: "Programa electoral del PP de Alicante · 2023 · página 6", exact: true })).toHaveAttribute("href", /PROGRAMAPP.pdf#page=6$/);
});

test("Alicante municipal mantiene condiciones y límites en móvil", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/observatorio/mandato/territorios/m-03014");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.screenshot({ path: "test-results/alicante-mobile-intro.png" });
  await expect(page.locator("#compromiso-m-03014-43")).toContainText("sujeto pasivo");
  await expect(page.locator("#compromiso-m-03014-672")).toContainText("no aprueba definitivamente");
  const childhood = page.locator("#compromiso-m-03014-890");
  await expect(childhood).toContainText("no se considera vencida");
  await childhood.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/alicante-mobile-childhood.png" });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("València municipal permite filtrar el discurso sin mezclar la comunidad", async ({ page }) => {
  await page.goto("/observatorio/mandato/cobertura");
  await page.getByLabel("Buscar administración").fill("València");
  await page.getByRole("combobox", { name: "Ámbito", exact: true }).selectOption("municipality");
  await page.getByRole("link", { name: "Leer inventario y revisiones territoriales" }).click();
  await expect(page).toHaveURL(/\/territorios\/m-46250$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("València · mandato municipal 2023–2027");
  await expect(page.locator(".mc-intro")).toContainText("no son promesas únicas");
  await expect(page.locator(".mt-review")).toHaveCount(3);
  await page.getByRole("combobox", { name: "Revisión", exact: true }).selectOption("pending");
  await expect(page.getByRole("status")).toContainText("16 resultados");
  await page.getByLabel("Buscar medida municipal").fill("natalidad");
  await expect(page.locator("#territorial-inventory")).toContainText("Sin conclusión de RegTrack");
  const tax = page.locator("#compromiso-m-46250-4");
  await tax.getByText("Promesa y página de origen", { exact: true }).click();
  await expect(tax.getByRole("link", { name: "Discurso de investidura municipal · 17/06/2023 · página 26", exact: true })).toHaveAttribute("href", /#page=26$/);
});
test("València municipal conserva límites de impuestos, licencias y Marina en móvil", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/observatorio/mandato/territorios/m-46250");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.screenshot({ path: "test-results/valencia-mobile-intro.png" });
  await expect(page.locator("#compromiso-m-46250-4")).toContainText("dos años");
  const licences = page.locator("#compromiso-m-46250-6");
  await expect(licences).toContainText("primer trimestre de 2023");
  await expect(licences).toContainText("primer semestre de 2023");
  await licences.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/valencia-mobile-licences.png" });
  await expect(page.locator("#compromiso-m-46250-15")).toContainText("antes de este mandato");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("Valenciana muestra secciones del discurso y permite distinguir las pendientes", async ({ page }) => {
  await page.goto("/observatorio/mandato/cobertura");
  await page.getByLabel("Buscar administración").fill("Valenciana");
  await expect(page.locator(".mc-counts")).toContainText("3 secciones del discurso");
  await page.getByRole("link", { name: "Leer inventario y revisiones territoriales" }).click();
  await expect(page).toHaveURL(/\/territorios\/r-10$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Comunitat Valenciana · investidura de noviembre de 2025");
  await expect(page.locator(".mc-intro")).toContainText("no son promesas únicas");
  await expect(page.getByRole("status")).toHaveText("19 resultados · página 1 de 2");
  await expect(page.locator(".mt-review")).toHaveCount(3);
  await page.getByRole("combobox", { name: "Revisión", exact: true }).selectOption("pending");
  await expect(page.getByRole("status")).toContainText("16 resultados");
  await page.getByLabel("Buscar medida autonómica").fill("Cofrentes");
  await expect(page.getByRole("status")).toContainText("1 resultados");
  await expect(page.locator("#territorial-inventory")).toContainText("Sin conclusión de RegTrack");
  await page.getByLabel("Buscar medida autonómica").fill("");
  await page.getByRole("combobox", { name: "Revisión", exact: true }).selectOption("reviewed");
  await expect(page.getByRole("status")).toContainText("3 resultados");
  const university = page.locator("#compromiso-r-10-12");
  await university.getByText("Promesa y página de origen", { exact: true }).click();
  await expect(university.getByRole("link", { name: "Discurso inicial de investidura · 27/11/2025 · página 8", exact: true })).toHaveAttribute("href", /XI000780.pdf#page=8$/);
});

test("Valenciana conserva condiciones y límites en móvil", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/observatorio/mandato/territorios/r-10");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator(".mn-summary-grid")).toContainText("secciones pendientes de revisión");
  await page.screenshot({ path: "test-results/valenciana-mobile-intro.png" });
  const university = page.locator("#compromiso-r-10-12");
  await expect(university).toContainText("hasta agotar 20 millones");
  await expect(university).toContainText("tres meses");
  const music = page.locator("#compromiso-r-10-13");
  await expect(music).toContainText("150 € por contribuyente, no por hijo");
  await expect(music).toContainText("la fórmula da cero");
  await music.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/valenciana-mobile-music.png" });
  await expect(page.locator("#compromiso-r-10-15")).toContainText("deroga expresamente");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("Extremadura separa el nuevo mandato, 62 apartados y cuatro fichas", async ({ page }) => {
  await page.goto("/observatorio/mandato/cobertura");
  await page.getByLabel("Buscar administración").fill("Extremadura");
  await page.getByRole("combobox", { name: "Ámbito", exact: true }).selectOption("region");
  await page.getByRole("link", { name: "Leer inventario y revisiones territoriales" }).click();
  await expect(page).toHaveURL(/\/territorios\/r-11$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Extremadura · mandato iniciado en abril de 2026");
  await expect(page.locator(".mt-review")).toHaveCount(4);
  await expect(page.getByRole("status")).toHaveText("62 resultados · página 1 de 5");
  await expect(page.locator(".mn-method").filter({ has: page.getByRole("heading", { name: "Qué se ha comprobado", exact: true }) })).toContainText("61 puntos y 74 medidas");
  await page.getByRole("combobox", { name: "Revisión", exact: true }).selectOption("pending");
  await expect(page.getByRole("status")).toContainText("58 resultados");
  await page.getByLabel("Buscar medida autonómica").fill("Senador por designación");
  await expect(page.locator("#territorial-inventory")).toContainText("Sin conclusión de RegTrack");
  await expect(page.locator("#territorial-inventory").getByRole("link", { name: /página 23/ })).toHaveAttribute("href", /20260416-ACUERDO-PP-VOX-FINAL-1\.pdf#page=23$/);
});

test("Extremadura en móvil conserva topes, plazos y pruebas pendientes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/observatorio/mandato/territorios/r-11");
  await expect(page.locator(".mc-intro")).toContainText("revisión humana independiente");
  await expect(page.locator("#compromiso-r-11-50")).toContainText("200 € al mes");
  await expect(page.locator("#compromiso-r-11-1")).toContainText("149 millones");
  await expect(page.locator("#compromiso-r-11-6")).toContainText("no terminar todas las obras");
  await expect(page.locator("#compromiso-r-11-32")).toContainText("puntos porcentuales");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/extremadura-mobile-intro.png" });
  await page.locator("#r-11-50-ayudas").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/extremadura-mobile-infantil.png" });
});

test("Castilla y León separa 220 apartados y tres fichas del mandato de junio", async ({ page }) => {
  await page.goto("/observatorio/mandato/cobertura");
  await page.getByLabel("Buscar administración").fill("Castilla y León");
  await page.getByRole("combobox", { name: "Ámbito", exact: true }).selectOption("region");
  await page.getByRole("link", { name: "Leer inventario y revisiones territoriales" }).click();
  await expect(page).toHaveURL(/\/territorios\/r-07$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Castilla y León · mandato iniciado en junio de 2026");
  await expect(page.locator(".mt-review")).toHaveCount(3);
  await expect(page.getByRole("status")).toHaveText("220 resultados · página 1 de 15");
  await page.getByRole("combobox", { name: "Revisión", exact: true }).selectOption("pending");
  await expect(page.getByRole("status")).toContainText("217 resultados");
  await page.getByLabel("Buscar medida autonómica").fill("11.8");
  await expect(page.locator("#territorial-inventory")).toContainText("Numeración cotejada");
  await expect(page.locator("#territorial-inventory")).toContainText("Sin conclusión de RegTrack");
  await expect(page.locator("#territorial-inventory").getByRole("link", { name: /página 38/ })).toHaveAttribute("href", /acuerdo-pp-vox-pdf\.pdf#page=38$/);
});

test("Castilla y León en móvil conserva condiciones, fechas y límites de las pruebas", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/observatorio/mandato/territorios/r-07");
  await expect(page.locator(".mc-intro")).toContainText("revisión humana independiente");
  await expect(page.locator("#compromiso-r-07-13-17")).toContainText("disponibilidad presupuestaria");
  await expect(page.locator("#compromiso-r-07-13-17")).toContainText("acreditación posterior");
  await expect(page.locator("#compromiso-r-07-15-3")).toContainText("primer presupuesto en 2027");
  await expect(page.locator("#compromiso-r-07-6-2")).toContainText("no demuestra que el problema continúe");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/cyl-mobile-intro.png" });
  await page.locator("#r-07-13-17-pago-matricula").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/cyl-mobile-university.png" });
});

test("Andalucía separa el pacto de 2026, tres revisiones y medidas pendientes", async ({ page }) => {
  await page.goto("/observatorio/mandato/cobertura");
  await page.getByLabel("Buscar administración").fill("Andalucía");
  await page.getByRole("combobox", { name: "Ámbito", exact: true }).selectOption("region");
  await page.getByRole("link", { name: "Leer inventario y revisiones territoriales" }).click();
  await expect(page).toHaveURL(/\/territorios\/r-01$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Andalucía · mandato iniciado en julio de 2026");
  await expect(page.locator(".mt-review")).toHaveCount(3);
  await expect(page.getByRole("status")).toHaveText("150 resultados · página 1 de 10");
  await page.getByRole("combobox", { name: "Revisión", exact: true }).selectOption("pending");
  await expect(page.getByRole("status")).toContainText("147 resultados");
  await page.getByLabel("Buscar medida autonómica").fill("litigar");
  await expect(page.getByRole("status")).toContainText("1 resultados");
  await expect(page.locator("#territorial-inventory")).toContainText("primer semestre de 2026");
  await expect(page.locator("#territorial-inventory")).toContainText("anterior a la firma");
  await expect(page.locator("#territorial-inventory")).toContainText("Sin conclusión de RegTrack");
  await expect(page.locator("#territorial-inventory").getByRole("link", { name: /página 32/ })).toHaveAttribute("href", /pactopp-vox-andalucia\.pdf#page=32$/);
});

test("Andalucía en móvil distingue cursos escolares, trámites y resultados", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/observatorio/mandato/territorios/r-01");
  await expect(page.locator(".mc-intro")).toContainText("revisión humana independiente");
  await expect(page.locator('section[aria-labelledby="r-01-63-plazo"]')).toContainText("2027–2028");
  await expect(page.locator('section[aria-labelledby="r-01-63-plazo"]')).toContainText("Objetivo aún no alcanzado");
  await expect(page.locator('section[aria-labelledby="r-01-47-plazo"]')).toContainText("cinco años");
  await expect(page.locator('section[aria-labelledby="r-01-88-antecedente"]')).toContainText("sin constituir una validación técnica");
  await expect(page.locator('section[aria-labelledby="r-01-88-apertura"]')).toContainText("no se trata como vencido");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/andalucia-mobile-intro.png" });
  await page.locator("#r-01-63-plazo").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/andalucia-mobile-school.png" });
});

test("Castilla-La Mancha conserva el programa inicial y separa sus cinco fichas", async ({ page }) => {
  await page.goto("/observatorio/mandato/cobertura");
  await page.getByLabel("Buscar administración").fill("Castilla-La Mancha");
  await page.getByRole("combobox", { name: "Ámbito", exact: true }).selectOption("region");
  await page.getByRole("link", { name: "Leer inventario y revisiones territoriales" }).click();
  await expect(page).toHaveURL(/\/territorios\/r-08$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Castilla-La Mancha · mandato 2023–2027");
  await expect(page.locator(".mt-review")).toHaveCount(5);
  await expect(page.getByRole("status")).toHaveText("861 resultados · página 1 de 58");
  await page.getByRole("combobox", { name: "Revisión", exact: true }).selectOption("pending");
  await expect(page.getByRole("status")).toContainText("856 resultados");
  await page.getByLabel("Buscar medida autonómica").fill("767");
  await expect(page.locator("#territorial-inventory")).toContainText("Sin conclusión de RegTrack");
  await page.getByLabel("Buscar medida autonómica").fill("");
  await page.getByRole("combobox", { name: "Revisión", exact: true }).selectOption("reviewed");
  await expect(page.getByRole("status")).toContainText("5 resultados");
  const university = page.locator("#compromiso-r-08-384");
  await university.getByText("Medida inicial y página de origen", { exact: true }).click();
  await expect(university).toContainText("si primero se queda despejado");
  await expect(university.getByRole("link", { name: "Programa de Gobierno inicial · página 30", exact: true })).toHaveAttribute("href", /\.pdf#page=30$/);
});

test("Castilla-La Mancha en móvil distingue unidades y avance de cumplimiento", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/observatorio/mandato/territorios/r-08");
  await expect(page.locator("#compromiso-r-08-1")).toContainText("78.035 personas");
  await expect(page.locator("#compromiso-r-08-257")).toContainText("No son un cobro universal anual");
  await expect(page.locator("#compromiso-r-08-384")).toContainText("60 o 72");
  await expect(page.locator("#compromiso-r-08-446")).toContainText("37,4 %");
  await expect(page.locator("#compromiso-r-08-446")).toContainText("no se ha auditado la totalidad");
  await expect(page.locator(".mc-intro")).toContainText("revisión humana independiente");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/clm-mobile-intro.png" });
  await page.screenshot({ path: "test-results/clm-mobile.png", fullPage: true });
});

test("Madrid autonómico conserva el programa y no se mezcla con el Ayuntamiento", async ({ page }) => {
  await page.goto("/observatorio/mandato/cobertura");
  await page.getByLabel("Buscar administración").fill("Madrid");
  await page.getByRole("combobox", { name: "Ámbito", exact: true }).selectOption("region");
  await expect(page.locator(".mc-list")).toContainText("459 de 459");
  await page.getByRole("link", { name: "Leer inventario y revisiones territoriales" }).click();
  await expect(page).toHaveURL(/\/territorios\/r-13$/);
  await expect(page.locator(".mt-review")).toHaveCount(4);
  await expect(page.getByText("Extracción digital provisional.", { exact: false })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("459 resultados");
  await page.getByRole("combobox", { name: "Revisión", exact: true }).selectOption("pending");
  await expect(page.getByRole("status")).toContainText("455 resultados");
  await page.getByLabel("Buscar medida autonómica").fill("3.000. Todos los niños");
  await expect(page.getByRole("status")).toContainText("1 resultados");
  await expect(page.locator("#territorial-inventory")).toContainText("tendrán plaza pública");
  await expect(page.locator("#territorial-inventory").getByRole("link", { name: /página 34/ })).toHaveAttribute("href", /PE_2023_completo\.pdf#page=34$/);
});

test("Madrid autonómico en móvil diferencia tarifa, oferta, obras y pagos", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/observatorio/mandato/territorios/r-13");
  await expect(page.locator('section[aria-labelledby="r-13-5-2-pagos"]')).toContainText("Evidencia insuficiente");
  await expect(page.locator('section[aria-labelledby="r-13-5-10-promesa"]')).toContainText("Compromiso documentado · ejecución no acreditada");
  await expect(page.locator('section[aria-labelledby="r-13-5-10-tarifa-familiar"]')).toContainText("Objetivo aún no alcanzado");
  await expect(page.locator('section[aria-labelledby="r-13-6-2-lista-estatal"]')).toContainText("no equivale necesariamente a ausencia de oferta");
  await expect(page.locator('section[aria-labelledby="r-13-10-17-entrega"]')).toContainText("Plan Vive general");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/madrid-region-mobile-top.png" });
  await page.locator("#r-13-5-10-tarifa-familiar").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/madrid-region-mobile-transport.png" });
});

test("Galicia conserva apartados pendientes y limita la cifra del partido", async ({ page }) => {
  await page.goto("/observatorio/mandato/cobertura");
  await page.getByLabel("Buscar administración").fill("Galicia");
  await expect(page.locator(".mc-list")).toContainText("793 de 793");
  await page.getByRole("link", { name: "Leer inventario y revisiones territoriales" }).click();
  await expect(page).toHaveURL(/\/territorios\/r-12$/);
  await expect(page.locator(".mn-summary-grid")).toContainText("apartados numerados");
  await expect(page.getByText("Extracción digital provisional.", { exact: false })).toBeVisible();
  await expect(page.locator(".mc-warning").filter({ hasText: /OCR|viñeta/ })).toHaveCount(0);
  await expect(page.locator(".mt-review")).toHaveCount(3);
  await expect(page.locator(".mn-method").filter({ has: page.getByRole("heading", { name: "Qué se ha comprobado", exact: true }) })).toContainText("no se interpreta como cumplimiento total");
  await expect(page.getByRole("status")).toContainText("793 resultados");
  await page.getByRole("combobox", { name: "Revisión", exact: true }).selectOption("pending");
  await expect(page.getByRole("status")).toContainText("790 resultados");
  await page.getByLabel("Buscar medida autonómica").fill("Sanidad penitenciaria");
  await expect(page.getByRole("status")).toContainText("1 resultados");
  await expect(page.locator("#territorial-inventory")).toContainText("cotejado visualmente");
  await expect(page.locator("#territorial-inventory")).toContainText("Sin conclusión de RegTrack");
});

test("Galicia en móvil distingue normas, entregas y aplicación efectiva", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/observatorio/mandato/territorios/r-12");
  await expect(page.locator('section[aria-labelledby="r-12-3-4-entregas"]')).toContainText("Dato comunicado por la administración");
  await expect(page.locator('section[aria-labelledby="r-12-3-4-contraste"]')).toContainText("valoración de la oposición");
  await expect(page.locator('section[aria-labelledby="r-12-7-1-requisitos"]')).toContainText("90 %");
  await expect(page.locator('section[aria-labelledby="r-12-7-1-aplicacion"]')).toContainText("15/02/2027");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/galicia-mobile-top.png" });
  await page.locator("#r-12-7-1-requisitos").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/galicia-mobile-university.png" });
});

test("Baleares conserva el pacto inicial y no oculta los apartados pendientes", async ({ page }) => {
  await page.goto("/observatorio/mandato/cobertura");
  await page.getByLabel("Buscar administración").fill("Balears");
  await page.getByRole("combobox", { name: "Ámbito", exact: true }).selectOption("region");
  await expect(page.locator(".mc-list")).toContainText("117 de 117");
  await page.getByRole("link", { name: "Leer inventario y revisiones territoriales" }).click();
  await expect(page).toHaveURL(/\/territorios\/r-04$/);
  await expect(page.locator(".mt-review")).toHaveCount(3);
  await expect(page.locator(".mn-method").filter({ has: page.getByRole("heading", { name: "Qué se ha comprobado", exact: true }) })).toContainText("12/07/2024");
  await expect(page.getByRole("status")).toHaveText("117 resultados · página 1 de 8");
  await page.getByRole("combobox", { name: "Revisión", exact: true }).selectOption("pending");
  await expect(page.getByRole("status")).toContainText("114 resultados");
  await page.getByLabel("Buscar medida autonómica").fill("bimensual");
  await expect(page.getByRole("status")).toContainText("1 resultados");
  await expect(page.locator("#territorial-inventory")).toContainText("Sin conclusión de RegTrack");
  await expect(page.locator("#territorial-inventory").getByRole("link", { name: /página 15/ })).toHaveAttribute("href", /Acuerdo-PP-VOX-Baleares\.pdf#page=15$/);
});

test("Baleares en móvil diferencia norma, oferta y acceso universal", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/observatorio/mandato/territorios/r-04");
  await expect(page.locator("#compromiso-r-04-6")).toContainText("25 %");
  await expect(page.locator("#compromiso-r-04-6")).toContainText("35 %");
  await expect(page.locator('section[aria-labelledby="r-04-63-oferta"]')).toContainText("15.451");
  await expect(page.locator('section[aria-labelledby="r-04-63-acceso"]')).toContainText("Evidencia insuficiente");
  await expect(page.locator("#compromiso-r-04-acuerdo-6")).toContainText("no borra las promesas originales");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/balears-mobile-top.png" });
  await page.locator("#r-04-63-acceso").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/balears-mobile-access.png" });
});

test("Aragón identifica el nuevo mandato, OCR provisional y discrepancia de plazos", async ({ page }) => {
  await page.goto("/observatorio/mandato/cobertura");
  await page.getByLabel("Buscar administración").fill("Aragón");
  await page.getByRole("combobox", { name: "Ámbito", exact: true }).selectOption("region");
  await expect(page.locator(".mc-list")).toContainText("117 de 117");
  await expect(page.locator(".mc-list")).toContainText("mandato iniciado en 2026");
  await page.getByRole("link", { name: "Leer inventario y revisiones territoriales" }).click();
  await expect(page).toHaveURL(/\/territorios\/r-02$/);
  await expect(page.locator(".mc-warning").filter({ hasText: "Consulta la imagen" })).toBeVisible();
  await page.getByLabel("Buscar medida autonómica").fill("clases de refuerzo");
  await expect(page.getByRole("status")).toContainText("2 resultados");
  await expect(page.locator("#territorial-inventory")).toContainText("ejercicio 2028");
  await expect(page.locator("#territorial-inventory")).toContainText("ejercicio 2027");
  await page.getByLabel("Buscar medida autonómica").fill("");
  await page.getByRole("combobox", { name: "Revisión", exact: true }).selectOption("pending");
  await expect(page.getByRole("status")).toContainText("115 resultados");
});

test("Aragón en móvil distingue cautelar, consulta y nombramiento", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/observatorio/mandato/territorios/r-02");
  await expect(page.locator("#compromiso-r-02-80")).toContainText("actuación previa");
  await expect(page.locator("#compromiso-r-02-80")).toContainText("Distrito7 incluye ciclos de FP");
  await expect(page.locator('section[aria-labelledby="r-02-80-consulta"]')).toContainText("terminó su plazo de aportaciones");
  await expect(page.locator('section[aria-labelledby="r-02-114-precedencia"]')).toContainText("No se interpreta esa omisión como incumplimiento");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/aragon-mobile-top.png" });
  await page.locator("#r-02-80-cautelar").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/aragon-mobile-contrast.png" });
});

test("Cantabria conserva las subcláusulas y separa importación de revisión", async ({ page }) => {
  await page.goto("/observatorio/mandato/cobertura");
  await page.getByLabel("Buscar administración").fill("Cantabria");
  await page.getByRole("combobox", { name: "Ámbito", exact: true }).selectOption("region");
  await expect(page.locator(".mc-list")).toContainText("1228 de 1228");
  await page.getByRole("link", { name: "Leer inventario y revisiones territoriales" }).click();
  await expect(page).toHaveURL(/\/territorios\/r-06$/);
  await expect(page.getByRole("status")).toHaveText("1228 resultados · página 1 de 82");
  await page.getByLabel("Buscar medida autonómica").fill("TARIFA PLANA DE EMPRENDIZAJE");
  await expect(page.getByRole("status")).toContainText("1 resultados");
  await expect(page.locator("#territorial-inventory")).toContainText("autónomos societarios");
  await expect(page.locator("#territorial-inventory")).toContainText("página 11–12");
  await page.getByLabel("Buscar medida autonómica").fill("");
  await page.getByRole("combobox", { name: "Revisión", exact: true }).selectOption("pending");
  await expect(page.getByRole("status")).toContainText("1226 resultados");
});

test("Cantabria en móvil distingue cuota pagada y abono municipal", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/observatorio/mandato/territorios/r-06");
  await expect(page.locator("#compromiso-r-06-29")).toContainText("cuotas previamente pagadas");
  await expect(page.locator("#compromiso-r-06-29")).toContainText("su autor sigue siendo el Gobierno");
  await expect(page.locator("#compromiso-r-06-1198")).toContainText("15,75 euros trimestrales");
  await expect(page.locator("#compromiso-r-06-1198")).toContainText("sin establecer el abono único de 20 euros");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/cantabria-mobile-top.png" });
  await page.locator("#r-06-1198-redes").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/cantabria-mobile-networks.png" });
});

test("La Rioja distingue los apartados documentales de las promesas únicas", async ({ page }) => {
  await page.goto("/observatorio/mandato/cobertura");
  await page.getByLabel("Buscar administración").fill("La Rioja");
  await page.getByRole("combobox", { name: "Ámbito", exact: true }).selectOption("region");
  await expect(page.locator(".mc-list")).toContainText("949 de 949");
  await expect(page.locator(".mc-list")).toContainText("formuladas en prosa pendiente");
  await page.getByRole("link", { name: "Leer inventario y revisiones territoriales" }).click();
  await expect(page).toHaveURL(/\/territorios\/r-17$/);
  await expect(page.locator(".mc-intro")).toContainText("Apartados con viñeta importados");
  await expect(page.getByRole("status")).toHaveText("949 resultados · página 1 de 64");
  await page.getByLabel("Buscar medida autonómica").fill("relevo generacional de los profesionales sanitarios");
  await expect(page.getByRole("status")).toContainText("1 resultados");
  await expect(page.locator("#territorial-inventory")).toContainText("Enfermería ya existente");
  await expect(page.locator("#territorial-inventory")).toContainText("página 102–103");
  await page.getByLabel("Buscar medida autonómica").fill("");
  await page.getByRole("combobox", { name: "Revisión", exact: true }).selectOption("pending");
  await expect(page.getByRole("status")).toContainText("947 resultados");
});

test("La Rioja en móvil conserva la discrepancia fiscal y los límites académicos", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/observatorio/mandato/territorios/r-17");
  const sport = page.locator("#compromiso-r-17-894");
  await expect(sport).toContainText("50.668 liquidaciones");
  await expect(sport).toContainText("57.402 contribuyentes");
  await expect(sport).toContainText("nota editorial");
  await expect(page.locator("#compromiso-r-17-714")).toContainText("no devolvieron PDF");
  await expect(page.locator("#compromiso-r-17-714")).toContainText("Enfermería");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/rioja-mobile.png", fullPage: true });
});

test("Asturias distingue el preacuerdo y conserva las condiciones sin numeración oficial", async ({ page }) => {
  await page.goto("/observatorio/mandato/cobertura");
  await page.getByLabel("Buscar administración").fill("Asturias");
  await page.getByRole("combobox", { name: "Ámbito", exact: true }).selectOption("region");
  await expect(page.locator(".mc-list")).toContainText("texto final firmado pendiente");
  await page.getByRole("link", { name: "Leer inventario y revisiones territoriales" }).click();
  await expect(page).toHaveURL(/\/territorios\/r-03$/);
  await expect(page.locator(".mc-intro")).toContainText("Preacuerdo importado");
  await expect(page.getByRole("status")).toHaveText("37 resultados · página 1 de 3");
  await page.getByLabel("Buscar medida autonómica").fill("ocho personas");
  await expect(page.getByRole("status")).toContainText("1 resultados");
  await expect(page.locator("#territorial-inventory")).toContainText("Orden editorial");
  await expect(page.locator("#territorial-inventory")).toContainText("forma semestral");
  await page.getByLabel("Buscar medida autonómica").fill("");
  await page.getByRole("combobox", { name: "Revisión", exact: true }).selectOption("pending");
  await expect(page.getByRole("status")).toContainText("35 resultados");
});

test("Asturias en móvil separa gratuidad, plazas y previsiones", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/observatorio/mandato/territorios/r-03");
  await expect(page.getByRole("link", { name: "Consultar el preacuerdo publicado", exact: true })).toBeVisible();
  await expect(page.locator(".mt-review")).toHaveCount(2);
  await expect(page.locator("#compromiso-r-03-19")).toContainText("previsiones");
  await expect(page.locator("#compromiso-r-03-19")).toContainText("servicios complementarios");
  await expect(page.locator("#compromiso-r-03-2")).toContainText("no añade una evaluación independiente");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/asturias-mobile.png", fullPage: true });
});

test("Murcia permite consultar también las ocho cláusulas finales del pacto", async ({ page }) => {
  await page.goto("/observatorio/mandato/cobertura");
  await page.getByLabel("Buscar administración").fill("Murcia");
  await page.getByRole("combobox", { name: "Ámbito", exact: true }).selectOption("region");
  await page.getByRole("link", { name: "Leer inventario y revisiones territoriales" }).click();
  await expect(page).toHaveURL(/\/territorios\/r-14$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("pacto de 5/09/2023");
  await expect(page.getByRole("status")).toHaveText("38 resultados · página 1 de 3");
  await expect(page.locator(".mt-review")).toHaveCount(3);
  await page.getByLabel("Buscar medida autonómica").fill("Defensor del Pueblo");
  await expect(page.getByRole("status")).toContainText("1 resultados");
  await expect(page.locator("#territorial-inventory")).toContainText("Octavo");
  await expect(page.locator("#territorial-inventory")).toContainText("Sin conclusión de RegTrack");
  await page.getByLabel("Buscar medida autonómica").fill("");
  await page.getByRole("combobox", { name: "Revisión", exact: true }).selectOption("pending");
  await expect(page.getByRole("status")).toContainText("35 resultados");
});

test("Murcia en móvil distingue copias, extractos y datos pendientes de comprobar", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/observatorio/mandato/territorios/r-14");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Consultar la copia del programa", exact: true })).toHaveAttribute("href", "https://multimedia.laverdad.es/documentos/acuerdo-pp-vox-murcia.pdf");
  await expect(page.locator("#compromiso-r-14-17")).toContainText("personas únicas");
  await expect(page.locator("#compromiso-r-14-17")).toContainText("extracto editorial conservado");
  await expect(page.locator("#compromiso-r-14-21")).toContainText("0,25 puntos porcentuales");
  await expect(page.locator("#compromiso-r-14-acuerdo-4")).toContainText("15 de julio de 2024");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/murcia-mobile.png", fullPage: true });
});

test("Melilla conserva el número repetido y el contexto sin inflar el inventario", async ({ page }) => {
  await page.goto("/observatorio/mandato/cobertura");
  await page.getByLabel("Buscar administración").fill("Melilla");
  await page.getByRole("link", { name: "Leer inventario y revisiones territoriales" }).click();
  await expect(page).toHaveURL(/\/territorios\/r-19$/);
  await expect(page.getByRole("status")).toHaveText("816 resultados · página 1 de 55");
  await page.getByLabel("Buscar medida de la ciudad autónoma").fill("388");
  await expect(page.getByRole("status")).toContainText("2 resultados");
  await expect(page.locator("#territorial-inventory article")).toHaveCount(2);
  await expect(page.locator("#territorial-inventory").getByText(/El número 388 aparece dos veces/)).toHaveCount(2);
  await page.getByLabel("Buscar medida de la ciudad autónoma").fill("");
  await page.getByRole("combobox", { name: "Revisión", exact: true }).selectOption("pending");
  await expect(page.getByRole("status")).toContainText("813 resultados");
  await page.getByText("Introducciones y otros textos sin número · 88", { exact: true }).click();
  const context = page.locator("section").filter({ has: page.getByRole("heading", { name: "Contexto del programa", exact: true }) });
  await expect(context).toContainText("5000 universitarios");
  await expect(context).toContainText("de inmediato");
  await expect(context.getByRole("link", { name: "Página 24–25", exact: true })).toHaveAttribute("href", /\.pdf#page=24$/);
});

test("Melilla en móvil separa contratación, carencias de indicadores y satisfacción", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/observatorio/mandato/territorios/r-19");
  await expect(page.locator(".mt-review")).toHaveCount(3);
  const works = page.locator("#compromiso-r-19-81");
  await expect(works).toContainText("no el acta de la sesión ni una adjudicación definitiva");
  await expect(works).toContainText("edificio principal del Campus, no a Correos");
  await works.getByText("Promesa y página de origen", { exact: true }).click();
  await expect(works.getByRole("link", { name: "Programa de gobierno del PP 2023–2027 · página 25", exact: true })).toHaveAttribute("href", /\.pdf#page=25$/);
  await expect(page.locator("#compromiso-r-19-784")).toContainText("Fuerte Rostrogordo, Pabellón Javier Imbroda y Ludotecas");
  const survey = page.locator("#compromiso-r-19-785");
  await expect(survey).toContainText("1.197 respuestas válidas");
  await expect(survey).toContainText("La muestra total es 1.203");
  await expect(survey).toContainText("No se convierte esa media en porcentaje de cumplimiento");
  await page.getByText("Introducciones y otros textos sin número · 88", { exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("heading", { level: 1 }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/melilla-mobile-viewport.png" });
});

test("Ceuta conserva el alcance inicial, el anexo y los números repetidos", async ({ page }) => {
  await page.goto("/observatorio/mandato/cobertura");
  await page.getByLabel("Buscar administración").fill("Ceuta");
  await page.getByRole("link", { name: "Leer inventario y revisiones territoriales" }).click();
  await expect(page).toHaveURL(/\/territorios\/r-18$/);
  await expect(page.locator(".mc-intro")).toContainText("Programa inicial no exhaustivo");
  await expect(page.getByRole("status")).toHaveText("138 resultados · página 1 de 10");
  await page.getByLabel("Buscar medida de la ciudad autónoma").fill("Nicaragua");
  await expect(page.getByRole("status")).toContainText("1 resultados");
  const inventory = page.locator("#territorial-inventory");
  await inventory.getByText("Fases del anexo de obras · 5", { exact: true }).click();
  await expect(inventory.locator("ol > li")).toHaveCount(5);
  await expect(inventory).toContainText("Nicaragua");
  await page.getByLabel("Buscar medida de la ciudad autónoma").fill("modernización autobuses");
  await expect(page.getByRole("status")).toContainText("1 resultados");
  await expect(inventory).toContainText("El número 26 se repite");
  await page.getByLabel("Buscar medida de la ciudad autónoma").fill("");
  await page.getByRole("combobox", { name: "Revisión", exact: true }).selectOption("pending");
  await expect(page.getByRole("status")).toContainText("135 resultados");
});

test("Ceuta en móvil distingue actos, condiciones y resultados sin certificar", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/observatorio/mandato/territorios/r-18");
  await expect(page.locator(".mt-review")).toHaveCount(3);
  const bus = page.locator("#compromiso-r-18-F-28");
  await expect(bus).toContainText("33,81 y 35,30 litros por 100 km");
  await bus.getByText("Medida inicial y página de origen", { exact: true }).click();
  await expect(bus).toContainText("El número 26 se repite");
  await expect(page.locator("#compromiso-r-18-F-18")).toContainText("ni como pago ya ejecutado");
  await expect(page.locator("#compromiso-r-18-H-2")).toContainText("no cierra esas fichas");
  await expect(page.getByRole("link", { name: "Consultar el programa inicial y sus condiciones" })).toHaveAttribute("href", /Objetivos_Gobierno.*\.pdf$/);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/ceuta-mobile-viewport.png" });
});

test("Canarias conserva los objetivos específicos repetidos y permite buscar sus códigos", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/observatorio/mandato/territorios/r-05");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Canarias");
  await expect(page.locator(".mc-intro")).toContainText("promesas políticas pendientes");
  await expect(page.locator(".mt-review")).toHaveCount(2);
  await expect(page.getByRole("status")).toHaveText("145 resultados · página 1 de 10");
  await page.getByLabel("Buscar medida autonómica").fill("BSIJIF.OEsp.3.2");
  await expect(page.getByRole("status")).toHaveText("1 resultados · página 1 de 1");
  const inventory = page.locator("#territorial-inventory");
  await inventory.getByText("Objetivos específicos · 28", { exact: true }).click();
  await expect(inventory.getByText("BSIJIF.OEsp.3.2", { exact: true })).toHaveCount(2);
  await expect(inventory.getByText(/El original repite BSIJIF/)).toHaveCount(2);
  await expect(inventory.locator("ol li")).toHaveCount(28);
  expect(errors).toEqual([]);
});

test("Canarias en móvil mantiene los límites y diferencia donantes de donaciones", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/observatorio/mandato/territorios/r-05");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const waiting = page.locator('[id="compromiso-r-05-S.OEst.1"]');
  await expect(waiting).toContainText("6.047");
  await expect(waiting).toContainText("incoherencia");
  const blood = page.locator('[id="compromiso-r-05-S.OEst.9"]');
  await expect(blood).toContainText("45.578");
  await expect(blood).toContainText("59.106");
  await blood.getByText("Objetivo y página de origen", { exact: true }).click();
  await blood.getByText("Objetivos específicos · 1", { exact: true }).click();
  await expect(blood).toContainText("70.000 donantes anuales");
  await page.getByRole("combobox", { name: "Revisión", exact: true }).selectOption("pending");
  await expect(page.getByRole("status")).toContainText("143 resultados");
  await page.screenshot({ path: "test-results/canarias-mobile-viewport.png" });
});

test("Bilbao conserva la copia identificada y busca dentro de las 80 descripciones", async ({ page }) => {
  await page.goto("/observatorio/mandato/cobertura");
  await page.getByLabel("Buscar administración").fill("Bilbao");
  await page.getByRole("link", { name: "Leer inventario y revisiones territoriales" }).click();
  await expect(page).toHaveURL(/\/territorios\/m-48020$/);
  await expect(page.locator(".mc-intro")).toContainText("copia difundida por EAJ-PNV");
  await expect(page.getByRole("status")).toHaveText("80 resultados · página 1 de 6");
  await expect(page.getByRole("link", { name: "Consultar la copia del programa" })).toHaveAttribute("href", /^https:\/\/bbb\.eaj-pnv\.eus\//);
  await expect(page.getByRole("link", { name: "Consultar el programa original", exact: true })).toHaveCount(0);
  await page.getByRole("combobox", { name: "Revisión", exact: true }).selectOption("pending");
  await expect(page.getByRole("status")).toContainText("78 resultados");
  await page.getByLabel("Buscar medida municipal").fill("600 iniciativas");
  await expect(page.getByRole("status")).toContainText("1 resultados");
  const inventory = page.locator("#territorial-inventory");
  await inventory.getByText("Ficha completa de la copia del programa", { exact: true }).click();
  await expect(inventory).toContainText("al menos, 600 nuevas iniciativas");
  await expect(inventory).toContainText("Sin conclusión de RegTrack");
  await page.getByLabel("Buscar medida municipal").fill("modernización municipal 2030");
  await expect(page.getByRole("status")).toContainText("1 resultados");
});

test("Bilbao en móvil distingue adjudicación anterior, celebración y viviendas de otra administración", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/observatorio/mandato/territorios/m-48020");
  const events = page.locator('[id="compromiso-m-48020-1.10"]');
  await expect(events).toContainText("16 de julio de 2021");
  await expect(events).toContainText("no audita impacto");
  await expect(events).toContainText("extracto editorial conservado");
  const housing = page.locator('[id="compromiso-m-48020-6.3"]');
  await expect(housing).toContainText("tampoco se cuentan las 63 dos veces");
  await expect(housing).toContainText("63/200");
  await housing.getByText("Promesa y página de origen", { exact: true }).click();
  await housing.getByText("Ficha completa de la copia del programa", { exact: true }).click();
  await expect(housing).toContainText("en torno a 200 nuevos recursos");
  await expect(page.locator(".mt-review")).toHaveCount(2);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("heading", { level: 1 }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/bilbao-mobile-viewport.png" });
});

test("Donostia conserva 129 fichas, 27 seguimientos y plazos más allá del mandato", async ({ page }) => {
  await page.goto("/observatorio/mandato/cobertura");
  await page.getByLabel("Buscar administración").fill("Donostia");
  await page.getByRole("link", { name: "Leer inventario y revisiones territoriales" }).click();
  await expect(page).toHaveURL(/\/territorios\/m-20069$/);
  await expect(page.locator(".mc-intro")).toContainText("La portada anuncia 127 proyectos");
  await expect(page.locator(".mc-intro")).toContainText("seguimiento detallado en 27");
  await expect(page.getByRole("status")).toHaveText("129 resultados · página 1 de 9");
  await page.getByRole("combobox", { name: "Revisión", exact: true }).selectOption("pending");
  await expect(page.getByRole("status")).toContainText("127 resultados");
  await page.getByRole("combobox", { name: "Revisión", exact: true }).selectOption("all");
  await page.getByLabel("Buscar medida municipal").fill("673 2033");
  await expect(page.getByRole("status")).toContainText("1 resultados");
  const inventory = page.locator("#territorial-inventory");
  await inventory.getByText("Seguimiento publicado por el Ayuntamiento · 36,5% declarado", { exact: true }).click();
  await expect(inventory).toContainText("673 (datos de 2023 y 2024)");
  await expect(inventory.getByRole("link", { name: "Consultar el seguimiento municipal original" })).toHaveAttribute("href", /&projectId=14$/);
  await expect(page.locator('a[href*="#page=null"]')).toHaveCount(0);
});

test("Donostia en móvil muestra discrepancias y no confunde 100% con revisión completa", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/observatorio/mandato/territorios/m-20069");
  const mobility = page.locator("#compromiso-m-20069-definicion-nueva-movilidad-urbana-sostenible");
  await expect(mobility).toContainText("Objetivo aún no alcanzado en el ejercicio examinado");
  await expect(mobility).toContainText("16,55 y 18");
  await mobility.getByText("Actuación publicada y fuente", { exact: true }).click();
  await mobility.getByText("Seguimiento publicado por el Ayuntamiento · 100% declarado", { exact: true }).click();
  await expect(mobility).toContainText("no es una valoración de RegTrack");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("heading", { level: 1 }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/donostia-mobile-viewport.png" });
});

test("Vitoria conserva los originales y el seguimiento posterior sin convertir el 100% en revisión", async ({ page }) => {
  await page.goto("/observatorio/mandato/cobertura");
  await page.getByLabel("Buscar administración").fill("Vitoria");
  await page.getByRole("link", { name: "Leer inventario y revisiones territoriales" }).click();
  await expect(page).toHaveURL(/\/territorios\/m-01059$/);
  await expect(page.getByRole("status")).toHaveText("100 resultados · página 1 de 7");
  await page.getByRole("combobox", { name: "Revisión", exact: true }).selectOption("pending");
  await expect(page.getByRole("status")).toContainText("98 resultados");
  await page.getByLabel("Buscar medida municipal").fill("5.8 sombras");
  await expect(page.getByRole("status")).toContainText("1 resultados");
  const inventory = page.locator("#territorial-inventory");
  await expect(inventory).toContainText("Sin conclusión de RegTrack");
  await inventory.getByText("Ficha completa del programa original", { exact: true }).click();
  await expect(inventory).toContainText("BENEFICIOS PARA LA CIUDADANÍA");
  await inventory.locator("summary").filter({ hasText: "Seguimiento publicado por el Ayuntamiento" }).click();
  await expect(inventory).toContainText("no es una valoración de RegTrack");
  await expect(inventory.getByRole("link", { name: "Consultar el seguimiento municipal original" })).toHaveAttribute("href", /#E\d+-L\d+-C\d+$/);
});

test("Vitoria en móvil separa norma, cambio del APR y obras sin apertura acreditada", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/observatorio/mandato/territorios/m-01059");
  const zbe = page.locator('[id="compromiso-m-01059-2.17"]');
  await expect(zbe).toContainText("23 de agosto de 2026");
  await expect(zbe).toContainText("no se afirma anulación, suspensión ni validación judicial");
  await zbe.getByText("Promesa y página de origen", { exact: true }).click();
  await zbe.getByText("Seguimiento publicado por el Ayuntamiento · 75% declarado", { exact: true }).click();
  await expect(zbe).toContainText("Ficha municipal 2.3.3");
  await expect(page.locator('[id="compromiso-m-01059-2.19"]')).toContainText("No son gasto ejecutado ni una fecha de apertura");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("heading", { level: 1 }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/vitoria-mobile-viewport.png" });
});

test("Barcelona publica el catálogo completo y busca dentro de las fichas conservadas", async ({ page }) => {
  await page.goto("/observatorio/mandato/cobertura");
  await page.getByLabel("Buscar administración").fill("Barcelona");
  await expect(page.locator(".mc-list")).toContainText("promesas originales sigue pendiente");
  await page.getByRole("link", { name: "Leer inventario y revisiones territoriales" }).click();
  await expect(page).toHaveURL(/\/territorios\/m-08019$/);
  await expect(page.getByRole("status")).toHaveText("1248 resultados · página 1 de 84");
  await expect(page.locator(".mc-intro")).toContainText("reconstrucción de las promesas originales pendiente");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByRole("status")).toContainText("página 2 de 84");
  await page.getByRole("combobox", { name: "Revisión", exact: true }).selectOption("pending");
  await expect(page.getByRole("status")).toContainText("1246 resultados");
  await page.getByRole("combobox", { name: "Revisión", exact: true }).selectOption("all");
  await page.getByLabel("Buscar medida municipal").fill("538 20.000");
  await expect(page.getByRole("status")).toContainText("1 resultados");
  const inventory = page.locator("#territorial-inventory");
  await inventory.getByText("Texto completo de la ficha municipal", { exact: true }).click();
  await expect(inventory.locator("div[lang=ca]")).toContainText("20.000");
  await expect(inventory).toContainText("SHA-256 del HTML original");
  await expect(inventory).toContainText("No es una valoración de RegTrack");
  await expect(inventory.getByRole("link", { name: "Ficha municipal original" })).toHaveAttribute("href", /nou-port-olimpic_538$/);
});

test("Barcelona en móvil conserva límites temporales y separa apertura, coste y litigios", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/observatorio/mandato/territorios/m-08019");
  await expect(page.locator(".mt-review")).toHaveCount(2);
  const port = page.locator("#compromiso-m-08019-538");
  await expect(port).toContainText("dos mandatos");
  await expect(port).toContainText("no demuestra que las barreras persistan hoy");
  const laietana = page.locator("#compromiso-m-08019-493");
  await expect(laietana).toContainText("no se interpreta como una liquidación auditada");
  await expect(laietana).toContainText("no se afirma una anulación firme actual");
  await port.getByText("Actuación publicada y fuente", { exact: true }).click();
  await port.getByText("Texto completo de la ficha municipal", { exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/barcelona-mobile.png", fullPage: true });
  await page.getByRole("heading", { level: 1 }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/barcelona-mobile-viewport.png" });
});

test("Cataluña conserva el original catalán y permite buscar sus temas en español", async ({ page }) => {
  await page.goto("/observatorio/mandato/cobertura");
  await page.getByLabel("Buscar administración").fill("Cataluña");
  await page.getByRole("link", { name: "Leer inventario y revisiones territoriales" }).click();
  await expect(page).toHaveURL(/\/territorios\/r-09$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Cataluña · XV legislatura · plan 2024–2027");
  await expect(page.getByRole("status")).toHaveText("260 resultados · página 1 de 18");
  await page.getByLabel("Buscar medida autonómica").fill("vivienda");
  await expect(page.getByRole("status")).toContainText("11 resultados");
  await expect(page.locator("#territorial-inventory h3[lang=ca]")).toHaveCount(11);
  await page.getByLabel("Buscar medida autonómica").fill("1.7.6");
  await expect(page.getByRole("status")).toContainText("1 resultados");
  await expect(page.locator("#territorial-inventory")).toContainText("bonificació dels interessos");
  await page.getByLabel("Buscar medida autonómica").fill("");
  await page.getByRole("combobox", { name: "Revisión", exact: true }).selectOption("pending");
  await expect(page.getByRole("status")).toContainText("258 resultados");
});

test("Cataluña en móvil distingue créditos aprobados, emisiones futuras y archivo pendiente", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/observatorio/mandato/territorios/r-09");
  const loan = page.locator('[id="compromiso-r-09-1.7.6"]');
  await expect(loan).toContainText("18–40 años");
  await expect(loan).toContainText("343 operaciones aprobadas");
  await loan.getByText("Promesa y página de origen", { exact: true }).click();
  await expect(loan.locator("p[lang=ca]")).toContainText("Fons Públic");
  const carbon = page.locator('[id="compromiso-r-09-2.2.6"]');
  await expect(carbon).toContainText("161,562 millones acumulados en cinco años");
  await expect(carbon).toContainText("extracto editorial conservado");
  await expect(page.locator(".mt-review")).toHaveCount(2);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/catalunya-mobile.png", fullPage: true });
});

test("Euskadi conserva las iniciativas y busca dentro de ellas sin inflar las revisiones", async ({ page }) => {
  await page.goto("/observatorio/mandato/cobertura");
  await page.getByLabel("Buscar administración").fill("País Vasco");
  await page.getByRole("link", { name: "Leer inventario y revisiones territoriales" }).click();
  await expect(page).toHaveURL(/\/territorios\/r-16$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Euskadi · mandato 2024–2028");
  await expect(page.locator(".mc-intro")).toContainText("846 iniciativas");
  await expect(page.getByRole("status")).toHaveText("154 resultados · página 1 de 11");
  await expect(page.locator(".mt-review")).toHaveCount(2);
  await page.getByLabel("Buscar medida autonómica").fill("Gaztelagun");
  const inventory = page.locator("#territorial-inventory");
  await expect(page.getByRole("status")).toContainText("2 resultados");
  const reviewed = inventory.locator("article").filter({ hasText: "Medida 18" });
  await reviewed.getByText("Iniciativas del compromiso · 5", { exact: true }).click();
  await expect(reviewed).toContainText("30.000 euros");
  await expect(reviewed.getByRole("link", { name: "Página 38", exact: true })).toHaveCount(5);
  await page.getByRole("combobox", { name: "Revisión", exact: true }).selectOption("pending");
  await expect(page.getByRole("status")).toContainText("1 resultados");
  await expect(inventory).toContainText("Medida 52");
  await expect(inventory).toContainText("Sin conclusión de RegTrack");
  await page.getByLabel("Buscar medida autonómica").fill("");
  await expect(page.getByRole("status")).toContainText("152 resultados");
});

test("Euskadi en móvil conserva cortes, umbrales y límites de la corroboración", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/observatorio/mandato/territorios/r-16");
  const health = page.locator("#compromiso-r-16-1");
  await expect(health).toContainText("54,19");
  await expect(health).toContainText("77,40");
  await expect(health).toContainText("no constituyen un segundo recuento independiente");
  await expect(health.getByRole("link", { name: "Ararteko · informe anual 2025" })).toHaveAttribute("href", /#page=87$/);
  await expect(page.locator("#compromiso-r-16-18")).toContainText("exactamente 30.000 € queda fuera");
  await page.getByLabel("Buscar medida autonómica").fill("transversalidad cuidados");
  await page.locator("#territorial-inventory").getByText("Iniciativas del compromiso · 8", { exact: true }).click();
  await expect(page.locator("#territorial-inventory ol li")).toHaveCount(8);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/euskadi-mobile.png", fullPage: true });
});

test("Navarra conserva el estado declarado sin convertirlo en veredicto y enlaza el acuerdo", async ({ page }) => {
  await page.goto("/observatorio/mandato/cobertura");
  await page.getByLabel("Buscar administración").fill("Navarra");
  await page.getByRole("combobox", { name: "Ámbito", exact: true }).selectOption("region");
  await page.getByRole("link", { name: "Leer inventario y revisiones territoriales" }).click();
  await expect(page).toHaveURL(/\/territorios\/r-15$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Navarra · mandato 2023–2027");
  await expect(page.locator(".mt-review")).toHaveCount(3);
  await expect(page.getByRole("link", { name: "Consultar el programa original" })).toHaveAttribute("href", /2023_ACUERDO_PROGRAMATICO/);
  await expect(page.getByRole("status")).toHaveText("347 resultados · página 1 de 24");
  await page.getByRole("combobox", { name: "Revisión", exact: true }).selectOption("pending");
  await expect(page.getByRole("status")).toContainText("344 resultados");
  await page.getByLabel("Buscar medida autonómica").fill("03.01.39");
  const inventory = page.locator("#territorial-inventory");
  await expect(inventory).toContainText("Personal referente");
  await expect(inventory).toContainText("Descartado");
  await expect(inventory).toContainText("Sin conclusión de RegTrack");
  await expect(inventory).toContainText("No es una valoración de RegTrack");
  await expect(inventory.getByRole("link", { name: "Balance del Gobierno 2025 · página 78" })).toHaveAttribute("href", /Rendici.*#page=78$/);
  await expect(page.locator("#compromiso-r-15-01\\.01\\.02")).toContainText("Plazo comprometido vencido");
});

test("Navarra es legible en móvil y distingue las condiciones omitidas en el resumen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/observatorio/mandato/territorios/r-15");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const review = page.locator('[id="compromiso-r-15-01.01.04"]');
  await expect(review).toContainText("criterio geográfico");
  await review.getByText("Promesa y página de origen", { exact: true }).click();
  await expect(review).toContainText("Estado declarado por el Gobierno a 2025-12-31");
  await expect(review).toContainText("Finalizado");
  await expect(review).toContainText("Evidencia insuficiente para esta parte");
});

const url = "/observatorio/mandato/territorios/m-28079";
test("el balance municipal separa el inventario, las cuatro revisiones y sus límites", async ({ page }) => {
  await page.goto(url);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ayuntamiento de Madrid · mandato 2023–2027");
  await expect(page.locator(".mc-intro")).toContainText("Ninguna de estas fichas ha pasado una revisión humana independiente");
  await expect(page.locator(".mt-review")).toHaveCount(4);
  await expect(page.getByText("Extracto editorial conservado; la huella no corresponde al documento original.", { exact: true })).toBeVisible();
  await expect(page.locator("#compromiso-m-28079-246")).toContainText("0,414 %");
  await expect(page.locator("#compromiso-m-28079-246")).toContainText("no lo declara incumplido al cierre");
  await expect(page.getByRole("status")).toHaveText("300 resultados · página 1 de 20");
  await page.getByRole("combobox", { name: "Revisión", exact: true }).selectOption("pending");
  await expect(page.getByRole("status")).toContainText("296 resultados");
  await expect(page.locator("#territorial-inventory").getByRole("link", { name: "Leer evidencia y límites" })).toHaveCount(0);
  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByRole("status")).toContainText("página 2 de 20");
  await page.getByRole("combobox", { name: "Revisión", exact: true }).selectOption("reviewed");
  await expect(page.getByRole("status")).toContainText("4 resultados · página 1 de 1");
  await page.getByLabel("Buscar medida municipal").fill("BiciMad");
  await expect(page.getByRole("status")).toContainText("1 resultados");
  await page.getByRole("link", { name: "Leer evidencia y límites" }).click();
  await expect(page).toHaveURL(/#compromiso-m-28079-103$/);
  const card = page.locator("#compromiso-m-28079-103");
  await card.getByText("Promesa y página de origen", { exact: true }).click();
  await expect(card.getByRole("link", { name: "Programa · página 33", exact: true })).toHaveAttribute("href", /\.pdf#page=33$/);
  await card.getByText("Qué falta para cerrar esta ficha", { exact: true }).click();
  await expect(card).toContainText("datos operativos conservados");
});

test("el inventario municipal funciona en móvil y no inventa otro balance", async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByLabel("Buscar medida municipal").fill("ninguna medida coincide");
  await expect(page.getByRole("status")).toHaveText("0 resultados · página 1 de 1");
  await expect(page.getByRole("button", { name: "Siguiente" })).toBeDisabled();
  expect((await request.get("/observatorio/mandato/territorios/inexistente")).status()).toBe(404);
});
