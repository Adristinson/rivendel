-- Rivendel · tareas cada 3/6/12 meses con historial (filtro del agua) y congelador
-- Ejecutar una vez en Supabase → SQL Editor. Se puede repetir sin problema.

alter table todos drop constraint if exists todos_repeat_check;
alter table todos add constraint todos_repeat_check
  check (repeat in ('semanal', 'quincenal', 'mensual', 'trimestral', 'semestral', 'anual'));
alter table todos add column if not exists done_log date[] not null default '{}';

create table if not exists freezer (
  id uuid primary key,
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  portions int not null default 1 check (portions >= 0),
  frozen_on date not null default current_date,
  note text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists freezer_household on freezer(household_id);

alter table freezer enable row level security;
drop policy if exists "congelador: miembros" on freezer;
create policy "congelador: miembros" on freezer for all using (is_member(household_id)) with check (is_member(household_id));

do $$ begin alter publication supabase_realtime add table freezer; exception when duplicate_object then null; end $$;

-- Tarea del filtro del agua (cada 3 meses), si no existe ya
insert into todos (id, household_id, list, text, note, due, repeat, created_by)
select gen_random_uuid(), h.id, 'casa', 'Cambiar el filtro del agua', null, null, 'trimestral', 'Adri'
from households h
where not exists (select 1 from todos t where t.household_id = h.id and t.text ilike '%filtro%agua%');
