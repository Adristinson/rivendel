-- Rivendel · viajes y maletas, gastos anuales, congelador en el menú y avisos al móvil
-- Ejecutar una vez en Supabase → SQL Editor. Se puede repetir sin problema.

-- Gastos anuales: son tareas de la lista 'pagos' con importe -------------------------
alter table todos drop constraint if exists todos_list_check;
alter table todos add constraint todos_list_check check (list in ('casa', 'comprar', 'ideas', 'pagos'));
alter table todos add column if not exists amount numeric(10, 2);
alter table todos add column if not exists notify boolean not null default false;
update todos set notify = true where text ilike '%filtro%agua%';

-- Congelador en el menú ---------------------------------------------------------------
alter table menu_slots add column if not exists freezer_id uuid references freezer(id) on delete set null;
alter table menu_slots add column if not exists freezer_taken boolean not null default false;

-- Viajes y maletas --------------------------------------------------------------------
create table if not exists pack_template (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  who text not null check (who in ('comun', 'adri', 'almu', 'lorenzo', 'salida')),
  types text[] not null default '{}',
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists trips (
  id uuid primary key,
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  start_date date,
  end_date date,
  types text[] not null default '{}',
  note text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists trip_items (
  id uuid primary key,
  household_id uuid not null references households(id) on delete cascade,
  trip_id uuid not null references trips(id) on delete cascade,
  name text not null,
  who text not null check (who in ('comun', 'adri', 'almu', 'lorenzo', 'salida')),
  done boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pack_template_household on pack_template(household_id);
create index if not exists trips_household on trips(household_id);
create index if not exists trip_items_trip on trip_items(trip_id);

alter table pack_template enable row level security;
alter table trips enable row level security;
alter table trip_items enable row level security;
drop policy if exists "plantilla: miembros" on pack_template;
create policy "plantilla: miembros" on pack_template for all using (is_member(household_id)) with check (is_member(household_id));
drop policy if exists "viajes: miembros" on trips;
create policy "viajes: miembros" on trips for all using (is_member(household_id)) with check (is_member(household_id));
drop policy if exists "maleta: miembros" on trip_items;
create policy "maleta: miembros" on trip_items for all using (is_member(household_id)) with check (is_member(household_id));

do $$ begin alter publication supabase_realtime add table pack_template; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table trips; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table trip_items; exception when duplicate_object then null; end $$;

-- Plantilla inicial (solo si el hogar no tiene ninguna) --------------------------------
insert into pack_template (household_id, name, who, types, sort)
select h.id, v.name, v.who, v.types::text[], v.sort
from households h
cross join (values
  ('DNI y tarjeta sanitaria', 'comun', '{}', 1),
  ('Cargadores del móvil', 'comun', '{}', 2),
  ('Neceser (cepillos, pasta, desodorante, champú)', 'comun', '{}', 3),
  ('Medicinas habituales', 'comun', '{}', 4),
  ('Botiquín y termómetro', 'comun', '{}', 5),
  ('Agua y algo de picar para el camino', 'comun', '{}', 6),
  ('Bolsa para la ropa sucia', 'comun', '{}', 7),
  ('Crema solar', 'comun', '{playa,nieve,campo}', 8),
  ('Gafas de sol', 'comun', '{playa,nieve,campo}', 9),
  ('Toallas de playa', 'comun', '{playa}', 10),
  ('Sombrilla', 'comun', '{playa}', 11),
  ('Paraguas', 'comun', '{ciudad}', 12),
  ('Tarjetas de embarque', 'comun', '{avion}', 13),
  ('Líquidos en bolsa transparente', 'comun', '{avion}', 14),
  ('Ropa interior y calcetines', 'adri', '{}', 20),
  ('Camisetas', 'adri', '{}', 21),
  ('Pantalones', 'adri', '{}', 22),
  ('Pijama', 'adri', '{}', 23),
  ('Sudadera o chaqueta', 'adri', '{}', 24),
  ('Zapatillas', 'adri', '{}', 25),
  ('Bañador y chanclas', 'adri', '{playa}', 26),
  ('Ropa de abrigo, gorro y guantes', 'adri', '{nieve}', 27),
  ('Ropa interior y calcetines', 'almu', '{}', 30),
  ('Camisetas', 'almu', '{}', 31),
  ('Pantalones', 'almu', '{}', 32),
  ('Pijama', 'almu', '{}', 33),
  ('Sudadera o chaqueta', 'almu', '{}', 34),
  ('Zapatillas', 'almu', '{}', 35),
  ('Bañador y chanclas', 'almu', '{playa}', 36),
  ('Ropa de abrigo, gorro y guantes', 'almu', '{nieve}', 37),
  ('Una muda por día y una de repuesto', 'lorenzo', '{}', 40),
  ('Pijama', 'lorenzo', '{}', 41),
  ('Chaqueta', 'lorenzo', '{}', 42),
  ('Zapatillas', 'lorenzo', '{}', 43),
  ('Peluche para dormir', 'lorenzo', '{}', 44),
  ('Cuentos y juguetes', 'lorenzo', '{}', 45),
  ('Toallitas', 'lorenzo', '{}', 46),
  ('Vaso y cubiertos', 'lorenzo', '{}', 47),
  ('Bañador, gorra y chanclas', 'lorenzo', '{playa}', 48),
  ('Manguitos', 'lorenzo', '{playa}', 49),
  ('Ropa de nieve, gorro y guantes', 'lorenzo', '{nieve}', 50),
  ('Silla de paseo', 'lorenzo', '{ciudad}', 51),
  ('Bajar la basura', 'salida', '{}', 60),
  ('Vaciar la nevera de lo que caduca', 'salida', '{}', 61),
  ('Cerrar ventanas y bajar persianas', 'salida', '{}', 62),
  ('Regar las plantas', 'salida', '{}', 63),
  ('Desenchufar aparatos', 'salida', '{}', 64),
  ('Coger las llaves de casa', 'salida', '{}', 65)
) as v(name, who, types, sort)
where not exists (select 1 from pack_template p where p.household_id = h.id);

-- Avisos al móvil (notificaciones push) ------------------------------------------------
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table push_subscriptions enable row level security;
drop policy if exists "avisos: cada uno los suyos" on push_subscriptions;
create policy "avisos: cada uno los suyos" on push_subscriptions for all
  using (user_id = auth.uid() and is_member(household_id))
  with check (user_id = auth.uid() and is_member(household_id));

-- Claves del servidor de avisos: solo las ve la función del servidor (sin políticas = nadie más).
create table if not exists app_secrets (key text primary key, value jsonb not null);
alter table app_secrets enable row level security;
revoke all on app_secrets from anon, authenticated;

create table if not exists push_log (
  todo_id uuid not null,
  kind text not null,
  day date not null,
  sent_at timestamptz not null default now(),
  primary key (todo_id, kind, day)
);
alter table push_log enable row level security;
revoke all on push_log from anon, authenticated;

-- La app pide la clave pública para suscribirse.
create or replace function push_public_key() returns text
language sql stable security definer set search_path = public as $$
  select value ->> 'publicKey' from app_secrets where key = 'vapid'
$$;
grant execute on function push_public_key() to authenticated;

-- Qué avisar hoy (solo tareas con «Avisar al móvil»). Cada aviso sale una sola vez.
create or replace function avisos_pendientes()
returns table (household_id uuid, todo_id uuid, kind text, title text, body text)
language plpgsql security definer set search_path = public as $$
declare
  today date := (now() at time zone 'Europe/Madrid')::date;
begin
  return query
  with candidatos as (
    select t.household_id, t.id as todo_id, 'due'::text as kind, t.due as day, t.text, t.list, t.amount, t.due
    from todos t
    where not t.done and t.notify and t.list <> 'ideas' and t.due between today - 3 and today
    union all
    select t.household_id, t.id, 'soon', t.due, t.text, t.list, t.amount, t.due
    from todos t
    where not t.done and t.notify and t.list = 'pagos' and t.due between today + 1 and today + 7
  ),
  nuevos as (
    insert into push_log (todo_id, kind, day)
    select c.todo_id, c.kind, c.day from candidatos c
    on conflict do nothing
    returning push_log.todo_id, push_log.kind
  )
  select c.household_id, c.todo_id, c.kind,
    case
      when c.list = 'pagos' and c.kind = 'soon' then 'Pago en ' || (c.due - today) || case when c.due - today = 1 then ' día' else ' días' end
      when c.list = 'pagos' then 'Hoy toca pagar'
      when c.due < today then 'Pendiente'
      else 'Toca hoy'
    end,
    c.text || coalesce(' · ' || replace(to_char(c.amount, 'FM999990.00'), '.', ',') || ' €', '')
  from candidatos c
  join nuevos n on n.todo_id = c.todo_id and n.kind = c.kind;
end $$;
revoke execute on function avisos_pendientes() from public, anon, authenticated;
grant execute on function avisos_pendientes() to service_role;
