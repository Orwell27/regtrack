import {PGlite} from '@electric-sql/pglite'
import {readFileSync} from 'node:fs'
import {randomUUID} from 'node:crypto'
import {beforeEach,afterEach,it,expect} from 'vitest'
import {buildRelease} from '../scripts/community-release.mjs'

let db:PGlite
const admin=randomUUID()
beforeEach(async()=>{
 db=new PGlite()
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,banned_until timestamptz,is_anonymous boolean default false);
 grant usage on schema public,auth to anon,authenticated,service_role;grant select on auth.users to service_role;
 alter default privileges in schema public grant all on tables to anon,authenticated;`)
 for(const file of ['001_initial.sql','002_add_rol_config.sql','006_correlacion.sql','008_boe_enrichment.sql'])await db.exec(readFileSync('supabase/migrations/'+file,'utf8'))
 await db.query("insert into auth.users(id,email,email_confirmed_at) values($1,'admin@example.test',now())",[admin])
 await db.query("insert into usuarios(auth_id,email,nombre,rol,plan) values($1,'admin@example.test','Admin original','admin','pro')",[admin])
 await db.exec("create table regtrack_memory_records(id integer primary key,content text);insert into regtrack_memory_records values(1,'keep this');alter table regtrack_memory_records enable row level security;revoke all on regtrack_memory_records from public,anon,authenticated")
},30000)
afterEach(async()=>{await db?.close()})
async function rollbackAfterFailure(sql:string,pattern:RegExp){
 await expect(db.exec(sql)).rejects.toThrow(pattern)
 await db.exec('rollback')
 expect((await db.query<{t:string|null}>("select to_regclass('public.community_members')::text t")).rows[0].t).toBeNull()
}

it('applies the exact package atomically, preserves rows and existing memory, supports the server',async()=>{
 const {sql,manifest}=buildRelease()
 expect(manifest.sources).toHaveLength(4)
 expect(manifest.sqlSha256).toMatch(/^[a-f0-9]{64}$/)
 await db.exec(sql)
 expect((await db.query('select count(*)::int n from subcategorias')).rows[0]).toEqual({n:12})
 expect((await db.query("select nombre,rol,plan from usuarios where auth_id=$1",[admin])).rows[0]).toEqual({nombre:'Admin original',rol:'admin',plan:'pro'})
 expect((await db.query('select content from regtrack_memory_records')).rows[0]).toEqual({content:'keep this'})
 await db.exec('set role service_role')
 expect((await db.query<{v:{ok:boolean}}>('select register_subscriber($1::uuid) v',[admin])).rows[0].v.ok).toBe(true)
 await db.exec('reset role;set role anon')
 await expect(db.query('select * from usuarios')).rejects.toThrow(/permission denied/)
 await expect(db.query('select * from community_members')).rejects.toThrow(/permission denied/)
})
it('refuses an already applied or partial deployment without overwriting anything',async()=>{
 await db.exec('create table sectores(sentinel text);insert into sectores values(\'preserve\')')
 await rollbackAfterFailure(buildRelease().sql,/RELEASE_ALREADY_PRESENT/)
 expect((await db.query('select * from sectores')).rows[0]).toEqual({sentinel:'preserve'})
})
it('aborts before deployment when no active verified administrator remains',async()=>{
 await db.exec('update usuarios set activo=false')
 await rollbackAfterFailure(buildRelease().sql,/RELEASE_NO_VERIFIED_ADMIN/)
})
it('rejects missing legacy dependencies before creating new tables',async()=>{
 await db.exec('drop table entregas')
 await rollbackAfterFailure(buildRelease().sql,/RELEASE_MISSING_TABLE/)
})
it('rejects duplicated identity links without choosing one account',async()=>{
 await db.query("insert into usuarios(auth_id,email,nombre) values($1,'duplicate@example.test','Duplicate')",[admin])
 await rollbackAfterFailure(buildRelease().sql,/RELEASE_DUPLICATE_AUTH_ID/)
 expect((await db.query('select count(*)::int n from usuarios')).rows[0]).toEqual({n:2})
})
it('rolls back all new tables and permission changes if the final assertion fails',async()=>{
 const sql=buildRelease().sql.replace('do $postflight$',"update usuarios set nombre='unintended';\ndo $postflight$")
 await rollbackAfterFailure(sql,/RELEASE_DATA_CHANGED/)
 expect((await db.query("select to_regclass('public.sectores')::text t")).rows[0]).toEqual({t:null})
 expect((await db.query('select nombre from usuarios')).rows[0]).toEqual({nombre:'Admin original'})
 expect((await db.query("select has_table_privilege('anon','usuarios','SELECT') allowed")).rows[0]).toEqual({allowed:true})
})
it('aborts if a column-level permission unexpectedly remains at commit time',async()=>{
 const sql=buildRelease().sql.replace('do $postflight$', 'grant select(nombre) on usuarios to anon;\ndo $postflight$')
 await rollbackAfterFailure(sql,/RELEASE_PUBLIC_PRIVILEGE/)
})
