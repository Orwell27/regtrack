-- Disposable local PostgreSQL only. No auth users or application tables required.
do $$ begin
  if not (select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.regtrack_memory_records'::regclass) then
    raise exception 'RLS no activada';
  end if;
end $$;
set role anon;
do $$ begin
  begin perform * from public.regtrack_memory_records; raise exception 'anon puede leer';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set role authenticated;
do $$ begin
  begin perform * from public.regtrack_memory_records; raise exception 'authenticated puede leer';
  exception when insufficient_privilege then null; end;
  begin insert into public.regtrack_memory_records values ('invalid', '{}', 'x', now()); raise exception 'authenticated puede escribir';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set role service_role;
insert into public.regtrack_memory_records(key, record, markdown)
values (repeat('a',32)||'-'||repeat('b',32), jsonb_build_object(
  'schemaVersion',1,'id',repeat('a',32),'version',repeat('b',32),'contentHash',repeat('c',64),
  'review','pendiente','legalStatus','sin_verificar','kind','norma','content','Documento ficticio SQL'
), '# Documento ficticio SQL');
insert into public.regtrack_memory_records(key, record, markdown)
select key, record, markdown from public.regtrack_memory_records on conflict (key) do nothing;
do $$ begin
  if (select count(*) from public.regtrack_memory_records) <> 1 then raise exception 'Reintento duplicado'; end if;
  begin update public.regtrack_memory_records set markdown='alterado'; raise exception 'service_role puede reescribir';
  exception when insufficient_privilege then null; end;
  begin delete from public.regtrack_memory_records; raise exception 'service_role puede borrar';
  exception when insufficient_privilege then null; end;
  begin insert into public.regtrack_memory_records(key,record,markdown) values (repeat('d',32)||'-'||repeat('e',32),'{}','# inválido');
    raise exception 'Registro incompleto aceptado';
  exception when check_violation then null; end;
end $$;
reset role;
