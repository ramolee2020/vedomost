create extension if not exists pgcrypto with schema extensions;

create table if not exists ved_secret (id int primary key default 1, code_hash text not null);
alter table ved_secret enable row level security;   -- без политик: anon не видит

create or replace function ved_club_ok() returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from ved_secret where code_hash =
    encode(digest(coalesce(current_setting('request.headers', true)::json->>'x-club-code', ''), 'sha256'), 'hex'))
$$;
grant execute on function ved_club_ok() to anon;

create table if not exists ved_groups    (id text primary key, name text not null, sort int not null default 0, updated_at timestamptz not null, deleted boolean not null default false);
create table if not exists ved_exercises (id text primary key, group_id text not null, name text not null, unit text not null, sort int not null default 0, updated_at timestamptz not null, deleted boolean not null default false);
create table if not exists ved_athletes  (id text primary key, group_id text not null, full_name text not null, updated_at timestamptz not null, deleted boolean not null default false);
create table if not exists ved_sessions  (id text primary key, group_id text not null, date date not null, updated_at timestamptz not null, deleted boolean not null default false);
create table if not exists ved_results   (id text primary key, session_id text not null, athlete_id text not null, exercise_id text not null, value numeric, updated_by text not null default '', updated_at timestamptz not null, deleted boolean not null default false);

do $$ declare t text; begin
  foreach t in array array['ved_groups','ved_exercises','ved_athletes','ved_sessions','ved_results'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists club on %I', t);
    execute format('create policy club on %I for all to anon using (ved_club_ok()) with check (ved_club_ok())', t);
    execute format('grant select, insert, update on %I to anon', t);
  end loop; end $$;

-- сид: 3 группы и упражнения из бумажного плана
insert into ved_groups values
 ('g45','4,5–5,5 лет',1,now(),false),('g67','6–7 лет',2,now(),false),('g89','8–9 лет',3,now(),false)
on conflict do nothing;
insert into ved_exercises values
 ('g45-1','g45','Отжимания от пола','раз',1,now(),false),('g45-2','g45','Прыжок в длину с места','м',2,now(),false),
 ('g45-3','g45','Вис на кимоно','сек',3,now(),false),('g45-4','g45','Пресс лёжа на полу','раз',4,now(),false),
 ('g67-1','g67','Отжимания','раз',1,now(),false),('g67-2','g67','Прыжок в длину с места','м',2,now(),false),
 ('g67-3','g67','Подтягивание на кимоно','раз',3,now(),false),('g67-4','g67','Пресс в висе','раз',4,now(),false),
 ('g67-5','g67','Стойка на руках','сек',5,now(),false),('g67-6','g67','Столб','сек',6,now(),false),
 ('g89-1','g89','Отжимания (кулаки)','раз',1,now(),false),('g89-2','g89','Отжимания (пальцы)','раз',2,now(),false),
 ('g89-3','g89','Прыжок в длину с места','м',3,now(),false),('g89-4','g89','Подтягивание на кимоно','раз',4,now(),false),
 ('g89-5','g89','Пресс в висе','раз',5,now(),false),('g89-6','g89','Канат','раз',6,now(),false),
 ('g89-7','g89','Спина','раз',7,now(),false),('g89-8','g89','Пистолетики','раз',8,now(),false)
on conflict do nothing;
-- код клуба задаётся отдельно (не в репозитории):
-- insert into ved_secret values (1, encode(extensions.digest('<КОД>','sha256'),'hex')) on conflict (id) do update set code_hash = excluded.code_hash;
