import { useEffect, useRef, useState, type FormEvent } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Store, StoreState } from '../lib/store';
import type { Ctx } from '../lib/logic';
import type { Place, Trip } from '../lib/types';
import { groupPlaces, monthLabel, placeStats, searchPlaces, toMonth, type GeoResult } from '../lib/places';
import { Sheet } from './Comida';

type Group = ReturnType<typeof groupPlaces>[number];

function WorldMap({ groups, onPick }: { groups: Group[]; onPick: (g: Group) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { worldCopyJump: true, zoomControl: false, attributionControl: true }).setView([30, 0], 1);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
      subdomains: 'abcd',
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(m);
    m.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
    L.control.zoom({ position: 'bottomright' }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const m = map.current;
    const lg = layer.current;
    if (!m || !lg) return;
    lg.clearLayers();
    for (const g of groups) {
      const mk = L.circleMarker([g.lat, g.lng], { radius: 8, color: '#33501E', weight: 2, fillColor: '#E9B949', fillOpacity: 1 });
      mk.bindTooltip(`${g.name} · ${g.visits.map((v) => monthLabel(v.visited_on)).join(', ')}`);
      mk.on('click', () => onPick(g));
      mk.addTo(lg);
    }
    if (groups.length === 1) m.setView([groups[0].lat, groups[0].lng], 5);
    else if (groups.length > 1) m.fitBounds(L.latLngBounds(groups.map((g) => [g.lat, g.lng] as [number, number])), { padding: [30, 30], maxZoom: 6 });
    setTimeout(() => m.invalidateSize(), 50);
  }, [groups, onPick]);

  return <div ref={el} className="world-map" role="img" aria-label="Mapa con los sitios visitados" />;
}

export function Mapa({ store, state, ctx, tabs, fromTrip, clearFromTrip }: { store: Store; state: StoreState; ctx: Ctx; tabs: React.ReactNode; fromTrip?: Trip | null; clearFromTrip?: () => void }) {
  const places = state.data.places ?? [];
  const groups = groupPlaces(places);
  const stats = placeStats(places);
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
        <WorldMap groups={groups} onPick={setPicked} />
        {places.length === 0 ? (
          <div className="empty">
            <strong>El mapa está en blanco</strong>
            Añade los sitios donde habéis estado con su fecha. Cada viaje terminado también se puede pasar al mapa desde su ficha.
          </div>
        ) : (
          <>
            <p className="small">
              {stats.places === 1 ? '1 sitio' : `${stats.places} sitios`} · {stats.countries === 1 ? '1 país' : `${stats.countries} países`}
              {stats.visits > stats.places ? ` · ${stats.visits} visitas` : ''}
            </p>
            <ul className="card">
              {groups.map((g) => (
                <li key={g.key}>
                  <button className="row-main" onClick={() => setPicked(g)}>
                    <span className="ledger-icon" style={{ background: '#F6E7BE', color: '#7A5232' }}>
                      ●
                    </span>
                    <span className="row-text">
                      <span className="row-name">{g.name}</span>
                      <span className="row-meta">
                        {g.detail ? `${g.detail} · ` : ''}
                        {g.visits.map((v) => monthLabel(v.visited_on)).join(', ')}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="small" style={{ fontSize: 11 }}>
          Mapa y búsqueda de sitios: © OpenStreetMap y CARTO. Necesitan conexión.
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
