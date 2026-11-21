-- Rivendel · esquema de base de datos (módulo 1: lista de la compra)
-- Ejecutar una sola vez en Supabase → SQL Editor → New query → pegar → Run.

create extension if not exists pgcrypto;

-- Hogar y miembros -----------------------------------------------------------

create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 6)),
  created_at timestamptz not null default now()
);

create table if not exists members (
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

-- ¿Pertenece el usuario actual a este hogar? (security definer para evitar recursión en RLS)
create or replace function is_member(h uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where household_id = h and user_id = auth.uid());
$$;

-- Catálogo ---------------------------------------------------------------------

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  sort int not null default 0,
  color text not null default 'gray'
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  category_id uuid references categories(id) on delete set null,
  is_staple boolean not null default false,
  times_bought int not null default 0,
  last_bought_at timestamptz,
  created_at timestamptz not null default now(),
  unique (household_id, name)
);

-- Lista de la compra -----------------------------------------------------------

create table if not exists list_items (
  id uuid primary key,              -- lo genera el móvil, para funcionar sin conexión
  household_id uuid not null references households(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  qty numeric not null default 1,
  note text,
  bought boolean not null default false,
  bought_at timestamptz,
  source text not null default 'manual' check (source in ('manual', 'menu')),
  added_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists list_items_household on list_items(household_id);
create index if not exists products_household on products(household_id);

-- Seguridad: solo los miembros del hogar ven y tocan sus datos ----------------

alter table households enable row level security;
alter table members enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table list_items enable row level security;

drop policy if exists "hogar: miembros leen" on households;
create policy "hogar: miembros leen" on households for select using (is_member(id));
drop policy if exists "hogar: miembros editan" on households;
create policy "hogar: miembros editan" on households for update using (is_member(id));

drop policy if exists "miembros: ver los del hogar" on members;
create policy "miembros: ver los del hogar" on members for select using (is_member(household_id));
drop policy if exists "miembros: editar el propio" on members;
create policy "miembros: editar el propio" on members for update using (user_id = auth.uid());

drop policy if exists "categorias: miembros" on categories;
create policy "categorias: miembros" on categories for all using (is_member(household_id)) with check (is_member(household_id));
drop policy if exists "productos: miembros" on products;
create policy "productos: miembros" on products for all using (is_member(household_id)) with check (is_member(household_id));
drop policy if exists "lista: miembros" on list_items;
create policy "lista: miembros" on list_items for all using (is_member(household_id)) with check (is_member(household_id));

-- Crear hogar con catálogo inicial ---------------------------------------------

create or replace function create_household(p_name text, p_display_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  h uuid;
  c_fv uuid; c_lac uuid; c_car uuid; c_pan uuid; c_des uuid;
begin
  if auth.uid() is null then raise exception 'Hace falta iniciar sesión'; end if;
  insert into households(name) values (p_name) returning id into h;
  insert into members(household_id, user_id, display_name) values (h, auth.uid(), p_display_name);

  insert into categories(household_id, name, sort, color) values (h, 'Fruta y verdura', 1, 'green') returning id into c_fv;
  insert into categories(household_id, name, sort, color) values (h, 'Lácteos', 2, 'blue') returning id into c_lac;
  insert into categories(household_id, name, sort, color) values (h, 'Carne', 3, 'red') returning id into c_car;
  insert into categories(household_id, name, sort, color) values (h, 'Panadería', 4, 'amber') returning id into c_pan;
  insert into categories(household_id, name, sort, color) values (h, 'Despensa', 5, 'purple') returning id into c_des;
  insert into categories(household_id, name, sort, color) values (h, 'Limpieza y hogar', 6, 'teal');
  insert into categories(household_id, name, sort, color) values (h, 'Otros', 99, 'gray');

  insert into products(household_id, name, category_id, is_staple) values
    (h, 'Aguacate', c_fv, false), (h, 'Naranjas', c_fv, false), (h, 'Ensaladas', c_fv, false),
    (h, 'Zanahoria', c_fv, false), (h, 'Brócoli', c_fv, false), (h, 'Espinacas', c_fv, false),
    (h, 'Cebolla', c_fv, false), (h, 'Tomate', c_fv, false), (h, 'Patata', c_fv, false),
    (h, 'Ajo', c_fv, false),
    (h, 'Leche', c_lac, false), (h, 'Kéfir', c_lac, false), (h, 'Yogur', c_lac, false), (h, 'Queso', c_lac, false),
    (h, 'Pollo', c_car, false), (h, 'Hamburguesa', c_car, false),
    (h, 'Pan', c_pan, false),
    (h, 'Aceite', c_des, true), (h, 'Pasta de lentejas', c_des, false);
  return h;
end;
$$;

-- Unirse a un hogar con el código de invitación ------------------------------

create or replace function join_household(p_code text, p_display_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare h uuid;
begin
  if auth.uid() is null then raise exception 'Hace falta iniciar sesión'; end if;
  select id into h from households where invite_code = upper(trim(p_code));
  if h is null then raise exception 'Código no válido'; end if;
  insert into members(household_id, user_id, display_name) values (h, auth.uid(), p_display_name)
    on conflict (household_id, user_id) do nothing;
  return h;
end;
$$;

-- Registrar compra (para los habituales) ---------------------------------------

create or replace function mark_bought(p_product uuid) returns void
language sql security invoker set search_path = public as $$
  update products set times_bought = times_bought + 1, last_bought_at = now() where id = p_product;
$$;

-- Mantener el proyecto activo (lo llama la tarea semanal) -----------------------

create or replace function keep_alive() returns text
language sql security definer set search_path = public as $$ select 'ok'::text; $$;
grant execute on function keep_alive() to anon;

-- Tiempo real --------------------------------------------------------------------

do $$ begin
  alter publication supabase_realtime add table list_items;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table products;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table categories;
exception when duplicate_object then null; end $$;
