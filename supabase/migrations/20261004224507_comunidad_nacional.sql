-- Community is a server-only API. Never trust the legacy usuarios.rol for
-- community moderation. Only explicitly provisioned auth IDs can moderate.
begin;

create table public.community_moderators (
  auth_id uuid primary key references auth.users(id) on delete cascade
);
create table public.community_members (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid unique references auth.users(id) on delete set null,
  email text not null unique check (email = lower(trim(email)) and length(email) between 3 and 254),
  alias text not null check (length(alias) between 2 and 60),
  region text not null check (length(region) between 2 and 60),
  owner_kind text not null check (length(owner_kind) between 2 and 80),
  need text not null default '' check (length(need) <= 1000),
  status text not null default 'pending' check (status in ('pending','approved','revoked')),
  consent_version text not null default '2026-10-05',
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  last_seen_at timestamptz,
  updated_at timestamptz not null default now()
);
create table public.community_topics (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references community_members(id),
  title text not null check (length(title) between 8 and 160),
  body text not null check (length(body) between 20 and 6000),
  category text not null check (category in ('cuidar','alquilar','convivir','decidir')),
  region text not null check (length(region) between 2 and 60),
  outcome text not null default '' check (length(outcome) <= 3000),
  reuse_consent boolean not null default false,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision integer not null default 1
);
create table public.community_replies (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references community_topics(id) on delete cascade,
  author_id uuid not null references community_members(id),
  body text not null check (length(body) between 5 and 4000),
  kind text not null check (kind in ('experiencia','fuente','profesional')),
  source_url text not null default '' check (source_url = '' or source_url ~ '^https?://[^[:space:]]+$'),
  affiliation text not null default '' check (length(affiliation) <= 160),
  useful boolean not null default false,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision integer not null default 1,
  check (kind <> 'fuente' or length(source_url) between 10 and 1000),
  check (kind <> 'profesional' or length(affiliation) >= 3)
);
create table public.community_follows (
  member_id uuid references community_members(id) on delete cascade,
  topic_id uuid references community_topics(id) on delete cascade,
  seen_at timestamptz not null default now(),
  primary key(member_id,topic_id)
);
create table public.community_reports (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references community_members(id),
  topic_id uuid not null references community_topics(id) on delete cascade,
  reply_id uuid references community_replies(id) on delete cascade,
  reason text not null check(length(reason) between 8 and 1000),
  resolved boolean not null default false,
  resolution text not null default '',
  created_at timestamptz not null default now()
);
create table public.community_resources (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null unique references community_topics(id),
  title text not null check(length(title) between 8 and 160),
  body text not null check(length(body) between 20 and 6000),
  scope text not null check(length(scope) between 10 and 1000),
  source_url text not null default '' check (source_url = '' or source_url ~ '^https?://[^[:space:]]+$'),
  source_revision integer not null,
  reviewer uuid not null references auth.users(id),
  reviewed_at timestamptz not null default now(),
  hidden boolean not null default false
);
create table public.community_audit (
  id bigint generated always as identity primary key,
  actor uuid not null,
  action text not null,
  target uuid,
  reason text not null default '',
  created_at timestamptz not null default now()
);
create table public.community_limits (
  bucket text primary key,
  hits integer not null,
  expires_at timestamptz not null
);
create table public.community_requests (
  actor uuid not null,
  request_id uuid not null,
  action text not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key(actor,request_id)
);
create table public.community_pilot (
  id boolean primary key default true check(id),
  started_on date,
  owner_name text not null default '',
  weekly_hours integer not null default 5 check(weekly_hours between 1 and 40)
);
insert into community_pilot(id) values(true);
create index community_topics_recent on community_topics(created_at desc) where not hidden;
create index community_replies_topic on community_replies(topic_id,created_at);
create index community_reports_pending on community_reports(created_at) where not resolved;
create index community_members_status on community_members(status);
create index community_topics_author on community_topics(author_id);
create index community_replies_author on community_replies(author_id);
create index community_follows_topic on community_follows(topic_id);
create index community_reports_member on community_reports(member_id);
create index community_reports_topic on community_reports(topic_id);
create index community_reports_reply on community_reports(reply_id);
create index community_resources_reviewer on community_resources(reviewer);
create index community_limits_expiry on community_limits(expires_at);
create index community_requests_age on community_requests(created_at);

do $$ declare t text; begin
  foreach t in array array['moderators','members','topics','replies','follows','reports','resources','audit','limits','requests','pilot'] loop
    execute format('alter table public.community_%I enable row level security',t);
    execute format('revoke all on public.community_%I from public, anon, authenticated',t);
    execute format('grant all on public.community_%I to service_role',t);
  end loop;
end $$;
grant usage,select on sequence public.community_audit_id_seq to service_role;

create function public.community_execute(actor uuid, command text, payload jsonb default '{}', rate_key text default '')
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  account auth.users%rowtype; member community_members%rowtype;
  topic community_topics%rowtype; reply community_replies%rowtype;
  moderator boolean := false; result jsonb; target uuid; req uuid;
  n integer; p integer; topics_json jsonb; resources_json jsonb;
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

  if command = 'admin' then
    if not moderator then raise exception 'FORBIDDEN'; end if;
    return jsonb_build_object('members',coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at desc) from (select * from community_members where (coalesce(payload->>'status','')='' or status=payload->>'status') order by created_at desc limit 50 offset greatest(0,least(1000,coalesce((payload->>'page')::integer,0)))*50) m),'[]'::jsonb),
      'member_count',(select count(*) from community_members where (coalesce(payload->>'status','')='' or status=payload->>'status')),
      'hidden',coalesce((select jsonb_agg(to_jsonb(h)) from (select id,title from community_topics where hidden order by updated_at desc limit 100) h),'[]'::jsonb),
      'reports',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at) from (select * from community_reports where not resolved order by created_at limit 100) r),'[]'::jsonb),
      'review',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'title',t.title,'body',t.body,'outcome',t.outcome,'region',t.region,'revision',t.revision,'alias',m.alias)) from (select t0.* from community_topics t0 where t0.reuse_consent and not t0.hidden and not exists(select 1 from community_resources r0 where r0.topic_id=t0.id and r0.source_revision=t0.revision and not r0.hidden) order by t0.updated_at limit 100) t join community_members m on m.id=t.author_id),'[]'::jsonb),
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
      and (coalesce(payload->>'q','')='' or strpos(lower(t.title||' '||t.body),lower(payload->>'q'))>0)
      and (coalesce(payload->>'following','')<>'true' or exists(select 1 from community_follows f where f.topic_id=t.id and f.member_id=member.id))
      order by t.created_at desc,t.id limit 21 offset p*20
    ) x;
    select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into resources_json from (
      select r.id,r.topic_id,r.title,r.body,r.scope,r.source_url,r.reviewed_at,t.region,m.alias
      from community_resources r join community_topics t on t.id=r.topic_id join community_members m on m.id=t.author_id
      where not r.hidden and not t.hidden and t.reuse_consent and r.source_revision=t.revision order by r.reviewed_at desc,r.id limit 21 offset p*20
    ) x;
    return jsonb_build_object('status','approved','moderator',moderator,'member',case when member.id is null then null else jsonb_build_object('id',member.id,'alias',member.alias) end,'topics',topics_json,'resources',resources_json,'page',p,'pilot',(select to_jsonb(s) from community_pilot s));
  end if;

  if command = 'topic' then
    p := greatest(0,least(1000,coalesce((payload->>'page')::integer,0)));
    select * into topic from community_topics where id=(payload->>'id')::uuid and (not hidden or moderator);
    if not found then raise exception 'NOT_FOUND'; end if;
    return jsonb_build_object('topic',to_jsonb(topic)||jsonb_build_object('alias',(select alias from community_members where id=topic.author_id)),
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
    insert into community_topics(author_id,title,body,category,region) values(member.id,trim(payload->>'title'),trim(payload->>'body'),payload->>'category',payload->>'region') returning id into target;
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
      update community_topics set title=trim(payload->>'title'),body=trim(payload->>'body'),category=payload->>'category',region=payload->>'region',updated_at=now(),revision=revision+1 where id=topic.id;
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
      insert into community_resources(topic_id,title,body,scope,source_url,source_revision,reviewer)
        values(topic.id,payload->>'title',payload->>'body',payload->>'scope',coalesce(payload->>'source_url',''),topic.revision,actor)
        on conflict(topic_id) do update set title=excluded.title,body=excluded.body,scope=excluded.scope,source_url=excluded.source_url,source_revision=excluded.source_revision,reviewer=actor,reviewed_at=now(),hidden=false;
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
