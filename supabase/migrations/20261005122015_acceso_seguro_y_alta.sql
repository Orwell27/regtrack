-- Server-only legacy tables. Preserve existing rows and service-role operations.
begin;
do $$ declare t text; begin
  foreach t in array array['usuarios','alertas','entregas','keywords','entidades','config','alerta_relaciones','sectores','subcategorias','alerta_sectores','suscriptor_intereses','telegram_grupos'] loop
    if to_regclass('public.'||t) is not null then
      execute format('alter table public.%I enable row level security',t);
      execute format('revoke all on public.%I from public,anon,authenticated',t);
      execute format('grant all on public.%I to service_role',t);
    end if;
  end loop;
end $$;
create unique index usuarios_auth_id_unique on usuarios(auth_id) where auth_id is not null;
create function public.register_subscriber(actor uuid, profile jsonb default '{}')
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare account auth.users%rowtype; existing usuarios%rowtype; label text;
begin
  select * into account from auth.users where id=actor and email_confirmed_at is not null and email is not null
    and not coalesce(is_anonymous,false) and (banned_until is null or banned_until<now());
  if not found then raise exception 'UNAUTHENTICATED'; end if;
  perform pg_advisory_xact_lock(hashtextextended('subscriber:'||actor::text,0));
  select * into existing from usuarios where auth_id=actor;
  if found then
    if not existing.activo then raise exception 'FORBIDDEN'; end if;
    return jsonb_build_object('ok',true,'id',existing.id);
  end if;
  if exists(select 1 from usuarios where lower(email)=lower(account.email)) then raise exception 'CONFLICT'; end if;
  label:=trim(coalesce(profile->>'nombre',''));
  if length(label) not between 2 and 100 then raise exception 'INVALID'; end if;
  if coalesce(profile->>'territorio','')='' or length(profile->>'territorio')>60 then raise exception 'INVALID'; end if;
  if coalesce(profile->>'subtema','') not in ('urbanismo','fiscalidad','arrendamiento','hipotecas','obra_nueva','construccion','rehabilitacion') then raise exception 'INVALID'; end if;
  if coalesce(profile->>'perfil','') not in ('promotor','agencia','despacho','inversor','propietario') then raise exception 'INVALID'; end if;
  insert into usuarios(auth_id,email,nombre,territorios,subtemas,afectado_como,rol,plan,activo)
    values(actor,lower(account.email),label,jsonb_build_array(profile->>'territorio'),jsonb_build_array(profile->>'subtema'),jsonb_build_array(profile->>'perfil'),'subscriber','free',true)
    returning * into existing;
  return jsonb_build_object('ok',true,'id',existing.id);
end $$;
revoke all on function public.register_subscriber(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.register_subscriber(uuid,jsonb) to service_role;
commit;
