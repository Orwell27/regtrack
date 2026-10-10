import { test, expect } from "@playwright/test";

test("la cobertura diferencia el catálogo territorial de las revisiones disponibles", async ({ page }) => {
  await page.goto("/observatorio/mandato/cobertura");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Qué hemos revisado");
  await expect(page.getByRole("status")).toHaveText("70 resultados · página 1 de 5");
  await page.getByLabel("Buscar administración").fill("Madrid");
  await expect(page.getByRole("status")).toContainText("2 resultados");
  await page.getByRole("combobox", { name: "Ámbito", exact: true }).selectOption("municipality");
  await expect(page.getByRole("status")).toContainText("1 resultados");
  const card = page.locator(".mc-card");
  await expect(card.getByRole("heading", { level: 3 })).toHaveText("Madrid");
  await expect(card).toContainText("Balance pendiente de elaboración");
  await expect(card).toContainText("Universo aún no determinado");
  await card.locator("summary").click();
  await expect(card).toContainText("Ayuntamiento de Madrid");
  await page.getByLabel("Buscar administración").fill("");
  await expect(page.getByRole("status")).toContainText("50 resultados");
  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByRole("status")).toContainText("página 2 de 4");
  await page.getByLabel("Buscar administración").fill("ningún territorio coincide");
  await expect(page.getByRole("status")).toHaveText("0 resultados · página 1 de 1");
  await expect(page.getByRole("button", { name: "Siguiente" })).toBeDisabled();
});

test("el inventario muestra pendientes sin veredicto y enlaza las revisiones existentes", async ({ page }) => {
  await page.goto("/observatorio/mandato/cobertura");
  await page.getByRole("button", { name: "Inventario nacional · 203" }).click();
  await expect(page.getByRole("status")).toContainText("203 resultados");
  await page.getByRole("combobox", { name: "Revisión", exact: true }).selectOption("pending");
  await expect(page.getByRole("status")).toContainText("165 resultados");
  await expect(page.locator(".mc-card").first()).toContainText("Sin conclusión de RegTrack");
  await expect(page.locator(".mc-card").getByRole("link")).toHaveCount(0);
  await page.getByRole("combobox", { name: "Revisión", exact: true }).selectOption("reviewed");
  await expect(page.getByRole("status")).toContainText("38 resultados");
  const link = page.getByRole("link", { name: "Leer evidencia, límites y correcciones" }).first();
  const href = await link.getAttribute("href");
  await link.click();
  await expect(page).toHaveURL(new RegExp(href!.split("#")[1]));
  await expect(page.locator(`#${href!.split("#")[1]}`)).toBeVisible();
});

test("la cobertura es legible en móvil sin desbordamiento horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/observatorio/mandato/cobertura");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Inventario nacional · 203" }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("la consulta territorial no devuelve el calendario electoral nacional ni sus pruebas", async ({ request }) => {
  const response = await request.post("/api/observatorio/mandato/preguntar", { data: { question: "¿Cuándo son las elecciones en Madrid?", mode: "documental" } });
  expect(response.status()).toBe(200);
  const answer = await response.json();
  expect(answer.mode).toBe("no-evidence");
  expect(answer.sources).toEqual([]);
  expect(answer.note).toContain("información territorial");
});
