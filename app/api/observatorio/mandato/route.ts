import { getMandateSnapshot } from "@/lib/mandate/data";

export function GET() {
  try {
    return Response.json(getMandateSnapshot(), { headers: { "Cache-Control": "public, max-age=300" } });
  } catch {
    return Response.json({ error: "No se pudo validar el archivo público del mandato." }, { status: 503 });
  }
}
