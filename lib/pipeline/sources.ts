import { fetchBOE, fetchBOEText, type NormalizedItem } from '../sources/boe'
import { fetchBORM, fetchBORMText } from '../sources/borm'
import { fetchBOCM } from '../sources/bocm'
import { fetchDOGC } from '../sources/dogc'
import { fetchBOJA } from '../sources/boja'
import { fetchBOIB } from '../sources/boib'
import { fetchBOC_CANARIAS } from '../sources/boc_canarias'
import { fetchBOC_CANTABRIA } from '../sources/boc_cantabria'
import { fetchBOCYL } from '../sources/bocyl'
import { fetchDOE } from '../sources/doe'
import { fetchDOG } from '../sources/dog'
import { fetchBOPV } from '../sources/bopv'
import { fetchBOPA } from '../sources/bopa'
import { fetchBON } from '../sources/bon'
import { fetchBOR } from '../sources/bor'
import type { ScanReport } from './report'

export async function collectSources(report: ScanReport, historical = false): Promise<NormalizedItem[]> {
  const items: NormalizedItem[] = []
  // Fechas secuenciales para no multiplicar las peticiones al BOE durante una recuperación.
  for (const date of report.dates) {
    items.push(...await report.source('BOE', date, () => fetchBOE(date, false)))
    items.push(...await report.source('BORM', date, () => fetchBORM(date)))
  }
  if (!historical) {
    const feeds = [
      ['BOCM', fetchBOCM], ['DOGC', fetchDOGC], ['BOJA', fetchBOJA], ['BOIB', fetchBOIB],
      ['BOC_CANARIAS', fetchBOC_CANARIAS], ['BOC_CANTABRIA', fetchBOC_CANTABRIA], ['BOCYL', fetchBOCYL],
      ['DOE', fetchDOE], ['DOG', fetchDOG], ['BOPV', fetchBOPV], ['BOPA', fetchBOPA], ['BON', fetchBON], ['BOR', fetchBOR],
    ] as const
    const results = await Promise.all(feeds.map(([name, fetcher]) => report.source(name, 'feed reciente', fetcher)))
    items.push(...results.flat())
  }
  return Array.from(new Map(items.map(item => [item.url, item])).values())
}

export async function hydrateDocument(item: NormalizedItem): Promise<NormalizedItem> {
  if (item.fuente === 'BOE') return { ...item, ...await fetchBOEText(item.id, item._xmlUrl), contenido: 'texto_completo' }
  if (item.fuente === 'BORM') {
    if (!item.texto_url) throw new Error('BORM: falta el identificador para recuperar el documento completo')
    return { ...item, texto: await fetchBORMText(item.texto_url), contenido: 'texto_completo' }
  }
  // Estos conectores solo recuperan índices/RSS. No certificar articulado completo.
  return { ...item, contenido: 'sumario' }
}
