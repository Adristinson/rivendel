import type { Data, LedgerEntry, Member } from './types';
import { norm } from './logic';

const eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
export const fmtEuro = (n: number) => eur.format(Math.round(n * 100) / 100);

/** Convierte "12,5" o "12.50" en número; null si no es un importe válido. */
export function parseAmount(s: string): number | null {
  const t = s.replace(/\s|€/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const n = Number(t);
  return n > 0 ? n : null;
}

/** Lo que `other` debe a quien paga por un gasto. */
export function owedBy(e: LedgerEntry): number {
  return e.kind === 'gasto' ? (e.amount * (100 - e.payer_share)) / 100 : e.amount;
}

/**
 * Saldo entre dos personas: positivo = `other` debe a `me`; negativo = `me` debe a `other`.
 * Un gasto pagado por X hace que el otro le deba su parte; un pago de X a Y reduce lo que X debe a Y.
 */
export function balance(entries: LedgerEntry[], me: string, other: string): number {
  let b = 0;
  for (const e of entries) {
    const amt = owedBy(e);
    if (e.kind === 'gasto') {
      if (e.paid_by === me && e.other_user === other) b += amt;
      else if (e.paid_by === other && e.other_user === me) b -= amt;
    } else {
      // pago: paid_by entrega dinero a other_user
      if (e.paid_by === other && e.other_user === me) b -= amt;
      else if (e.paid_by === me && e.other_user === other) b += amt;
    }
  }
  return Math.round(b * 100) / 100;
}

export function otherMember(data: Data, me: string): Member | undefined {
  return data.members.find((m) => m.user_id !== me);
}

export function nameOf(data: Data, userId: string): string {
  return data.members.find((m) => m.user_id === userId)?.display_name ?? 'Alguien';
}

export interface MonthGroup {
  month: string; // YYYY-MM
  label: string;
  entries: LedgerEntry[];
  spent: number; // total de gastos compartidos del mes
}

export function byMonth(entries: LedgerEntry[]): MonthGroup[] {
  const map = new Map<string, LedgerEntry[]>();
  for (const e of [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))) {
    const m = e.date.slice(0, 7);
    map.set(m, [...(map.get(m) ?? []), e]);
  }
  return [...map.entries()].map(([month, list]) => {
    const [y, mo] = month.split('-').map(Number);
    const label = new Date(y, mo - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    return {
      month,
      label: label.charAt(0).toUpperCase() + label.slice(1),
      entries: list,
      spent: Math.round(list.filter((e) => e.kind === 'gasto').reduce((s, e) => s + e.amount, 0) * 100) / 100,
    };
  });
}

const DEFAULT_CONCEPTS = ['Súper', 'Guardería', 'Farmacia', 'Restaurante', 'Casa', 'Lorenzo'];

/** Conceptos para elegir con un toque: los más usados primero, completados con los habituales. */
export function frequentConcepts(entries: LedgerEntry[], max = 8): string[] {
  const count = new Map<string, { label: string; n: number }>();
  for (const e of entries) {
    if (e.kind !== 'gasto' || !e.concept.trim()) continue;
    const k = norm(e.concept);
    const prev = count.get(k);
    count.set(k, { label: prev?.label ?? e.concept.trim(), n: (prev?.n ?? 0) + 1 });
  }
  const used = [...count.values()].sort((a, b) => b.n - a.n).map((x) => x.label);
  const rest = DEFAULT_CONCEPTS.filter((d) => !count.has(norm(d)));
  return [...used, ...rest].slice(0, max);
}

export interface Settlement {
  id: string; // id del pago que dejó las cuentas a cero
  date: string;
  payment: LedgerEntry;
  entries: LedgerEntry[]; // gastos y pagos del periodo (sin el pago final), más recientes primero
  spent: number; // total de gastos compartidos del periodo
  from: string; // fecha del primer movimiento del periodo
}

/**
 * Parte el historial en "saldos": cada vez que un pago deja las cuentas a cero se cierra un periodo.
 * Devuelve los periodos cerrados (más reciente primero) y los movimientos abiertos desde el último saldo.
 */
export function settlements(entries: LedgerEntry[], a: string, b: string): { closed: Settlement[]; open: LedgerEntry[] } {
  const chrono = [...entries].sort((x, y) => x.date.localeCompare(y.date) || x.created_at.localeCompare(y.created_at));
  const closed: Settlement[] = [];
  let current: LedgerEntry[] = [];
  let bal = 0;
  for (const e of chrono) {
    bal = Math.round((bal + balance([e], a, b)) * 100) / 100;
    if (e.kind === 'pago' && Math.abs(bal) < 0.005 && current.length > 0) {
      const gastos = current.filter((x) => x.kind === 'gasto');
      closed.push({
        id: e.id,
        date: e.date,
        payment: e,
        entries: [...current].reverse(),
        spent: Math.round(gastos.reduce((s, x) => s + x.amount, 0) * 100) / 100,
        from: current[0].date,
      });
      current = [];
      bal = 0;
    } else {
      current.push(e);
    }
  }
  return { closed: closed.reverse(), open: current };
}
