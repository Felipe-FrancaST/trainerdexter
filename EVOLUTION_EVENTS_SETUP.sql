-- Execute uma única vez no SQL Editor do Supabase.
create table if not exists public.trainerdex_evolution_events (
 id uuid primary key,
 trainer_id text not null,
 old_pokemon_id integer not null,
 new_pokemon_id integer not null,
 level integer not null default 1,
 consumed boolean not null default false,
 created_at timestamptz not null default now()
);
create index if not exists trainerdex_evolution_events_pending_idx
 on public.trainerdex_evolution_events (trainer_id, consumed, created_at);
alter table public.trainerdex_evolution_events enable row level security;
drop policy if exists trainerdex_evolution_events_access on public.trainerdex_evolution_events;
create policy trainerdex_evolution_events_access on public.trainerdex_evolution_events
 for all to anon, authenticated using (true) with check (true);
grant select,insert,update on public.trainerdex_evolution_events to anon, authenticated;
