import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'

// Public upstream images. Resolve once, then Compose consumes immutable digests.
const images = {
  postgres: 'docker.io/library/postgres:17',
  redis: 'docker.io/library/redis:alpine',
  elasticsearch: 'ghcr.io/openaleph/elasticsearch:latest',
  openaleph: 'ghcr.io/openaleph/openaleph:latest',
  ingest: 'ghcr.io/openaleph/ingest-file:latest',
  analyze: 'ghcr.io/openaleph/ftm-analyze:latest',
  ui: 'ghcr.io/openaleph/aleph-ui:latest',
  graphiti: 'docker.io/zepai/knowledge-graph-mcp:latest',
}
const accept = 'application/vnd.oci.image.index.v1+json, application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.v2+json'
const locked = {}
for (const [name, source] of Object.entries(images)) {
  const [registry, ...parts] = source.split('/')
  const [repository, tag] = parts.join('/').split(':')
  const hub = registry === 'docker.io'
  const auth = new URL(hub ? 'https://auth.docker.io/token' : 'https://ghcr.io/token')
  auth.searchParams.set('service', hub ? 'registry.docker.io' : 'ghcr.io')
  auth.searchParams.set('scope', `repository:${repository}:pull`)
  const authRes = await fetch(auth, { signal: AbortSignal.timeout(30_000) })
  if (!authRes.ok) throw new Error(`${name}: token público HTTP ${authRes.status}`)
  const token = (await authRes.json()).token
  const res = await fetch(`https://${hub ? 'registry-1.docker.io' : registry}/v2/${repository}/manifests/${tag}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: accept }, signal: AbortSignal.timeout(30_000), redirect: 'error',
  })
  if (!res.ok) throw new Error(`${name}: manifiesto HTTP ${res.status}`)
  const bytes = Buffer.from(await res.arrayBuffer())
  const digest = `sha256:${createHash('sha256').update(bytes).digest('hex')}`
  if (digest !== res.headers.get('docker-content-digest')) throw new Error(`${name}: digest no coincide con el manifiesto`)
  const manifest = JSON.parse(bytes.toString())
  if (manifest.manifests && !manifest.manifests.some(m => m.platform?.os === 'linux' && m.platform?.architecture === 'amd64')) throw new Error(`${name}: sin Linux amd64`)
  locked[name] = { source, image: `${registry}/${repository}@${digest}` }
  console.log(`${name}: digest verificado`)
}
writeFileSync(new URL('./images.lock.json', import.meta.url), JSON.stringify({ resolvedAt: new Date().toISOString(), images: locked }, null, 2) + '\n')
