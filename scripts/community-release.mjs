// Local packaging only. This module never connects to a database or deploys.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
export const releaseFiles = [
  '007_sectorial.sql',
  '20261004224507_comunidad_nacional.sql',
  '20261005113039_comunidad_normativa.sql',
  '20261005122015_acceso_seguro_y_alta.sql',
]
const sha256 = value => createHash('sha256').update(value).digest('hex')
const legacy = ['usuarios','alertas','entregas','keywords','entidades','config','alerta_relaciones']
const sector = ['sectores','subcategorias','alerta_sectores','suscriptor_intereses','telegram_grupos']
const community = ['moderators','members','topics','replies','follows','reports','resources','audit','limits','requests','pilot'].map(name => `community_${name}`)
const sqlArray = values => `array[${values.map(value => `'${value}'`).join(',')}]`

export const preflight = `
do $preflight$
declare t text;
begin
  foreach t in array ${sqlArray(legacy)} loop
    if to_regclass('public.'||t) is null then raise exception 'RELEASE_MISSING_TABLE: %',t; end if;
  end loop;
  foreach t in array ${sqlArray([...sector,...community])} loop
    if to_regclass('public.'||t) is not null then raise exception 'RELEASE_ALREADY_PRESENT: %',t; end if;
  end loop;
  if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('register_subscriber','community_execute','community_alert_context')) then
    raise exception 'RELEASE_FUNCTION_ALREADY_PRESENT';
  end if;
  if exists(select auth_id from public.usuarios where auth_id is not null group by auth_id having count(*)>1) then
    raise exception 'RELEASE_DUPLICATE_AUTH_ID';
  end if;
  if not exists(select 1 from public.usuarios u join auth.users a on a.id=u.auth_id
    where u.rol='admin' and u.activo=true and a.email_confirmed_at is not null
    and not coalesce(a.is_anonymous,false) and (a.banned_until is null or a.banned_until<now())) then
    raise exception 'RELEASE_NO_VERIFIED_ADMIN';
  end if;
  if not exists(select 1 from pg_roles where rolname='service_role' and rolbypassrls) then
    raise exception 'RELEASE_SERVICE_ROLE_REQUIRED';
  end if;
end $preflight$;
`

const snapshot = `
lock table ${legacy.map(t => `public.${t}`).join(',')} in share row exclusive mode;
create temporary table release_legacy_snapshot(table_name text primary key, fingerprint text) on commit drop;
do $snapshot$
declare t text; fingerprint text;
begin
  foreach t in array ${sqlArray(legacy)} loop
    execute format('select md5(coalesce(string_agg(md5(to_jsonb(r)::text), '''' order by md5(to_jsonb(r)::text)), '''')) from public.%I r',t) into fingerprint;
    insert into release_legacy_snapshot values(t,fingerprint);
  end loop;
end $snapshot$;
`

const postflight = `
do $postflight$
declare t text; role_name text; fingerprint text; old_record record; function_name text;
begin
  foreach t in array ${sqlArray([...legacy,...sector,...community])} loop
    if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname=t and c.relrowsecurity) then raise exception 'RELEASE_RLS_MISSING: %',t; end if;
    foreach role_name in array array['anon','authenticated'] loop
      if has_table_privilege(role_name,'public.'||t,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
        or has_any_column_privilege(role_name,'public.'||t,'SELECT,INSERT,UPDATE,REFERENCES') then
        raise exception 'RELEASE_PUBLIC_PRIVILEGE: % %',t,role_name;
      end if;
    end loop;
    if not has_table_privilege('service_role','public.'||t,'SELECT')
      or not has_table_privilege('service_role','public.'||t,'INSERT')
      or not has_table_privilege('service_role','public.'||t,'UPDATE')
      or not has_table_privilege('service_role','public.'||t,'DELETE') then
      raise exception 'RELEASE_SERVER_PRIVILEGE_MISSING: %',t;
    end if;
  end loop;
  foreach function_name in array array['public.register_subscriber(uuid,jsonb)','public.community_execute(uuid,text,jsonb,text)','public.community_alert_context(uuid)'] loop
    if has_function_privilege('anon',function_name,'EXECUTE') or has_function_privilege('authenticated',function_name,'EXECUTE')
      or not has_function_privilege('service_role',function_name,'EXECUTE') then raise exception 'RELEASE_FUNCTION_PRIVILEGE: %',function_name; end if;
  end loop;
  for old_record in select * from release_legacy_snapshot loop
    execute format('select md5(coalesce(string_agg(md5(to_jsonb(r)::text), '''' order by md5(to_jsonb(r)::text)), '''')) from public.%I r',old_record.table_name) into fingerprint;
    if fingerprint is distinct from old_record.fingerprint then raise exception 'RELEASE_DATA_CHANGED: %',old_record.table_name; end if;
  end loop;
end $postflight$;
`

export function buildRelease() {
  const sources = releaseFiles.map(name => {
    // Normalize line endings so Windows and Linux produce the same package.
    const original = readFileSync(path.join(root,'supabase/migrations',name),'utf8').replace(/\r\n/g,'\n')
    let sql = original
    if (name !== '007_sectorial.sql') {
      if ((sql.match(/^begin;$/gmi) ?? []).length !== 1 || !/\ncommit;\s*$/i.test(sql)) throw Error(`Unexpected transaction wrapper: ${name}`)
      sql = sql.replace(/^begin;\s*$/mi,'').replace(/\ncommit;\s*$/i,'\n')
    }
    // No embedded top-level transaction may commit an incomplete package.
    if (/^(begin|commit|rollback);\s*$/mi.test(sql)) throw Error(`Unexpected transaction control: ${name}`)
    return {name,sha256:sha256(original),sql}
  })
  const sql = `-- RegTrack: one atomic release; never apply individual statements.\nbegin;\nset local lock_timeout='5s';\nset local statement_timeout='60s';\nselect pg_advisory_xact_lock(hashtextextended('regtrack:community-release',0));\n${preflight}\n${snapshot}\n${sources.map(source => `-- Source: ${source.name} sha256:${source.sha256}\n${source.sql}`).join('\n')}\n${postflight}\ncommit;\n`
  return {sql,manifest:{format:1,project:'rygwmqxqjmgytnzgrnef',release:'community_access',sqlSha256:sha256(sql),sources:sources.map(({name,sha256})=>({name,sha256}))}}
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const {sql,manifest} = buildRelease()
  const destination = path.join(root,'.artifacts/community-release')
  mkdirSync(destination,{recursive:true})
  writeFileSync(path.join(destination,'release.sql'),sql)
  writeFileSync(path.join(destination,'manifest.json'),JSON.stringify(manifest,null,2)+'\n')
  console.log(JSON.stringify({directory:destination,...manifest},null,2))
}
