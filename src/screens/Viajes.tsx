import { useState, type FormEvent } from 'react';
import type { Store, StoreState } from '../lib/store';
import type { Ctx } from '../lib/logic';
import type { PackTemplateItem, PackWho, Trip, TripItem, TripType } from '../lib/types';
import { addTripItemOps, createTripOps, splitTrips, templateFor, TRIP_TYPES, tripProgress, tripWhen, WHO, whoLabel } from '../lib/trips';
import { isoDate } from '../lib/menu';
import { Back, Check, Chevron, Plus, Trash } from '../icons';
import { Sheet } from './Comida';

type View = { kind: 'list' } | { kind: 'trip'; id: string } | { kind: 'template' };

const WHO_TONE: Record<PackWho, { bg: string; fg: string }> = {
  comun: { bg: '#E3EFE7', fg: '#1F5C41' },
  adri: { bg: '#E1ECFB', fg: '#1D4E8F' },
  almu: { bg: '#F6E3F1', fg: '#7B2A66' },
  lorenzo: { bg: '#FFF1C9', fg: '#7A5400' },
  salida: { bg: '#ECE6FA', fg: '#4B2E91' },
};

export function Viajes({ store, state, ctx }: { store: Store; state: StoreState; ctx: Ctx }) {
  const [view, setView] = useState<View>({ kind: 'list' });
  if (view.kind === 'trip') {
    const trip = state.data.trips.find((t) => t.id === view.id);
    if (trip) return <TripScreen store={store} state={state} ctx={ctx} trip={trip} back={() => setView({ kind: 'list' })} />;
  }
  if (view.kind === 'template') return <TemplateScreen store={store} state={state} ctx={ctx} back={() => setView({ kind: 'list' })} />;
  return <TripList store={store} state={state} ctx={ctx} open={(id) => setView({ kind: 'trip', id })} openTemplate={() => setView({ kind: 'template' })} />;
}

function typesLabel(types: TripType[]) {
  return types.map((t) => TRIP_TYPES.find((x) => x.id === t)?.emoji).join(' ');
}

function Progress({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="progress" aria-label={`${done} de ${total} listos`}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ───────────────────────── Lista de viajes ───────────────────────── */

function TripList({ store, state, ctx, open, openTemplate }: { store: Store; state: StoreState; ctx: Ctx; open: (id: string) => void; openTemplate: () => void }) {
  const { data } = state;
  const today = isoDate(new Date());
  const { next, past } = splitTrips(data.trips, today);
  const [creating, setCreating] = useState(false);
  const [showPast, setShowPast] = useState(false);

  const card = (t: Trip) => {
    const p = tripProgress(data, t.id);
    return (
      <li key={t.id}>
        <button className="row-main" onClick={() => open(t.id)}>
          <span className="row-text">
            <span className="row-name" style={{ fontWeight: 700 }}>
              {t.name} {typesLabel(t.types)}
            </span>
            <span className="row-meta">
              {tripWhen(t, today)} · {p.total ? `${p.done}/${p.total} en la maleta` : 'maleta vacía'}
            </span>
            {p.total > 0 && <Progress {...p} />}
          </span>
          <Chevron />
        </button>
      </li>
    );
  };

  return (
    <div className="screen">
      <header className="band">
        <div>
          <div className="band-kicker">Rivendel</div>
          <h1>Viajes</h1>
        </div>
        <div className="menu-actions">
          <button className="add-big" onClick={() => setCreating(true)}>
            + Nuevo viaje
          </button>
          <button className="add-big ghost" onClick={openTemplate}>
            Plantilla
          </button>
        </div>
      </header>
      <div className="scroll">
        {next.length === 0 ? (
          <div className="empty">
            <strong>Ningún viaje a la vista</strong>
            Al crear un viaje se prepara la maleta de cada uno a partir de la plantilla, según el tipo de viaje (playa, nieve…). Lo que añadáis se queda
            en la plantilla para la próxima vez.
          </div>
        ) : (
          <ul className="card">{next.map(card)}</ul>
        )}
        {past.length > 0 && (
          <>
            <button className="link-btn" onClick={() => setShowPast(!showPast)}>
              {showPast ? 'Ocultar viajes pasados' : `Viajes pasados (${past.length})`}
            </button>
            {showPast && <ul className="card">{past.map(card)}</ul>}
          </>
        )}
      </div>
      {creating && (
        <NewTripSheet
          state={state}
          close={() => setCreating(false)}
          create={(input) => {
            const { trip, ops } = createTripOps(data, input, ctx);
            store.dispatch(ops);
            setCreating(false);
            open(trip.id);
          }}
        />
      )}
    </div>
  );
}

function TypeChips({ value, onChange }: { value: TripType[]; onChange: (v: TripType[]) => void }) {
  return (
    <div className="row-gap" style={{ flexWrap: 'wrap' }}>
      {TRIP_TYPES.map((t) => {
        const on = value.includes(t.id);
        return (
          <button
            key={t.id}
            type="button"
            className="chip"
            aria-pressed={on}
            style={on ? { background: '#2E7D5B', color: '#fff' } : { background: '#fff', color: '#1E2320', border: '1px solid #D9DAD4' }}
            onClick={() => onChange(on ? value.filter((x) => x !== t.id) : [...value, t.id])}
          >
            {t.emoji} {t.label}
          </button>
        );
      })}
    </div>
  );
}

function NewTripSheet({
  state,
  close,
  create,
  trip,
  remove,
}: {
  state: StoreState;
  close: () => void;
  create: (input: { name: string; start_date: string | null; end_date: string | null; types: TripType[] }) => void;
  trip?: Trip;
  remove?: () => void;
}) {
  const [name, setName] = useState(trip?.name ?? '');
  const [start, setStart] = useState(trip?.start_date ?? '');
  const [end, setEnd] = useState(trip?.end_date ?? '');
  const [types, setTypes] = useState<TripType[]>(trip?.types ?? []);
  const n = templateFor(state.data.packTemplate, types).length;
  return (
    <Sheet title={trip ? 'Editar viaje' : 'Nuevo viaje'} close={close}>
      <div className="form">
        <label>
          Adónde
          <input value={name} placeholder="Cádiz, casa de los abuelos…" onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="row-gap">
          <label style={{ flex: 1 }}>
            Ida
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label style={{ flex: 1 }}>
            Vuelta
            <input type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} />
          </label>
        </div>
        <div className="label">Tipo de viaje</div>
        <TypeChips value={types} onChange={setTypes} />
        {!trip && <p className="small">La maleta empezará con {n} cosas de la plantilla. Luego podéis quitar o añadir.</p>}
        <button className="primary" disabled={!name.trim()} onClick={() => create({ name, start_date: start || null, end_date: end || null, types })}>
          {trip ? 'Guardar' : 'Crear y preparar la maleta'}
        </button>
        {remove && (
          <button className="link-btn" style={{ color: '#B3261E' }} onClick={remove}>
            Borrar este viaje
          </button>
        )}
      </div>
    </Sheet>
  );
}

/* ───────────────────────── Un viaje: la maleta ───────────────────────── */

function TripScreen({ store, state, ctx, trip, back }: { store: Store; state: StoreState; ctx: Ctx; trip: Trip; back: () => void }) {
  const { data } = state;
  const today = isoDate(new Date());
  const items = data.tripItems.filter((i) => i.trip_id === trip.id);
  const p = tripProgress(data, trip.id);
  const [filter, setFilter] = useState<PackWho | 'todo'>('todo');
  const [text, setText] = useState('');
  const [who, setWho] = useState<PackWho>('comun');
  const [keep, setKeep] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editingTrip, setEditingTrip] = useState(false);
  const [hideDone, setHideDone] = useState(false);

  function add(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    store.dispatch(addTripItemOps(data, trip, text, filter === 'todo' ? who : filter, keep, ctx));
    setText('');
  }

  function toggle(i: TripItem) {
    store.dispatch([{ kind: 'upsertRow', table: 'trip_items', row: { ...i, done: !i.done, updated_at: ctx.now() } }]);
  }

  const groups = WHO.filter((w) => filter === 'todo' || w.id === filter)
    .map((w) => ({ ...w, items: items.filter((i) => i.who === w.id && (!hideDone || !i.done)).sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name)) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="screen">
      <header className="band" style={{ paddingTop: 'calc(10px + env(safe-area-inset-top))' }}>
        <div className="band-row">
          <button className="icon-btn" onClick={back} aria-label="Volver" style={{ marginLeft: -12 }}>
            <Back />
          </button>
          <span className="band-kicker">Viajes</span>
          <button className="link-btn" style={{ marginLeft: 'auto', color: '#fff' }} onClick={() => setEditingTrip(true)}>
            Editar
          </button>
        </div>
        <div>
          <h1 style={{ fontSize: 26 }}>
            {trip.name} {typesLabel(trip.types)}
          </h1>
          <div className="band-kicker" style={{ marginTop: 2 }}>
            {tripWhen(trip, today)} · {p.done}/{p.total} listos
          </div>
        </div>
        <div className="chips">
          {([{ id: 'todo', label: 'Todo' }, ...WHO] as { id: PackWho | 'todo'; label: string }[]).map((w) => {
            const n = w.id === 'todo' ? items.filter((i) => !i.done).length : items.filter((i) => i.who === w.id && !i.done).length;
            return (
              <button
                key={w.id}
                className="chip"
                aria-pressed={filter === w.id}
                style={filter === w.id ? { background: '#fff', color: '#1F5C41' } : { background: 'rgba(255,255,255,.16)', color: '#fff' }}
                onClick={() => setFilter(w.id)}
              >
                {w.label}
                {n > 0 && <span className="tab-count">{n}</span>}
              </button>
            );
          })}
        </div>
        <form className="add" onSubmit={add}>
          <input aria-label="Añadir a la maleta" placeholder={filter === 'todo' ? `Añadir (${whoLabel(who)})…` : `Añadir para ${whoLabel(filter)}…`} value={text} onChange={(e) => setText(e.target.value)} />
          <button type="submit" aria-label="Añadir" disabled={!text.trim()}>
            <Plus />
          </button>
        </form>
      </header>
      <div className="scroll">
        {text.trim() && (
          <div className="hint-card" style={{ gap: 10 }}>
            {filter === 'todo' && (
              <div className="row-gap" style={{ flexWrap: 'wrap' }}>
                {WHO.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    className="chip"
                    style={who === w.id ? { background: WHO_TONE[w.id].fg, color: '#fff', height: 34 } : { background: WHO_TONE[w.id].bg, color: WHO_TONE[w.id].fg, height: 34 }}
                    onClick={() => setWho(w.id)}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            )}
            <label className="row-gap" style={{ fontSize: 14 }}>
              <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} />
              Guardar también en la plantilla{trip.types.length ? ` (viajes de ${trip.types.map((t) => TRIP_TYPES.find((x) => x.id === t)?.label.toLowerCase()).join(', ')})` : ''}
            </label>
          </div>
        )}

        {items.length === 0 && (
          <div className="empty">
            <strong>Maleta vacía</strong>
            Añade lo que haga falta arriba. Si la plantilla está vacía, empieza por ahí (Viajes → Plantilla).
          </div>
        )}

        {groups.map((g) => (
          <section key={g.id} className="group">
            <h2 className="group-title" style={{ background: WHO_TONE[g.id].bg, color: WHO_TONE[g.id].fg }}>
              {g.label}
            </h2>
            <ul className="card">
              {g.items.map((i) => (
                <li key={i.id} className={i.done ? 'bought' : undefined}>
                  <div className="row">
                    <button className="row-main" onClick={() => toggle(i)} aria-label={`${i.done ? 'Desmarcar' : 'Marcar'}: ${i.name}`}>
                      <span className="ring" style={i.done ? { background: '#2E7D5B', borderColor: '#2E7D5B' } : { borderColor: '#2E7D5B' }}>
                        {i.done && <Check />}
                      </span>
                      <span className="row-text">
                        <span className="row-name">{i.name}</span>
                      </span>
                    </button>
                    {editMode && (
                      <button className="qty" aria-label={`Quitar ${i.name}`} onClick={() => store.dispatch([{ kind: 'deleteRows', table: 'trip_items', match: { id: i.id } }])}>
                        <Trash />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {items.length > 0 && (
          <div className="row-gap" style={{ justifyContent: 'space-between' }}>
            <button className="link-btn" onClick={() => setHideDone(!hideDone)}>
              {hideDone ? 'Mostrar lo ya guardado' : 'Ocultar lo ya guardado'}
            </button>
            <button className="link-btn" onClick={() => setEditMode(!editMode)}>
              {editMode ? 'Listo' : 'Quitar cosas'}
            </button>
          </div>
        )}
      </div>

      {editingTrip && (
        <NewTripSheet
          state={state}
          trip={trip}
          close={() => setEditingTrip(false)}
          create={(input) => {
            store.dispatch([{ kind: 'upsertRow', table: 'trips', row: { ...trip, ...input, name: input.name.trim(), updated_at: ctx.now() } }]);
            setEditingTrip(false);
          }}
          remove={() => {
            store.dispatch([
              { kind: 'deleteRows', table: 'trip_items', match: { trip_id: trip.id } },
              { kind: 'deleteRows', table: 'trips', match: { id: trip.id } },
            ]);
            back();
          }}
        />
      )}
    </div>
  );
}

/* ───────────────────────── Plantilla de maleta ───────────────────────── */

function TemplateScreen({ store, state, ctx, back }: { store: Store; state: StoreState; ctx: Ctx; back: () => void }) {
  const { data } = state;
  const [who, setWho] = useState<PackWho>('comun');
  const [text, setText] = useState('');
  const [editing, setEditing] = useState<PackTemplateItem | null>(null);
  const items = data.packTemplate.filter((t) => t.who === who).sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));

  function add(e: FormEvent) {
    e.preventDefault();
    const name = text.trim().replace(/^./, (c) => c.toUpperCase());
    if (!name) return;
    store.dispatch([
      {
        kind: 'upsertRow',
        table: 'pack_template',
        row: {
          id: ctx.newId(),
          household_id: ctx.householdId,
          name,
          who,
          types: [],
          sort: Math.max(0, ...data.packTemplate.map((t) => t.sort)) + 1,
          created_at: ctx.now(),
        },
      },
    ]);
    setText('');
  }

  return (
    <div className="screen">
      <header className="band" style={{ paddingTop: 'calc(10px + env(safe-area-inset-top))' }}>
        <div className="band-row">
          <button className="icon-btn" onClick={back} aria-label="Volver" style={{ marginLeft: -12 }}>
            <Back />
          </button>
          <span className="band-kicker">Viajes</span>
        </div>
        <h1>Plantilla de maleta</h1>
        <div className="chips">
          {WHO.map((w) => (
            <button
              key={w.id}
              className="chip"
              aria-pressed={who === w.id}
              style={who === w.id ? { background: '#fff', color: '#1F5C41' } : { background: 'rgba(255,255,255,.16)', color: '#fff' }}
              onClick={() => setWho(w.id)}
            >
              {w.label}
            </button>
          ))}
        </div>
        <form className="add" onSubmit={add}>
          <input aria-label="Añadir a la plantilla" placeholder={`Añadir para ${whoLabel(who)}…`} value={text} onChange={(e) => setText(e.target.value)} />
          <button type="submit" aria-label="Añadir" disabled={!text.trim()}>
            <Plus />
          </button>
        </form>
      </header>
      <div className="scroll">
        <p className="small">Lo que no tiene tipo va en todos los viajes. Toca una cosa para decir en qué viajes va (solo playa, solo nieve…).</p>
        {items.length === 0 ? (
          <div className="empty">
            <strong>Nada para {whoLabel(who)}</strong>
            Añade arriba lo que siempre hay que llevar.
          </div>
        ) : (
          <ul className="card">
            {items.map((t) => (
              <li key={t.id}>
                <button className="row-main" onClick={() => setEditing(t)}>
                  <span className="row-text">
                    <span className="row-name">{t.name}</span>
                    <span className="row-meta">
                      {t.types.length ? t.types.map((x) => TRIP_TYPES.find((y) => y.id === x)?.label).join(', ') : 'Todos los viajes'}
                    </span>
                  </span>
                  <Chevron />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {editing && <TemplateItemSheet key={editing.id} item={editing} store={store} close={() => setEditing(null)} />}
    </div>
  );
}

function TemplateItemSheet({ item, store, close }: { item: PackTemplateItem; store: Store; close: () => void }) {
  const [it, setIt] = useState(item);
  return (
    <Sheet title="Plantilla" close={close}>
      <div className="form">
        <label>
          Qué
          <input value={it.name} onChange={(e) => setIt({ ...it, name: e.target.value })} />
        </label>
        <label>
          De quién
          <select value={it.who} onChange={(e) => setIt({ ...it, who: e.target.value as PackWho })}>
            {WHO.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label}
              </option>
            ))}
          </select>
        </label>
        <div className="label">Solo en viajes de… (nada marcado = todos)</div>
        <TypeChips value={it.types} onChange={(types) => setIt({ ...it, types })} />
        <button
          className="primary"
          disabled={!it.name.trim()}
          onClick={() => {
            store.dispatch([{ kind: 'upsertRow', table: 'pack_template', row: { ...it, name: it.name.trim() } }]);
            close();
          }}
        >
          Guardar
        </button>
        <button
          className="link-btn"
          style={{ color: '#B3261E' }}
          onClick={() => {
            store.dispatch([{ kind: 'deleteRows', table: 'pack_template', match: { id: it.id } }]);
            close();
          }}
        >
          Quitar de la plantilla
        </button>
      </div>
    </Sheet>
  );
}
