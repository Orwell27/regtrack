// Test-only external Supabase protocol fixture. The application has no test
// bypass: it verifies sessions over HTTP and executes the real migration SQL.
import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { PGlite } from '@electric-sql/pglite'
const db = new PGlite(),
  accounts = new Map(),
  tokens = new Map()
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,banned_until timestamptz);
 grant usage on schema auth,public to service_role;grant select on auth.users to service_role;`)
await db.exec(
  readFileSync(
    'supabase/migrations/20261004224507_comunidad_nacional.sql',
    'utf8',
  ),
)
for (const name of ['owner', 'helper', 'moderator']) {
  const user = {
    id: randomUUID(),
    email: `${name}@example.test`,
    aud: 'authenticated',
    role: 'authenticated',
    email_confirmed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    app_metadata: { provider: 'email' },
    user_metadata: {},
  }
  accounts.set(user.email, user)
  await db.query('insert into auth.users values($1,$2,$3,null)', [
    user.id,
    user.email,
    user.email_confirmed_at,
  ])
  if (name === 'moderator')
    await db.query('insert into community_moderators values($1)', [user.id])
}
await db.exec('set role service_role')
function session(user) {
  const encode = (x) => Buffer.from(JSON.stringify(x)).toString('base64url')
  const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, email: user.email, aud: 'authenticated', role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000), session_id: randomUUID() })}.test-signature`
  tokens.set(token, user)
  return {
    access_token: token,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: randomUUID(),
    user,
  }
}
const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:3100')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'authorization, apikey, content-type, x-client-info, x-supabase-api-version',
  )
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Content-Type', 'application/json')
  const send = (data, status = 200) => {
    res.statusCode = status
    res.end(JSON.stringify(data))
  }
  if (req.method === 'OPTIONS') return send({})
  if (req.url === '/health') return send({ ok: true })
  let raw = ''
  for await (const chunk of req) raw += chunk
  const body = raw ? JSON.parse(raw) : {},
    url = new URL(req.url, 'http://127.0.0.1:54329'),
    bearer = req.headers.authorization?.replace(/^Bearer /, '')
  if (url.pathname === '/auth/v1/token') {
    const user = accounts.get(body.email)
    return user && body.password === 'Community-test-123!'
      ? send(session(user))
      : send({ msg: 'Invalid credentials', code: 'invalid_credentials' }, 400)
  }
  if (url.pathname === '/auth/v1/user')
    return tokens.has(bearer)
      ? send(tokens.get(bearer))
      : send({ msg: 'Invalid token', code: 'bad_jwt' }, 401)
  if (url.pathname === '/auth/v1/logout') {
    tokens.delete(bearer)
    return send({})
  }
  if (url.pathname === '/rest/v1/rpc/community_execute') {
    if (bearer !== 'community-test-service-key')
      return send({ message: 'permission denied', code: '42501' }, 403)
    try {
      const r = await db.query(
        'select community_execute($1::uuid,$2,$3::jsonb,$4) as value',
        [
          body.actor,
          body.command,
          JSON.stringify(body.payload ?? {}),
          body.rate_key ?? '',
        ],
      )
      return send(r.rows[0].value)
    } catch (e) {
      return send({ message: e.message, code: e.code ?? 'P0001' }, 400)
    }
  }
  send({ error: 'Unsupported fixture endpoint' }, 404)
})
server.listen(54329, '127.0.0.1', () =>
  console.log('Local SQL fixture listening on 54329'),
)
async function close() {
  server.close()
  await db.close()
  process.exit(0)
}
process.on('SIGTERM', close)
process.on('SIGINT', close)
