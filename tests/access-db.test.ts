import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { beforeAll,afterAll,describe,it,expect } from 'vitest'
let db:PGlite
const actor=randomUUID(),admin=randomUUID(),unconfirmed=randomUUID(),blocked=randomUUID(),orphan=randomUUID()
const profile={nombre:'Propietario',territorio:'Galicia',subtema:'arrendamiento',perfil:'propietario',rol:'admin',plan:'pro',email:'victim@example.test',auth_id:admin}
async function register(id:string,p=profile){return (await db.query<{result:{ok:boolean;id:string}}>('select register_subscriber($1::uuid,$2::jsonb) as result',[id,JSON.stringify(p)])).rows[0].result}
beforeAll(async()=>{
 db=new PGlite()
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,banned_until timestamptz,is_anonymous boolean default false);
 grant usage on schema public,auth to service_role,anon,authenticated;grant select on auth.users to service_role;`)
 for(const f of ['001_initial.sql','002_add_rol_config.sql','006_correlacion.sql','007_sectorial.sql'])await db.exec(readFileSync('supabase/migrations/'+f,'utf8'))
 await db.exec('grant all on all tables in schema public to anon,authenticated,service_role')
 for(const id of [actor,admin,unconfirmed,blocked,orphan])await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,$3)',[id,id+'@example.test',id===unconfirmed?null:new Date().toISOString()])
 await db.query("insert into usuarios(auth_id,email,nombre,rol,plan,activo) values($1,$2,'Admin','admin','pro',true),($3,$4,'Baja','subscriber','free',false),(null,$5,'Sin enlace','admin','pro',true)",[admin,admin+'@example.test',blocked,blocked+'@example.test',orphan+'@example.test'])
 // Reproduce the old grants on synthetic data before applying the repair.
 await db.exec('set role anon')
 expect((await db.query('select id from usuarios')).rows.length).toBe(3)
 expect((await db.query("update usuarios set nombre=nombre where auth_id=$1 returning id",[admin])).rows.length).toBe(1)
 await db.exec('reset role')
 await db.exec(readFileSync('supabase/migrations/20261005122015_acceso_seguro_y_alta.sql','utf8'))
 await db.exec('set role service_role')
},30000)
afterAll(async()=>{await db?.close()})
describe.sequential('legacy data boundary and safe profile creation',()=>{
 it.each(['anon','authenticated'])('%s cannot read/write private data or call provisioning',async role=>{
  await db.exec(`reset role;set role ${role}`)
  try {
   for(const table of ['usuarios','alertas','config','entregas','keywords','entidades','alerta_relaciones','sectores','subcategorias','alerta_sectores','suscriptor_intereses','telegram_grupos']) {
    await expect(db.query(`select * from ${table}`)).rejects.toThrow(/permission denied/)
    await expect(db.query(`delete from ${table} where false`)).rejects.toThrow(/permission denied/)
   }
   await expect(db.query("update usuarios set rol='admin'")).rejects.toThrow(/permission denied/)
   await expect(register(actor)).rejects.toThrow(/permission denied/)
  } finally {await db.exec('reset role;set role service_role')}
 })
 it('preserves existing administrator data and rejects email-based account claiming',async()=>{
  expect((await register(admin)).ok).toBe(true)
  expect((await db.query<{rol:string}>('select rol from usuarios where auth_id=$1',[admin])).rows[0].rol).toBe('admin')
  await expect(register(orphan)).rejects.toThrow('CONFLICT')
 })
 it('rejects unconfirmed, banned and disabled identities',async()=>{
  await expect(register(unconfirmed)).rejects.toThrow('UNAUTHENTICATED')
  await expect(register(blocked)).rejects.toThrow('FORBIDDEN')
  await db.exec('reset role')
  await db.query("update auth.users set email_confirmed_at=now(),banned_until=now()+interval '1 day' where id=$1",[unconfirmed])
  await db.exec('set role service_role')
  await expect(register(unconfirmed)).rejects.toThrow('UNAUTHENTICATED')
 })
 it('ignores attacker roles and binds the new free subscriber to verified email/id, idempotently',async()=>{
  const first=await register(actor),second=await register(actor)
  expect(first).toEqual(second)
  const row=(await db.query<{rol:string;plan:string;email:string;auth_id:string}>('select rol,plan,email,auth_id from usuarios where id=$1',[first.id])).rows[0]
  expect(row).toEqual({rol:'subscriber',plan:'free',email:actor+'@example.test',auth_id:actor})
 })
})
