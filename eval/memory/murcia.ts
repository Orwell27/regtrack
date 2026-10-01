import { normalizeImpact } from '../../lib/analysis/validation'
import { digest, type KnowledgeRecord } from '../../lib/knowledge/vault'

// Editorial acceptance case for a historical source, not an automatic model result.
export function murciaHistoricalReading(source: KnowledgeRecord) {
  if (source.sourceUrl !== 'https://www.borm.es/services/anuncio/780550/txt' || source.contentKind !== 'texto_completo' || source.publishedAt !== '2019-10-19') {
    throw new Error('El caso necesita la publicación completa del Decreto 256/2019 de 19-10-2019')
  }
  if (digest(source.content.replace(/\r\n/g, '\n').trim()) !== '73b0735f278b5a89d86f4c1311f56488681391941d635faedb3a969bc2f3d5ba') {
    throw new Error('El caso está fijado al texto histórico revisado; no reutilizar la lectura para otra versión')
  }
  const marketing = 'No se podrán comercializar turísticamente viviendas, ya se cedan en su totalidad o por habitaciones, cuya declaración responsable no haya sido presentada ante el organismo competente en materia de turismo.'
  const adaptation = 'Las viviendas que a la entrada en vigor de la presente norma se encuentren ofertando la modalidad de alojamiento regulada en el presente decreto deberán adaptarse a sus prescripciones en el plazo de 6 meses.'
  const entry = 'El presente decreto entrará en vigor a los veinte días de su completa publicación en el Boletín Oficial de la Región de Murcia.'
  return normalizeImpact({
    estado_analisis: 'suficiente',
    resumen: 'Lectura histórica de la publicación de 2019. El texto exige presentar la declaración responsable antes de comercializar turísticamente la vivienda. Además, establece seis meses de adaptación para las viviendas que ya ofrecían ese alojamiento cuando entró en vigor. Es un plazo histórico: no empieza de nuevo al descubrir este documento.',
    impacto: 'Para revisar un expediente de vivienda turística en Murcia, este texto permite identificar un requisito de comercialización y un régimen de adaptación para actividad preexistente. No acredita por sí solo que un inmueble concreto pueda iniciar o continuar la actividad hoy.',
    afectados: ['Titulares de viviendas de uso turístico en la Región de Murcia'],
    urgencia: 'baja', score_relevancia: 6, deroga_modifica: null, territorios: ['Región de Murcia'],
    entrada_vigor: { fecha: null, regla: 'A los veinte días de la completa publicación en el BORM; regla histórica, sin calcular aquí una fecha absoluta.', cita: entry, localizador: 'Disposición final primera' },
    efectos: [],
    plazos_adaptacion: [{ cantidad: 6, unidad: 'meses', inicio: 'entrada en vigor histórica de la norma', destinatarios: 'viviendas que ya ofrecían esta modalidad al entrar en vigor', cita: adaptation, localizador: 'Disposición adicional primera' }],
    acciones: [
      { accion: 'Revisar en el expediente la presentación de la declaración responsable y contrastar los requisitos actuales antes de decidir sobre la comercialización.', cita: marketing, localizador: 'Artículo 6.1' },
      { accion: 'Distinguir el plazo histórico de adaptación de los plazos que puedan corresponder hoy; no crear un vencimiento nuevo a partir de esta captura.', cita: adaptation, localizador: 'Disposición adicional primera' },
    ],
    evidencias: [
      { campo: 'resumen', cita: marketing, localizador: 'Artículo 6.1' },
      { campo: 'resumen', cita: adaptation, localizador: 'Disposición adicional primera' },
      { campo: 'impacto', cita: marketing, localizador: 'Artículo 6.1' },
    ],
    limitaciones: [
      'Caso de aceptación preparado por Codex con una fuente real. No es un resultado del escáner ni una nueva ejecución de Claude; requiere revisión humana.',
      'La fuente es una publicación histórica de 2019, no una novedad de hoy. No se certifican su vigencia actual ni requisitos posteriores, estatales o municipales.',
      'No se ha evaluado un inmueble concreto. Contrastar el expediente y el trámite vigente de la CARM antes de actuar.',
    ],
  }, source.title, source.content, { fecha_publicacion: source.publishedAt, rango: 'Decreto', contenido: 'texto_completo' })
}
