import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { validateAnswer } from "@/lib/observatorio/answer";
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  origin: vi.fn(),
  load: vi.fn(),
  synthesize: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  requireAdmin: mocks.auth,
  rejectForeignOrigin: mocks.origin,
}));
vi.mock("@/lib/observatorio/feed", () => ({ loadBulletin: mocks.load }));
vi.mock("@/lib/observatorio/answer", async () => ({
  ...(await vi.importActual("@/lib/observatorio/answer")),
  synthesize: mocks.synthesize,
}));
import { POST } from "@/app/api/observatorio/preguntar/route";
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("OBSERVATORY_AI_ENABLED", "true");
  vi.stubEnv("ANTHROPIC_API_KEY", "test-not-a-key");
  mocks.origin.mockReturnValue(null);
  mocks.auth.mockResolvedValue({
    user: { usuarioId: crypto.randomUUID() },
    error: null,
  });
});
afterEach(() => vi.unstubAllEnvs());
const request = (body: unknown) =>
  new Request("https://regtrack.example/api/observatorio/preguntar", {
    method: "POST",
    headers: {
      origin: "https://regtrack.example",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
describe("piloto de explicación, sin llamadas de pago", () => {
  it("apagado por defecto, sin autenticar ni invocar el modelo", async () => {
    vi.stubEnv("OBSERVATORY_AI_ENABLED", "false");
    expect(
      await (await POST(request({ question: "vivienda" }))).json(),
    ).toEqual({ mode: "documental" });
    expect(mocks.auth).not.toHaveBeenCalled();
    expect(mocks.synthesize).not.toHaveBeenCalled();
  });
  it("no permite solicitudes de otro origen", async () => {
    mocks.origin.mockReturnValue(
      Response.json({ error: "Origen no válido" }, { status: 403 }),
    );
    expect((await POST(request({ question: "vivienda" }))).status).toBe(403);
    expect(mocks.auth).not.toHaveBeenCalled();
  });
  it("exige administrador antes de consultar fuentes o gastar", async () => {
    mocks.auth.mockResolvedValue({
      user: null,
      error: Response.json({ error: "Forbidden" }, { status: 403 }),
    });
    expect((await POST(request({ question: "vivienda" }))).status).toBe(403);
    expect(mocks.load).not.toHaveBeenCalled();
    expect(mocks.synthesize).not.toHaveBeenCalled();
  });
  it("rechaza consultas sobredimensionadas incluso sin Content-Length", async () => {
    expect((await POST(request({ question: "a".repeat(5000) }))).status).toBe(
      400,
    );
    expect(mocks.synthesize).not.toHaveBeenCalled();
  });
  it("sin evidencia, no llama al modelo", async () => {
    mocks.load.mockResolvedValue({ stories: [] });
    expect(
      await (await POST(request({ question: "vivienda" }))).json(),
    ).toEqual({ mode: "documental", sources: [] });
    expect(mocks.synthesize).not.toHaveBeenCalled();
  });
  it("reconstruye la evidencia en servidor y conserva filtros", async () => {
    const date = new Date().toISOString(),
      base = {
        id: "a",
        title: "Vivienda en Cartagena",
        excerpt: "Una referencia",
        sourceId: "boe",
        source: "BOE",
        url: "https://www.boe.es",
        kind: "oficial",
        author: null,
        topics: ["vivienda"],
        territories: ["m-30016"],
        national: false,
        publishedAt: date,
      };
    mocks.load.mockResolvedValue({
      stories: [base, { ...base, id: "b", territories: ["r-13"] }],
    });
    mocks.synthesize.mockResolvedValue([
      { text: "Explicación de prueba", citations: [1] },
    ]);
    const result = await (
      await POST(
        request({
          question: "vivienda",
          filters: { territory: "m-30016" },
          sources: [{ title: "INJECTED" }],
        }),
      )
    ).json();
    expect(result.mode).toBe("ia");
    expect(result.sources).toEqual([base]);
    expect(mocks.synthesize).toHaveBeenCalledWith("vivienda", [base]);
  });
  it("rechaza referencias inexistentes, párrafos sin citas y respuestas rotas", () => {
    expect(() =>
      validateAnswer('{"paragraphs":[{"text":"A","citations":[2]}]}', 1),
    ).toThrow();
    expect(() =>
      validateAnswer('{"paragraphs":[{"text":"A","citations":[]}]}', 1),
    ).toThrow();
    expect(() => validateAnswer("not json", 2)).toThrow();
    expect(
      validateAnswer('{"paragraphs":[{"text":"A","citations":[1]}]}', 1),
    ).toEqual([{ text: "A", citations: [1] }]);
  });
});
