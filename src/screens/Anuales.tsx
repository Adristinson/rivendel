import { useState } from 'react';
import type { Store, StoreState } from '../lib/store';
import type { Ctx } from '../lib/logic';
import type { Op, Repeat, Todo } from '../lib/types';
import { fmtEuro, nameOf, otherMember, parseAmount } from '../lib/accounts';
import { annualTotal, complete, dueLabel, dueToday, fmtDay, lastDone, PAY_NOTICE_DAYS, payments } from '../lib/todos';
import { isoDate } from '../lib/menu';
import { Sheet } from './Comida';

export type FinanzasSub = 'cuentas' | 'anuales';

export function FinanzasTabs({ sub, setSub, dueSoon }: { sub: FinanzasSub; setSub: (s: FinanzasSub) => void; dueSoon: number }) {
  return (
    <div className="tabs" role="tablist">
      <button role="tab" aria-pressed={sub === 'cuentas'} aria-selected={sub === 'cuentas'} onClick={() => setSub('cuentas')}>
        Cuentas claras
      </button>
      <button role="tab" aria-pressed={sub === 'anuales'} aria-selected={sub === 'anuales'} onClick={() => setSub('anuales')}>
        Gastos anuales
        {dueSoon > 0 && <span className="tab-count">{dueSoon}</span>}
      </button>
    </div>
  );
}

const PAY_REPEATS: { id: Repeat | null; label: string }[] = [
  { id: 'anual', label: 'Cada año' },
  { id: 'semestral', label: 'Cada 6 meses' },
  { id: 'trimestral', label: 'Cada 3 meses' },
  { id: 'mensual', label: 'Cada mes' },
  { id: null, label: 'Una vez' },
];

export function Anuales({ store, state, ctx, tabs }: { store: Store; state: StoreState; ctx: Ctx; tabs: React.ReactNode }) {
  const { data } = state;
  const today = isoDate(new Date());
  const list = payments(data.todos);
  const total = annualTotal(data.todos);
  const [editing, setEditing] = useState<Todo | null>(null);
  const [paying, setPaying] = useState<Todo | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function newPayment(): Todo {
    const now = ctx.now();
    return {
      id: ctx.newId(),
      household_id: ctx.householdId,
      list: 'pagos',
      text: '',
      note: null,
      due: null,
      repeat: 'anual',
      tags: [],
      done: false,
      done_at: null,
      done_log: [],
      amount: null,
      notify: true,
      created_by: ctx.by,
      created_at: now,
      updated_at: now,
    };
  }

  return (
    <div className="screen">
      <header className="band">
        <div>
          <div className="band-kicker">Finanzas · gastos anuales</div>
          <h1 style={{ fontSize: 26 }}>{total > 0 ? `${fmtEuro(total)} al año` : 'Gastos anuales'}</h1>
        </div>
        {tabs}
        <div className="menu-actions">
          <button className="add-big" onClick={() => setEditing(newPayment())}>
            + Añadir gasto anual
          </button>
        </div>
      </header>

      <div className="scroll">
        {list.length === 0 ? (
          <div className="empty">
            <strong>Sin gastos anuales todavía</strong>
            Apunta el IBI, el seguro del coche, el de casa, la ITV… con su importe y su fecha. Una semana antes aparecen en Hoy y os llega un aviso al
            móvil.
          </div>
        ) : (
          <ul className="card">
            {list.map((t) => {
              const d = dueLabel(t.due, today);
              const rep = PAY_REPEATS.find((r) => r.id === t.repeat)?.label ?? 'Una vez';
              const last = lastDone(t);
              const soon = !!t.due && dueToday([t], today).length > 0;
              return (
                <li key={t.id}>
                  <div className="row">
                    <button className="row-main" onClick={() => setEditing(t)} aria-label={`Editar ${t.text}`}>
                      <span className="ledger-icon">€</span>
                      <span className="row-text">
                        <span className="row-name">{t.text}</span>
                        <span className="row-meta">
                          {rep}
                          {t.due ? ` · ${fmtDay(t.due, t.due.slice(0, 4) !== today.slice(0, 4))}` : ' · sin fecha'}
                          {last ? ` · pagado ${fmtDay(last)}` : ''}
                        </span>
                      </span>
                      <span style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: 700, display: 'block' }}>{t.amount != null ? fmtEuro(t.amount) : '—'}</span>
                        {d && <span className={`due ${d.tone}`}>{d.text}</span>}
                      </span>
                    </button>
                    {soon && (
                      <button className="secondary" style={{ height: 36, padding: '0 12px', width: 'auto', marginRight: 8 }} onClick={() => setPaying(t)}>
                        Pagado
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {list.length > 0 && (
          <p className="small">
            Salen en Hoy {PAY_NOTICE_DAYS} días antes y se quedan hasta marcarlos como pagados. Al pagarlo, la fecha pasa al año (o periodo) siguiente.
          </p>
        )}
      </div>

      {editing && (
        <PaymentSheet
          key={editing.id}
          todo={editing}
          isNew={!data.todos.some((x) => x.id === editing.id)}
          close={() => setEditing(null)}
          save={(t) => {
            store.dispatch([{ kind: 'upsertRow', table: 'todos', row: { ...t, updated_at: ctx.now() } }]);
            setEditing(null);
          }}
          remove={() => {
            store.dispatch([{ kind: 'deleteRows', table: 'todos', match: { id: editing.id } }]);
            setEditing(null);
          }}
          pay={() => {
            setPaying(editing);
            setEditing(null);
          }}
        />
      )}

      {paying && (
        <Sheet title={`Pagar: ${paying.text}`} close={() => setPaying(null)}>
          <p className="note">
            {paying.amount != null ? `${fmtEuro(paying.amount)}. ` : ''}¿Lo apunto también en cuentas claras para repartirlo a medias?
          </p>
          {(() => {
            const me = ctx.userId ?? '';
            const other = otherMember(data, me);
            const markPaid = (payer: string | null) => {
              const now = ctx.now();
              const ops: Op[] = [{ kind: 'upsertRow', table: 'todos', row: complete(paying, today, now) }];
              const amount = paying.amount ?? 0;
              if (payer && other && amount > 0) {
                const otherUser = payer === me ? other.user_id : me;
                ops.push({
                  kind: 'upsertRow',
                  table: 'ledger',
                  row: {
                    id: ctx.newId(),
                    household_id: ctx.householdId,
                    kind: 'gasto',
                    amount,
                    concept: paying.text,
                    paid_by: payer,
                    other_user: otherUser,
                    payer_share: 50,
                    date: today,
                    created_by: ctx.by,
                    created_at: now,
                    updated_at: now,
                  },
                });
              }
              store.dispatch(ops);
              setPaying(null);
              setToast(payer ? `${paying.text}: pagado y apuntado a medias.` : `${paying.text}: pagado.`);
            };
            return (
              <div className="form">
                {other && (paying.amount ?? 0) > 0 && (
                  <>
                    <button className="primary" onClick={() => markPaid(me)}>
                      Lo he pagado yo · a medias
                    </button>
                    <button className="primary" onClick={() => markPaid(other.user_id)}>
                      Lo ha pagado {nameOf(data, other.user_id)} · a medias
                    </button>
                  </>
                )}
                <button className="secondary" onClick={() => markPaid(null)}>
                  Solo marcar como pagado
                </button>
              </div>
            );
          })()}
        </Sheet>
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
          <button onClick={() => setToast(null)}>Vale</button>
        </div>
      )}
    </div>
  );
}

function PaymentSheet({
  todo,
  isNew,
  close,
  save,
  remove,
  pay,
}: {
  todo: Todo;
  isNew: boolean;
  close: () => void;
  save: (t: Todo) => void;
  remove: () => void;
  pay: () => void;
}) {
  const [t, setT] = useState<Todo>(todo);
  const [amount, setAmount] = useState(todo.amount != null ? String(todo.amount).replace('.', ',') : '');
  const parsed = amount.trim() ? parseAmount(amount) : null;
  const valid = t.text.trim() && t.due && (!amount.trim() || parsed != null);
  const log = [...(t.done_log ?? [])].reverse();
  return (
    <Sheet title={isNew ? 'Nuevo gasto anual' : 'Gasto anual'} close={close}>
      <div className="form">
        <label>
          Qué es
          <input value={t.text} placeholder="IBI, seguro del coche…" onChange={(e) => setT({ ...t, text: e.target.value })} />
        </label>
        <label>
          Importe (€)
          <input inputMode="decimal" value={amount} placeholder="Opcional" onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label>
          Próximo pago
          <input type="date" value={t.due ?? ''} onChange={(e) => setT({ ...t, due: e.target.value || null })} />
        </label>
        <div className="label">Se repite</div>
        <div className="seg" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {PAY_REPEATS.map((r) => (
            <button key={r.label} aria-pressed={t.repeat === r.id} onClick={() => setT({ ...t, repeat: r.id })}>
              {r.label.replace('Cada ', '')}
            </button>
          ))}
        </div>
        <label>
          Nota
          <input value={t.note ?? ''} placeholder="Opcional: domiciliado, nº de póliza…" onChange={(e) => setT({ ...t, note: e.target.value || null })} />
        </label>
        <button type="button" className="toggle-row" role="switch" aria-checked={!!t.notify} onClick={() => setT({ ...t, notify: !t.notify })}>
          <span style={{ flex: 1, textAlign: 'left' }}>
            Avisar al móvil
            <span className="small" style={{ display: 'block', fontWeight: 400 }}>
              Una semana antes y el mismo día
            </span>
          </span>
          <span className={`switch${t.notify ? ' on' : ''}`} aria-hidden />
        </button>
        {log.length > 0 && <p className="small">Pagado: {log.map((d) => fmtDay(d, true)).join(' · ')}</p>}
        <button className="primary" disabled={!valid} onClick={() => save({ ...t, text: t.text.trim(), amount: parsed })}>
          Guardar
        </button>
        {!isNew && (
          <>
            <button className="secondary" onClick={pay}>
              Marcar como pagado
            </button>
            <button className="link-btn" style={{ color: '#B3261E' }} onClick={remove}>
              Borrar este gasto
            </button>
          </>
        )}
      </div>
    </Sheet>
  );
}
