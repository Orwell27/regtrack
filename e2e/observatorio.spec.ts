import { test, expect } from "@playwright/test";
const stamp = new Date().toISOString();
const stories = [
  {
    id: "fixture-local",
    title: "Ayudas para rehabilitar vivienda en Cartagena · ejemplo de prueba",
    excerpt:
      "Convocatoria de prueba para comprobar los filtros del observatorio.",
    url: "https://www.boe.es/diario_boe/",
    sourceId: "boe",
    source: "BOE",
    kind: "oficial",
    author: "Organismo de prueba",
    publishedAt: stamp,
    topics: ["vivienda", "ayudas"],
    territories: ["m-30016", "p-30", "r-14"],
    national: false,
  },
  {
    id: "fixture-analysis",
    title: "La vivienda y el empleo · análisis de prueba",
    excerpt: "Texto de prueba del recorrido de preguntas.",
    url: "https://www.hayderecho.com/",
    sourceId: "hayderecho",
    source: "Hay Derecho",
    kind: "analisis",
    author: "Autora de prueba",
    publishedAt: stamp,
    topics: ["vivienda", "empleo"],
    territories: ["r-13"],
    national: false,
    relatedDocuments: [{
      id: "fixture-local", title: "Ayudas para rehabilitar vivienda en Cartagena · ejemplo de prueba",
      url: "https://www.boe.es/diario_boe/", reason: "El canal cita la convocatoria de prueba.",
    }],
  },
];
test.beforeEach(async ({ page }) => {
  await page.route("**/api/observatorio", (r) =>
    r.fulfill({
      json: {
        stories,
        checkedAt: stamp,
        sources: [
          {
            id: "boe",
            name: "BOE",
            url: "https://www.boe.es",
            kind: "oficial",
            state: "ok",
            count: 1,
            checkedAt: stamp,
            latest: stamp,
          },
        ],
      },
    }),
  );
});
test("mapa, todos los niveles territoriales, filtros y preguntas con fuentes", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/observatorio");
  await expect(page.locator(".ob-map-region")).toHaveCount(19);
  await page
    .getByRole("button", { name: /Región de Murcia: 1 publicaciones/ })
    .click();
  await expect(page.getByLabel("Comunidad", { exact: true })).toHaveValue(
    "r-14",
  );
  await page.getByLabel("Provincia", { exact: true }).selectOption("p-30");
  await expect(page.locator(".ob-map-region")).toHaveCount(45);
  await page.getByLabel("Municipio", { exact: true }).selectOption("m-30016");
  await expect(
    page.getByRole("heading", { name: "El tablón de Cartagena." }),
  ).toBeVisible();
  await expect(page.locator(".ob-story")).toHaveCount(1);
  await page
    .getByLabel("Tu pregunta", { exact: true })
    .fill("¿Qué ayudas hay para vivienda?");
  await page.getByRole("button", { name: "Lanzar pregunta" }).click();
  await expect(page.locator(".ob-answer")).toContainText(
    "He encontrado 1 referencias",
  );
  await expect(page.locator(".ob-answer a")).toHaveAttribute(
    "href",
    stories[0].url,
  );
  await page
    .getByRole("button", { name: "Tus búsquedas", exact: true })
    .click();
  await expect(page.locator(".ob-trend-pills")).toContainText("Vivienda");
  await page.getByRole("button", { name: "Borrar historial" }).click();
  await expect(page.locator(".ob-trend-pills")).toContainText("Tus consultas");
  await page.getByLabel("Tema", { exact: true }).selectOption("salud");
  await expect(page.locator(".ob-empty")).toContainText("No hay publicaciones");
  await page.getByRole("button", { name: "Lanzar pregunta" }).click();
  await expect(page.locator(".ob-answer")).toContainText(
    "No he encontrado referencias suficientes",
  );
  expect(errors).toEqual([]);
});
test("búsqueda directa, fuentes accesibles, teclado y móvil sin desbordamiento", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/observatorio");
  await page.getByLabel("Buscar un lugar de España").fill("Cartagena");
  await page
    .locator(".ob-place-options")
    .getByRole("button", { name: /Cartagena/ })
    .click();
  await expect(page.getByLabel("Municipio", { exact: true })).toHaveValue(
    "m-30016",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Fuentes", exact: true }).click();
  await expect(page.locator("dialog")).toBeVisible();
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(() =>
      Boolean(document.activeElement?.closest("dialog")),
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Restablecer filtros", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Análisis y opinión", exact: true })
    .click();
  await expect(page.locator(".ob-story")).toHaveCount(1);
  await expect(page.locator(".ob-story")).toContainText("Autora de prueba");
  await expect(page.locator(".ob-related")).toContainText("Relacionado con");
  await expect(page.locator(".ob-related")).toContainText("El canal cita la convocatoria de prueba.");
  await expect(page.locator(".ob-related a")).toHaveAttribute("href", stories[0].url);
  await page.screenshot({
    path: ".artifacts/observatorio/mobile-tested.png",
    fullPage: true,
  });
});
test("fallo de fuentes visible y recuperación", async ({ page }) => {
  await page.route("**/api/observatorio", (r) =>
    r.fulfill({ status: 503, json: { error: "Fallo de prueba" } }),
  );
  await page.goto("/observatorio");
  await expect(page.locator(".ob-notice[role=alert]")).toContainText(
    "No se pudieron actualizar",
  );
  await page.unroute("**/api/observatorio");
  await page.route("**/api/observatorio", (r) =>
    r.fulfill({ json: { stories, checkedAt: stamp, sources: [] } }),
  );
  await page.getByRole("button", { name: "Reintentar", exact: true }).click();
  await expect(page.locator(".ob-story")).toHaveCount(2);
});
