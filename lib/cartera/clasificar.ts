// lib/cartera/clasificar.ts
// Clasifica un inmueble según su exposición regulatoria. Funciones puras, sin acceso a red ni a BD.
import { NORMAS, FECHA_REFORMA_LPH } from './normas'
import { MUNICIPIO } from './municipios'
import type { Clase, Clasificacion, Exposicion, Inmueble, Nivel, TipoInmueble } from './tipos'

type Datos = Omit<Inmueble, 'id' | 'usuario_id' | 'created_at' | 'updated_at'>

const TIPOLOGIA: Record<TipoInmueble, string> = {
  piso: 'Piso en edificio de viviendas',
  bajo: 'Bajo o planta baja',
  edificio: 'Edificio completo',
  unifamiliar: 'Vivienda unifamiliar',
}

// IVA soportado recuperable sobre la facturación, según el ejemplo del boletín del 3T 2026:
// 2.025 € sobre 24.000 € con limpieza externa y 1.269 € si la hace el propietario.
const RATIO_IVA_RECUPERABLE = { conLimpiezaExterna: 0.084, sinLimpiezaExterna: 0.053 }

function esTuristica(d: Datos) {
  return d.modalidad !== 'sin_uso_turistico'
}

function esVut(d: Datos) {
  return d.modalidad === 'vut_completa' || d.modalidad === 'vut_habitaciones'
}

export function impactoIva(facturacion: number, limpiezaExterna: boolean): number {
  const ivaRepercutido = facturacion - facturacion / 1.1
  const ratio = limpiezaExterna ? RATIO_IVA_RECUPERABLE.conLimpiezaExterna : RATIO_IVA_RECUPERABLE.sinLimpiezaExterna
  return Math.round(-ivaRepercutido + facturacion * ratio)
}

function reglaIva(d: Datos): Exposicion | null {
  if (!esTuristica(d)) return null
  if (d.modalidad === 'apartamento_turistico') {
    return {
      id: 'iva',
      titulo: 'IVA del 10 %: probablemente ya lo aplicas',
      nivel: 'baja',
      ambito: 'estatal',
      explicacion: 'Los apartamentos turísticos con servicios de tipo hotelero ya tributan al 10 %. Desde el 1 de diciembre también las viviendas turísticas con estancias de hasta 30 noches.',
      accion: 'Confirma con tu gestoría que ya facturas con IVA.',
      norma: NORMAS.rdl_26_2026_iva,
    }
  }
  const exp: Exposicion = {
    id: 'iva',
    titulo: 'IVA del 10 % en estancias de hasta 30 noches',
    nivel: 'media',
    ambito: 'estatal',
    explicacion: 'Deja de estar exento. Si mantienes el precio, de cada 110 € cobrados 10 € son de Hacienda, pero el IVA de tus gastos pasa a ser recuperable.',
    accion: 'Antes del 1 de diciembre, alta en IVA y decide si trasladas el impuesto al precio.',
    norma: NORMAS.rdl_26_2026_iva,
  }
  if (d.facturacion_anual && d.facturacion_anual > 0) {
    exp.impacto_euros = impactoIva(d.facturacion_anual, d.limpieza_externa === 'si')
  }
  return exp
}

function reglaRegistro(d: Datos): Exposicion | null {
  if (!esTuristica(d) || d.registro_turistico === 'si') return null
  const enTramite = d.registro_turistico === 'en_tramite'
  return {
    id: 'registro',
    titulo: enTramite ? 'Registro turístico en trámite' : 'Sin registro turístico',
    nivel: enTramite ? 'media' : 'alta',
    ambito: 'autonomico',
    explicacion: 'Anunciar sin declaración responsable es infracción grave, de 1.001 a 10.000 €, y las plataformas retiran el anuncio si el número no es válido.',
    accion: enTramite
      ? 'No publiques anuncios hasta tener el número del registro de empresas y actividades turísticas (REAT).'
      : 'Presenta la declaración responsable ante el ITREM antes de anunciar.',
    norma: NORMAS.ley_turismo_murcia,
  }
}

function reglaSeguro(d: Datos): Exposicion | null {
  if (!esVut(d) || d.seguro_rc === 'si') return null
  return {
    id: 'seguro',
    titulo: d.seguro_rc === 'no' ? 'Sin seguro de responsabilidad civil' : 'Seguro de responsabilidad civil sin confirmar',
    nivel: d.seguro_rc === 'no' ? 'alta' : 'media',
    ambito: 'autonomico',
    explicacion: 'El decreto regional exige una cobertura mínima de 300.000 € por siniestro. No tenerla vigente es infracción muy grave: desde 10.001 €.',
    accion: 'Revisa la póliza y guarda el certificado de cobertura.',
    norma: NORMAS.decreto_256_2019,
  }
}

function reglaHabitaciones(d: Datos): Exposicion | null {
  if (d.modalidad !== 'vut_habitaciones' || d.reside_en_vivienda === 'si') return null
  return {
    id: 'habitaciones',
    titulo: 'Alquiler por habitaciones sin residir en la vivienda',
    nivel: d.reside_en_vivienda === 'no' ? 'alta' : 'media',
    ambito: 'autonomico',
    explicacion: 'En Murcia, una vivienda turística por habitaciones solo la puede explotar una persona física empadronada que resida en ella.',
    accion: 'Revisa bajo qué modalidad está inscrita y, si no resides, valora pasarla a vivienda completa o a apartamento turístico.',
    norma: NORMAS.decreto_256_2019,
  }
}

function reglaComunidad(d: Datos): Exposicion | null {
  if (!esVut(d) || d.propiedad_horizontal === 'no') return null
  const norma = NORMAS.lph_lo_1_2025

  if (d.propiedad_horizontal === 'desconocido') {
    return {
      id: 'comunidad', titulo: '¿Hay comunidad de propietarios?', nivel: 'media', ambito: 'comunidad',
      explicacion: 'Si el edificio está en régimen de propiedad horizontal, la comunidad puede limitar o prohibir la actividad por mayoría de 3/5.',
      accion: 'Confirma si el edificio tiene división horizontal.', norma,
    }
  }
  if (d.estatutos === 'prohiben') {
    return {
      id: 'comunidad', titulo: 'Los estatutos prohíben la actividad', nivel: 'alta', ambito: 'comunidad',
      explicacion: 'El Supremo confirmó en abril de 2026 el cierre de un piso turístico con licencia porque los estatutos prohibían las «hospederías».',
      accion: 'Consulta con un abogado antes de seguir invirtiendo en este piso.', norma,
    }
  }
  const altaPosterior = d.fecha_alta_turistica !== null && d.fecha_alta_turistica >= FECHA_REFORMA_LPH
  if (altaPosterior && d.acuerdo_comunidad !== 'si') {
    return {
      id: 'comunidad', titulo: 'Alta posterior a abril de 2025 sin acuerdo de la comunidad', nivel: 'alta', ambito: 'comunidad',
      explicacion: 'Desde el 3 de abril de 2025, una vivienda turística nueva en un edificio con comunidad necesita el voto a favor de 3/5 de los propietarios. Sin él, el presidente puede exigir el cese.',
      accion: 'Consigue el certificado del acuerdo de la junta o prepárate para una reclamación.', norma,
    }
  }
  if (d.fecha_alta_turistica === null) {
    return {
      id: 'comunidad', titulo: 'Fecha de alta turística sin confirmar', nivel: 'media', ambito: 'comunidad',
      explicacion: 'Si la actividad empezó antes del 3 de abril de 2025 puede seguir sin acuerdo de la comunidad. Si es posterior, necesita el voto de 3/5.',
      accion: 'Busca la fecha de tu declaración responsable ante el ITREM.', norma,
    }
  }
  const exp: Exposicion = {
    id: 'comunidad',
    titulo: d.estatutos === 'desconocido' ? 'Estatutos sin revisar' : 'La comunidad puede subirte los gastos',
    nivel: d.estatutos === 'desconocido' ? 'media' : 'baja',
    ambito: 'comunidad',
    explicacion: 'Tu actividad puede seguir, pero la comunidad puede subirte hasta un 20 % los gastos comunes. Si los estatutos prohíben un uso equivalente, pueden exigir el cierre.',
    accion: d.estatutos === 'desconocido'
      ? 'Lee los estatutos y busca «hospedería», «industria» o «actividad».'
      : 'Sigue las juntas de la comunidad.',
    norma,
  }
  if (d.gastos_comunidad_anual && d.gastos_comunidad_anual > 0) {
    exp.impacto_euros = -Math.round(d.gastos_comunidad_anual * 0.2)
  }
  return exp
}

function reglaTemporada(d: Datos): Exposicion | null {
  if (!esTuristica(d) || d.estancias_largas !== 'si') return null
  return {
    id: 'temporada',
    titulo: 'Estancias de más de 31 días',
    nivel: 'media',
    ambito: 'estatal',
    explicacion: 'La estancia turística tiene un máximo de 31 días. Por encima es alquiler de temporada, que necesita una causa real que tú debes probar; sin ella, pasa a ser alquiler de vivienda habitual.',
    accion: 'Para las estancias largas, usa contrato de temporada con la causa por escrito.',
    norma: NORMAS.rdl_26_2026_lau,
  }
}

function reglasCartagena(d: Datos): Exposicion[] {
  if (d.municipio_ine !== MUNICIPIO.cartagena || !esTuristica(d)) return []
  const out: Exposicion[] = []
  const registrado = d.registro_turistico === 'si'
  const pgou = NORMAS.pgou_cartagena

  if (d.zona_urbanistica === 'residencial_colectivo'
    || (d.zona_urbanistica === 'residencial_generico' && d.acceso_independiente !== 'si')) {
    out.push({
      id: 'pgou',
      titulo: 'El nuevo PGOU solo admite alojamiento turístico en edificio completo',
      nivel: registrado ? 'media' : 'alta',
      ambito: 'municipal',
      explicacion: registrado
        ? 'En esta zona, el plan en tramitación reserva el uso turístico a edificios enteros (o con acceso independiente en residencial genérico). No se ha encontrado régimen transitorio para los ya registrados.'
        : 'Cuando el plan se apruebe, no podrás dar de alta un alojamiento turístico en esta zona salvo edificio completo.',
      accion: registrado ? 'Guarda la documentación de tu alta y sigue la aprobación definitiva.' : 'Si quieres darlo de alta, hazlo antes de la aprobación definitiva.',
      norma: pgou,
    })
  } else if (d.zona_urbanistica === 'desconocida') {
    out.push({
      id: 'pgou',
      titulo: 'Zona del nuevo PGOU sin confirmar',
      nivel: 'media',
      ambito: 'municipal',
      explicacion: 'En zonas de residencial colectivo, el plan en tramitación solo admite alojamiento turístico en edificio completo.',
      accion: 'Pide una consulta urbanística al Ayuntamiento para esta parcela.',
      norma: pgou,
    })
  } else if (d.zona_urbanistica === 'residencial_generico' && d.acceso_independiente === 'si') {
    out.push({
      id: 'pgou',
      titulo: 'Acceso independiente: compatible con el nuevo PGOU',
      nivel: 'favorable',
      ambito: 'municipal',
      explicacion: 'En residencial genérico, el plan en tramitación admite alojamiento turístico con acceso independiente del resto de usos.',
      accion: 'Documenta el acceso independiente en tu expediente.',
      norma: pgou,
    })
  }

  if (d.casco_historico === 'si') {
    out.push({
      id: 'peopch',
      titulo: 'Casco histórico: plan especial en revisión',
      nivel: 'media',
      ambito: 'municipal',
      explicacion: 'El Ayuntamiento revisa el Plan Especial del casco con el objetivo de que sea «un lugar para vivir». Es el instrumento con más probabilidades de limitar los pisos turísticos en el centro (2027–2028).',
      accion: 'Sigue la tramitación y valora presentar sugerencias en la fase de participación.',
      norma: NORMAS.peopch_cartagena,
    })
  }
  return out
}

function reglasMunicipales(d: Datos): Exposicion[] {
  if (!esTuristica(d)) return []
  const out: Exposicion[] = []
  if (d.municipio_ine === MUNICIPIO.mazarron) {
    out.push({
      id: 'convivencia',
      titulo: 'Respondes de los ruidos de tus huéspedes',
      nivel: 'media',
      ambito: 'municipal',
      explicacion: 'Si no se identifica al infractor, responden a la vez el propietario y el usuario. No colaborar para identificarlo es falta grave: de 751 a 1.500 €.',
      accion: 'Ten a mano el registro de viajeros y añade una cláusula de convivencia a tus normas de la casa.',
      norma: NORMAS.convivencia_mazarron,
    })
  }
  if (d.municipio_ine === MUNICIPIO.sanJavier) {
    out.push({
      id: 'la_manga',
      titulo: 'Menos pisos nuevos en La Manga',
      nivel: 'favorable',
      ambito: 'municipal',
      explicacion: 'Si el inmueble está en La Manga, la modificación en trámite elimina el uso residencial colectivo del suelo pendiente de desarrollar. La oferta futura se limita, aunque llegarán hoteles y apartamentos turísticos.',
      accion: 'Sin acción. Sigue la tramitación.',
      norma: NORMAS.nnss_san_javier_79,
    })
  }
  if (esVut(d) && d.municipio_ine !== null) {
    out.push({
      id: 'bono',
      titulo: 'Fuera del Bono Turístico regional',
      nivel: 'baja',
      ambito: 'autonomico',
      explicacion: 'El bono paga el 50 % de la estancia (hasta 250 €) en hoteles y apartamentos turísticos, pero no en viviendas de uso turístico. Más competencia en temporada baja.',
      accion: 'Revisa tus tarifas de octubre a mayo frente a los apartamentos turísticos de tu zona.',
      norma: NORMAS.bono_turistico,
    })
  }
  return out
}

const ORDEN_NIVEL: Record<Nivel, number> = { alta: 0, media: 1, baja: 2, favorable: 3 }

function pendientesDe(d: Datos): string[] {
  const p: string[] = []
  if (!esTuristica(d)) return p
  if (d.propiedad_horizontal === 'desconocido') p.push('Si el edificio tiene comunidad de propietarios')
  if (d.propiedad_horizontal === 'si' && d.estatutos === 'desconocido') p.push('Qué dicen los estatutos de la comunidad')
  if (d.fecha_alta_turistica === null) p.push('Fecha de alta en el registro turístico')
  if (d.seguro_rc === 'desconocido') p.push('Si el seguro de responsabilidad civil está vigente')
  if (d.municipio_ine === MUNICIPIO.cartagena && d.zona_urbanistica === 'desconocida') p.push('Zona del PGOU de Cartagena')
  if (d.municipio_ine === MUNICIPIO.cartagena && d.casco_historico === 'desconocido') p.push('Si está en el casco histórico')
  if (d.facturacion_anual === null) p.push('Facturación anual, para calcular el efecto del IVA')
  return p
}

export function clasificar(d: Datos): Clasificacion {
  const exposiciones = [
    reglaRegistro(d),
    reglaSeguro(d),
    reglaHabitaciones(d),
    reglaComunidad(d),
    ...reglasCartagena(d),
    ...reglasMunicipales(d),
    reglaIva(d),
    reglaTemporada(d),
  ]
    .filter((e): e is Exposicion => e !== null)
    .sort((a, b) => ORDEN_NIVEL[a.nivel] - ORDEN_NIVEL[b.nivel])

  let clase: Clase = 'solida'
  if (exposiciones.some(e => e.nivel === 'alta')) clase = 'fragil'
  else if (exposiciones.filter(e => e.nivel === 'media').length >= 2) clase = 'vigilancia'

  return {
    clase,
    tipologia: TIPOLOGIA[d.tipo],
    exposiciones,
    pendientes: pendientesDe(d),
  }
}

export const ETIQUETA_CLASE: Record<Clase, string> = {
  solida: 'Sólida',
  vigilancia: 'Con vigilancia',
  fragil: 'Frágil',
}
