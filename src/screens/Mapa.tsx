import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { select } from 'd3-selection';
import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';
import type { Store, StoreState } from '../lib/store';
import type { Ctx } from '../lib/logic';
import type { Place, Trip } from '../lib/types';
import { groupPlaces, monthLabel, searchPlaces, toMonth, type GeoResult } from '../lib/places';
import { countryAt, MAP, projection, WORLD_COUNTRIES, type MapView } from '../lib/geo';
import { Sheet } from './Comida';

type Group = ReturnType<typeof groupPlaces>[number];

function CountryMap({ view, visited, groups, onPick }: { view: MapView; visited: Set<string>; groups: Group[]; onPick: (g: Group) => void }) {
  const svg = useRef<SVGSVGElement>(null);
  const g = useRef<SVGGElement>(null);
  const zb = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [k, setK] = useState(1);
  const m = view === 'world' ? MAP.world : MAP.europe;
  const proj = useMemo(() => projection(view), [view]);

  useEffect(() => {
    if (!svg.current || !g.current) return;
    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, view === 'world' ? 12 : 8])
      .translateExtent([
        [0, 0],
        [m.w, m.h],
      ])
      .on('zoom', (e) => {
        g.current?.setAttribute('transform', e.transform.toString());
        setK(e.transform.k);
      });
    const sel = select(svg.current);
    sel.call(z).call(z.transform, zoomIdentity);
    zb.current = z;
    return () => {
      sel.on('.zoom', null);
    };
  }, [view, m.w, m.h]);

  const pins = groups
    .map((gr) => ({ gr, xy: proj([gr.lng, gr.lat]) }))
    .filter((p): p is { gr: Group; xy: [number, number] } => !!p.xy && p.xy[0] >= 0 && p.xy[0] <= m.w && p.xy[1] >= 0 && p.xy[1] <= m.h);

  return (
    <div className="country-map">
      <svg
        ref={svg}
        viewBox={`0 0 ${m.w} ${m.h}`}
        role="img"
        aria-label={view === 'world' ? 'Mapamundi con los países visitados en verde' : 'Mapa de Europa con los países visitados en verde'}
      >
        <rect width={m.w} height={m.h} fill="#DCE6D7" />
        <g ref={g}>
          {m.paths.map((p, i) => (
            <path key={p.id + '-' + i} d={p.d} fill={visited.has(p.id) ? '#6E8F45' : '#EFE3C4'} stroke={visited.has(p.id) ? '#4E6E2E' : '#C9B48A'} strokeWidth={(view === 'world' ? 0.25 : 0.5) / k} />
          ))}
          {pins.map(({ gr, xy }) => (
            <circle
              key={gr.key}
              cx={xy[0]}
              cy={xy[1]}
              r={4.5 / Math.sqrt(k)}
              fill="#E9B949"
              stroke="#33501E"
              strokeWidth={1.4 / Math.sqrt(k)}
              style={{ cursor: 'pointer' }}
              onClick={() => onPick(gr)}
            >
              <title>{gr.name}</title>
            </circle>
          ))}
        </g>
      </svg>
      {k > 1.05 && (
        <button
          className="map-reset"
          onClick={() => svg.current && zb.current && select(svg.current).call(zb.current.transform, zoomIdentity)}
        >
          Ver todo
        </button>
      )}
    </div>
  );
}

export function Mapa({ store, state, ctx, tabs, fromTrip, clearFromTrip }: { store: Store; state: StoreState; ctx: Ctx; tabs: React.ReactNode; fromTrip?: Trip | null; clearFromTrip?: () => void }) {
  const places = state.data.places ?? [];
  const groups = groupPlaces(places);
  const [view, setView] = useState<MapView>(() => (localStorage.getItem('rivendel:mapa') as MapView) || 'europe');
  const changeView = (v: MapView) => {
    setView(v);
    try {
      localStorage.setItem('rivendel:mapa', v);
    } catch {
      /* sin almacenamiento */
    }
  };
  // País de cada sitio a partir de sus coordenadas
  const byCountry = useMemo(() => {
    const map = new Map<string, { id: string; name: string; groups: Group[] }>();
    for (const gr of groups) {
      const id = countryAt(gr.lng, gr.lat) ?? 'x-' + (gr.visits[0].country ?? gr.name);
      const e = map.get(id) ?? { id, name: gr.visits[0].country ?? gr.name, groups: [] };
      e.groups.push(gr);
      map.set(id, e);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [groups]);
  const visited = useMemo(() => new Set(byCountry.map((c) => c.id)), [byCountry]);
  const nCountries = byCountry.filter((c) => !c.id.startsWith('x-')).length;
  const nVisits = places.length;
  const [adding, setAdding] = useState<{ q: string; month: string | null; trip_id: string | null } | null>(
    fromTrip ? { q: fromTrip.name, month: toMonth(fromTrip.start_date), trip_id: fromTrip.id } : null,
  );
  const [picked, setPicked] = useState<Group | null>(null);

  return (
    <div className="screen">
      <header className="band">
        <div className="band-top">
          <div>
            <div className="band-kicker">Viajes</div>
            <h1>Por dónde hemos andado</h1>
          </div>
        </div>
        {tabs}
        <div className="menu-actions">
          <button className="add-big" onClick={() => setAdding({ q: '', month: null, trip_id: null })}>
            + Añadir sitio
          </button>
        </div>
      </header>
      <div className="scroll">
        <div className="map-card">
          <div className="seg map-seg" role="tablist" aria-label="Zona del mapa">
            <button role="tab" aria-pressed={view === 'europe'} aria-selected={view === 'europe'} onClick={() => changeView('europe')}>
              Europa
            </button>
            <button role="tab" aria-pressed={view === 'world'} aria-selected={view === 'world'} onClick={() => changeView('world')}>
              Mundo
            </button>
          </div>
          <CountryMap view={view} visited={visited} groups={groups} onPick={setPicked} />
          <div className="map-count">
            <span className="map-big">{nCountries}</span>
            <span className="small">
              de {WORLD_COUNTRIES} países · {groups.length === 1 ? '1 sitio' : `${groups.length} sitios`}
              {nVisits > groups.length ? ` · ${nVisits} visitas` : ''}
            </span>
          </div>
          <div className="map-bar">
            <span style={{ width: `${Math.max(2, (nCountries / WORLD_COUNTRIES) * 100)}%` }} />
          </div>
        </div>
        {places.length === 0 ? (
          <div className="empty">
            <strong>El mapa está en blanco</strong>
            Añade los sitios donde habéis estado con su fecha. Cada viaje terminado también se puede pasar al mapa desde su ficha.
          </div>
        ) : (
          <ul className="card">
            {byCountry.map((c) => (
              <li key={c.id}>
                <div className="country-row">
                  <span className="country-swatch" aria-hidden />
                  <span className="row-text">
                    <span className="row-name country-name">{c.name}</span>
                    {c.groups.map((gr) => (
                      <button key={gr.key} className="place-link" onClick={() => setPicked(gr)}>
                        {gr.name} · {gr.visits.map((v) => monthLabel(v.visited_on)).join(', ')}
                      </button>
                    ))}
                  </span>
                  <span className="country-count">{c.groups.reduce((n, gr) => n + gr.visits.length, 0) === 1 ? '1 visita' : `${c.groups.reduce((n, gr) => n + gr.visits.length, 0)} visitas`}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="small" style={{ fontSize: 11 }}>
          Siluetas de países: Natural Earth. Búsqueda de sitios: © OpenStreetMap (necesita conexión).
        </p>
      </div>

      {adding && (
        <AddPlaceSheet
          initial={adding}
          close={() => {
            setAdding(null);
            clearFromTrip?.();
          }}
          save={(r, month, note) => {
            const now = ctx.now();
            store.dispatch([
              {
                kind: 'upsertRow',
                table: 'places',
                row: {
                  id: ctx.newId(),
                  household_id: ctx.householdId,
                  name: r.name,
                  detail: r.detail,
                  country: r.country,
                  lat: r.lat,
                  lng: r.lng,
                  visited_on: month,
                  note,
                  trip_id: adding.trip_id,
                  created_by: ctx.by,
                  created_at: now,
                  updated_at: now,
                },
              },
            ]);
            setAdding(null);
            clearFromTrip?.();
          }}
        />
      )}

      {picked && (
        <Sheet title={picked.name} close={() => setPicked(null)}>
          {picked.detail && <p className="note">{picked.detail}</p>}
          <ul className="menu-list">
            {picked.visits.map((v) => (
              <li key={v.id}>
                <VisitRow
                  visit={v}
                  save={(month, note) => store.dispatch([{ kind: 'upsertRow', table: 'places', row: { ...v, visited_on: month, note, updated_at: ctx.now() } }])}
                  remove={() => {
                    store.dispatch([{ kind: 'deleteRows', table: 'places', match: { id: v.id } }]);
                    setPicked(picked.visits.length > 1 ? { ...picked, visits: picked.visits.filter((x) => x.id !== v.id) } : null);
                  }}
                />
              </li>
            ))}
          </ul>
          <button
            className="secondary"
            onClick={() => {
              const v = picked.visits[0];
              const now = ctx.now();
              store.dispatch([
                {
                  kind: 'upsertRow',
                  table: 'places',
                  row: { ...v, id: ctx.newId(), visited_on: null, note: null, trip_id: null, created_by: ctx.by, created_at: now, updated_at: now },
                },
              ]);
              setPicked(null);
            }}
          >
            Hemos vuelto: añadir otra visita
          </button>
        </Sheet>
      )}
    </div>
  );
}

function VisitRow({ visit, save, remove }: { visit: Place; save: (month: string | null, note: string | null) => void; remove: () => void }) {
  const [month, setMonth] = useState(visit.visited_on ? visit.visited_on.slice(0, 7) : '');
  const [note, setNote] = useState(visit.note ?? '');
  const dirty = (toMonth(month) ?? null) !== (visit.visited_on ?? null) || (note || null) !== (visit.note ?? null);
  return (
    <div className="form" style={{ padding: '12px 14px', gap: 8 }}>
      <label>
        Cuándo
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
      </label>
      <label>
        Nota
        <input value={note} placeholder="Opcional: con los abuelos, boda de…" onChange={(e) => setNote(e.target.value)} />
      </label>
      <div className="row-gap" style={{ justifyContent: 'space-between' }}>
        <button className="link-btn" style={{ color: '#A3321F' }} onClick={remove}>
          Quitar esta visita
        </button>
        {dirty && (
          <button className="link-btn" onClick={() => save(toMonth(month), note.trim() || null)}>
            Guardar
          </button>
        )}
      </div>
    </div>
  );
}

function AddPlaceSheet({
  initial,
  close,
  save,
}: {
  initial: { q: string; month: string | null };
  close: () => void;
  save: (r: GeoResult, month: string | null, note: string | null) => void;
}) {
  const [q, setQ] = useState(initial.q);
  const [results, setResults] = useState<GeoResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chosen, setChosen] = useState<GeoResult | null>(null);
  const [month, setMonth] = useState(initial.month ? initial.month.slice(0, 7) : '');
  const [note, setNote] = useState('');

  async function search(e?: FormEvent) {
    e?.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const r = await searchPlaces(q.trim());
      setResults(r);
      if (r.length === 0) setError('No encuentro ese sitio. Prueba con la ciudad y el país.');
    } catch {
      setError('No se pudo buscar. ¿Hay conexión?');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (initial.q) void search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Sheet title="Añadir al mapa" close={close}>
      {!chosen ? (
        <>
          <form className="add" onSubmit={search}>
            <input autoFocus aria-label="Buscar sitio" placeholder="Ciudad, pueblo o país…" value={q} onChange={(e) => setQ(e.target.value)} />
            <button type="submit" className="add-btn" disabled={!q.trim() || busy} aria-label="Buscar">
              {busy ? '…' : '🔍'}
            </button>
          </form>
          {error && <p className="note">{error}</p>}
          {results && results.length > 0 && (
            <ul className="menu-list">
              {results.map((r, i) => (
                <li key={i}>
                  <button onClick={() => setChosen(r)}>
                    <span style={{ flex: 1 }}>
                      {r.name}
                      {r.detail && <div className="sub">{r.detail}</div>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <div className="form">
          <div className="hint-card">
            <strong>{chosen.name}</strong>
            {chosen.detail && <span className="small">{chosen.detail}</span>}
          </div>
          <label>
            Cuándo fuisteis
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </label>
          <label>
            Nota
            <input value={note} placeholder="Opcional" onChange={(e) => setNote(e.target.value)} />
          </label>
          <button className="primary" onClick={() => save(chosen, toMonth(month), note.trim() || null)}>
            Añadir al mapa
          </button>
          <button className="link-btn" onClick={() => setChosen(null)}>
            Elegir otro sitio
          </button>
        </div>
      )}
    </Sheet>
  );
}
