import { describe, expect, it } from 'vitest';
import { fromNominatim, groupPlaces, monthLabel, placeStats, toMonth } from './places';
import type { Place } from './types';

const P = (id: string, name: string, country: string, visited_on: string | null): Place => ({ id, household_id: 'h', name, detail: null, country, lat: 1, lng: 2, visited_on, note: null, trip_id: null, created_by: null, created_at: '', updated_at: '' });

describe('mapa de viajes', () => {
  it('lee un resultado de OpenStreetMap', () => {
    expect(fromNominatim({ lat: '36.5', lon: '-6.3', name: 'Cádiz', display_name: 'Cádiz, Andalucía, España', address: { city: 'Cádiz', state: 'Andalucía', country: 'España' } })).toEqual({
      name: 'Cádiz',
      detail: 'Andalucía, España',
      country: 'España',
      lat: 36.5,
      lng: -6.3,
    });
    expect(fromNominatim({ lat: '1', lon: '2', name: 'Islandia', display_name: 'Islandia', address: { country: 'Islandia' } }).detail).toBeNull();
  });
  it('fechas por mes', () => {
    expect(toMonth('2024-03')).toBe('2024-03-01');
    expect(toMonth('2026-12-04')).toBe('2026-12-01');
    expect(monthLabel('2024-03-01')).toBe('mar 2024');
    expect(monthLabel(null)).toBe('Sin fecha');
  });
  it('agrupa visitas al mismo sitio y cuenta países', () => {
    const list = [P('a', 'Cádiz', 'España', '2023-08-01'), P('b', 'Roma', 'Italia', '2024-05-01'), P('c', 'cádiz', 'España', '2025-07-01')];
    const g = groupPlaces(list);
    expect(g.map((x) => [x.name, x.visits.map((v) => v.id)])).toEqual([
      ['Cádiz', ['c', 'a']],
      ['Roma', ['b']],
    ]);
    expect(placeStats(list)).toEqual({ places: 2, countries: 2, visits: 3 });
  });
});
