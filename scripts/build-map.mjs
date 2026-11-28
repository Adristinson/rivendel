// Genera src/data/map-paths.json: siluetas de países para las vistas Europa y Mundo.
// Uso: node scripts/build-map.mjs
import fs from 'node:fs';
import * as topo from 'topojson-client';
import * as d3 from 'd3-geo';

const load = (f) => JSON.parse(fs.readFileSync(new URL(`../node_modules/world-atlas/${f}`, import.meta.url)));
const r1 = (n) => Math.round(n * 1000) / 1000;

// Mundo (110m, sin Antártida)
const w110 = load('countries-110m.json');
const world = topo.feature(w110, w110.objects.countries);
world.features = world.features.filter((f) => f.id !== '010');
const WW = 400, WH = 210;
const pw = d3.geoNaturalEarth1().fitExtent([[4, 4], [WW - 4, WH - 4]], world);
const worldPaths = world.features.map((f) => ({ id: String(f.id ?? ''), d: d3.geoPath(pw).digits(1)(f) })).filter((p) => p.d);

// Europa (50m, recortado)
const w50 = load('countries-50m.json');
const all50 = topo.feature(w50, w50.objects.countries);
const EW = 400, EH = 380;
const pe = d3.geoConicConformal().rotate([-10, 0]).parallels([40, 60]);
pe.fitExtent([[0, 0], [EW, EH]], { type: 'MultiPoint', coordinates: [[-12, 35], [36, 35], [-12, 70], [36, 70]] });
pe.clipExtent([[-2, -2], [EW + 2, EH + 2]]);
const euroPaths = all50.features
  .filter((f) => { const b = d3.geoBounds(f); return b[1][0] > -40 && b[0][0] < 60 && b[1][1] > 25 && b[0][1] < 82; })
  .map((f) => ({ id: String(f.id ?? ''), d: d3.geoPath(pe).digits(1)(f) }))
  .filter((p) => p.d);
pe.clipExtent(null);

const out = {
  world: { w: WW, h: WH, scale: r1(pw.scale()), translate: pw.translate().map(r1), paths: worldPaths },
  europe: { w: EW, h: EH, scale: r1(pe.scale()), translate: pe.translate().map(r1), rotate: [-10, 0], parallels: [40, 60], paths: euroPaths },
  total: world.features.length,
};
fs.writeFileSync(new URL('../src/data/map-paths.json', import.meta.url), JSON.stringify(out));
console.log('mundo', worldPaths.length, 'europa', euroPaths.length, fs.statSync(new URL('../src/data/map-paths.json', import.meta.url)).size);
