import { describe, expect, it } from 'vitest';
import { addTripItemOps, createTripOps, soonTrip, splitTrips, templateFor, tripWhen } from './trips';
import type { Data, PackTemplateItem, Trip, TripItem } from './types';
import type { Ctx } from './logic';

let n = 0;
const ctx: Ctx = { householdId: 'h', by: 'Adri', now: () => '2026-11-27T10:00:00Z', newId: () => 'id' + ++n };
const P = (name: string, who: PackTemplateItem['who'], types: PackTemplateItem['types'] = [], sort = 0): PackTemplateItem => ({ id: 't-' + name + who, household_id: 'h', name, who, types, sort, created_at: '' });
const data = (p: Partial<Data> = {}): Data => ({ categories: [], products: [], items: [], recipes: [], ingredients: [], weeks: [], slots: [], ledger: [], members: [], todos: [], freezer: [], packTemplate: [], trips: [], tripItems: [], places: [], ...p });
const template = [P('DNI', 'comun', [], 1), P('Bañador', 'adri', ['playa'], 2), P('Guantes', 'lorenzo', ['nieve'], 3), P('Bajar la basura', 'salida', [], 4)];

describe('maletas', () => {
  it('la plantilla filtra por tipo de viaje', () => {
    expect(templateFor(template, ['playa']).map((t) => t.name)).toEqual(['DNI', 'Bañador', 'Bajar la basura']);
    expect(templateFor(template, []).map((t) => t.name)).toEqual(['DNI', 'Bajar la basura']);
  });
  it('crear un viaje genera la lista desde la plantilla', () => {
    const { trip, ops } = createTripOps(data({ packTemplate: template }), { name: ' Cádiz ', start_date: '2026-12-05', end_date: '2026-12-08', types: ['playa'] }, ctx);
    expect(trip.name).toBe('Cádiz');
    const items = ops.filter((o) => o.kind === 'upsertRow' && o.table === 'trip_items').map((o) => (o as { row: TripItem }).row);
    expect(items.map((i) => [i.name, i.who, i.done])).toEqual([['DNI', 'comun', false], ['Bañador', 'adri', false], ['Bajar la basura', 'salida', false]]);
  });
  it('lo que se añade en un viaje mejora la plantilla para los del mismo tipo', () => {
    const trip = { id: 'v', types: ['nieve'] } as unknown as Trip;
    const ops = addTripItemOps(data({ packTemplate: template }), trip, 'crema de labios', 'almu', true, ctx);
    expect(ops).toHaveLength(2);
    expect((ops[1] as { row: PackTemplateItem }).row).toMatchObject({ name: 'Crema de labios', who: 'almu', types: ['nieve'] });
    // ya existía solo para playa: ahora también para nieve
    const ops2 = addTripItemOps(data({ packTemplate: template }), trip, 'Bañador', 'adri', true, ctx);
    expect((ops2[1] as { row: PackTemplateItem }).row.types).toEqual(['playa', 'nieve']);
    // sin guardar en plantilla
    expect(addTripItemOps(data(), trip, 'Algo', 'comun', false, ctx)).toHaveLength(1);
  });
  it('orden de viajes y aviso en Hoy', () => {
    const T = (id: string, start: string | null, end: string | null): Trip => ({ id, household_id: 'h', name: id, start_date: start, end_date: end, types: [], note: null, created_by: null, created_at: '', updated_at: '' });
    const trips = [T('pasado', '2026-10-01', '2026-10-03'), T('lejos', '2027-03-01', null), T('pronto', '2026-12-03', '2026-12-06'), T('sinfecha', null, null)];
    const { next, past } = splitTrips(trips, '2026-11-27');
    expect(next.map((t) => t.id)).toEqual(['pronto', 'lejos', 'sinfecha']);
    expect(past.map((t) => t.id)).toEqual(['pasado']);
    expect(soonTrip(data({ trips }), '2026-11-27')?.id).toBe('pronto');
    expect(tripWhen(trips[2], '2026-11-27')).toBe('3 dic – 6 dic · en 6 días');
  });
});
