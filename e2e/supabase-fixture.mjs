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
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,banned_until timestamptz,is_anonymous boolean default false);
 grant usage on schema auth,public to service_role;grant select on auth.users to service_role;`)
await db.exec(
  readFileSync(
    'supabase/migrations/20261004224507_comunidad_nacional.sql',
    'utf8',
  ),
)
await db.exec(readFileSync('supabase/migrations/001_initial.sql', 'utf8'))
await db.exec(readFileSync('supabase/migrations/002_add_rol_config.sql', 'utf8'))
await db.exec(readFileSync('supabase/migrations/006_correlacion.sql', 'utf8'))
await db.exec(readFileSync('supabase/migrations/007_sectorial.sql', 'utf8'))
await db.exec(readFileSync('supabase/migrations/20261005122015_acceso_seguro_y_alta.sql', 'utf8'))
await db.exec(
  readFileSync(
    'supabase/migrations/20261005113039_comunidad_normativa.sql',
    'utf8',
  ),
)
await db.exec(
  'grant select,insert,update,delete on alertas,alerta_relaciones to service_role',
)
for (const name of ['owner', 'helper', 'moderator', 'subscriber', 'administrator']) {
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
  await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,$3)', [
    user.id,
    user.email,
    user.email_confirmed_at,
  ])
  if (name === 'moderator')
    await db.query('insert into community_moderators values($1)', [user.id])
  if (name === 'administrator')
    await db.query("insert into usuarios(auth_id,email,nombre,rol,plan,activo) values($1,$2,'Administrador de prueba','admin','pro',true)",[user.id,user.email])
}
await db.exec('set role service_role')
const regulationId = '03f2f098-a036-4c03-bbf4-2842d4b32920'
await db.query(
  `insert into alertas(id,url,titulo,fuente,ambito,territorios,fecha_publicacion,resumen,impacto,accion_recomendada,estado) values
 ($1,'https://www.boe.es/example-fixture','Normativa de obras · ejemplo de prueba','BOE','estatal','["España"]','2026-01-01','Resumen sintético para comprobar el recorrido; no es asesoramiento.','Impacto de prueba sobre trámites de obras.','Contrastar condiciones territoriales antes de decidir.','enviada')`,
  [regulationId],
)
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
  // Test fixture only; never part of the Next.js application or remote database.
  if (
    url.pathname === '/__test/change-reference' &&
    req.method === 'POST' &&
    bearer === 'community-test-service-key'
  ) {
    await db.query(
      "update alertas set fecha_entrada_vigor='2026-02-01' where id=$1",
      [regulationId],
    )
    return send({ ok: true })
  }
  if (url.pathname === '/rest/v1/rpc/register_subscriber') {
    if (bearer !== 'community-test-service-key') return send({message:'permission denied'},403)
    try {
      const r = await db.query('select register_subscriber($1::uuid,$2::jsonb) as value',[body.actor,JSON.stringify(body.profile)])
      return send(r.rows[0].value)
    } catch(e) { return send({message:e.message,code:e.code ?? 'P0001'},400) }
  }
  if (url.pathname.startsWith('/rest/v1/') && req.method === 'GET') {
    if (bearer !== 'community-test-service-key') return send({message:'permission denied'},403)
    const table = url.pathname.slice('/rest/v1/'.length)
    if (table === 'usuarios') {
      const column = url.searchParams.has('auth_id') ? 'auth_id' : 'id'
      const value = url.searchParams.get(column)?.replace(/^eq\./,'')
      const result = await db.query(`select * from usuarios where ${column}=$1::uuid`,[value])
      if (req.headers.accept?.includes('vnd.pgrst.object')) return result.rows[0] ? send(result.rows[0]) : send({code:'PGRST116',details:'0 rows'},406)
      return send(result.rows)
    }
    if (['alertas','subcategorias','suscriptor_intereses','alerta_sectores'].includes(table)) return send([])
    if (table === 'config') return send((await db.query('select * from config')).rows)
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
