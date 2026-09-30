// lib/github.ts
// Lanza el flujo del pipeline en GitHub Actions (workflow_dispatch).
// Necesita un token fine-grained con permiso «Actions: Read and write» sobre el repositorio.

export const REPO_PIPELINE = 'Orwell27/regtrack'
export const WORKFLOW_PIPELINE = 'pipeline.yml'
export const URL_EJECUCIONES = `https://github.com/${REPO_PIPELINE}/actions/workflows/${WORKFLOW_PIPELINE}`

export type ResultadoLanzamiento = { ok: true; url: string } | { ok: false; error: string }

export async function lanzarPipeline(
  token: string | undefined,
  fetchImpl: typeof fetch = fetch
): Promise<ResultadoLanzamiento> {
  if (!token) {
    return { ok: false, error: 'Falta la variable GITHUB_WORKFLOW_TOKEN en Vercel.' }
  }

  let res: Response
  try {
    res = await fetchImpl(
      `https://api.github.com/repos/${REPO_PIPELINE}/actions/workflows/${WORKFLOW_PIPELINE}/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ref: 'main' }),
        signal: AbortSignal.timeout(10_000),
      }
    )
  } catch (err) {
    return { ok: false, error: `No se pudo contactar con GitHub: ${err instanceof Error ? err.message : String(err)}` }
  }

  if (res.status === 204) return { ok: true, url: URL_EJECUCIONES }

  let mensaje = ''
  try {
    mensaje = ((await res.json()) as { message?: string }).message ?? ''
  } catch { /* cuerpo vacío o no JSON */ }

  if (res.status === 401) return { ok: false, error: 'El token de GitHub no es válido o ha caducado.' }
  if (res.status === 403 || res.status === 404) {
    return { ok: false, error: `El token no tiene permiso para lanzar el flujo (necesita «Actions: Read and write» sobre ${REPO_PIPELINE}).` }
  }
  return { ok: false, error: `GitHub respondió ${res.status}${mensaje ? `: ${mensaje}` : ''}. Comprueba que el flujo está activado en Actions.` }
}
