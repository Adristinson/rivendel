import { useEffect, useState } from 'react';
import type { Store, StoreState } from '../lib/store';
import type { LedgerEntry } from '../lib/types';
import type { Ctx } from '../lib/logic';
import { isoDate } from '../lib/menu';
import { balance, byMonth, fmtEuro, frequentConcepts, nameOf, otherMember, owedBy, parseAmount, settlements } from '../lib/accounts';
import { fmtDay } from '../lib/todos';
import { Back } from '../icons';

type Editing = { mode: 'gasto' | 'pago'; entry?: LedgerEntry } | null;

export function Cuentas({ store, state, ctx, back, tabs }: { store: Store; state: StoreState; ctx: Ctx; back?: () => void; tabs?: React.ReactNode }) {
  const { data } = state;
  const me = ctx.userId ?? '';
  const other = otherMember(data, me);
  const [editing, setEditing] = useState<Editing>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [openSettlement, setOpenSettlement] = useState<string | null>(null);

  const bal = other ? balance(data.ledger, me, other.user_id) : 0;
  const { closed, open } = other ? settlements(data.ledger, me, other.user_id) : { closed: [], open: data.ledger };
  const months = byMonth(open);

  function entryRow(e: LedgerEntry) {
    const payer = e.paid_by === me ? 'Tú' : nameOf(data, e.paid_by);
    const d = new Date(e.date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    const detail =
      e.kind === 'pago'
        ? `${payer} pagó a ${e.other_user === me ? 'ti' : nameOf(data, e.other_user)}`
        : `${e.paid_by === me ? 'Pagaste tú' : `Pagó ${payer}`}${e.payer_share === 50 ? ' · a medias' : ` · ${100 - e.payer_share}% de ${e.other_user === me ? 'ti' : nameOf(data, e.other_user)}`}`;
    return (
      <li key={e.id}>
        <button className="row-main" onClick={() => setEditing({ mode: e.kind, entry: e })}>
          <span className="ledger-icon" style={e.kind === 'pago' ? { background: 'var(--brand-soft)', color: 'var(--brand-ink)' } : undefined}>
            {e.kind === 'pago' ? '⇄' : '€'}
          </span>
          <span className="row-text">
            <span className="row-name">{e.kind === 'pago' ? 'Pago' : e.concept || 'Gasto'}</span>
            <span className="row-meta">
              {d} · {detail}
            </span>
          </span>
          <span style={{ textAlign: 'right' }}>
            <span style={{ fontWeight: 700, display: 'block' }}>{fmtEuro(e.amount)}</span>
            {e.kind === 'gasto' && e.payer_share !== 100 && <span className="small">debe {fmtEuro(owedBy(e))}</span>}
          </span>
        </button>
      </li>
    );
  }

  let headline: string;
  if (!other) headline = 'Falta la otra persona del hogar';
  else if (Math.abs(bal) < 0.005) headline = 'Estáis en paz';
  else if (bal > 0) headline = `${other.display_name} te debe ${fmtEuro(bal)}`;
  else headline = `Debes ${fmtEuro(-bal)} a ${other.display_name}`;

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
        <div>
          <div className="band-kicker">Finanzas · cuentas claras</div>
          <h1 style={{ fontSize: 26 }}>{headline}</h1>
        </div>
        {tabs}
        {other && (
          <div className="menu-actions">
            <button className="add-big" onClick={() => setEditing({ mode: 'gasto' })}>
              + Apuntar gasto
            </button>
            <button className="add-big ghost" disabled={Math.abs(bal) < 0.005} onClick={() => setEditing({ mode: 'pago' })}>
              Saldar
            </button>
          </div>
        )}
      </header>

      <div className="scroll">
        {!other && (
          <div className="hint-card">Cuando la otra persona se una al hogar (Más → Hogar) podréis apuntar gastos compartidos.</div>
        )}
        {other && open.length === 0 && closed.length > 0 && (
          <div className="empty">
            <strong>Todo saldado</strong>
            Desde el {fmtDay(closed[0].date, true)} no hay gastos nuevos. Lo anterior está en el histórico.
          </div>
        )}
        {other && data.ledger.length === 0 && (
          <div className="empty">
            <strong>Sin movimientos todavía</strong>
            Apunta un gasto compartido (el súper, la guardería…) con quién lo pagó. Por defecto se reparte a medias y la app lleva la cuenta.
          </div>
        )}
        {months.map((m) => (
          <section key={m.month} className="group">
            <div className="section-head">
              <h2 className="group-title" style={{ background: '#ECEDEA', color: '#454B47' }}>
                {m.label}
              </h2>
              <span className="small">Gastos compartidos: {fmtEuro(m.spent)}</span>
            </div>
            <ul className="card">{m.entries.map(entryRow)}</ul>
          </section>
        ))}
        {closed.length > 0 && (
          <section className="group">
            <div className="section-head">
              <h2 className="group-title" style={{ background: 'var(--brand-soft)', color: 'var(--brand-ink)' }}>
                Histórico de saldos
              </h2>
              <span className="small">{closed.length === 1 ? '1 saldo' : `${closed.length} saldos`}</span>
            </div>
            <ul className="card">
              {closed.map((st) => {
                const isOpen = openSettlement === st.id;
                const p = st.payment;
                const who = `${p.paid_by === me ? 'Pagaste' : `${nameOf(data, p.paid_by)} pagó`} ${fmtEuro(p.amount)} a ${p.other_user === me ? 'ti' : nameOf(data, p.other_user)}`;
                const n = st.entries.filter((e) => e.kind === 'gasto').length;
                return (
                  <li key={st.id}>
                    <button className="row-main" aria-expanded={isOpen} onClick={() => setOpenSettlement(isOpen ? null : st.id)}>
                      <span className="ledger-icon" style={{ background: 'var(--brand-soft)', color: 'var(--brand-ink)' }}>
                        ✓
                      </span>
                      <span className="row-text">
                        <span className="row-name">Saldado el {fmtDay(st.date, true)}</span>
                        <span className="row-meta">
                          {who} · {n === 1 ? '1 gasto' : `${n} gastos`} del {fmtDay(st.from)} al {fmtDay(st.date)}
                        </span>
                      </span>
                      <span style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: 700, display: 'block' }}>{fmtEuro(st.spent)}</span>
                        <span className="small">{isOpen ? 'Ocultar' : 'Ver'}</span>
                      </span>
                    </button>
                    {isOpen && (
                      <ul className="card" style={{ margin: '0 10px 12px', boxShadow: 'none', border: '1px solid #ECEDEA' }}>
                        {[p, ...st.entries].map(entryRow)}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}
        <p className="small">Solo lo veis vosotros dos. No se conecta con ningún banco.</p>
      </div>

      {editing && other && (
        <EntrySheet
          key={editing.entry?.id ?? editing.mode}
          store={store}
          ctx={ctx}
          me={me}
          otherId={other.user_id}
          otherName={other.display_name}
          mode={editing.mode}
          entry={editing.entry}
          suggestedPayment={bal}
          concepts={frequentConcepts(data.ledger)}
          close={() => setEditing(null)}
          saved={(msg) => {
            setEditing(null);
            setToast(msg);
          }}
        />
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

function EntrySheet({
  store,
  ctx,
  me,
  otherId,
  otherName,
  mode,
  entry,
  suggestedPayment,
  concepts,
  close,
  saved,
}: {
  store: Store;
  ctx: Ctx;
  me: string;
  otherId: string;
  otherName: string;
  mode: 'gasto' | 'pago';
  entry?: LedgerEntry;
  suggestedPayment: number;
  concepts: string[];
  close: () => void;
  saved: (msg: string) => void;
}) {
  // Para un pago nuevo: paga quien debe
  const defaultPayer = mode === 'pago' && !entry ? (suggestedPayment > 0 ? otherId : me) : me;
  const [amount, setAmount] = useState(entry ? String(entry.amount).replace('.', ',') : mode === 'pago' ? Math.abs(suggestedPayment).toFixed(2).replace('.', ',') : '');
  const [concept, setConcept] = useState(entry?.concept ?? '');
  const [payer, setPayer] = useState(entry?.paid_by ?? defaultPayer);
  const [share, setShare] = useState(entry?.payer_share ?? 50);
  const [date, setDate] = useState(entry?.date ?? isoDate(new Date()));
  const value = parseAmount(amount);
  const receiver = payer === me ? otherId : me;
  const nm = (id: string) => (id === me ? 'Tú' : otherName);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  function save() {
    if (!value) return;
    const now = ctx.now();
    const row: LedgerEntry = {
      id: entry?.id ?? ctx.newId(),
      household_id: ctx.householdId,
      kind: mode,
      amount: value,
      concept: mode === 'pago' ? 'Pago' : concept.trim(),
      paid_by: payer,
      other_user: receiver,
      payer_share: mode === 'pago' ? 0 : share,
      date,
      created_by: entry?.created_by ?? ctx.by,
      created_at: entry?.created_at ?? now,
      updated_at: now,
    };
    store.dispatch([{ kind: 'upsertRow', table: 'ledger', row }]);
    saved(entry ? 'Cambios guardados.' : mode === 'pago' ? 'Pago apuntado.' : 'Gasto apuntado.');
  }

  function remove() {
    if (!entry) return;
    if (!window.confirm('¿Borrar este movimiento? El saldo se recalcula.')) return;
    store.dispatch([{ kind: 'deleteRows', table: 'ledger', match: { id: entry.id } }]);
    saved('Movimiento borrado.');
  }

  const owes = value ? (value * (100 - share)) / 100 : 0;

  return (
    <div className="sheet-backdrop" onClick={close}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={mode === 'gasto' ? 'Gasto' : 'Pago'} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{entry ? (mode === 'gasto' ? 'Editar gasto' : 'Editar pago') : mode === 'gasto' ? 'Apuntar gasto' : 'Saldar cuentas'}</h2>
          <button className="icon-btn" aria-label="Cerrar" onClick={close}>
            ✕
          </button>
        </div>
        <div className="sheet-body">
          <label className="form" style={{ gap: 6 }}>
            <span className="label">Importe (€)</span>
            <input
              className="field amount-input"
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus={!entry}
            />
          </label>
          {amount && !value && <p className="error">Escribe un importe válido, por ejemplo 23,50.</p>}

          {mode === 'gasto' && (
            <>
              <label className="form" style={{ gap: 6 }}>
                <span className="label">Concepto</span>
                <input className="field" placeholder="Súper, guardería…" value={concept} onChange={(e) => setConcept(e.target.value)} />
              </label>
              <div className="chips" style={{ margin: 0, padding: 0, flexWrap: 'wrap' }}>
                {concepts.map((c) => (
                  <button
                    key={c}
                    className="chip"
                    aria-pressed={concept === c}
                    style={concept === c ? { background: 'var(--brand)', color: '#fff' } : { background: 'var(--card)', border: '1px solid var(--line)', color: 'var(--ink)' }}
                    onClick={() => setConcept(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="form" style={{ gap: 6 }}>
            <span className="label">{mode === 'gasto' ? '¿Quién pagó?' : '¿Quién paga?'}</span>
            <div className="seg">
              {[me, otherId].map((id) => (
                <button key={id} aria-pressed={payer === id} onClick={() => setPayer(id)}>
                  {nm(id)}
                </button>
              ))}
            </div>
            {mode === 'pago' && (
              <span className="small">
                {nm(payer)} {payer === me ? 'pagas' : 'paga'} a {receiver === me ? 'ti' : otherName}.
              </span>
            )}
          </div>

          {mode === 'gasto' && (
            <div className="form" style={{ gap: 6 }}>
              <span className="label">Reparto</span>
              <div className="seg three">
                <button aria-pressed={share === 50} onClick={() => setShare(50)}>
                  A medias
                </button>
                <button aria-pressed={share === 0} onClick={() => setShare(0)}>
                  Todo de {receiver === me ? 'ti' : otherName}
                </button>
                <button aria-pressed={share !== 50 && share !== 0} onClick={() => setShare(share === 50 || share === 0 ? 60 : share)}>
                  Otro
                </button>
              </div>
              {share !== 50 && share !== 0 && (
                <label className="small" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  Parte de {nm(payer).toLowerCase() === 'tú' ? 'quien paga (tú)' : nm(payer)}: {share}%
                  <input type="range" min={0} max={100} step={5} value={share} onChange={(e) => setShare(Number(e.target.value))} />
                </label>
              )}
              {value && (
                <span className="small">
                  {receiver === me ? 'Debes' : `${otherName} debe`} {fmtEuro(owes)} a {payer === me ? 'ti' : otherName}.
                </span>
              )}
            </div>
          )}

          <label className="form" style={{ gap: 6 }}>
            <span className="label">Fecha</span>
            <input className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>

          <button className="primary" disabled={!value || (mode === 'gasto' && !concept.trim())} onClick={save}>
            {entry ? 'Guardar cambios' : mode === 'gasto' ? 'Apuntar gasto' : 'Apuntar pago'}
          </button>
          {entry && (
            <button className="link-btn" style={{ color: '#B3261E' }} onClick={remove}>
              Borrar movimiento
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
