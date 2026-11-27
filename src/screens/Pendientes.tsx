import { useEffect, useState, type FormEvent } from 'react';
import type { Store, StoreState } from '../lib/store';
import type { Ctx } from '../lib/logic';
import type { FreezerItem, Repeat, Todo, TodoList } from '../lib/types';
import { isoDate } from '../lib/menu';
import { complete, doneOf, isLongRepeat, dueLabel, fmtDay, frozenLabel, IDEA_TAGS, lastDone, LISTS, nextDue, openOf, REPEATS, setLastDone, sortFreezer } from '../lib/todos';
import { Back, Check, Minus, Plus } from '../icons';

type Tab = TodoList | 'congelador';

const TONE: Record<string, { bg: string; fg: string }> = {
  late: { bg: '#FCE4DF', fg: '#9A2E1E' },
  today: { bg: '#FFE2C6', fg: '#8A3B00' },
  soon: { bg: '#E1ECFB', fg: '#1D4E8F' },
  later: { bg: '#ECEDEA', fg: '#454B47' },
};

export function Pendientes({
  store,
  state,
  ctx,
  back,
  initialList = 'casa',
}: {
  store: Store;
  state: StoreState;
  ctx: Ctx;
  back?: () => void;
  initialList?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialList);
  const list: TodoList = tab === 'congelador' ? 'casa' : tab;
  const [frozenEditing, setFrozenEditing] = useState<FreezerItem | null>(null);
  const [toast, setToast] = useState<{ text: string; undo?: () => void } | null>(null);
  const freezer = sortFreezer(state.data.freezer ?? []);
  const portionsTotal = freezer.reduce((n, i) => n + i.portions, 0);
  const [text, setText] = useState('');
  const [editing, setEditing] = useState<Todo | null>(null);
  const [showDone, setShowDone] = useState(false);
  const today = isoDate(new Date());
  const todos = state.data.todos;
  const open = openOf(todos, list);
  const done = doneOf(todos, list);
  const meta = LISTS.find((l) => l.id === list)!;

  function add(e: FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    const now = ctx.now();
    if (tab === 'congelador') {
      // "3 lentejas" → 3 raciones de Lentejas
      const m = t.match(/^(\d{1,2})\s*(?:x\s*)?(?:raci[oó]n(?:es)?\s+de\s+)?(.+)$/i);
      const name = (m ? m[2] : t).trim();
      store.dispatch([
        {
          kind: 'upsertRow',
          table: 'freezer',
          row: {
            id: ctx.newId(),
            household_id: ctx.householdId,
            name: name.charAt(0).toUpperCase() + name.slice(1),
            portions: m ? Math.max(1, Number(m[1])) : 1,
            frozen_on: today,
            note: null,
            created_by: ctx.by,
            created_at: now,
            updated_at: now,
          },
        },
      ]);
      setText('');
      return;
    }
    store.dispatch([
      {
        kind: 'upsertRow',
        table: 'todos',
        row: {
          id: ctx.newId(),
          household_id: ctx.householdId,
          list,
          text: t.charAt(0).toUpperCase() + t.slice(1),
          note: null,
          due: null,
          repeat: null,
          tags: [],
          done: false,
          done_at: null,
          done_log: [],
          created_by: ctx.by,
          created_at: now,
          updated_at: now,
        },
      },
    ]);
    setText('');
  }

  function toggle(t: Todo) {
    store.dispatch([{ kind: 'upsertRow', table: 'todos', row: complete(t, today, ctx.now()) }]);
  }

  function row(t: Todo) {
    const due = dueLabel(t.due, today);
    const tone = due ? TONE[due.tone] : null;
    const last = lastDone(t);
    const extras = [
      t.repeat ? REPEATS.find((r) => r.id === t.repeat)?.label : null,
      t.repeat && last ? `última vez ${fmtDay(last)}` : t.repeat && !t.due ? 'indica cuándo se hizo la última vez' : null,
      ...t.tags.map((g) => IDEA_TAGS.find((x) => x.id === g)?.label ?? g),
      t.note,
    ].filter(Boolean);
    return (
      <li key={t.id} className={t.done ? 'bought' : undefined}>
        <div className="row">
          <button
            className="row-main"
            onClick={() => toggle(t)}
            aria-label={`${t.done ? 'Desmarcar' : t.repeat ? 'Hecho (vuelve a aparecer)' : 'Marcar como hecho'}: ${t.text}`}
          >
            <span className="ring" style={t.done ? { background: 'var(--brand)', borderColor: 'var(--brand)' } : { borderColor: 'var(--brand)' }}>
              {t.done && <Check />}
            </span>
            <span className="row-text">
              <span className="row-name">{t.text}</span>
              {!t.done && extras.length > 0 && <span className="row-meta">{extras.join(' · ')}</span>}
            </span>
          </button>
          {!t.done && due && tone && (
            <span className="due" style={{ background: tone.bg, color: tone.fg }}>
              {due.text}
            </span>
          )}
          <button className="qty" aria-label={`Editar ${t.text}`} onClick={() => setEditing(t)}>
            <span style={{ color: '#5F6661', fontSize: 20, padding: 0 }}>⋯</span>
          </button>
        </div>
      </li>
    );
  }

  function takeOne(it: FreezerItem) {
    const now = ctx.now();
    if (it.portions <= 1) {
      store.dispatch([{ kind: 'deleteRows', table: 'freezer', match: { id: it.id } }]);
      setToast({ text: `${it.name}: se ha acabado`, undo: () => store.dispatch([{ kind: 'upsertRow', table: 'freezer', row: { ...it, updated_at: ctx.now() } }]) });
    } else {
      store.dispatch([{ kind: 'upsertRow', table: 'freezer', row: { ...it, portions: it.portions - 1, updated_at: now } }]);
    }
  }

  function freezerRow(it: FreezerItem) {
    const age = frozenLabel(it, today);
    return (
      <li key={it.id}>
        <div className="row">
          <button className="row-main" onClick={() => setFrozenEditing(it)} aria-label={`Editar ${it.name}`}>
            <span className="ledger-icon" style={{ background: '#E1ECFB', color: '#1D4E8F' }}>
              ❄
            </span>
            <span className="row-text">
              <span className="row-name">{it.name}</span>
              <span className="row-meta">
                {it.portions === 1 ? '1 ración' : `${it.portions} raciones`} · {fmtDay(it.frozen_on, it.frozen_on.slice(0, 4) !== today.slice(0, 4))}
                {it.note ? ` · ${it.note}` : ''}
              </span>
            </span>
          </button>
          <span className="due" style={age.old ? { background: '#FCE4DF', color: '#9A2E1E' } : { background: '#ECEDEA', color: '#454B47' }}>
            {age.text}
          </span>
          <button className="qty" aria-label={`Sacar una ración de ${it.name}`} onClick={() => takeOne(it)}>
            <Minus />
          </button>
        </div>
      </li>
    );
  }

  return (
    <div className="screen">
      <header className="band" style={back ? { paddingTop: 'calc(10px + env(safe-area-inset-top))' } : undefined}>
        {back && (
          <div className="band-row">
            <button className="icon-btn" onClick={back} aria-label="Volver" style={{ marginLeft: -12 }}>
              <Back />
            </button>
            <span className="band-kicker">Ajustes</span>
          </div>
        )}
        {!back && <div className="band-kicker">Rivendel</div>}
        <h1 style={{ fontSize: back ? 26 : 28 }}>Pendientes</h1>
        <div className="tabs four" role="tablist">
          {LISTS.map((l) => {
            const n = l.id === 'ideas' ? 0 : openOf(todos, l.id).length; // las ideas se guardan, no son pendientes
            return (
              <button key={l.id} role="tab" aria-selected={tab === l.id} aria-pressed={tab === l.id} onClick={() => setTab(l.id)}>
                {l.label}
                {n > 0 && (
                  <span className="tab-count" aria-label={`${n} pendientes`}>
                    {n}
                  </span>
                )}
              </button>
            );
          })}
          <button role="tab" aria-selected={tab === 'congelador'} aria-pressed={tab === 'congelador'} onClick={() => setTab('congelador')}>
            Congelador
          </button>
        </div>
        <form className="add" onSubmit={add}>
          <input
            aria-label={tab === 'congelador' ? 'Añadir al congelador' : `Añadir a ${meta.label}`}
            placeholder={
              tab === 'congelador' ? 'Qué congeláis (ej. 3 lentejas)…' : list === 'ideas' ? 'Nueva idea de plan…' : list === 'comprar' ? 'Algo que comprar…' : 'Algo por hacer…'
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            enterKeyHint="done"
          />
          <button className="add-btn" aria-label="Añadir" disabled={!text.trim()}>
            <Plus />
          </button>
        </form>
      </header>

      {tab === 'congelador' ? (
        <div className="scroll">
          {freezer.length === 0 ? (
            <div className="empty">
              <strong>El congelador está vacío</strong>
              Apunta lo que congeláis y cuántas raciones. Lo más antiguo sale arriba, y a partir de 3 meses se marca en rojo para gastarlo antes.
            </div>
          ) : (
            <>
              <div className="section-head">
                <span className="small">
                  {freezer.length === 1 ? '1 cosa' : `${freezer.length} cosas`} · {portionsTotal === 1 ? '1 ración' : `${portionsTotal} raciones`} · lo más antiguo primero
                </span>
              </div>
              <ul className="card">{freezer.map(freezerRow)}</ul>
              <p className="small">Toca − cuando saquéis una ración. Al sacar la última desaparece de la lista.</p>
            </>
          )}
        </div>
      ) : (
      <div className="scroll">
        {open.length === 0 ? (
          <div className="empty">
            <strong>{list === 'ideas' ? 'Sin ideas guardadas' : 'Nada pendiente'}</strong>
            {meta.hint}
          </div>
        ) : (
          <ul className="card">{open.map(row)}</ul>
        )}
        {done.length > 0 && (
          <section className="group">
            <div className="section-head">
              <button className="link-btn" onClick={() => setShowDone(!showDone)}>
                {showDone ? 'Ocultar' : 'Ver'} {list === 'ideas' ? 'planes hechos' : 'hechos'} ({done.length})
              </button>
              {showDone && list !== 'ideas' && (
                <button
                  className="link-btn"
                  onClick={() => store.dispatch(done.map((t) => ({ kind: 'deleteRows' as const, table: 'todos' as const, match: { id: t.id } })))}
                >
                  Borrar hechos
                </button>
              )}
            </div>
            {showDone && <ul className="card">{done.map(row)}</ul>}
          </section>
        )}
        {list === 'ideas' && done.length > 0 && (
          <p className="small">Los planes hechos se guardan para repetir los que gustaron: tócalos para devolverlos a la lista.</p>
        )}
      </div>
      )}

      {frozenEditing && (
        <FreezerSheet
          key={frozenEditing.id}
          item={frozenEditing}
          close={() => setFrozenEditing(null)}
          save={(it) => {
            store.dispatch([{ kind: 'upsertRow', table: 'freezer', row: { ...it, updated_at: ctx.now() } }]);
            setFrozenEditing(null);
          }}
          remove={() => {
            const it = frozenEditing;
            store.dispatch([{ kind: 'deleteRows', table: 'freezer', match: { id: it.id } }]);
            setFrozenEditing(null);
            setToast({ text: `${it.name}: quitado del congelador`, undo: () => store.dispatch([{ kind: 'upsertRow', table: 'freezer', row: { ...it, updated_at: ctx.now() } }]) });
          }}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          {toast.text}
          {toast.undo ? (
            <button
              onClick={() => {
                toast.undo?.();
                setToast(null);
              }}
            >
              Deshacer
            </button>
          ) : (
            <button onClick={() => setToast(null)}>Vale</button>
          )}
        </div>
      )}

      {editing && (
        <TodoSheet
          key={editing.id}
          todo={editing}
          close={() => setEditing(null)}
          save={(t) => {
            store.dispatch([{ kind: 'upsertRow', table: 'todos', row: { ...t, updated_at: ctx.now() } }]);
            setEditing(null);
          }}
          remove={() => {
            store.dispatch([{ kind: 'deleteRows', table: 'todos', match: { id: editing.id } }]);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function TodoSheet({ todo, close, save, remove }: { todo: Todo; close: () => void; save: (t: Todo) => void; remove: () => void }) {
  const [t, setT] = useState<Todo>(todo);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);
  const isIdea = t.list === 'ideas';

  return (
    <div className="sheet-backdrop" onClick={close}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Editar" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>Editar</h2>
          <button className="icon-btn" aria-label="Cerrar" onClick={close}>
            ✕
          </button>
        </div>
        <div className="sheet-body">
          <div className="form">
            <label>
              Texto
              <input value={t.text} onChange={(e) => setT({ ...t, text: e.target.value })} />
            </label>
            <label>
              Nota
              <input value={t.note ?? ''} placeholder="Opcional" onChange={(e) => setT({ ...t, note: e.target.value || null })} />
            </label>
            <label>
              Lista
              <select value={t.list} onChange={(e) => setT({ ...t, list: e.target.value as TodoList })}>
                {LISTS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
            {!isIdea && (
              <>
                <label>
                  Fecha
                  <input type="date" value={t.due ?? ''} onChange={(e) => setT({ ...t, due: e.target.value || null })} />
                </label>
                <div className="label">Repetir</div>
                <div className="seg" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                  <button aria-pressed={!t.repeat} onClick={() => setT({ ...t, repeat: null })}>
                    No
                  </button>
                  {REPEATS.map((r) => (
                    <button
                      key={r.id}
                      aria-pressed={t.repeat === r.id}
                      onClick={() => {
                        const last = lastDone(t);
                        setT({
                          ...t,
                          repeat: r.id as Repeat,
                          due: last ? nextDue(last, r.id as Repeat) : (t.due ?? isoDate(new Date())),
                          notify: t.notify || isLongRepeat(r.id as Repeat),
                        });
                      }}
                    >
                      {r.label.replace('Cada ', '')}
                    </button>
                  ))}
                </div>
                {t.repeat && (
                  <>
                    <label>
                      Última vez que se hizo
                      <input
                        type="date"
                        value={lastDone(t) ?? ''}
                        max={isoDate(new Date())}
                        onChange={(e) => e.target.value && setT(setLastDone(t, e.target.value, new Date().toISOString()))}
                      />
                    </label>
                    <p className="small">
                      Al marcarla como hecha se apunta el día y vuelve a aparecer en la próxima fecha
                      {t.due ? ` (ahora: ${fmtDay(t.due, true)})` : ''}. Ese día sale en Hoy.
                    </p>
                    {(t.done_log ?? []).length > 1 && (
                      <p className="small">
                        Historial: {[...(t.done_log ?? [])].reverse().map((d) => fmtDay(d, true)).join(' · ')}
                      </p>
                    )}
                  </>
                )}
                {(t.due || t.repeat) && (
                  <button
                    type="button"
                    className="toggle-row"
                    role="switch"
                    aria-checked={!!t.notify}
                    onClick={() => setT({ ...t, notify: !t.notify })}
                  >
                    <span style={{ flex: 1, textAlign: 'left' }}>
                      Avisar al móvil
                      <span className="small" style={{ display: 'block', fontWeight: 400 }}>
                        Un aviso la mañana del día que toca
                      </span>
                    </span>
                    <span className={`switch${t.notify ? ' on' : ''}`} aria-hidden />
                  </button>
                )}
              </>
            )}
            {isIdea && (
              <>
                <div className="label">Etiquetas</div>
                <div className="row-gap" style={{ flexWrap: 'wrap' }}>
                  {IDEA_TAGS.map((g) => {
                    const on = t.tags.includes(g.id);
                    return (
                      <button
                        key={g.id}
                        className="chip"
                        aria-pressed={on}
                        style={on ? { background: 'var(--brand)', color: '#fff' } : { background: 'var(--card)', color: 'var(--ink)', border: '1px solid var(--line)' }}
                        onClick={() => setT({ ...t, tags: on ? t.tags.filter((x) => x !== g.id) : [...t.tags, g.id] })}
                      >
                        {g.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            <button className="primary" disabled={!t.text.trim()} onClick={() => save({ ...t, text: t.text.trim() })}>
              Guardar
            </button>
            <button className="link-btn" style={{ color: '#B3261E' }} onClick={remove}>
              Borrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FreezerSheet({ item, close, save, remove }: { item: FreezerItem; close: () => void; save: (it: FreezerItem) => void; remove: () => void }) {
  const [it, setIt] = useState<FreezerItem>(item);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);
  return (
    <div className="sheet-backdrop" onClick={close}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Congelador" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>Congelador</h2>
          <button className="icon-btn" aria-label="Cerrar" onClick={close}>
            ✕
          </button>
        </div>
        <div className="sheet-body">
          <div className="form">
            <label>
              Qué es
              <input value={it.name} onChange={(e) => setIt({ ...it, name: e.target.value })} />
            </label>
            <div className="label">Raciones</div>
            <div className="stepper">
              <button aria-label="Una ración menos" disabled={it.portions <= 1} onClick={() => setIt({ ...it, portions: it.portions - 1 })}>
                <Minus />
              </button>
              <output>{it.portions}</output>
              <button aria-label="Una ración más" onClick={() => setIt({ ...it, portions: it.portions + 1 })}>
                <Plus />
              </button>
            </div>
            <label>
              Congelado el
              <input type="date" value={it.frozen_on} max={isoDate(new Date())} onChange={(e) => e.target.value && setIt({ ...it, frozen_on: e.target.value })} />
            </label>
            <label>
              Nota
              <input value={it.note ?? ''} placeholder="Opcional: táper azul, cajón de abajo…" onChange={(e) => setIt({ ...it, note: e.target.value || null })} />
            </label>
            <button className="primary" disabled={!it.name.trim()} onClick={() => save({ ...it, name: it.name.trim() })}>
              Guardar
            </button>
            <button className="link-btn" style={{ color: '#B3261E' }} onClick={remove}>
              Se ha acabado (quitar)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
