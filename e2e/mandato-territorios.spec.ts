import { expect, test } from "@playwright/test";

const url = "/observatorio/mandato/territorios/m-28079";
test("el balance municipal separa el inventario, las cuatro revisiones y sus límites", async ({ page }) => {
  await page.goto(url);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ayuntamiento de Madrid · mandato 2023–2027");
  await expect(page.locator(".mc-intro")).toContainText("Ninguna de estas fichas ha pasado una revisión humana independiente");
  await expect(page.locator(".mt-review")).toHaveCount(4);
  await expect(page.getByText("Extracto editorial conservado; la huella no corresponde al artículo original.", { exact: true })).toBeVisible();
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
