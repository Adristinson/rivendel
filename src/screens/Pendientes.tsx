import { useEffect, useState, type FormEvent } from 'react';
import type { Store, StoreState } from '../lib/store';
import type { Ctx } from '../lib/logic';
import type { Repeat, Todo, TodoList } from '../lib/types';
import { isoDate } from '../lib/menu';
import { complete, doneOf, dueLabel, IDEA_TAGS, LISTS, openOf, REPEATS } from '../lib/todos';
import { Back, Check, Plus } from '../icons';

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
  back: () => void;
  initialList?: TodoList;
}) {
  const [list, setList] = useState<TodoList>(initialList);
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
    const extras = [
      t.repeat ? REPEATS.find((r) => r.id === t.repeat)?.label : null,
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
            <span className="ring" style={t.done ? { background: '#2E7D5B', borderColor: '#2E7D5B' } : { borderColor: '#2E7D5B' }}>
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

  return (
    <div className="screen">
      <header className="band" style={{ paddingTop: 'calc(10px + env(safe-area-inset-top))' }}>
        <div className="band-row">
          <button className="icon-btn" onClick={back} aria-label="Volver" style={{ marginLeft: -12 }}>
            <Back />
          </button>
          <span className="band-kicker">Más</span>
        </div>
        <h1 style={{ fontSize: 26 }}>Pendientes e ideas</h1>
        <div className="tabs three" role="tablist">
          {LISTS.map((l) => {
            const n = openOf(todos, l.id).length;
            return (
              <button key={l.id} role="tab" aria-selected={list === l.id} aria-pressed={list === l.id} onClick={() => setList(l.id)}>
                {l.label}
                {n > 0 ? ` · ${n}` : ''}
              </button>
            );
          })}
        </div>
        <form className="add" onSubmit={add}>
          <input
            aria-label={`Añadir a ${meta.label}`}
            placeholder={list === 'ideas' ? 'Nueva idea de plan…' : list === 'comprar' ? 'Algo que comprar…' : 'Algo por hacer…'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            enterKeyHint="done"
          />
          <button className="add-btn" aria-label="Añadir" disabled={!text.trim()}>
            <Plus />
          </button>
        </form>
      </header>

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
                      onClick={() => setT({ ...t, repeat: r.id as Repeat, due: t.due ?? isoDate(new Date()) })}
                    >
                      {r.label.replace('Cada ', '')}
                    </button>
                  ))}
                </div>
                {t.repeat && <p className="small">Al marcarla como hecha, vuelve a aparecer en la próxima fecha.</p>}
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
                        style={on ? { background: '#2E7D5B', color: '#fff' } : { background: '#fff', color: '#1E2320', border: '1px solid #D9DAD4' }}
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
