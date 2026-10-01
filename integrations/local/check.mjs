import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { configurations, prepare } from './prepare.mjs'

test('local services cannot expose databases or send text to a model provider', () => {
  const { openaleph, graphiti } = configurations()
  for (const config of [openaleph, graphiti]) {
    assert.equal(config.networks.default.internal, true)
    for (const service of Object.values(config.services)) {
      assert.match(service.image, /@sha256:[a-f0-9]{64}$/)
      assert.equal(service.restart, 'no')
      for (const port of service.ports || []) assert.match(port, /^127\.0\.0\.1:/)
    }
  }
  for (const name of ['postgres', 'elasticsearch', 'redis']) assert.equal(openaleph.services[name].ports, undefined)
  assert.equal(openaleph.services.api.environment.ALEPH_SINGLE_USER, 'false')
  assert.equal(graphiti.services.graphiti.environment.OPENAI_API_KEY, 'regtrack-disabled-no-provider-credential')
})

test('preparing again preserves the credentials needed to reopen existing volumes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'regtrack-services-'))
  prepare(dir)
  const first = readFileSync(join(dir, '.env'), 'utf8')
  prepare(dir)
  assert.equal(readFileSync(join(dir, '.env'), 'utf8'), first)
  assert.match(first, /^REGTRACK_POSTGRES_PASSWORD=[a-f0-9]{64}\nREGTRACK_ALEPH_SECRET=[a-f0-9]{64}\n$/)
  assert(!readFileSync(join(dir, 'compose.openaleph.json'), 'utf8').includes(first.split('=')[1].split('\n')[0]))
})
