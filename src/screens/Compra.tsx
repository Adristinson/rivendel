import { useMemo, useState, type FormEvent } from 'react';
import type { Store, StoreState } from '../lib/store';
import {
  addByName,
  boughtRows,
  categoryTone,
  clearBought,
  findProduct,
  groupPending,
  habituales,
  setNote,
  setQty,
  suggestions,
  toggleBought,
  type Ctx,
  type Row,
} from '../lib/logic';
import { Check, CloudOff, Minus, Plus, Trash } from '../icons';
import { tone } from '../lib/palette';

function fmtQty(q: number) {
  return Number.isInteger(q) ? String(q) : q.toLocaleString('es-ES');
}

export function Compra({ store, state, ctx }: { store: Store; state: StoreState; ctx: Ctx }) {
  const { data } = state;
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [askCat, setAskCat] = useState<{ id: string; name: string } | null>(null);
  const now = () => new Date().toISOString();

  const groups = useMemo(() => groupPending(data), [data]);
  const bought = useMemo(() => boughtRows(data), [data]);
  const habs = useMemo(() => habituales(data), [data]);
  const sugg = useMemo(() => suggestions(data, q), [data, q]);
  const exact = q.trim() ? findProduct(data, q) : undefined;
  const pendingCount = data.items.filter((i) => !i.bought).length;
  const pendingIds = new Set(data.items.filter((i) => !i.bought).map((i) => i.product_id));

  function add(name: string) {
    const ops = addByName(data, name, ctx);
    const created = ops.find((o) => o.kind === 'upsertProduct');
    store.dispatch(ops);
    if (created && created.kind === 'upsertProduct') setAskCat({ id: created.product.id, name: created.product.name });
    setQ('');
  }

  const cats = [...data.categories].sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, 'es'));

  function submit(e: FormEvent) {
    e.preventDefault();
    if (sugg.length > 0 && !exact) add(sugg[0].name);
    else add(q);
  }

  function renderRow(r: Row, isBought: boolean) {
    const { item, product, tone } = r;
    const expanded = open === item.id;
    const meta =
      item.note ??
      (item.source === 'menu' ? 'Del menú de la semana' : item.added_by ? `Añadido por ${item.added_by}` : '');
    return (
      <li key={item.id} className={isBought ? 'bought' : undefined}>
        <div className="row">
          <button
            className="row-main"
            onClick={() => store.dispatch(toggleBought(data, item.id, now()))}
            aria-label={`${isBought ? 'Desmarcar' : 'Marcar como comprado'}: ${product.name}`}
          >
            <span
              className="ring"
              style={isBought ? { background: '#2E7D5B', borderColor: '#2E7D5B' } : { borderColor: tone.dot }}
            >
              {isBought && <Check />}
            </span>
            <span className="row-text">
              <span className="row-name">{product.name}</span>
              {!isBought && meta && <span className="row-meta">{meta}</span>}
            </span>
            {!isBought && item.source === 'menu' && <span className="tag-menu">menú</span>}
          </button>
          <button
            className="qty"
            onClick={() => setOpen(expanded ? null : item.id)}
            aria-expanded={expanded}
            aria-label={`Cantidad de ${product.name}: ${fmtQty(item.qty)}. Editar`}
          >
            <span style={isBought ? { color: '#6B716D', background: '#ECEDEA' } : { color: tone.fg, background: tone.bg }}>
              ×{fmtQty(item.qty)}
            </span>
          </button>
        </div>
        {expanded && (
          <div className="editor">
            <div className="stepper">
              <button aria-label="Quitar uno" onClick={() => store.dispatch(setQty(data, item.id, item.qty - 1, now()))}>
                <Minus />
              </button>
              <output aria-live="polite">{fmtQty(item.qty)}</output>
              <button aria-label="Añadir uno" onClick={() => store.dispatch(setQty(data, item.id, item.qty + 1, now()))}>
                <Plus size={20} />
              </button>
              <button
                className="danger"
                onClick={() => {
                  store.dispatch(setQty(data, item.id, 0, now()));
                  setOpen(null);
                }}
              >
                <Trash size={18} /> Quitar
              </button>
            </div>
            <input
              className="field"
              placeholder="Nota (marca, tamaño…)"
              aria-label={`Nota para ${product.name}`}
              defaultValue={item.note ?? ''}
              onBlur={(e) => {
                if ((e.target.value.trim() || null) !== item.note) store.dispatch(setNote(data, item.id, e.target.value, now()));
              }}
            />
          </div>
        )}
      </li>
    );
  }

  return (
    <div className="screen">
      <header className="band">
        <div className="band-top">
          <div>
            <div className="band-kicker">Rivendel</div>
            <h1>Compra</h1>
          </div>
          <span className="pill">{pendingCount} por comprar</span>
        </div>
        <form className="add" onSubmit={submit} role="search">
          <input
            aria-label="Añadir producto"
            placeholder="Añadir producto…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoComplete="off"
            enterKeyHint="done"
          />
          <button className="add-btn" aria-label="Añadir" disabled={!q.trim()}>
            <Plus />
          </button>
          {q.trim() && (
            <div className="suggest">
              {sugg.map((p) => (
                <button type="button" key={p.id} onClick={() => add(p.name)}>
                  <span>{p.name}</span>
                  <span className="hint">
                    {pendingIds.has(p.id) ? 'ya en la lista · +1' : data.categories.find((c) => c.id === p.category_id)?.name}
                  </span>
                </button>
              ))}
              {!exact && (
                <button type="button" className="create" onClick={() => add(q)}>
                  Crear «{q.trim()}» y añadir
                </button>
              )}
            </div>
          )}
        </form>
      </header>

      <div className="scroll">
        {(!state.online || state.pending > 0) && (
          <div className="status" role="status">
            <CloudOff />
            {state.online
              ? `Guardando ${state.pending} cambio${state.pending === 1 ? '' : 's'}…`
              : 'Sin conexión. Puedes seguir usando la lista; se sincroniza al volver.'}
          </div>
        )}

        {habs.length > 0 && (
          <section aria-label="Habituales" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="label">Habituales</div>
            <div className="chips">
              {habs.map((p) => {
                const t = categoryTone(data, p);
                return (
                  <button key={p.id} className="chip" style={{ background: t.bg, color: t.fg }} onClick={() => add(p.name)}>
                    <Plus size={14} w={2.6} />
                    {p.name}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {groups.length === 0 && bought.length === 0 && state.loaded && (
          <div className="empty">
            <strong>La lista está vacía</strong>
            Añade lo que falte escribiendo arriba o con un toque en los habituales.
          </div>
        )}

        {groups.map((g) => (
          <section className="group" key={g.category?.id ?? 'none'}>
            <h2 className="group-title" style={{ background: g.tone.bg, color: g.tone.fg }}>
              <span className="dot" style={{ background: g.tone.dot }} />
              {g.name}
            </h2>
            <ul className="card">{g.rows.map((r) => renderRow(r, false))}</ul>
          </section>
        ))}

        {askCat && (
          <div className="sheet-backdrop" onClick={() => setAskCat(null)}>
            <div className="sheet" role="dialog" aria-modal="true" aria-label="Elegir categoría" onClick={(e) => e.stopPropagation()}>
              <div className="sheet-head">
                <h2>¿En qué sección va «{askCat.name}»?</h2>
              </div>
              <div className="sheet-body">
                <div className="row-gap" style={{ flexWrap: 'wrap' }}>
                  {cats.map((c) => {
                    const t = tone(c.color);
                    return (
                      <button
                        key={c.id}
                        className="chip"
                        style={{ background: t.bg, color: t.fg }}
                        onClick={() => {
                          store.dispatch([{ kind: 'updateProduct', id: askCat.id, patch: { category_id: c.id } }]);
                          setAskCat(null);
                        }}
                      >
                        <span className="dot" style={{ background: t.dot }} />
                        {c.name}
                      </button>
                    );
                  })}
                </div>
                <p className="small">Se recuerda para la próxima vez. Puedes cambiarla o crear categorías en Más → Productos.</p>
              </div>
            </div>
          </div>
        )}

        {bought.length > 0 && (
          <section className="group">
            <div className="section-head">
              <h2 className="group-title" style={{ background: '#ECEDEA', color: '#454B47' }}>
                Comprados · {bought.length}
              </h2>
              <button className="link-btn" onClick={() => store.dispatch(clearBought(data))}>
                Limpiar comprados
              </button>
            </div>
            <ul className="card">{bought.map((r) => renderRow(r, true))}</ul>
          </section>
        )}
      </div>
    </div>
  );
}
