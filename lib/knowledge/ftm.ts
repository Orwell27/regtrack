import type { KnowledgeRecord } from './vault'

export interface FtmEntity { id: string; schema: string; properties: Record<string, string[]> }

// FollowTheMoney Document, validado además con su biblioteca Python oficial.
// contentHash de FtM significa SHA1: nuestro SHA256 se conserva en notes.
export function toFtm(record: KnowledgeRecord): FtmEntity {
  return { id: `regtrack-${record.id}-${record.version}`, schema: 'Document', properties: {
    name: [record.title], title: [record.title], fileName: [`${record.id}-${record.version}.md`],
    mimeType: ['text/markdown'], bodyText: [record.content], publisher: [record.publisher],
    ...(record.sourceUrl.startsWith('http') ? { sourceUrl: [record.sourceUrl] } : {}),
    ...(record.publishedAt ? { publishedAt: [record.publishedAt] } : {}),
    notes: [JSON.stringify({ kind: record.kind, review: record.review, legalStatus: record.legalStatus,
      source: record.sourceUrl, observedAt: record.observedAt, sha256: record.contentHash })],
  } }
}
