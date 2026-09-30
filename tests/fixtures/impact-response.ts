export const adaptationQuote = 'Las viviendas que ya se encuentren ofertando alojamiento deberán adaptarse en el plazo de 6 meses.'
export const entryQuote = 'El presente decreto entrará en vigor a los veinte días de su completa publicación.'
export const documentText = `${adaptationQuote}\n${entryQuote}`
export function impactResponse() {
  return {
    estado_analisis: 'suficiente', resumen: 'Adaptación de las viviendas existentes.',
    impacto: 'Las viviendas que ya ofertan alojamiento deben adaptarse.', afectados: ['propietarios'],
    urgencia: 'media', tipo_norma: 'Real Decreto', territorios: ['Murcia'], score_relevancia: 6,
    entrada_vigor: { fecha: null, regla: 'Veinte días desde la completa publicación.', cita: entryQuote, localizador: 'Disposición final' },
    efectos: [],
    plazos_adaptacion: [{ cantidad: 6, unidad: 'meses', inicio: 'Entrada en vigor', destinatarios: 'Viviendas que ya ofertaban alojamiento', cita: adaptationQuote, localizador: 'Disposición adicional' }],
    acciones: [{ accion: 'Adaptar las viviendas que ya ofertaban alojamiento en seis meses desde entrada en vigor.', cita: adaptationQuote, localizador: 'Disposición adicional' }],
    evidencias: [{ campo: 'resumen', cita: adaptationQuote, localizador: 'Disposición adicional' }, { campo: 'impacto', cita: adaptationQuote, localizador: 'Disposición adicional' }],
    deroga_modifica: null, limitaciones: ['No se ha verificado vigencia actual.'],
  }
}
