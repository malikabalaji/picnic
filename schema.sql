-- SnapBack database schema for Supabase.
-- Paste this whole file into Supabase > SQL Editor > New query, then press Run.
-- Safe to run once on a new project.

create extension if not exists pgcrypto with schema extensions;

-- ---------- tables ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  avatar_url text,
  onboarded boolean not null default false,
  age_confirmed boolean not null default false,
  recognition boolean not null default false,
  reception boolean not null default true,
  paused boolean not null default false,
  strictness text not null default 'balanced' check (strictness in ('strict','balanced','relaxed')),
  blocked uuid[] not null default '{}',
  notif_seen_at timestamptz not null default 'epoch',
  created_at timestamptz not null default now()
);

create table public.face_samples (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  embedding real[] not null check (array_length(embedding, 1) = 128),
  created_at timestamptz not null default now()
);
create index face_samples_user on public.face_samples(user_id);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 80),
  start_date date not null,
  end_date date not null,
  location text not null default '',
  organizer_id uuid not null references public.profiles(id) on delete cascade,
  token text unique,
  token_issued_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active','paused','ended','deleted')),
  join_approval boolean not null default true,
  photo_approval boolean not null default false,
  auto_delivery boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.event_participants (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('pending','approved','removed','left')),
  receive boolean not null default false,
  consent boolean not null default false,
  role text not null default 'guest',
  joined_at timestamptz not null default now(),
  approved_at timestamptz,
  primary key (event_id, user_id)
);
create index event_participants_user on public.event_participants(user_id);

create table public.photos (
  id uuid primary key,
  event_id uuid not null references public.events(id) on delete cascade,
  uploader_id uuid not null references public.profiles(id) on delete cascade,
  path text not null,
  thumb_path text not null,
  width int,
  height int,
  hash text,
  faces int,
  taken_at timestamptz,
  created_at timestamptz not null default now(),
  sharing boolean not null default true,
  require_approval boolean not null default false,
  excluded uuid[] not null default '{}',
  unique (event_id, uploader_id, hash)
);
create index photos_event on public.photos(event_id);

-- Face signatures found in shared photos. Never readable by any user.
-- Kept only while the event is active so late joiners can be matched; deleted when it ends.
create table public.photo_faces (
  id bigserial primary key,
  photo_id uuid not null references public.photos(id) on delete cascade,
  embedding real[] not null check (array_length(embedding, 1) = 128)
);
create index photo_faces_photo on public.photo_faces(photo_id);

create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.photos(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  uploader_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  distance real not null,
  status text not null check (status in ('pending','delivered','declined','rejected','reported','removal_requested')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (photo_id, recipient_id)
);
create index deliveries_recipient on public.deliveries(recipient_id);
create index deliveries_uploader on public.deliveries(uploader_id);

create table public.consent_records (
  id bigserial primary key,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  type text not null,
  status text not null,
  at timestamptz not null default now()
);

create table public.albums (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  name text not null check (length(name) between 1 and 40),
  photo_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.reports (
  id bigserial primary key,
  reporter_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  delivery_id uuid references public.deliveries(id) on delete set null,
  photo_id uuid,
  reason text not null,
  created_at timestamptz not null default now()
);

-- ---------- helpers (run with owner rights, used by security rules) ----------
create function public.is_organizer(e uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from events where id = e and organizer_id = auth.uid())
$$;

create function public.member_status(e uuid) returns text
language sql stable security definer set search_path = public as $$
  select status from event_participants where event_id = e and user_id = auth.uid()
$$;

create function public.shares_event(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from event_participants a
    join event_participants b on a.event_id = b.event_id
    where a.user_id = auth.uid() and b.user_id = other
      and a.status in ('approved','pending') and b.status in ('approved','pending'))
$$;

create function public.can_upload(e uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from events ev where ev.id = e and ev.status = 'active'
      and (ev.organizer_id = auth.uid() or exists (
        select 1 from event_participants p where p.event_id = e and p.user_id = auth.uid() and p.status = 'approved')))
$$;

create function public.can_view_photo(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from photos ph join events ev on ev.id = ph.event_id
    where ph.id = p and ev.status <> 'deleted'
      and (ph.uploader_id = auth.uid()
        or (ph.sharing and not (ph.uploader_id = any (coalesce((select blocked from profiles where id = auth.uid()), '{}')))
            and exists (select 1 from deliveries d where d.photo_id = ph.id and d.recipient_id = auth.uid() and d.status = 'delivered'))))
$$;

create function public.can_view_object(object_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from photos where (path = object_name or thumb_path = object_name) and public.can_view_photo(id))
$$;

create function public.l2(a real[], b real[]) returns real
language sql immutable parallel safe as $$
  select sqrt(sum((x - y) * (x - y)))::real from unnest(a, b) as t(x, y)
$$;

create function public.new_token() returns text
language plpgsql volatile set search_path = public, extensions as $$
declare alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; b bytea := gen_random_bytes(8); t text := ''; i int;
begin
  for i in 0..7 loop t := t || substr(alphabet, (get_byte(b, i) % 32) + 1, 1); end loop;
  return t;
end $$;

-- Core matching. Compares faces in shared photos with the face profiles of consenting,
-- approved participants of the same event. Never callable directly by users.
create function public.run_matching(p_photo uuid, p_event uuid, p_user uuid) returns int
language sql volatile security definer set search_path = public as $$
  with ins as (
    insert into deliveries (photo_id, event_id, uploader_id, recipient_id, distance, status)
    select ph.id, ph.event_id, ph.uploader_id, ep.user_id, m.d,
           case when ph.require_approval or ev.photo_approval then 'pending' else 'delivered' end
    from photos ph
    join events ev on ev.id = ph.event_id and ev.status = 'active' and ev.auto_delivery
    join event_participants ep on ep.event_id = ph.event_id and ep.status = 'approved'
         and ep.receive and ep.consent and ep.user_id <> ph.uploader_id
    join profiles pr on pr.id = ep.user_id and pr.recognition and pr.reception and not pr.paused
         and not (ph.uploader_id = any (pr.blocked))
    cross join lateral (
      select min(public.l2(f.embedding, s.embedding)) as d
      from photo_faces f join face_samples s on s.user_id = ep.user_id
      where f.photo_id = ph.id) m
    where ph.sharing and not (ep.user_id = any (ph.excluded))
      and (p_photo is null or ph.id = p_photo)
      and (p_event is null or ph.event_id = p_event)
      and (p_user is null or ep.user_id = p_user)
      and m.d < case pr.strictness when 'strict' then 0.42 when 'relaxed' then 0.54 else 0.48 end
    on conflict (photo_id, recipient_id) do nothing
    returning 1)
  select count(*)::int from ins
$$;
revoke execute on function public.run_matching(uuid, uuid, uuid) from public, anon, authenticated;

-- ---------- actions the app calls ----------
create function public.create_event(p_name text, p_start date, p_end date, p_location text,
  p_join_approval boolean, p_photo_approval boolean, p_auto boolean, p_match_me boolean) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare e uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  insert into events (name, start_date, end_date, location, organizer_id, token, join_approval, photo_approval, auto_delivery)
  values (trim(p_name), p_start, greatest(p_end, p_start), coalesce(trim(p_location), ''), auth.uid(), new_token(),
          p_join_approval, p_photo_approval, p_auto)
  returning id into e;
  insert into event_participants (event_id, user_id, status, receive, consent, role, approved_at)
  values (e, auth.uid(), 'approved', p_match_me, p_match_me, 'organiser', now());
  return e;
end $$;

create function public.revoke_token(p_event uuid) returns text
language plpgsql volatile security definer set search_path = public as $$
declare t text := new_token();
begin
  update events set token = t, token_issued_at = now() where id = p_event and organizer_id = auth.uid();
  if not found then raise exception 'Only the organiser can do this'; end if;
  return t;
end $$;

create function public.find_event(p_token text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('id', e.id, 'name', e.name, 'start_date', e.start_date, 'end_date', e.end_date,
    'location', e.location, 'organizer_name', pr.name, 'join_approval', e.join_approval,
    'photo_approval', e.photo_approval, 'my_status', public.member_status(e.id))
  from events e join profiles pr on pr.id = e.organizer_id
  where auth.uid() is not null and e.status in ('active','paused') and e.token is not null
    and e.token = upper(regexp_replace(coalesce(p_token, ''), '[^A-Za-z0-9]', '', 'g'))
$$;

create function public.join_event(p_token text, p_receive boolean) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare e events; st text; existing text;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select * into e from events where token = upper(regexp_replace(coalesce(p_token, ''), '[^A-Za-z0-9]', '', 'g'))
    and status in ('active','paused');
  if not found then raise exception 'No active event uses that code'; end if;
  select status into existing from event_participants where event_id = e.id and user_id = auth.uid();
  if existing = 'removed' then raise exception 'The organiser removed you from this event'; end if;
  if existing in ('approved','pending') then return e.id; end if;
  st := case when e.join_approval then 'pending' else 'approved' end;
  insert into event_participants (event_id, user_id, status, receive, consent, approved_at)
  values (e.id, auth.uid(), st, p_receive, p_receive, case when st = 'approved' then now() end)
  on conflict (event_id, user_id) do update set status = excluded.status, receive = excluded.receive,
    consent = excluded.consent, joined_at = now(), approved_at = excluded.approved_at;
  if st = 'approved' and p_receive then perform run_matching(null, e.id, auth.uid()); end if;
  return e.id;
end $$;

create function public.set_receive(p_event uuid, p_receive boolean) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  update event_participants set receive = p_receive, consent = p_receive
  where event_id = p_event and user_id = auth.uid() and status in ('approved','pending');
  if p_receive then perform run_matching(null, p_event, auth.uid()); end if;
end $$;

create function public.leave_event(p_event uuid) returns void
language sql volatile security definer set search_path = public as $$
  update event_participants set status = 'left', receive = false, consent = false
  where event_id = p_event and user_id = auth.uid() and role <> 'organiser'
$$;

create function public.decide_member(p_event uuid, p_user uuid, p_status text) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  if not is_organizer(p_event) then raise exception 'Only the organiser can do this'; end if;
  if p_status not in ('approved','removed') or p_user = auth.uid() then raise exception 'Not allowed'; end if;
  update event_participants set status = p_status,
    approved_at = case when p_status = 'approved' then now() else approved_at end
  where event_id = p_event and user_id = p_user;
  if p_status = 'approved' then perform run_matching(null, p_event, p_user); end if;
end $$;

create function public.delete_event(p_event uuid) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  update events set status = 'deleted', token = null where id = p_event and organizer_id = auth.uid();
  if not found then raise exception 'Only the organiser can do this'; end if;
end $$;

create function public.add_photo_faces(p_photo uuid, p_faces jsonb) returns int
language plpgsql volatile security definer set search_path = public as $$
declare ph photos;
begin
  select * into ph from photos where id = p_photo and uploader_id = auth.uid();
  if not found or not can_upload(ph.event_id) then raise exception 'Not allowed'; end if;
  if jsonb_typeof(p_faces) <> 'array' or jsonb_array_length(p_faces) > 60 then raise exception 'Too many faces'; end if;
  delete from photo_faces where photo_id = p_photo;
  insert into photo_faces (photo_id, embedding)
  select p_photo, array(select x::real from jsonb_array_elements_text(f) with ordinality t(x, n) order by n)
  from jsonb_array_elements(p_faces) f;
  update photos set faces = jsonb_array_length(p_faces) where id = p_photo;
  return run_matching(p_photo, null, null);
end $$;

create function public.rematch_photo(p_photo uuid) returns int
language plpgsql volatile security definer set search_path = public as $$
begin
  if not exists (select 1 from photos where id = p_photo and uploader_id = auth.uid()) then raise exception 'Not allowed'; end if;
  return run_matching(p_photo, null, null);
end $$;

create function public.save_face_profile(p_samples jsonb) returns int
language plpgsql volatile security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if jsonb_typeof(p_samples) <> 'array' or jsonb_array_length(p_samples) not between 3 and 5 then
    raise exception 'Provide 3 to 5 face samples'; end if;
  delete from face_samples where user_id = auth.uid();
  insert into face_samples (user_id, embedding)
  select auth.uid(), array(select x::real from jsonb_array_elements_text(f) with ordinality t(x, n) order by n)
  from jsonb_array_elements(p_samples) f;
  update profiles set recognition = true where id = auth.uid();
  return run_matching(null, null, auth.uid());
end $$;

create function public.delete_face_profile() returns void
language sql volatile security definer set search_path = public as $$
  delete from face_samples where user_id = auth.uid();
  update profiles set recognition = false where id = auth.uid();
$$;

create function public.rematch_me() returns int
language sql volatile security definer set search_path = public as $$
  select run_matching(null, null, auth.uid())
$$;

create function public.respond_delivery(p_id uuid, p_status text) returns void
language plpgsql volatile security definer set search_path = public as $$
declare d deliveries;
begin
  select * into d from deliveries where id = p_id;
  if not found then raise exception 'Not found'; end if;
  if d.uploader_id = auth.uid() and p_status in ('delivered','declined') and d.status in ('pending','delivered','declined') then
    update deliveries set status = p_status, updated_at = now() where id = p_id;
  elsif d.recipient_id = auth.uid() and p_status in ('rejected','reported','removal_requested') and d.status = 'delivered' then
    update deliveries set status = p_status, updated_at = now() where id = p_id;
  else
    raise exception 'Not allowed';
  end if;
end $$;

create function public.delete_my_account() returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  delete from auth.users where id = auth.uid();
end $$;

-- ---------- triggers ----------
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
          new.raw_user_meta_data->>'avatar_url');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.on_event_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status in ('ended','deleted') then
    delete from photo_faces f using photos p where p.id = f.photo_id and p.event_id = new.id;
  elsif new.status = 'active' and old.status = 'paused' then
    perform run_matching(null, new.id, null);
  end if;
  return new;
end $$;
create trigger events_status after update of status on public.events
  for each row when (old.status is distinct from new.status) execute function public.on_event_status();

-- Photos can't be moved between events after upload.
create function public.photos_lock() returns trigger language plpgsql as $$
begin
  if new.event_id <> old.event_id or new.uploader_id <> old.uploader_id or new.path <> old.path or new.thumb_path <> old.thumb_path then
    raise exception 'These fields cannot change';
  end if;
  return new;
end $$;
create trigger photos_lock before update on public.photos for each row execute function public.photos_lock();

-- ---------- row level security ----------
alter table public.profiles enable row level security;
alter table public.face_samples enable row level security;
alter table public.events enable row level security;
alter table public.event_participants enable row level security;
alter table public.photos enable row level security;
alter table public.photo_faces enable row level security;
alter table public.deliveries enable row level security;
alter table public.consent_records enable row level security;
alter table public.albums enable row level security;
alter table public.reports enable row level security;

create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_event(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy face_read_own on public.face_samples for select to authenticated using (user_id = auth.uid());

create policy events_read on public.events for select to authenticated
  using (status <> 'deleted' and (organizer_id = auth.uid() or public.member_status(id) in ('approved','pending')));
create policy events_update on public.events for update to authenticated
  using (organizer_id = auth.uid() and status <> 'deleted')
  with check (organizer_id = auth.uid() and status in ('active','paused','ended'));

create policy participants_read on public.event_participants for select to authenticated
  using (user_id = auth.uid() or public.is_organizer(event_id) or public.member_status(event_id) = 'approved');

create policy photos_read on public.photos for select to authenticated using (public.can_view_photo(id));
create policy photos_insert on public.photos for insert to authenticated
  with check (uploader_id = auth.uid() and public.can_upload(event_id) and path like event_id::text || '/%' and thumb_path like event_id::text || '/%');
create policy photos_update on public.photos for update to authenticated
  using (uploader_id = auth.uid()) with check (uploader_id = auth.uid());
create policy photos_delete on public.photos for delete to authenticated using (uploader_id = auth.uid());

-- photo_faces: no policies, so no user can read or write it directly.

create policy deliveries_read on public.deliveries for select to authenticated
  using (uploader_id = auth.uid() or (recipient_id = auth.uid() and status not in ('pending','declined')));

create policy consent_read on public.consent_records for select to authenticated using (user_id = auth.uid());
create policy consent_insert on public.consent_records for insert to authenticated with check (user_id = auth.uid());

create policy albums_all on public.albums for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy reports_insert on public.reports for insert to authenticated with check (reporter_id = auth.uid());

-- ---------- photo storage (private bucket) ----------
insert into storage.buckets (id, name, public) values ('photos', 'photos', false) on conflict (id) do nothing;

create policy "snapback upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and public.can_upload(((storage.foldername(name))[1])::uuid));
create policy "snapback read" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and public.can_view_object(name));
create policy "snapback delete" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and owner_id = (select auth.uid())::text);
