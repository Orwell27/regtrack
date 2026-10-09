import { loadBulletin } from "@/lib/observatorio/feed";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET() {
  try {
    return Response.json(await loadBulletin(), {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=300",
      },
    });
  } catch {
    return Response.json(
      { error: "No se pudo cargar el observatorio. Vuelve a intentarlo." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
