import type { Ctx } from './logic';
import { norm } from './logic';
import type { Data, Op, PackTemplateItem, PackWho, Trip, TripItem, TripType } from './types';

export const TRIP_TYPES: { id: TripType; label: string; emoji: string }[] = [
  { id: 'playa', label: 'Playa', emoji: '🏖️' },
  { id: 'nieve', label: 'Nieve', emoji: '⛷️' },
  { id: 'ciudad', label: 'Ciudad', emoji: '🏙️' },
  { id: 'campo', label: 'Campo', emoji: '🌲' },
  { id: 'abuelos', label: 'Abuelos', emoji: '🏡' },
  { id: 'avion', label: 'Avión', emoji: '✈️' },
];

export const WHO: { id: PackWho; label: string }[] = [
  { id: 'comun', label: 'Común' },
  { id: 'adri', label: 'Adri' },
  { id: 'almu', label: 'Almudena' },
  { id: 'lorenzo', label: 'Lorenzo' },
  { id: 'salida', label: 'Antes de salir' },
];

export const whoLabel = (w: PackWho) => WHO.find((x) => x.id === w)?.label ?? w;

/** Cosas de la plantilla que tocan en un viaje: las de siempre y las de sus tipos. */
export function templateFor(template: PackTemplateItem[], types: TripType[]): PackTemplateItem[] {
  return template.filter((t) => t.types.length === 0 || t.types.some((x) => types.includes(x)));
}

export function createTripOps(
  data: Data,
  input: { name: string; start_date: string | null; end_date: string | null; types: TripType[] },
  ctx: Ctx,
): { trip: Trip; ops: Op[] } {
  const now = ctx.now();
  const trip: Trip = {
    id: ctx.newId(),
    household_id: ctx.householdId,
    name: input.name.trim(),
    start_date: input.start_date,
    end_date: input.end_date,
    types: input.types,
    note: null,
    created_by: ctx.by,
    created_at: now,
    updated_at: now,
  };
  const ops: Op[] = [{ kind: 'upsertRow', table: 'trips', row: trip }];
  const seen = new Set<string>();
  for (const t of [...templateFor(data.packTemplate, input.types)].sort((a, b) => a.sort - b.sort)) {
    const key = t.who + '|' + norm(t.name);
    if (seen.has(key)) continue;
    seen.add(key);
    const item: TripItem = {
      id: ctx.newId(),
      household_id: ctx.householdId,
      trip_id: trip.id,
      name: t.name,
      who: t.who,
      done: false,
      sort: t.sort,
      created_at: now,
      updated_at: now,
    };
    ops.push({ kind: 'upsertRow', table: 'trip_items', row: item });
  }
  return { trip, ops };
}

/**
 * Añadir algo a la maleta de un viaje. Si se guarda en la plantilla, la próxima vez
 * aparecerá solo en viajes del mismo tipo (o en todos si el viaje no tiene tipo).
 */
export function addTripItemOps(data: Data, trip: Trip, name: string, who: PackWho, saveToTemplate: boolean, ctx: Ctx): Op[] {
  const now = ctx.now();
  const clean = name.trim().replace(/^./, (c) => c.toUpperCase());
  const items = data.tripItems.filter((i) => i.trip_id === trip.id);
  const ops: Op[] = [];
  if (!items.some((i) => i.who === who && norm(i.name) === norm(clean))) {
    ops.push({
      kind: 'upsertRow',
      table: 'trip_items',
      row: {
        id: ctx.newId(),
        household_id: ctx.householdId,
        trip_id: trip.id,
        name: clean,
        who,
        done: false,
        sort: Math.max(0, ...items.map((i) => i.sort)) + 1,
        created_at: now,
        updated_at: now,
      },
    });
  }
  if (saveToTemplate) {
    const existing = data.packTemplate.find((t) => t.who === who && norm(t.name) === norm(clean));
    if (!existing) {
      ops.push({
        kind: 'upsertRow',
        table: 'pack_template',
        row: {
          id: ctx.newId(),
          household_id: ctx.householdId,
          name: clean,
          who,
          types: trip.types,
          sort: Math.max(0, ...data.packTemplate.map((t) => t.sort)) + 1,
          created_at: now,
        },
      });
    } else if (existing.types.length > 0 && trip.types.some((x) => !existing.types.includes(x))) {
      const types = trip.types.length === 0 ? [] : [...new Set([...existing.types, ...trip.types])];
      ops.push({ kind: 'upsertRow', table: 'pack_template', row: { ...existing, types } });
    }
  }
  return ops;
}

export function tripProgress(data: Data, tripId: string): { done: number; total: number } {
  const items = data.tripItems.filter((i) => i.trip_id === tripId);
  return { done: items.filter((i) => i.done).length, total: items.length };
}

/** Días hasta la salida (negativo si ya empezó). */
export function daysUntil(date: string, today: string): number {
  return Math.round((new Date(date + 'T12:00:00').getTime() - new Date(today + 'T12:00:00').getTime()) / 864e5);
}

/** Viajes por venir o en curso primero (el más cercano arriba); los pasados después. */
export function splitTrips(trips: Trip[], today: string): { next: Trip[]; past: Trip[] } {
  const isPast = (t: Trip) => !!(t.end_date ?? t.start_date) && (t.end_date ?? t.start_date)! < today;
  const next = trips
    .filter((t) => !isPast(t))
    .sort((a, b) => (a.start_date ?? '9999').localeCompare(b.start_date ?? '9999') || a.created_at.localeCompare(b.created_at));
  const past = trips.filter(isPast).sort((a, b) => (b.start_date ?? '').localeCompare(a.start_date ?? ''));
  return { next, past };
}

/** Para Hoy: el próximo viaje si sale en los próximos 10 días (o está en curso). */
export function soonTrip(data: Data, today: string): Trip | undefined {
  return splitTrips(data.trips, today).next.find((t) => t.start_date && daysUntil(t.start_date, today) <= 10);
}

export function tripWhen(t: Trip, today: string): string {
  if (!t.start_date) return 'Sin fecha';
  const f = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  const range = t.end_date && t.end_date !== t.start_date ? `${f(t.start_date)} – ${f(t.end_date)}` : f(t.start_date);
  const n = daysUntil(t.start_date, today);
  const rel = n > 1 ? `en ${n} días` : n === 1 ? 'mañana' : n === 0 ? 'hoy' : t.end_date && t.end_date >= today ? 'en curso' : '';
  return rel ? `${range} · ${rel}` : range;
}
