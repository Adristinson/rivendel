import type { FreezerItem, Repeat, Todo, TodoList } from './types';
import { isoDate, parseDate } from './menu';

export const LISTS: { id: TodoList; label: string; hint: string }[] = [
  { id: 'casa', label: 'Casa', hint: 'Cosas por hacer: llamar al fontanero, cambiar sábanas…' },
  { id: 'comprar', label: 'Comprar', hint: 'Lo que no es del súper: pilas, zapatos de Lorenzo…' },
  { id: 'ideas', label: 'Ideas', hint: 'Planes con Lorenzo para cuando no sepáis qué hacer.' },
];

export const IDEA_TAGS = [
  { id: 'casa', label: 'En casa' },
  { id: 'fuera', label: 'Fuera' },
  { id: 'sol', label: 'Buen tiempo' },
  { id: 'lluvia', label: 'Con lluvia' },
];

export const REPEATS: { id: Repeat; label: string }[] = [
  { id: 'semanal', label: 'Cada semana' },
  { id: 'quincenal', label: 'Cada 2 semanas' },
  { id: 'mensual', label: 'Cada mes' },
  { id: 'trimestral', label: 'Cada 3 meses' },
  { id: 'semestral', label: 'Cada 6 meses' },
  { id: 'anual', label: 'Cada año' },
];

const MONTHS: Partial<Record<Repeat, number>> = { mensual: 1, trimestral: 3, semestral: 6, anual: 12 };

/** Suma meses sin saltar de mes (31 ene + 1 mes = 28/29 feb). */
export function addMonths(from: string, n: number): string {
  const d = parseDate(from);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return isoDate(d);
}

export function nextDue(from: string, repeat: Repeat): string {
  const d = parseDate(from);
  if (repeat === 'semanal') d.setDate(d.getDate() + 7);
  else if (repeat === 'quincenal') d.setDate(d.getDate() + 14);
  else return addMonths(from, MONTHS[repeat] ?? 1);
  return isoDate(d);
}

/** Repeticiones largas (filtro del agua, revisiones…): la próxima fecha cuenta desde el día en que se hizo. */
export function isLongRepeat(r: Repeat | null): boolean {
  return r === 'trimestral' || r === 'semestral' || r === 'anual';
}

/**
 * Marcar como hecho. Si se repite, no se cierra: pasa a la próxima fecha y se apunta el día
 * en el historial. Las semanales/mensuales mantienen su calendario (contando desde hoy si estaba
 * atrasada, para no acumular); las largas cuentan siempre desde el día en que se hizo.
 */
export function complete(t: Todo, today: string, now: string): Todo {
  if (t.repeat && !t.done) {
    const base = isLongRepeat(t.repeat) ? today : t.due && t.due > today ? t.due : today;
    const log = [...(t.done_log ?? []).filter((d) => d !== today), today].sort();
    return { ...t, due: nextDue(base, t.repeat), done_at: now, done_log: log, updated_at: now };
  }
  return { ...t, done: !t.done, done_at: t.done ? null : now, updated_at: now };
}

export function dueLabel(due: string | null, today: string): { text: string; tone: 'late' | 'today' | 'soon' | 'later' } | null {
  if (!due) return null;
  const days = Math.round((parseDate(due).getTime() - parseDate(today).getTime()) / 864e5);
  if (days < 0) return { text: days === -1 ? 'Ayer' : `Hace ${-days} días`, tone: 'late' };
  if (days === 0) return { text: 'Hoy', tone: 'today' };
  if (days === 1) return { text: 'Mañana', tone: 'soon' };
  if (days < 7) {
    const w = parseDate(due).toLocaleDateString('es-ES', { weekday: 'long' });
    return { text: w.charAt(0).toUpperCase() + w.slice(1), tone: 'soon' };
  }
  return { text: parseDate(due).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }), tone: 'later' };
}

/** Pendientes primero por fecha (sin fecha al final, los más nuevos arriba). */
export function sortOpen(list: Todo[]): Todo[] {
  return [...list].sort((a, b) => {
    if (a.due && b.due) return a.due.localeCompare(b.due);
    if (a.due) return -1;
    if (b.due) return 1;
    return b.created_at.localeCompare(a.created_at);
  });
}

export function openOf(todos: Todo[], list: TodoList): Todo[] {
  return sortOpen(todos.filter((t) => t.list === list && !t.done));
}

export function doneOf(todos: Todo[], list: TodoList): Todo[] {
  return todos.filter((t) => t.list === list && t.done).sort((a, b) => (b.done_at ?? '').localeCompare(a.done_at ?? ''));
}

/** Para Hoy: lo de Casa y Comprar que vence hoy o está atrasado. */
export function dueToday(todos: Todo[], today = isoDate(new Date())): Todo[] {
  return sortOpen(todos.filter((t) => !t.done && t.list !== 'ideas' && t.due && t.due <= today));
}

export function lastDone(t: Todo): string | null {
  const log = t.done_log ?? [];
  return log.length ? log[log.length - 1] : null;
}

/** Corregir "la última vez que se hizo": recalcula la próxima fecha a partir de ese día. */
export function setLastDone(t: Todo, date: string, now: string): Todo {
  const log = [...(t.done_log ?? [])];
  if (log.length) log[log.length - 1] = date;
  else log.push(date);
  const sorted = [...new Set(log)].sort();
  return { ...t, done_log: sorted, due: t.repeat ? nextDue(date, t.repeat) : t.due, updated_at: now };
}

export function fmtDay(iso: string, withYear = false): string {
  return parseDate(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) });
}

// Congelador ------------------------------------------------------------------

/** Días que lleva congelado. */
export function frozenDays(it: FreezerItem, today: string): number {
  return Math.max(0, Math.round((parseDate(today).getTime() - parseDate(it.frozen_on).getTime()) / 864e5));
}

/** Aviso orientativo: a partir de 3 meses conviene gastarlo. */
export const FREEZER_WARN_DAYS = 90;

export function frozenLabel(it: FreezerItem, today: string): { text: string; old: boolean } {
  const d = frozenDays(it, today);
  const text =
    d === 0 ? 'Congelado hoy' : d === 1 ? 'Desde ayer' : d < 14 ? `Hace ${d} días` : d < 60 ? `Hace ${Math.round(d / 7)} semanas` : `Hace ${Math.round(d / 30)} meses`;
  return { text, old: d >= FREEZER_WARN_DAYS };
}

/** Lo más antiguo primero: es lo que hay que gastar antes. */
export function sortFreezer(items: FreezerItem[]): FreezerItem[] {
  return [...items].filter((i) => i.portions > 0).sort((a, b) => a.frozen_on.localeCompare(b.frozen_on) || a.name.localeCompare(b.name));
}
