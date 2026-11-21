-- Rivendel · módulo 3: cuentas claras (gastos compartidos y pagos entre los dos)
-- Ejecutar una vez en Supabase → SQL Editor.

create table if not exists ledger (
  id uuid primary key,
  household_id uuid not null references households(id) on delete cascade,
  kind text not null check (kind in ('gasto', 'pago')),
  amount numeric(12, 2) not null check (amount > 0),
  concept text not null default '',
  paid_by uuid not null references auth.users(id),
  other_user uuid not null references auth.users(id),
  payer_share int not null default 50 check (payer_share between 0 and 100), -- parte del gasto que corresponde a quien paga
  date date not null default current_date,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (paid_by <> other_user)
);

create index if not exists ledger_household on ledger(household_id, date desc);

alter table ledger enable row level security;

drop policy if exists "cuentas: miembros" on ledger;
create policy "cuentas: miembros" on ledger for all
  using (is_member(household_id))
  with check (
    is_member(household_id)
    and exists (select 1 from members m where m.household_id = ledger.household_id and m.user_id = ledger.paid_by)
    and exists (select 1 from members m where m.household_id = ledger.household_id and m.user_id = ledger.other_user)
  );

do $$ begin alter publication supabase_realtime add table ledger; exception when duplicate_object then null; end $$;
