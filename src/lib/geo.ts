import { geoCentroid, geoConicConformal, geoContains, geoDistance, geoNaturalEarth1, type GeoProjection } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { Topology, GeometryCollection } from 'topojson-specification';
import world110 from 'world-atlas/countries-110m.json';
import paths from '../data/map-paths.json';

export type MapView = 'europe' | 'world';
export const MAP = paths as unknown as {
  world: { w: number; h: number; scale: number; translate: [number, number]; paths: { id: string; d: string }[] };
  europe: { w: number; h: number; scale: number; translate: [number, number]; rotate: [number, number]; parallels: [number, number]; paths: { id: string; d: string }[] };
};

/** Países reconocidos por la ONU, para el "X de 195". */
export const WORLD_COUNTRIES = 195;

export function projection(view: MapView): GeoProjection {
  if (view === 'world') return geoNaturalEarth1().scale(MAP.world.scale).translate(MAP.world.translate);
  const e = MAP.europe;
  return geoConicConformal().rotate(e.rotate).parallels(e.parallels).scale(e.scale).translate(e.translate);
}

const topo = world110 as unknown as Topology<{ countries: GeometryCollection }>;
const countries = (feature(topo, topo.objects.countries) as FeatureCollection<Geometry>).features as Feature<Geometry>[];
const centroids = countries.map((f) => geoCentroid(f));

/** País (código ISO numérico) en el que cae un punto; si cae en la costa, el más cercano. */
export function countryAt(lng: number, lat: number): string | null {
  const hit = countries.find((f) => geoContains(f, [lng, lat]));
  if (hit) return String(hit.id);
  let best: string | null = null;
  let dist = Infinity;
  countries.forEach((f, i) => {
    const d = geoDistance([lng, lat], centroids[i]);
    if (d < dist) {
      dist = d;
      best = String(f.id);
    }
  });
  return dist < 0.12 ? best : null; // ~750 km
}
