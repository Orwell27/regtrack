-- Published alerts are the only normative source exposed to admitted members.
-- Snapshots are copied by the database, never trusted from browser input.
begin;
alter table community_topics add column alert_id uuid references alertas(id) on delete restrict,
  add column municipality text not null default '' check(length(municipality)<=120),
  add column reference_snapshot jsonb;
alter table community_resources add column regulation_version text;
create index community_topics_alert on community_topics(alert_id) where alert_id is not null;

create function public.community_alert_context(alert uuid) returns jsonb
language sql stable security invoker set search_path=public,pg_temp as $$
  select doc || jsonb_build_object('version',md5(doc::text)) from (
    select jsonb_build_object('id',a.id,'title',a.titulo,'url',a.url,'source',a.fuente,
      'scope',a.ambito,'territories',coalesce(a.territorios,'[]'::jsonb),
      'published_on',a.fecha_publicacion,'effective_on',a.fecha_entrada_vigor,
      'summary',a.resumen,'impact',a.impacto,'affected',coalesce(a.afectados,'[]'::jsonb),
      'action',a.accion_recomendada,'modifies',a.deroga_modifica,
      'related',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'title',b.titulo,'url',b.url,'relation',r.tipo_relacion,'published_on',b.fecha_publicacion,'effective_on',b.fecha_entrada_vigor) order by b.id,r.tipo_relacion)
        from alerta_relaciones r join alertas b on b.id=case when r.alerta_id=a.id then r.alerta_relacionada_id else r.alerta_id end
        where (r.alerta_id=a.id or r.alerta_relacionada_id=a.id) and b.estado='enviada'),'[]'::jsonb)) as doc
    from alertas a where a.id=alert and a.estado='enviada'
  ) x;
$$;
revoke all on function public.community_alert_context(uuid) from public,anon,authenticated;
grant execute on function public.community_alert_context(uuid) to service_role;

create or replace function public.community_execute(actor uuid, command text, payload jsonb default '{}', rate_key text default '')
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  account auth.users%rowtype; member community_members%rowtype;
  topic community_topics%rowtype; reply community_replies%rowtype;
  moderator boolean := false; result jsonb; target uuid; req uuid;
  source jsonb; current_source jsonb; n integer; p integer; topics_json jsonb; resources_json jsonb;
begin
  if command = 'apply' then
    if actor is not null or length(rate_key) <> 64 or coalesce(payload->>'consent','') <> 'true' then raise exception 'INVALID'; end if;
    if coalesce(payload->>'email','') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'INVALID'; end if;
    insert into community_limits values('apply:'||rate_key,1,now()+interval '1 hour')
      on conflict(bucket) do update set hits = case when community_limits.expires_at < now() then 1 else community_limits.hits+1 end,
      expires_at = case when community_limits.expires_at < now() then now()+interval '1 hour' else community_limits.expires_at end returning hits into n;
    if n > 10 then raise exception 'RATE_LIMIT'; end if;
    insert into community_members(email,alias,region,owner_kind,need)
      values(lower(trim(payload->>'email')),trim(payload->>'alias'),payload->>'region',payload->>'owner_kind',coalesce(payload->>'need',''))
      on conflict(email) do nothing;
    -- Same result for existing/pending/approved addresses; a repeat never changes admission.
    return '{"ok":true}'::jsonb;
  end if;
  if actor is null then
    if command = 'read' then return '{"status":"visitor","moderator":false}'::jsonb; end if;
    raise exception 'UNAUTHENTICATED';
  end if;
  select * into account from auth.users where id=actor and email_confirmed_at is not null and (banned_until is null or banned_until < now());
  if not found then raise exception 'UNAUTHENTICATED'; end if;
  select exists(select 1 from community_moderators where auth_id=actor) into moderator;
  -- Claim only a verified Auth address. Pending claims never acquire membership.
  update community_members set auth_id=actor where email=lower(account.email) and auth_id is null;
  select * into member from community_members where auth_id=actor for update;
  if command = 'read' and not moderator and (member.id is null or member.status <> 'approved') then
    return jsonb_build_object('status',coalesce(member.status,'none'),'moderator',false,'member',case when member.id is null then null else jsonb_build_object('id',member.id,'alias',member.alias) end);
  end if;
  if not moderator and (member.id is null or member.status <> 'approved') then raise exception 'FORBIDDEN'; end if;

  if command in ('regulation','regulations') then
    if command='regulation' then
      source := community_alert_context((payload->>'id')::uuid);
      if source is null then raise exception 'NOT_FOUND'; end if;
      return source;
    end if;
    p := greatest(0,least(1000,coalesce((payload->>'page')::integer,0)));
    return coalesce((select jsonb_agg(community_alert_context(a.id) order by a.fecha_publicacion desc nulls last,a.id) from (
      select id,fecha_publicacion from alertas where estado='enviada'
      and (coalesce(payload->>'q','')='' or strpos(lower(titulo),lower(payload->>'q'))>0)
      and (coalesce(payload->>'ambito','')='' or ambito::text=payload->>'ambito')
      order by fecha_publicacion desc nulls last,id limit 21 offset p*20
    ) a),'[]'::jsonb);
  end if;

  if command = 'admin' then
    if not moderator then raise exception 'FORBIDDEN'; end if;
    return jsonb_build_object('members',coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at desc) from (select * from community_members where (coalesce(payload->>'status','')='' or status=payload->>'status') order by created_at desc limit 50 offset greatest(0,least(1000,coalesce((payload->>'page')::integer,0)))*50) m),'[]'::jsonb),
      'member_count',(select count(*) from community_members where (coalesce(payload->>'status','')='' or status=payload->>'status')),
      'hidden',coalesce((select jsonb_agg(to_jsonb(h)) from (select id,title from community_topics where hidden order by updated_at desc limit 100) h),'[]'::jsonb),
      'reports',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at) from (select * from community_reports where not resolved order by created_at limit 100) r),'[]'::jsonb),
      'review',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'title',t.title,'body',t.body,'outcome',t.outcome,'region',t.region,'revision',t.revision,'alias',m.alias,'municipality',t.municipality,'regulation',community_alert_context(t.alert_id),'alert_id',t.alert_id)) from (select t0.* from community_topics t0 where t0.reuse_consent and not t0.hidden and not exists(select 1 from community_resources r0 where r0.topic_id=t0.id and r0.source_revision=t0.revision and not r0.hidden and (t0.alert_id is null or r0.regulation_version = community_alert_context(t0.alert_id)->>'version')) order by t0.updated_at limit 100) t join community_members m on m.id=t.author_id),'[]'::jsonb),
      'pilot',(select to_jsonb(s) from community_pilot s),
      'metrics',jsonb_build_object('topics',(select count(*) from community_topics where not hidden),'useful',(select count(*) from community_replies r join community_topics t on t.id=r.topic_id where r.useful and not r.hidden and not t.hidden),'helpers',(select count(distinct r.author_id) from community_replies r join community_topics t on t.id=r.topic_id where r.useful and not r.hidden and not t.hidden),'unanswered',(select count(*) from community_topics t where not hidden and not exists(select 1 from community_replies r where r.topic_id=t.id and not r.hidden))),
      'audit',coalesce((select jsonb_agg(to_jsonb(a)) from (select ca.action,ca.target,ca.reason,ca.created_at from community_audit ca order by ca.id desc limit 30) a),'[]'::jsonb));
  end if;

  if command = 'read' then
    p := greatest(0,least(1000,coalesce((payload->>'page')::integer,0)));
    select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into topics_json from (
      select t.*,m.alias,(select count(*) from community_replies r where r.topic_id=t.id and not r.hidden) as replies,
      exists(select 1 from community_follows f where f.member_id=member.id and f.topic_id=t.id) as following,
      exists(select 1 from community_follows f join community_replies r on r.topic_id=f.topic_id where f.member_id=member.id and f.topic_id=t.id and not r.hidden and r.created_at>f.seen_at and r.author_id<>member.id) as unread
      from community_topics t join community_members m on m.id=t.author_id
      where not t.hidden and (coalesce(payload->>'category','')='' or t.category=payload->>'category')
      and (coalesce(payload->>'region','')='' or t.region=payload->>'region')
      and (coalesce(payload->>'alert_id','')='' or t.alert_id::text=payload->>'alert_id')
      and (coalesce(payload->>'q','')='' or strpos(lower(t.title||' '||t.body),lower(payload->>'q'))>0)
      and (coalesce(payload->>'following','')<>'true' or exists(select 1 from community_follows f where f.topic_id=t.id and f.member_id=member.id))
      order by t.created_at desc,t.id limit 21 offset p*20
    ) x;
    select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into resources_json from (
      select r.id,r.topic_id,r.title,
      case when t.alert_id is not null and r.regulation_version is distinct from community_alert_context(t.alert_id)->>'version' then '' else r.body end as body,
      r.scope,r.source_url,r.reviewed_at,t.region,t.municipality,m.alias,
      community_alert_context(t.alert_id) as regulation,
      (t.alert_id is not null and (community_alert_context(t.alert_id) is null or r.regulation_version is distinct from community_alert_context(t.alert_id)->>'version')) as needs_review
      from community_resources r join community_topics t on t.id=r.topic_id join community_members m on m.id=t.author_id
      where not r.hidden and not t.hidden and t.reuse_consent and r.source_revision=t.revision order by r.reviewed_at desc,r.id limit 21 offset p*20
    ) x;
    return jsonb_build_object('status','approved','moderator',moderator,'member',case when member.id is null then null else jsonb_build_object('id',member.id,'alias',member.alias) end,'topics',topics_json,'resources',resources_json,'page',p,'pilot',(select to_jsonb(s) from community_pilot s));
  end if;

  if command = 'topic' then
    p := greatest(0,least(1000,coalesce((payload->>'page')::integer,0)));
    select * into topic from community_topics where id=(payload->>'id')::uuid and (not hidden or moderator);
    if not found then raise exception 'NOT_FOUND'; end if;
    return jsonb_build_object('topic',to_jsonb(topic)||jsonb_build_object('alias',(select alias from community_members where id=topic.author_id),'regulation',community_alert_context(topic.alert_id),'reference_changed',topic.alert_id is not null and (community_alert_context(topic.alert_id) is null or topic.reference_snapshot->>'version' is distinct from community_alert_context(topic.alert_id)->>'version')),
      'replies',coalesce((select jsonb_agg(to_jsonb(x)) from (select r.*,(select alias from community_members where id=r.author_id) as alias from community_replies r where topic_id=topic.id and (not hidden or moderator) order by created_at,id limit 21 offset p*20) x),'[]'::jsonb),
      'member',case when member.id is null then null else jsonb_build_object('id',member.id,'alias',member.alias) end,'moderator',moderator,
      'reply_page',p,'reply_count',(select count(*) from community_replies r where r.topic_id=topic.id and not r.hidden),
      'following',exists(select 1 from community_follows where topic_id=topic.id and member_id=member.id));
  end if;

  -- Mutations: serialize identical submissions and return their prior result.
  req := (payload->>'request_id')::uuid;
  if req is null then raise exception 'INVALID'; end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text||req::text,0));
  select r.result into result from community_requests r where r.actor=community_execute.actor and r.request_id=req and r.action=command;
  if found then return result; end if;
  insert into community_limits values('write:'||actor::text,1,now()+interval '1 hour')
    on conflict(bucket) do update set hits=case when community_limits.expires_at<now() then 1 else community_limits.hits+1 end,
    expires_at=case when community_limits.expires_at<now() then now()+interval '1 hour' else community_limits.expires_at end returning hits into n;
  if n>120 then raise exception 'RATE_LIMIT'; end if;
  if command in ('admit','revoke','moderate','resolve_report','publish','pilot','purge') and not moderator then raise exception 'FORBIDDEN'; end if;
  if command in ('ask','reply','edit_topic','edit_reply','follow','seen','outcome','consent','useful','report') and (member.id is null or member.status<>'approved') then raise exception 'FORBIDDEN'; end if;

  if command in ('admit','revoke') then
    if length(coalesce(payload->>'reason',''))<3 then raise exception 'INVALID'; end if;
    update community_members set status=case when command='admit' then 'approved' else 'revoked' end,updated_at=now() where id=(payload->>'id')::uuid returning id into target;
    if target is null then raise exception 'NOT_FOUND'; end if;
  elsif command='purge' then
    delete from community_members m where m.status='pending' and m.created_at < now()-interval '90 days' and not exists(select 1 from community_topics t where t.author_id=m.id) and not exists(select 1 from community_replies r where r.author_id=m.id) and not exists(select 1 from community_reports r where r.member_id=m.id);
    delete from community_limits where expires_at<now();
    delete from community_requests where created_at<now()-interval '30 days';
  elsif command='pilot' then
    update community_pilot set started_on=nullif(payload->>'started_on','')::date,owner_name=left(trim(payload->>'owner_name'),80),weekly_hours=(payload->>'weekly_hours')::integer;
  elsif command='resolve_report' then
    if length(coalesce(payload->>'reason',''))<3 then raise exception 'INVALID'; end if;
    update community_reports set resolved=true,resolution=left(payload->>'reason',1000) where id=(payload->>'id')::uuid returning id into target;
    if target is null then raise exception 'NOT_FOUND'; end if;
  elsif command='ask' then
    if nullif(payload->>'alert_id','') is not null then
      source := community_alert_context((payload->>'alert_id')::uuid);
      if source is null then raise exception 'NOT_FOUND'; end if;
      if source->>'version' is distinct from payload->>'regulation_version' then raise exception 'CONFLICT'; end if;
    end if;
    insert into community_topics(author_id,title,body,category,region,municipality,alert_id,reference_snapshot)
      values(member.id,trim(payload->>'title'),trim(payload->>'body'),payload->>'category',payload->>'region',coalesce(payload->>'municipality',''),nullif(payload->>'alert_id','')::uuid,source) returning id into target;
    insert into community_follows values(member.id,target,now());
  else
    select * into topic from community_topics where id=(payload->>'topic_id')::uuid for update;
    if not found or (topic.hidden and not moderator) then raise exception 'NOT_FOUND'; end if;
    target:=topic.id;
    if command in ('edit_topic','outcome','consent','useful') and topic.author_id<>member.id then raise exception 'FORBIDDEN'; end if;
    if command='reply' then
      insert into community_replies(topic_id,author_id,body,kind,source_url,affiliation) values(topic.id,member.id,trim(payload->>'body'),payload->>'kind',coalesce(payload->>'source_url',''),coalesce(payload->>'affiliation','')) returning id into target;
    elsif command='edit_reply' then
      select * into reply from community_replies where id=(payload->>'id')::uuid and topic_id=topic.id and not hidden for update;
      if not found then raise exception 'NOT_FOUND'; end if;
      if reply.author_id<>member.id then raise exception 'FORBIDDEN'; end if;
      if reply.revision is distinct from (payload->>'revision')::integer then raise exception 'CONFLICT'; end if;
      update community_replies set body=trim(payload->>'body'),source_url=coalesce(payload->>'source_url',''),affiliation=coalesce(payload->>'affiliation',''),kind=payload->>'kind',useful=false,updated_at=now(),revision=revision+1 where id=reply.id;
      target:=reply.id;
    elsif command='edit_topic' then
      if topic.revision is distinct from (payload->>'revision')::integer then raise exception 'CONFLICT'; end if;
      update community_topics set title=trim(payload->>'title'),body=trim(payload->>'body'),category=payload->>'category',region=payload->>'region',municipality=coalesce(payload->>'municipality',''),updated_at=now(),revision=revision+1 where id=topic.id;
    elsif command='outcome' then
      update community_topics set outcome=trim(payload->>'outcome'),updated_at=now(),revision=revision+1 where id=topic.id;
    elsif command='consent' then
      update community_topics set reuse_consent=(payload->>'enabled')::boolean,revision=revision+1,updated_at=now() where id=topic.id;
    elsif command='useful' then
      update community_replies set useful=(payload->>'enabled')::boolean where id=(payload->>'id')::uuid and topic_id=topic.id and not hidden and author_id<>member.id returning id into target;
      if target is null then raise exception 'NOT_FOUND'; end if;
    elsif command='follow' then
      if (payload->>'enabled')::boolean then insert into community_follows values(member.id,topic.id,now()) on conflict do nothing;
      else delete from community_follows where member_id=member.id and topic_id=topic.id; end if;
    elsif command='seen' then
      update community_follows set seen_at=now() where member_id=member.id and topic_id=topic.id;
    elsif command='report' then
      if nullif(payload->>'reply_id','') is not null and not exists(select 1 from community_replies where id=(payload->>'reply_id')::uuid and topic_id=topic.id and not hidden) then raise exception 'NOT_FOUND'; end if;
      insert into community_reports(member_id,topic_id,reply_id,reason) values(member.id,topic.id,nullif(payload->>'reply_id','')::uuid,trim(payload->>'reason')) returning id into target;
    elsif command='moderate' then
      if length(coalesce(payload->>'reason',''))<3 then raise exception 'INVALID'; end if;
      if nullif(payload->>'reply_id','') is not null then
        update community_replies set hidden=(payload->>'hidden')::boolean,useful=false where id=(payload->>'reply_id')::uuid and topic_id=topic.id returning id into target;
        if target is null then raise exception 'NOT_FOUND'; end if;
      else update community_topics set hidden=(payload->>'hidden')::boolean where id=topic.id; end if;
    elsif command='publish' then
      if topic.hidden or not topic.reuse_consent then raise exception 'CONSENT_REQUIRED'; end if;
      if topic.revision is distinct from (payload->>'revision')::integer then raise exception 'CONFLICT'; end if;
      if topic.alert_id is not null then
        current_source := community_alert_context(topic.alert_id);
        if current_source is null then raise exception 'NOT_FOUND'; end if;
        if current_source->>'version' is distinct from payload->>'regulation_version' then raise exception 'CONFLICT'; end if;
      end if;
      insert into community_resources(topic_id,title,body,scope,source_url,source_revision,reviewer,regulation_version)
        values(topic.id,payload->>'title',payload->>'body',payload->>'scope',coalesce(payload->>'source_url',''),topic.revision,actor,current_source->>'version')
        on conflict(topic_id) do update set title=excluded.title,body=excluded.body,scope=excluded.scope,source_url=excluded.source_url,source_revision=excluded.source_revision,regulation_version=excluded.regulation_version,reviewer=actor,reviewed_at=now(),hidden=false;
    else raise exception 'INVALID'; end if;
  end if;
  if moderator and command in ('admit','revoke','moderate','resolve_report','publish','pilot','purge') then
    insert into community_audit(actor,action,target,reason) values(actor,command,target,coalesce(payload->>'reason',payload->>'scope',''));
  end if;
  if member.id is not null then update community_members set activated_at=coalesce(activated_at,now()),last_seen_at=now() where id=member.id; end if;
  result:=jsonb_build_object('ok',true,'id',target);
  insert into community_requests values(actor,req,command,result,now());
  return result;
end $$;
revoke all on function public.community_execute(uuid,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.community_execute(uuid,text,jsonb,text) to service_role;

commit;
