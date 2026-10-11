import { expect, test } from "@playwright/test";

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
  expect((await request.get("/observatorio/mandato/territorios/r-13")).status()).toBe(404);
});
