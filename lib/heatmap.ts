/**
 * Returns a terracota fill color for the map heatmap.
 * @param count  Number of alertas for this region
 * @param max    Maximum count across all regions (must be >= 1)
 */
export function getHeatColor(count: number, max: number): string {
  if (!count) return '#f1f5f9'
  const ratio = count / max
  if (ratio <= 0.2)  return '#fed7aa'
  if (ratio < 0.4)  return '#fb923c'
  if (ratio < 0.65) return '#ea580c'
  if (ratio < 0.85) return '#c2410c'
  return '#9a3412'
}
