-- Rivendel · módulo 4: pendientes (casa, comprar) e ideas y planes
-- Ejecutar una vez en Supabase → SQL Editor.

create table if not exists todos (
  id uuid primary key,
  household_id uuid not null references households(id) on delete cascade,
  list text not null check (list in ('casa', 'comprar', 'ideas')),
  text text not null,
  note text,
  due date,
  repeat text check (repeat in ('semanal', 'quincenal', 'mensual')),
  tags text[] not null default '{}',
  done boolean not null default false,
  done_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists todos_household on todos(household_id);

alter table todos enable row level security;
drop policy if exists "pendientes: miembros" on todos;
create policy "pendientes: miembros" on todos for all using (is_member(household_id)) with check (is_member(household_id));

do $$ begin alter publication supabase_realtime add table todos; exception when duplicate_object then null; end $$;
