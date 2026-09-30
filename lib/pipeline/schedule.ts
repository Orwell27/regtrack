export interface ScheduledRun { id: number; created_at: string; status: string; conclusion: string | null }

export function assessSchedule(state: string, runs: ScheduledRun[], now = new Date()) {
  const last = [...runs].sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
  const ageHours = last ? (now.getTime() - Date.parse(last.created_at)) / 3_600_000 : null
  const problems: string[] = []
  if (state !== 'active') problems.push(`Workflow ${state}`)
  if (!last) problems.push('No hay ejecuciones programadas en el historial consultado')
  else if (ageHours === null || !Number.isFinite(ageHours) || ageHours > 36) problems.push('Más de 36 horas sin ejecución programada')
  if (last?.status === 'completed' && last.conclusion !== 'success') problems.push(`Última ejecución programada: ${last.conclusion}`)
  return { ok: problems.length === 0, state, lastScheduledAt: last?.created_at ?? null, ageHours, problems }
}
