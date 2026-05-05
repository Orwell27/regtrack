export interface AlertaContexto {
  titulo: string
  resumen: string
  impacto: string
  accion_recomendada: string
  afectados: string[]
  territorios: string[]
  plazo_adaptacion: number | null
  deroga_modifica: string | null
  subtema: string
  tipo_norma: string
  fecha_entrada_vigor: string | null
}

export function buildAlertaContext(alerta: AlertaContexto): string {
  const lines: string[] = [
    `**Norma:** ${alerta.titulo}`,
    `**Tipo:** ${alerta.tipo_norma} | **Subtema:** ${alerta.subtema}`,
  ]

  if (alerta.territorios.length > 0) {
    lines.push(`**Territorios:** ${alerta.territorios.join(', ')}`)
  }
  if (alerta.fecha_entrada_vigor) {
    lines.push(`**Entra en vigor:** ${alerta.fecha_entrada_vigor}`)
  }
  if (alerta.plazo_adaptacion != null) {
    lines.push(`**Plazo de adaptación:** ${alerta.plazo_adaptacion} días`)
  }

  lines.push('', `**Resumen:**\n${alerta.resumen}`)
  lines.push('', `**Impacto:**\n${alerta.impacto}`)
  lines.push('', `**Colectivos afectados:** ${alerta.afectados.join(', ')}`)
  lines.push('', `**Acción recomendada:**\n${alerta.accion_recomendada}`)

  if (alerta.deroga_modifica) {
    lines.push('', `**Deroga/Modifica:**\n${alerta.deroga_modifica}`)
  }

  return lines.join('\n')
}
