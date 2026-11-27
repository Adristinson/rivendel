-- Rivendel · mapa de sitios visitados
create table if not exists places (
  id uuid primary key,
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  detail text,
  country text,
  lat double precision not null,
  lng double precision not null,
  visited_on date,
  note text,
  trip_id uuid references trips(id) on delete set null,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists places_household on places(household_id);
alter table places enable row level security;
drop policy if exists "mapa: miembros" on places;
create policy "mapa: miembros" on places for all using (is_member(household_id)) with check (is_member(household_id));
do $$ begin alter publication supabase_realtime add table places; exception when duplicate_object then null; end $$;
select count(*) as sitios from places;
