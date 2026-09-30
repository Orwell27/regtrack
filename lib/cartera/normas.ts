// lib/cartera/normas.ts
// Normas que usa la clasificación. El estado de cada una se actualiza aquí, en un solo sitio.

export type Norma = { titulo: string; estado: string; url: string }

export const NORMAS = {
  rdl_26_2026_iva: {
    titulo: 'Real Decreto-ley 26/2026, art. 7 (IVA de alquileres de hasta 30 noches)',
    estado: 'Publicado el 30/09/2026, pendiente de convalidación. Efectos desde el 01/12/2026',
    url: 'https://www.boe.es/buscar/doc.php?id=BOE-A-2026-20266',
  },
  rdl_26_2026_lau: {
    titulo: 'Real Decreto-ley 26/2026, art. 3 (estancia turística máxima de 31 días y alquiler temporal con causa)',
    estado: 'En vigor desde el 01/10/2026, pendiente de convalidación',
    url: 'https://www.boe.es/buscar/doc.php?id=BOE-A-2026-20266',
  },
  lph_lo_1_2025: {
    titulo: 'Ley de Propiedad Horizontal, arts. 7.3 y 17.12 (LO 1/2025)',
    estado: 'En vigor desde el 03/04/2025',
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2025-76',
  },
  decreto_256_2019: {
    titulo: 'Decreto 256/2019 de viviendas de uso turístico de la Región de Murcia',
    estado: 'En vigor',
    url: 'https://www.borm.es/services/anuncio/780550/pdf',
  },
  ley_turismo_murcia: {
    titulo: 'Ley 12/2013 de Turismo de la Región de Murcia, arts. 48 y 49',
    estado: 'En vigor',
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2014-750',
  },
  pgou_cartagena: {
    titulo: 'Nuevo PGOU de Cartagena, arts. 1.3.19, 1.3.44 y 1.3.45',
    estado: 'Aprobación provisional (12/02/2026), pendiente de aprobación definitiva',
    url: 'https://urbanismo.cartagena.es/ExtDoc/PLDOC/2020-0001/AT/2026-02/AP_Propuesta_Normas.PDF',
  },
  peopch_cartagena: {
    titulo: 'Revisión del Plan Especial del casco histórico de Cartagena',
    estado: 'Avance en participación pública desde junio de 2026',
    url: 'https://www.cartagenaactualidad.com/articulo/actualidad/cartagena-abre-participacion-publica-revision-plan-especial-casco-historico-cuatro-meses/20260603134102217587.html',
  },
  convivencia_mazarron: {
    titulo: 'Ordenanza de convivencia ciudadana de Mazarrón',
    estado: 'En vigor desde abril de 2026',
    url: 'https://www.borm.es/services/anuncio/842433/pdf',
  },
  nnss_san_javier_79: {
    titulo: 'Modificación n.º 79 de las Normas Subsidiarias de San Javier (La Manga)',
    estado: 'En tramitación desde mayo de 2026',
    url: 'https://www.sanjavier.es/es/noticia-17061-resumen-acuerdos-pleno-mayo',
  },
  bono_turistico: {
    titulo: 'Bono Turístico de la Región de Murcia (BORM n.º 225)',
    estado: 'Bases aprobadas el 29/09/2026',
    url: 'https://www.borm.es/services/boletin/ano/2026/numero/225/pdf',
  },
} satisfies Record<string, Norma>

/** Fecha de entrada en vigor de la reforma de la LPH (acuerdo de 3/5 para nuevas VUT) */
export const FECHA_REFORMA_LPH = '2025-04-03'
