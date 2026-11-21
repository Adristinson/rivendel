-- Rivendel · módulo 2: recetario y menú semanal
-- Ejecutar una vez en Supabase → SQL Editor, después de schema.sql.

-- Recetas ----------------------------------------------------------------------

create table if not exists recipes (
  id uuid primary key,
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  url text,
  body text,
  image_path text,
  tags text[] not null default '{}',
  favorite boolean not null default false,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists recipe_ingredients (
  id uuid primary key,
  household_id uuid not null references households(id) on delete cascade,
  recipe_id uuid not null references recipes(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  qty numeric,
  unit text,
  raw text not null,
  sort int not null default 0
);

create index if not exists recipes_household on recipes(household_id);
create index if not exists recipe_ingredients_recipe on recipe_ingredients(recipe_id);

-- Menú semanal -----------------------------------------------------------------

create table if not exists menu_weeks (
  household_id uuid not null references households(id) on delete cascade,
  week_start date not null,
  status text not null default 'draft' check (status in ('draft', 'approved')),
  approved_at timestamptz,
  primary key (household_id, week_start)
);

create table if not exists menu_slots (
  household_id uuid not null references households(id) on delete cascade,
  week_start date not null,
  day int not null check (day between 0 and 6),
  meal text not null check (meal in ('comida', 'cena')),
  recipe_id uuid references recipes(id) on delete set null,
  text text,
  leftover boolean not null default false,  -- "sale para dos días": este hueco come lo del anterior
  updated_at timestamptz not null default now(),
  primary key (household_id, week_start, day, meal)
);

-- Seguridad --------------------------------------------------------------------

alter table recipes enable row level security;
alter table recipe_ingredients enable row level security;
alter table menu_weeks enable row level security;
alter table menu_slots enable row level security;

drop policy if exists "recetas: miembros" on recipes;
create policy "recetas: miembros" on recipes for all using (is_member(household_id)) with check (is_member(household_id));
drop policy if exists "ingredientes: miembros" on recipe_ingredients;
create policy "ingredientes: miembros" on recipe_ingredients for all using (is_member(household_id)) with check (is_member(household_id));
drop policy if exists "semanas: miembros" on menu_weeks;
create policy "semanas: miembros" on menu_weeks for all using (is_member(household_id)) with check (is_member(household_id));
drop policy if exists "huecos: miembros" on menu_slots;
create policy "huecos: miembros" on menu_slots for all using (is_member(household_id)) with check (is_member(household_id));

-- Fotos de recetas (privadas, una carpeta por hogar) ----------------------------

insert into storage.buckets (id, name, public)
values ('recetas', 'recetas', false)
on conflict (id) do nothing;

drop policy if exists "fotos recetas: leer" on storage.objects;
create policy "fotos recetas: leer" on storage.objects for select
  using (bucket_id = 'recetas' and is_member(((storage.foldername(name))[1])::uuid));
drop policy if exists "fotos recetas: subir" on storage.objects;
create policy "fotos recetas: subir" on storage.objects for insert
  with check (bucket_id = 'recetas' and is_member(((storage.foldername(name))[1])::uuid));
drop policy if exists "fotos recetas: borrar" on storage.objects;
create policy "fotos recetas: borrar" on storage.objects for delete
  using (bucket_id = 'recetas' and is_member(((storage.foldername(name))[1])::uuid));

-- Tiempo real --------------------------------------------------------------------

do $$ begin alter publication supabase_realtime add table recipes; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table recipe_ingredients; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table menu_weeks; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table menu_slots; exception when duplicate_object then null; end $$;
