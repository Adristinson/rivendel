import type { Repeat, Todo, TodoList } from './types';
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
];

export function nextDue(from: string, repeat: Repeat): string {
  const d = parseDate(from);
  if (repeat === 'semanal') d.setDate(d.getDate() + 7);
  else if (repeat === 'quincenal') d.setDate(d.getDate() + 14);
  else {
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + 1);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, last));
  }
  return isoDate(d);
}

/**
 * Marcar como hecho. Si se repite, no se cierra: pasa a la próxima fecha
 * (contando desde hoy si estaba atrasado, para no acumular).
 */
export function complete(t: Todo, today: string, now: string): Todo {
  if (t.repeat && !t.done) {
    const base = t.due && t.due > today ? t.due : today;
    return { ...t, due: nextDue(base, t.repeat), done_at: now, updated_at: now };
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
