import { publishedLibrary } from "@/lib/observatorio/published-library";

export function GET() {
  return Response.json(publishedLibrary, { headers: { "Cache-Control": "public, max-age=900" } });
}
