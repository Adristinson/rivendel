import type { Place } from './types';

export interface GeoResult {
  name: string;
  detail: string | null;
  country: string | null;
  lat: number;
  lng: number;
}

interface NominatimRow {
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  address?: Record<string, string>;
}

/** Convierte un resultado de OpenStreetMap (Nominatim) en un sitio. */
export function fromNominatim(r: NominatimRow): GeoResult {
  const a = r.address ?? {};
  const name = r.name || a.city || a.town || a.village || a.municipality || a.county || a.state || a.country || r.display_name.split(',')[0];
  const region = a.state || a.province || a.region || a.county || null;
  const country = a.country ?? null;
  const detail = [region !== name ? region : null, country !== name ? country : null].filter(Boolean).join(', ') || null;
  return { name, detail, country, lat: Number(r.lat), lng: Number(r.lon) };
}

/** Buscar un sitio por nombre (OpenStreetMap). Una búsqueda por pulsación del botón, no por tecla. */
export async function searchPlaces(q: string): Promise<GeoResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&accept-language=es&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('No se pudo buscar el sitio');
  const rows = (await res.json()) as NominatimRow[];
  const seen = new Set<string>();
  return rows.map(fromNominatim).filter((r) => {
    const k = `${r.name}|${r.detail}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function monthLabel(visited_on: string | null): string {
  if (!visited_on) return 'Sin fecha';
  const [y, m] = visited_on.split('-');
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

/** Sitios agrupados por lugar (mismo nombre y país), con sus visitas de la más reciente a la más antigua. */
export function groupPlaces(places: Place[]): { key: string; name: string; detail: string | null; lat: number; lng: number; visits: Place[] }[] {
  const map = new Map<string, { key: string; name: string; detail: string | null; lat: number; lng: number; visits: Place[] }>();
  for (const p of places) {
    const key = `${p.name.toLowerCase()}|${(p.country ?? '').toLowerCase()}`;
    const g = map.get(key) ?? { key, name: p.name, detail: p.detail, lat: p.lat, lng: p.lng, visits: [] };
    g.visits.push(p);
    map.set(key, g);
  }
  const byDate = (a: Place, b: Place) => (b.visited_on ?? '').localeCompare(a.visited_on ?? '');
  return [...map.values()]
    .map((g) => ({ ...g, visits: g.visits.sort(byDate) }))
    .sort((a, b) => byDate(a.visits[0], b.visits[0]));
}

export function placeStats(places: Place[]): { places: number; countries: number; visits: number } {
  return {
    places: groupPlaces(places).length,
    countries: new Set(places.map((p) => p.country).filter(Boolean)).size,
    visits: places.length,
  };
}

/** Mes (YYYY-MM-01) a partir de una fecha o de un valor de <input type="month">. */
export function toMonth(v: string | null | undefined): string | null {
  if (!v) return null;
  const m = v.match(/^(\d{4})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-01` : null;
}
