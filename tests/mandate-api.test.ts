import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), origin: vi.fn(), synthesize: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireAdmin: mocks.auth, rejectForeignOrigin: mocks.origin }));
vi.mock("@/lib/observatorio/answer", () => ({ synthesize: mocks.synthesize }));
import { GET } from "@/app/api/observatorio/mandato/route";
import { POST } from "@/app/api/observatorio/mandato/preguntar/route";
import * as mandateData from "@/lib/mandate/data";
const request = (body: unknown) => new Request("https://regtrack.test/api/observatorio/mandato/preguntar", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://regtrack.test" }, body: JSON.stringify(body) });
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("MANDATE_AI_ENABLED", "false"); vi.stubEnv("OBSERVATORY_AI_ENABLED", "false");
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
  mocks.origin.mockReturnValue(null);
  mocks.auth.mockResolvedValue({ user: { usuarioId: crypto.randomUUID() }, error: null });
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
describe("API pública de mandato y opt-in de IA", () => {
  it("publica solo el snapshot explícito sin rutas de archivo o capturas privadas", async () => {
    const response = GET();
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).not.toMatch(/snapshotPath|evidencePath|\.artifacts|\.env|service_role/i);
    expect(JSON.parse(text).commitments).toHaveLength(38);
  });
  it("responde sin gastar por defecto y conserva evidencia si se solicita IA apagada", async () => {
    for (const mode of ["documental", "ia"]) {
      const result = await (await POST(request({ question: "vivienda", mode }))).json();
      expect(result.mode).toBe("documental"); expect(result.sources.length).toBeGreaterThan(0);
    }
    expect(mocks.auth).not.toHaveBeenCalled(); expect(mocks.synthesize).not.toHaveBeenCalled();
  });
  it("rechaza cuerpos y parámetros malformados incluso sin Content-Length", async () => {
    for (const input of [null, [], { question: "a" }, { question: "x".repeat(5000) }, { question: "empleo", mode: "force" }, { question: "empleo", topic: {} }])
      expect((await POST(request(input))).status).toBe(400);
    expect(mocks.synthesize).not.toHaveBeenCalled();
  });
  it("no invoca IA para una pregunta sin evidencia aunque esté activada", async () => {
    vi.stubEnv("MANDATE_AI_ENABLED", "true"); vi.stubEnv("OBSERVATORY_AI_ENABLED", "true");
    const response = await (await POST(request({ question: "astrofisicainexistente", mode: "ia" }))).json();
    expect(response.mode).toBe("no-evidence"); expect(mocks.synthesize).not.toHaveBeenCalled();
  });
  it("exige ambos interruptores, origen y administrador para gasto", async () => {
    vi.stubEnv("MANDATE_AI_ENABLED", "true");
    expect((await (await POST(request({ question: "empleo", mode: "ia" }))).json()).mode).toBe("documental");
    vi.stubEnv("OBSERVATORY_AI_ENABLED", "true");
    mocks.origin.mockReturnValue(Response.json({}, { status: 403 }));
    expect((await POST(request({ question: "empleo", mode: "ia" }))).status).toBe(403);
    expect(mocks.auth).not.toHaveBeenCalled();
    mocks.origin.mockReturnValue(null);
    mocks.auth.mockResolvedValue({ user: null, error: Response.json({}, { status: 401 }) });
    expect((await POST(request({ question: "empleo", mode: "ia" }))).status).toBe(401);
    expect(mocks.synthesize).not.toHaveBeenCalled();
  });
  it("reconstruye las fuentes del servidor y conserva el freno por usuario", async () => {
    vi.stubEnv("MANDATE_AI_ENABLED", "true"); vi.stubEnv("OBSERVATORY_AI_ENABLED", "true");
    mocks.synthesize.mockResolvedValue([{ text: "Interpretación de prueba", citations: [1] }]);
    const result = await (await POST(request({ question: "vivienda", mode: "ia", sources: [{ title: "INJECTED" }] }))).json();
    expect(result.mode).toBe("ia");
    expect(JSON.stringify(mocks.synthesize.mock.calls)).not.toContain("INJECTED");
    expect(mocks.synthesize.mock.calls[0][2]).toBe("mandate");
    expect(result.paragraphs[0].citations).toEqual([result.sources[0].id]);
    expect((await POST(request({ question: "vivienda", mode: "ia" }))).status).toBe(429);
    expect(mocks.synthesize).toHaveBeenCalledTimes(1);
  });
  it("mantiene el resumen calculado fuera de la redacción del modelo", async () => {
    vi.stubEnv("MANDATE_AI_ENABLED", "true"); vi.stubEnv("OBSERVATORY_AI_ENABLED", "true");
    mocks.synthesize.mockResolvedValue([{ text: "Explicación de prueba", citations: [1] }]);
    const result = await (await POST(request({ question: "Honestidad", mode: "ia" }))).json();
    expect(result.paragraphs[0].text).toContain("100 % (38 de 38)");
    expect(result.paragraphs[0].citations).toEqual([]);
    expect(result.paragraphs[1].text).toBe("Explicación de prueba");
    expect(result.note).toContain("no califica la honestidad");
  });
  it("devuelve el resumen documental sin modelo si el tema carece de contrastes", async () => {
    vi.stubEnv("MANDATE_AI_ENABLED", "true"); vi.stubEnv("OBSERVATORY_AI_ENABLED", "true");
    const snapshot = mandateData.getMandateSnapshot();
    // Exercise the absence branch explicitly; education now has real reviewed evidence.
    snapshot.commitments = snapshot.commitments.map(item => ({ ...item, review: { ...item.review, status: "pending", label: "Pendiente de contraste" } }));
    vi.spyOn(mandateData, "getMandateSnapshot").mockReturnValueOnce(snapshot);
    const result = await (await POST(request({ question: "Honestidad", topic: "educacion", mode: "ia" }))).json();
    expect(result.mode).toBe("documental");
    expect(result.paragraphs[0].text).toContain("sigue sin calcular");
    expect(result.sources).toEqual([]);
    expect(mocks.synthesize).not.toHaveBeenCalled();
  });
});
