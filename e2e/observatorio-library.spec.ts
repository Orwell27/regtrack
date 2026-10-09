import { createHash } from "node:crypto";
import { test, expect, type APIRequestContext } from "@playwright/test";
import type { PublicLibrary } from "../lib/observatorio/library";

async function readPublishedLibrary(request: APIRequestContext) {
  const response = await request.get("/api/observatorio/biblioteca");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/json");
  return (await response.json()) as PublicLibrary;
}

test("la biblioteca pública entrega solo la proyección revisada y conserva la evidencia en el HTML", async ({ request }) => {
  const library = await readPublishedLibrary(request);
  expect(Object.keys(library).sort()).toEqual(
    ["schemaVersion", "generatedAt", "documents", "relations", "coverage"].sort(),
  );
  expect(library.schemaVersion).toBe(1);
  expect(library.documents).toHaveLength(4);
  expect(library.documents.filter((document) => document.kind === "norma")).toHaveLength(2);
  expect(library.documents.filter((document) => document.kind === "indicador")).toHaveLength(2);
  expect(library.coverage.length).toBeGreaterThan(0);
  expect(Number.isFinite(Date.parse(library.generatedAt))).toBe(true);
  const keys = new Set(library.documents.map((document) => document.key));
  const allowedDocumentFields = new Set([
    "key", "recordId", "recordVersion", "contentHash", "visibility", "sourceId",
    "documentId", "summary", "topics", "profiles", "territory", "reuse", "reason",
    "kind", "statistic", "title", "sourceUrl", "publisher", "observedAt", "publishedAt",
    "content", "contentKind",
  ]);
  for (const document of library.documents) {
    expect(Object.keys(document).filter((key) => !allowedDocumentFields.has(key))).toEqual([]);
    expect(document.visibility).toBe("public");
    expect(document.key).toBe(`${document.recordId}-${document.recordVersion}`);
    expect(document.key).toMatch(/^[a-f0-9]{32}-[a-f0-9]{32}$/);
    expect(document.contentHash).toBe(createHash("sha256").update(document.content).digest("hex"));
    expect(["boe", "ine"]).toContain(document.sourceId);
    expect(["www.boe.es", "servicios.ine.es"]).toContain(new URL(document.sourceUrl).hostname);
  }
  expect(library.relations).toHaveLength(2);
  for (const relation of library.relations) {
    expect(relation.type).toBe("contexto");
    expect(keys.has(relation.from) && keys.has(relation.to)).toBe(true);
    expect(relation.reason.length).toBeGreaterThan(0);
    expect(relation.evidence.length).toBeGreaterThan(0);
  }
  // The public response is deliberately bounded: no credentials, raw vault
  // paths, sync receipts, private analyses or full cloud-table rows.
  const json = JSON.stringify(library);
  expect(json).not.toMatch(/SUPABASE_SERVICE_KEY|service_role|\.records[\\/]|\.receipts[\\/]|[A-Za-z]:\\Users\\|"(?:access_token|refresh_token|password|secret|markdown|stored_at)"\s*:/);

  const page = await request.get("/observatorio/biblioteca");
  expect(page.status()).toBe(200);
  const html = await page.text();
  expect(html).toContain("Biblioteca piloto");
  for (const document of library.documents) {
    expect(html).toContain(`id="${document.key}"`);
    expect(html).toContain(document.contentHash);
  }
});

test("permite consultar las cuatro fichas reales, contrastar valores y seguir sus relaciones", async ({ page, request }) => {
  const library = await readPublishedLibrary(request);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/observatorio/biblioteca");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Una base para\s+entender y contrastar\./);
  await expect(page.locator(".dl-document:visible")).toHaveCount(4);
  await page.getByLabel("Buscar en la biblioteca", { exact: true }).fill("BOE-A-2023-12203");
  await expect(page.locator(".dl-document:visible")).toHaveCount(1);
  await page.getByRole("button", { name: "Limpiar filtros", exact: true }).click();
  await page.getByLabel("Tipo de documento", { exact: true }).selectOption("norma");
  await expect(page.locator(".dl-document:visible")).toHaveCount(2);
  await page.getByLabel("Tipo de documento", { exact: true }).selectOption("indicador");
  await expect(page.locator(".dl-document:visible")).toHaveCount(2);

  const formatter = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 12 });
  for (const document of library.documents.filter((item) => item.statistic)) {
    const card = page.locator(`[id="${document.key}"]`);
    const statistic = document.statistic!;
    await expect(card.getByRole("heading", { name: document.title, exact: true })).toBeVisible();
    await expect(card.locator(".dl-statistic-heading")).toContainText("Índice (base 2015 = 100)");
    await expect(card.locator(".dl-statistic-heading")).toContainText(statistic.frequency);
    await expect(card.locator("caption")).toContainText("Un dato no disponible no equivale a cero");
    await expect(card.locator("tbody tr")).toHaveCount(statistic.observations.length);
    for (const observation of statistic.observations) {
      const row = card.getByRole("row").filter({
        has: page.getByRole("rowheader", { name: observation.period, exact: true }),
      });
      await expect(row.getByRole("cell")).toHaveText(
        observation.value === null ? "No disponible" : formatter.format(observation.value),
      );
    }
    await card.locator(".dl-provenance summary").click();
    await expect(card.locator(".dl-provenance-content")).toContainText(document.contentHash);
    await expect(card.locator(".dl-provenance-content")).toContainText(document.recordVersion);
    await expect(card.locator("pre")).toHaveText(document.content);
    await expect(card.getByRole("link", { name: "Consultar fuente original" })).toHaveAttribute("href", document.sourceUrl);
    await card.locator(".dl-provenance summary").click();
  }

  await page.getByLabel("Tipo de documento", { exact: true }).selectOption("");
  await page.getByLabel("Tema", { exact: true }).selectOption("ayudas");
  await expect(page.locator(".dl-document:visible")).toHaveCount(1);
  await page.getByLabel("Tema", { exact: true }).selectOption("vivienda");
  await expect(page.locator(".dl-document:visible")).toHaveCount(4);
  await page.getByLabel("Tipo de documento", { exact: true }).selectOption("norma");
  const relation = library.relations[0];
  const source = page.locator(`[id="${relation.from}"]`);
  const target = library.documents.find((document) => document.key === relation.to)!;
  await expect(source.locator(".dl-relations")).toContainText("no demuestran un efecto causal");
  await source.locator(".dl-relations").getByRole("link", { name: target.title }).click();
  await expect(page).toHaveURL(new RegExp(`#${target.key}$`));
  await expect(page.locator(".dl-document:visible")).toHaveCount(4);
  await expect(page.locator(`[id="${target.key}"]`)).toBeInViewport();

  await expect(page.locator(".dl-source")).toHaveCount(9);
  await page.getByLabel("Estado de integración", { exact: true }).selectOption("piloto");
  await expect(page.locator(".dl-source")).toHaveCount(2);
  await page.getByLabel("Estado de integración", { exact: true }).selectOption("referencia");
  await expect(page.locator(".dl-source")).toHaveCount(4);
  await page.getByLabel("Estado de integración", { exact: true }).selectOption("candidato");
  await expect(page.locator(".dl-source")).toHaveCount(3);
  await page.getByLabel("Estado de integración", { exact: true }).selectOption("");
  await page.getByLabel("Buscar en la biblioteca", { exact: true }).fill("sincoincidenciasenestacoleccion");
  await expect(page.getByRole("heading", { name: "No hay coincidencias en esta colección" })).toBeVisible();
  await expect(page.locator(".dl-document:visible")).toHaveCount(0);
  await page.getByRole("button", { name: "Ver todas las fichas", exact: true }).click();
  await expect(page.locator(".dl-document:visible")).toHaveCount(4);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: ".artifacts/observatorio/library-preview.png" });
  await page.screenshot({ path: ".artifacts/observatorio/library-desktop.png", fullPage: true });
  expect(errors).toEqual([]);
});

test("se llega desde el observatorio y la biblioteca es legible en móvil", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/observatorio");
  await page.locator(".ob-header").getByRole("link", { name: "Biblioteca", exact: true }).click();
  await expect(page).toHaveURL(/\/observatorio\/biblioteca$/);
  await expect(page.locator(".dl-document:visible")).toHaveCount(4);
  const noHorizontalOverflow = () => page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );
  expect(await noHorizontalOverflow()).toBe(true);
  const firstCard = page.locator(".dl-document").first();
  await firstCard.locator(".dl-provenance summary").click();
  await expect(firstCard.locator("pre")).toBeVisible();
  expect(await noHorizontalOverflow()).toBe(true);
  await firstCard.locator(".dl-provenance summary").click();
  await page.getByLabel("Tipo de documento", { exact: true }).selectOption("indicador");
  await expect(page.locator(".dl-document:visible")).toHaveCount(2);
  expect(await noHorizontalOverflow()).toBe(true);
  await page.getByRole("button", { name: "Limpiar filtros", exact: true }).click();
  await page.screenshot({ path: ".artifacts/observatorio/library-mobile.png", fullPage: true });
  await page.getByRole("link", { name: "Volver al observatorio", exact: true }).click();
  await expect(page).toHaveURL(/\/observatorio$/);
  expect(errors).toEqual([]);
});
