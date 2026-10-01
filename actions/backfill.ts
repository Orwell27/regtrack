// Recuperación BOE y BORM por intervalo explícito, sin duplicar la lógica del pipeline.
// Uso: npm run backfill -- --from 2026-09-01 --to 2026-09-30
if (!process.argv.includes('--from') || !process.argv.includes('--to')) {
  console.error('Indicar --from YYYY-MM-DD y --to YYYY-MM-DD (máximo 31 días).')
  process.exitCode = 1
} else {
  void import('./pipeline')
}
