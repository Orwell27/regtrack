import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'

const lock = JSON.parse(readFileSync(new URL('./images.lock.json', import.meta.url), 'utf8'))
export function configurations() {
  const image = name => {
    const ref = lock.images[name]?.image
    if (!ref || !/@sha256:[a-f0-9]{64}$/.test(ref)) throw new Error(`Falta imagen fijada: ${name}`)
    return ref
  }
  const db = 'postgresql://regtrack:${REGTRACK_POSTGRES_PASSWORD:?Falta password}@postgres/regtrack'
  const environment = {
    ALEPH_SECRET_KEY: '${REGTRACK_ALEPH_SECRET:?Falta secreto}',
    ALEPH_APP_NAME: 'regtrack', ALEPH_APP_TITLE: 'RegTrack local',
    ALEPH_UI_URL: 'http://127.0.0.1:8080/',
    ALEPH_SINGLE_USER: 'false', ALEPH_PASSWORD_LOGIN: 'true', ALEPH_DEBUG: 'false',
    ALEPH_OAUTH: 'false', ALEPH_FORCE_HTTPS: 'false',
    OPENALEPH_DB_URI: db, ALEPH_DATABASE_URI: db, PROCRASTINATE_DB_URI: db, FTM_FRAGMENTS_URI: db,
    OPENALEPH_ELASTICSEARCH_URI: 'http://elasticsearch:9200', ALEPH_ELASTICSEARCH_URI: 'http://elasticsearch:9200',
    REDIS_URL: 'redis://redis:6379/0', ARCHIVE_TYPE: 'file', ARCHIVE_PATH: '/data',
    ALEPH_OCR_DEFAULTS: 'spa', ALEPH_MAIL_HOST: '', SENTRY_DSN: '',
  }
  const service = (name, extras = {}) => ({ image: image(name), platform: 'linux/amd64', restart: 'no', ...extras })
  const backend = extras => service('openaleph', { environment, volumes: ['archive:/data'], mem_limit: '1g', ...extras })
  const dependencies = { postgres: { condition: 'service_healthy' }, elasticsearch: { condition: 'service_healthy' }, redis: { condition: 'service_healthy' } }
  const openaleph = {
    name: 'regtrack-openaleph',
    services: {
      postgres: service('postgres', { environment: { POSTGRES_USER: 'regtrack', POSTGRES_DB: 'regtrack', POSTGRES_PASSWORD: '${REGTRACK_POSTGRES_PASSWORD:?Falta password}' },
        volumes: ['postgres:/var/lib/postgresql/data'], mem_limit: '512m',
        healthcheck: { test: ['CMD-SHELL', 'pg_isready -U regtrack -d regtrack'], interval: '5s', timeout: '5s', retries: 30 } }),
      elasticsearch: service('elasticsearch', { environment: { 'discovery.type': 'single-node', 'xpack.security.enabled': 'false', ES_JAVA_OPTS: '-Xms1g -Xmx1g' },
        volumes: ['elasticsearch:/usr/share/elasticsearch/data'], mem_limit: '2g',
        healthcheck: { test: ['CMD-SHELL', 'curl -fsS http://localhost:9200/_cluster/health?wait_for_status=yellow'], interval: '10s', timeout: '10s', retries: 30 } }),
      redis: service('redis', { command: ['redis-server', '--save', '60', '1'], volumes: ['redis:/data'], mem_limit: '128m',
        healthcheck: { test: ['CMD', 'redis-cli', 'ping'], interval: '5s', timeout: '5s', retries: 30 } }),
      migrate: backend({ profiles: ['setup'], command: ['aleph', 'upgrade'], depends_on: dependencies }),
      api: backend({ command: ['gunicorn', '--config', '/aleph/gunicorn.conf.py', '--workers', '1', '--log-level', 'info', '--log-file', '-'],
        depends_on: dependencies }),
      worker: backend({ command: ['procrastinate', 'worker', '-q', 'openaleph,openaleph-management'], depends_on: dependencies }),
      ui: service('ui', { profiles: ['ui'], ports: ['127.0.0.1:8080:8080'], depends_on: ['api'], mem_limit: '256m' }),
      ingest: service('ingest', { profiles: ['documents'], environment, command: ['procrastinate', 'worker', '-q', 'ingest'],
        volumes: ['archive:/data'], tmpfs: ['/tmp:mode=1777'], depends_on: dependencies, mem_limit: '2g' }),
      analyze: service('analyze', { profiles: ['documents'], environment, command: ['procrastinate', 'worker', '-q', 'analyze'],
        tmpfs: ['/tmp:mode=1777'], depends_on: dependencies, mem_limit: '2g' }),
    },
    volumes: { archive: {}, postgres: {}, elasticsearch: {}, redis: {} },
    // Text import test only; no remote downloads or notifications from these containers.
    networks: { default: { internal: true } },
  }
  const graphiti = {
    name: 'regtrack-graphiti-readonly',
    services: { graphiti: service('graphiti', {
      mem_limit: '2g',
      environment: { OPENAI_API_KEY: 'regtrack-disabled-no-provider-credential', BROWSER: '0',
        GRAPHITI_GROUP_ID: 'regtrack', FALKORDB_URI: 'redis://localhost:6379', FALKORDB_DATABASE: 'regtrack',
        GRAPHITI_TELEMETRY_ENABLED: 'false', SEMAPHORE_LIMIT: '1', CONFIG_PATH: '/app/mcp/config/config.yaml' },
      volumes: ['graph:/var/lib/falkordb/data', 'logs:/var/log/graphiti'],
    }) },
    volumes: { graph: {}, logs: {} },
    // No real model credential and no outbound network. Only MCP discovery/episode reads.
    networks: { default: { internal: true } },
  }
  return { openaleph, graphiti }
}

export function prepare(directory) {
  const dir = resolve(directory)
  mkdirSync(dir, { recursive: true })
  for (const [name, config] of Object.entries(configurations())) {
    writeFileSync(join(dir, `compose.${name}.json`), JSON.stringify(config, null, 2) + '\n')
  }
  const env = join(dir, '.env')
  // Never rotate a database password by rerunning preparation.
  if (!existsSync(env)) writeFileSync(env, `REGTRACK_POSTGRES_PASSWORD=${randomBytes(32).toString('hex')}\nREGTRACK_ALEPH_SECRET=${randomBytes(32).toString('hex')}\n`, { mode: 0o600, flag: 'wx' })
  return dir
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  console.log(`Preparado en ${prepare(process.argv[2] || '.knowledge/local-services')}. No se han arrancado servicios. Conservar .env sin publicarlo.`)
}
