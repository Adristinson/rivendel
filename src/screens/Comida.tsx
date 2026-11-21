import { useEffect, useMemo, useState } from 'react';
import type { Store, StoreState } from '../lib/store';
import type { Data, Meal, Op, Recipe } from '../lib/types';
import type { Ctx } from '../lib/logic';
import { norm } from '../lib/logic';
import {
  addReviewToList,
  addWeeks,
  DAYS,
  dayDate,
  extractIngredientLines,
  getSlot,
  getWeek,
  ingredientOps,
  ingredientsOf,
  isIncomplete,
  matchProduct,
  MEALS,
  nextSlotKey,
  parseIngredientLine,
  proposeRecipe,
  proposeWeek,
  removeRecipeFromList,
  reviewForRecipes,
  reviewSummary,
  slotDish,
  slotRow,
  TAGS,
  weekLabel,
  weekRecipeIds,
  weekStartOf,
  WEEKDAYS,
  type ReviewRow,
} from '../lib/menu';
import { imageUrl, removeRecipeImage, uploadRecipeImage } from '../lib/images';
import { Back, Check, Chevron, Plus, Trash } from '../icons';

interface Props {
  store: Store;
  state: StoreState;
  ctx: Ctx;
  goCompra: () => void;
}

type View =
  | { kind: 'menu' }
  | { kind: 'recetas' }
  | { kind: 'receta'; id: string }
  | { kind: 'editar'; id: string | null };

export function Comida({ store, state, ctx, goCompra }: Props) {
  const [view, setView] = useState<View>({ kind: 'menu' });
  const [week, setWeek] = useState(() => {
    const now = new Date();
    // En fin de semana se planifica la semana siguiente
    return now.getDay() === 0 || now.getDay() === 6 ? addWeeks(weekStartOf(now), 1) : weekStartOf(now);
  });

  if (view.kind === 'receta')
    return (
      <RecipeDetail
        store={store}
        data={state.data}
        ctx={ctx}
        id={view.id}
        back={() => setView({ kind: 'recetas' })}
        edit={() => setView({ kind: 'editar', id: view.id })}
        goCompra={goCompra}
      />
    );
  if (view.kind === 'editar')
    return (
      <RecipeEditor
        store={store}
        data={state.data}
        ctx={ctx}
        id={view.id}
        done={(id) => setView(id ? { kind: 'receta', id } : { kind: 'recetas' })}
      />
    );

  return (
    <div className="screen">
      <header className="band">
        <div className="band-top">
          <div>
            <div className="band-kicker">Rivendel</div>
            <h1>Comida</h1>
          </div>
        </div>
        <div className="tabs" role="tablist">
          <button role="tab" aria-pressed={view.kind === 'menu'} aria-selected={view.kind === 'menu'} onClick={() => setView({ kind: 'menu' })}>
            Menú
          </button>
          <button role="tab" aria-pressed={view.kind === 'recetas'} aria-selected={view.kind === 'recetas'} onClick={() => setView({ kind: 'recetas' })}>
            Recetas · {state.data.recipes.length}
          </button>
        </div>
      </header>
      {view.kind === 'menu' ? (
        <MenuView store={store} data={state.data} ctx={ctx} week={week} setWeek={setWeek} goCompra={goCompra} goRecetas={() => setView({ kind: 'recetas' })} />
      ) : (
        <RecipeList data={state.data} open={(id) => setView({ kind: 'receta', id })} create={() => setView({ kind: 'editar', id: null })} />
      )}
    </div>
  );
}

/* ───────────────────────── Menú semanal ───────────────────────── */

function MenuView({
  store,
  data,
  ctx,
  week,
  setWeek,
  goCompra,
  goRecetas,
}: {
  store: Store;
  data: Data;
  ctx: Ctx;
  week: string;
  setWeek: (w: string) => void;
  goCompra: () => void;
  goRecetas: () => void;
}) {
  const [slot, setSlot] = useState<{ day: number; meal: Meal } | null>(null);
  const [review, setReview] = useState<{ recipeIds: string[]; approveWeek: boolean } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const w = getWeek(data, week);
  const approved = w?.status === 'approved';
  const filled = WEEKDAYS.flatMap((d) => MEALS.map((m) => slotDish(data, week, d, m))).filter(Boolean).length;
  const thisWeek = weekStartOf(new Date());

  function propose() {
    const ops = proposeWeek(data, week, ctx);
    if (ops.length === 0) setToast(data.recipes.length === 0 ? 'Primero guarda alguna receta.' : 'No hay huecos vacíos.');
    store.dispatch(ops);
  }

  return (
    <div className="scroll">
      <div className="week-nav">
        <button className="icon-btn" aria-label="Semana anterior" onClick={() => setWeek(addWeeks(week, -1))}>
          <Back />
        </button>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{weekLabel(week)}</div>
          <div className="small">
            {week === thisWeek ? 'Esta semana' : week === addWeeks(thisWeek, 1) ? 'Semana que viene' : week < thisWeek ? 'Semana pasada' : 'Más adelante'}
            {' · '}
            {approved ? <span style={{ color: '#2E7D5B', fontWeight: 700 }}>Aprobado</span> : 'Borrador'}
          </div>
        </div>
        <button className="icon-btn" aria-label="Semana siguiente" onClick={() => setWeek(addWeeks(week, 1))}>
          <Chevron size={22} />
        </button>
      </div>

      {data.recipes.length === 0 && (
        <div className="hint-card">
          <strong>El menú se hace con vuestras recetas.</strong> Guardad unas cuantas en Recetas y el botón «Proponer semana» rellenará los huecos.
          <button className="link-btn" onClick={goRecetas}>
            Ir a Recetas
          </button>
        </div>
      )}

      <div className="menu-actions">
        <button className="secondary" onClick={propose} disabled={filled === 10}>
          Proponer semana
        </button>
        <button
          className="primary"
          disabled={weekRecipeIds(data, week).length === 0}
          onClick={() => setReview({ recipeIds: weekRecipeIds(data, week), approveWeek: true })}
        >
          {approved ? 'Volver a pasar a la compra' : 'Aprobar menú'}
        </button>
      </div>

      {WEEKDAYS.map((day) => {
        const date = dayDate(week, day);
        const isToday = date.toDateString() === new Date().toDateString();
        return (
          <section key={day} className="day">
            <h2 className="day-title" style={isToday ? { color: '#2E7D5B' } : undefined}>
              {DAYS[day]} {date.getDate()}
              {isToday && <span className="today">hoy</span>}
            </h2>
            <div className="slots">
              {MEALS.map((meal) => {
                const dish = slotDish(data, week, day, meal);
                const incomplete = dish?.recipe && !dish.leftover && isIncomplete(data, dish.recipe.id);
                return (
                  <button key={meal} className={`slot${dish ? '' : ' empty'}`} onClick={() => setSlot({ day, meal })}>
                    <span className="slot-meal">{meal === 'comida' ? 'Comida' : 'Cena'}</span>
                    <span className="slot-dish">{dish ? dish.recipe?.name ?? dish.text : '+ Elegir'}</span>
                    {dish?.leftover && <span className="slot-tag">sobras</span>}
                    {incomplete && <span className="slot-tag warn">sin ingredientes</span>}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
      <p className="note">Fines de semana libres. Toca un hueco para elegir receta, escribir un plato rápido o marcar que sale para dos días.</p>

      {slot && (
        <SlotSheet
          store={store}
          data={data}
          ctx={ctx}
          week={week}
          day={slot.day}
          meal={slot.meal}
          approved={approved}
          close={() => setSlot(null)}
          askReview={(ids) => setReview({ recipeIds: ids, approveWeek: false })}
        />
      )}
      {review && (
        <ReviewSheet
          store={store}
          data={data}
          ctx={ctx}
          recipeIds={review.recipeIds}
          title={review.approveWeek ? 'Revisa los ingredientes' : 'Ingredientes del nuevo plato'}
          extraOps={
            review.approveWeek
              ? [{ kind: 'upsertRow', table: 'menu_weeks', row: { household_id: ctx.householdId, week_start: week, status: 'approved', approved_at: ctx.now() } }]
              : []
          }
          close={() => setReview(null)}
          done={(n) => {
            setReview(null);
            setToast(n > 0 ? `${n} producto${n === 1 ? '' : 's'} añadido${n === 1 ? '' : 's'} a la compra.` : 'Menú aprobado.');
          }}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
          <button
            onClick={() => {
              setToast(null);
              if (toast.includes('compra')) goCompra();
            }}
          >
            {toast.includes('compra') ? 'Ver lista' : 'Vale'}
          </button>
        </div>
      )}
    </div>
  );
}

function SlotSheet({
  store,
  data,
  ctx,
  week,
  day,
  meal,
  approved,
  close,
  askReview,
}: {
  store: Store;
  data: Data;
  ctx: Ctx;
  week: string;
  day: number;
  meal: Meal;
  approved: boolean;
  close: () => void;
  askReview: (ids: string[]) => void;
}) {
  const current = getSlot(data, week, day, meal);
  const dish = slotDish(data, week, day, meal);
  const [q, setQ] = useState('');
  const [text, setText] = useState(current?.text ?? '');
  const used = useMemo(() => new Set(weekRecipeIds(data, week)), [data, week]);
  const [rejected, setRejected] = useState<Set<string>>(() => new Set(dish?.recipe ? [dish.recipe.id] : []));
  const [suggest, setSuggest] = useState<Recipe | undefined>(
    () => proposeRecipe(data, { meal, exclude: new Set([...used, ...rejected]) }) ?? proposeRecipe(data, { meal, exclude: rejected }),
  );
  const next = nextSlotKey(day, meal);
  const nextSlot = next ? getSlot(data, week, next.day, next.meal) : undefined;
  const list = data.recipes
    .filter((r) => !q || norm(r.name).includes(norm(q)))
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name, 'es'));

  function set(patch: { recipe_id?: string | null; text?: string | null; leftover?: boolean }) {
    const ops: Op[] = [];
    const oldRecipe = current && !current.leftover ? current.recipe_id : null;
    const newRecipe = patch.recipe_id ?? null;
    if (approved && oldRecipe && oldRecipe !== newRecipe) ops.push(...removeRecipeFromList(data, oldRecipe, ctx.now()));
    ops.push({
      kind: 'upsertRow',
      table: 'menu_slots',
      row: slotRow(ctx, week, day, meal, { recipe_id: null, text: null, leftover: false, ...patch }),
    });
    store.dispatch(ops);
    close();
    if (approved && newRecipe && newRecipe !== oldRecipe) askReview([newRecipe]);
  }

  function toggleLeftover() {
    if (!next) return;
    const on = !nextSlot?.leftover;
    store.dispatch([{ kind: 'upsertRow', table: 'menu_slots', row: slotRow(ctx, week, next.day, next.meal, { leftover: on }) }]);
    close();
  }

  return (
    <Sheet title={`${DAYS[day]} · ${meal}`} close={close}>
      {dish && (
        <div className="current-dish">
          <div className="small">Ahora</div>
          <div style={{ fontWeight: 700, fontSize: 17 }}>{dish.recipe?.name ?? dish.text}</div>
          {dish.leftover && <div className="small">Sobras del plato anterior</div>}
        </div>
      )}

      {data.recipes.length > 0 && (
        <div className="suggest-card">
          <div className="small">Propuesta del recetario</div>
          {suggest ? (
            <>
              <div style={{ fontWeight: 700, fontSize: 18 }}>
                {suggest.favorite && '★ '}
                {suggest.name}
              </div>
              <div className="row-gap">
                <button className="primary" style={{ flex: 1, height: 44 }} onClick={() => set({ recipe_id: suggest.id })}>
                  Usar esta
                </button>
                <button
                  className="secondary"
                  style={{ flex: 1, height: 44 }}
                  onClick={() => {
                    const rej = new Set(rejected).add(suggest.id);
                    setRejected(rej);
                    const ex = new Set([...used, ...rej]);
                    setSuggest(proposeRecipe(data, { meal, exclude: ex }) ?? proposeRecipe(data, { meal, exclude: rej }));
                  }}
                >
                  Otra
                </button>
              </div>
            </>
          ) : (
            <div className="note">No hay recetas que encajen.</div>
          )}
        </div>
      )}

      <label className="form" style={{ gap: 6 }}>
        <span className="label">Plato rápido, sin receta</span>
        <div className="row-gap">
          <input className="field" placeholder="Sobras, cenamos fuera…" value={text} onChange={(e) => setText(e.target.value)} />
          <button className="secondary" style={{ height: 44, padding: '0 14px' }} disabled={!text.trim()} onClick={() => set({ text: text.trim() })}>
            Poner
          </button>
        </div>
      </label>

      {next && dish && !dish.leftover && (
        <button className="secondary" onClick={toggleLeftover}>
          {nextSlot?.leftover ? 'Quitar «sale para dos días»' : `Sale para dos días (también ${DAYS[next.day].toLowerCase()} ${next.meal})`}
        </button>
      )}

      {data.recipes.length > 0 && (
        <div className="form" style={{ gap: 8 }}>
          <span className="label">Elegir del recetario</span>
          <input className="field" placeholder="Buscar receta…" value={q} onChange={(e) => setQ(e.target.value)} />
          <ul className="menu-list" style={{ maxHeight: 260, overflowY: 'auto' }}>
            {list.map((r) => (
              <li key={r.id}>
                <button onClick={() => set({ recipe_id: r.id })}>
                  <span style={{ flex: 1 }}>
                    {r.favorite && '★ '}
                    {r.name}
                    {used.has(r.id) && <span className="sub"> · ya en esta semana</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {current && (current.recipe_id || current.text || current.leftover) && (
        <button className="link-btn" style={{ color: '#B3261E' }} onClick={() => set({})}>
          Vaciar hueco
        </button>
      )}
    </Sheet>
  );
}

function ReviewSheet({
  store,
  data,
  ctx,
  recipeIds,
  title,
  extraOps,
  close,
  done,
}: {
  store: Store;
  data: Data;
  ctx: Ctx;
  recipeIds: string[];
  title: string;
  extraOps: Op[];
  close: () => void;
  done: (n: number) => void;
}) {
  const initial = useMemo(() => reviewForRecipes(data, recipeIds), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [rows, setRows] = useState<ReviewRow[]>(initial.rows);
  const n = rows.filter((r) => r.checked).length;
  const staples = data.products.filter((p) => p.is_staple).map((p) => p.name.toLowerCase());

  return (
    <Sheet title={title} close={close}>
      <p className="note">Desmarca lo que ya tengáis en casa. El resto pasa a la lista de la compra.</p>
      {rows.length > 0 && (
        <ul className="card">
          {rows.map((r, i) => (
            <li key={r.product.id}>
              <button
                className="row-main"
                aria-pressed={r.checked}
                onClick={() => setRows(rows.map((x, j) => (j === i ? { ...x, checked: !x.checked } : x)))}
              >
                <span className={`box${r.checked ? ' on' : ''}`}>{r.checked && <Check />}</span>
                <span className="row-text">
                  <span className="row-name" style={r.checked ? undefined : { color: '#6B716D' }}>
                    {r.product.name}
                  </span>
                  <span className="row-meta">Para {r.recipes.join(', ')}</span>
                </span>
                <span className="amount">{[r.count > 0 ? `×${r.count}` : '', reviewSummary(r)].filter(Boolean).join(' · ')}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {initial.incomplete.length > 0 && (
        <div className="warn-card">
          {initial.incomplete.length === 1 ? 'Esta receta no tiene ingredientes' : 'Estas recetas no tienen ingredientes'} y no añade
          {initial.incomplete.length === 1 ? '' : 'n'} nada: {initial.incomplete.map((r) => r.name).join(', ')}.
        </div>
      )}
      {staples.length > 0 && <p className="small">Los básicos de casa ({staples.join(', ')}) no aparecen: se apuntan solo cuando se acaban.</p>}
      <button
        className="primary"
        onClick={() => {
          store.dispatch([...addReviewToList(data, rows, ctx), ...extraOps]);
          done(n);
        }}
      >
        {n > 0 ? `Añadir ${n} producto${n === 1 ? '' : 's'} a la compra` : extraOps.length ? 'Aprobar sin añadir nada' : 'Cerrar'}
      </button>
    </Sheet>
  );
}

/* ───────────────────────── Recetario ───────────────────────── */

const FILTERS = [{ id: 'fav', label: '★ Favoritas' }, ...TAGS.filter((t) => t.id !== 'comida' && t.id !== 'cena'), { id: 'inc', label: 'Sin ingredientes' }];

function RecipeList({ data, open, create }: { data: Data; open: (id: string) => void; create: () => void }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<string | null>(null);
  const list = data.recipes
    .filter((r) => !q || norm(r.name).includes(norm(q)))
    .filter((r) => {
      if (!filter) return true;
      if (filter === 'fav') return r.favorite;
      if (filter === 'inc') return isIncomplete(data, r.id);
      return r.tags.includes(filter);
    })
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name, 'es'));

  return (
    <div className="scroll">
      <div className="row-gap">
        <input className="field" style={{ height: 48 }} placeholder="Buscar receta…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar receta" />
        <button className="add-btn" aria-label="Nueva receta" onClick={create}>
          <Plus />
        </button>
      </div>
      <div className="chips">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className="chip"
            aria-pressed={filter === f.id}
            style={filter === f.id ? { background: '#2E7D5B', color: '#fff' } : { background: '#fff', color: '#1E2320', border: '1px solid #D9DAD4' }}
            onClick={() => setFilter(filter === f.id ? null : f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
      {data.recipes.length === 0 ? (
        <div className="empty">
          <strong>Aún no hay recetas</strong>
          Guarda las que hacéis a menudo: basta con el nombre. Puedes pegar el enlace de Instagram o el texto de la receta, y añadir una foto.
          <div style={{ marginTop: 16 }}>
            <button className="primary" style={{ padding: '0 24px' }} onClick={create}>
              Nueva receta
            </button>
          </div>
        </div>
      ) : list.length === 0 ? (
        <div className="empty">Ninguna receta coincide.</div>
      ) : (
        <ul className="menu-list">
          {list.map((r) => {
            const inc = isIncomplete(data, r.id);
            return (
              <li key={r.id}>
                <button onClick={() => open(r.id)}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 600 }}>
                      {r.favorite && <span style={{ color: '#E59A1A' }}>★ </span>}
                      {r.name}
                    </span>
                    <div className="sub">
                      {[
                        ...r.tags.map((t) => TAGS.find((x) => x.id === t)?.label ?? t),
                        inc ? 'sin ingredientes' : `${ingredientsOf(data, r.id).length} ingredientes`,
                      ].join(' · ')}
                    </div>
                  </span>
                  <Chevron />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function SubHeader({ title, back, kicker = 'Recetas' }: { title: string; back: () => void; kicker?: string }) {
  return (
    <header className="band" style={{ paddingTop: 'calc(10px + env(safe-area-inset-top))' }}>
      <div className="band-row">
        <button className="icon-btn" onClick={back} aria-label="Volver" style={{ marginLeft: -12 }}>
          <Back />
        </button>
        <span className="band-kicker">{kicker}</span>
      </div>
      <h1 style={{ fontSize: 26 }}>{title}</h1>
    </header>
  );
}

function RecipeImage({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    imageUrl(path).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [path]);
  if (!url) return <div className="img-ph">Foto (necesita conexión)</div>;
  return <img src={url} alt="" className="recipe-img" />;
}

function RecipeDetail({
  store,
  data,
  ctx,
  id,
  back,
  edit,
  goCompra,
}: {
  store: Store;
  data: Data;
  ctx: Ctx;
  id: string;
  back: () => void;
  edit: () => void;
  goCompra: () => void;
}) {
  const r = data.recipes.find((x) => x.id === id);
  const [review, setReview] = useState(false);
  const [added, setAdded] = useState<number | null>(null);
  if (!r)
    return (
      <div className="screen">
        <SubHeader title="Receta" back={back} />
        <div className="scroll empty">Esta receta ya no existe.</div>
      </div>
    );
  const ings = ingredientsOf(data, id);
  return (
    <div className="screen">
      <SubHeader title={r.name} back={back} />
      <div className="scroll">
        {r.image_path && <RecipeImage path={r.image_path} />}
        <div className="row-gap" style={{ flexWrap: 'wrap' }}>
          <button
            className="chip"
            aria-pressed={r.favorite}
            style={{ background: r.favorite ? '#FCEBCB' : '#fff', color: r.favorite ? '#7F4D00' : '#1E2320', border: '1px solid #E6E6E0' }}
            onClick={() => store.dispatch([{ kind: 'upsertRow', table: 'recipes', row: { ...r, favorite: !r.favorite, updated_at: ctx.now() } }])}
          >
            {r.favorite ? '★ Favorita' : '☆ Marcar favorita'}
          </button>
          {r.tags.map((t) => (
            <span key={t} className="tag">
              {TAGS.find((x) => x.id === t)?.label ?? t}
            </span>
          ))}
        </div>
        {r.url && (
          <a className="secondary link-like" href={r.url} target="_blank" rel="noreferrer">
            Abrir enlace de la receta
          </a>
        )}
        <section className="group">
          <h2 className="group-title" style={{ background: '#E2F3DF', color: '#1E6A2B' }}>
            Ingredientes
          </h2>
          {ings.length === 0 ? (
            <div className="warn-card">
              Sin ingredientes: sirve para el menú, pero no añade nada a la lista.{' '}
              <button className="link-btn" onClick={edit}>
                Añadirlos
              </button>
            </div>
          ) : (
            <ul className="card">
              {ings.map((i) => {
                const p = data.products.find((x) => x.id === i.product_id);
                return (
                  <li key={i.id} className="ing-row">
                    <span>{i.raw}</span>
                    {p && <span className="small">{p.is_staple ? `${p.name} · básico` : p.name}</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        {ings.length > 0 && (
          <button className="secondary" onClick={() => setReview(true)}>
            Añadir ingredientes a la compra
          </button>
        )}
        {r.body && (
          <section className="group">
            <h2 className="group-title" style={{ background: '#ECEDEA', color: '#454B47' }}>
              Receta
            </h2>
            <div className="body-text">{r.body}</div>
          </section>
        )}
        <button className="primary" onClick={edit}>
          Editar receta
        </button>
      </div>
      {review && (
        <ReviewSheet
          store={store}
          data={data}
          ctx={ctx}
          recipeIds={[id]}
          title="Añadir a la compra"
          extraOps={[]}
          close={() => setReview(false)}
          done={(n) => {
            setReview(false);
            setAdded(n);
          }}
        />
      )}
      {added !== null && (
        <div className="toast" role="status">
          {added} producto{added === 1 ? '' : 's'} en la lista.
          <button onClick={goCompra}>Ver lista</button>
        </div>
      )}
    </div>
  );
}

function RecipeEditor({
  store,
  data,
  ctx,
  id,
  done,
}: {
  store: Store;
  data: Data;
  ctx: Ctx;
  id: string | null;
  done: (id: string | null) => void;
}) {
  const existing = id ? data.recipes.find((r) => r.id === id) : undefined;
  const [recipeId] = useState(() => existing?.id ?? ctx.newId());
  const [name, setName] = useState(existing?.name ?? '');
  const [url, setUrl] = useState(existing?.url ?? '');
  const [body, setBody] = useState(existing?.body ?? '');
  const [ingText, setIngText] = useState(() => (existing ? ingredientsOf(data, existing.id).map((i) => i.raw).join('\n') : ''));
  const [tags, setTags] = useState<string[]>(existing?.tags ?? []);
  const [favorite, setFavorite] = useState(existing?.favorite ?? false);
  const [imagePath, setImagePath] = useState<string | null>(existing?.image_path ?? null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const lines = ingText.split('\n').map((l) => l.trim()).filter(Boolean);
  const preview = lines.map((l) => {
    const p = parseIngredientLine(l);
    const prod = p ? matchProduct(data.products, p.name) : undefined;
    return { line: l, parsed: p, product: prod };
  });

  async function onImage(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setMsg(null);
    try {
      const path = await uploadRecipeImage(ctx.householdId, recipeId, file);
      if (imagePath && imagePath !== existing?.image_path) void removeRecipeImage(imagePath);
      setImagePath(path);
    } catch {
      setMsg('No se pudo subir la foto. Hace falta conexión.');
    }
    setUploading(false);
  }

  function save() {
    const now = ctx.now();
    const recipe: Recipe = {
      id: recipeId,
      household_id: ctx.householdId,
      name: name.trim(),
      url: url.trim() || null,
      body: body.trim() || null,
      image_path: imagePath,
      tags,
      favorite,
      created_by: existing?.created_by ?? ctx.by,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };
    const oldLines = existing ? ingredientsOf(data, existing.id).map((i) => i.raw).join('\n') : '';
    const ops: Op[] = [{ kind: 'upsertRow', table: 'recipes', row: recipe }];
    if (lines.join('\n') !== oldLines) ops.push(...ingredientOps(data, recipeId, lines, ctx));
    if (existing?.image_path && existing.image_path !== imagePath) void removeRecipeImage(existing.image_path);
    store.dispatch(ops);
    done(recipeId);
  }

  function remove() {
    if (!existing) return;
    if (!window.confirm(`¿Borrar la receta «${existing.name}»? Si está en algún menú, ese hueco quedará vacío.`)) return;
    if (existing.image_path) void removeRecipeImage(existing.image_path);
    store.dispatch([{ kind: 'deleteRows', table: 'recipes', match: { id: existing.id } }]);
    done(null);
  }

  return (
    <div className="screen">
      <SubHeader title={existing ? 'Editar receta' : 'Nueva receta'} back={() => done(existing ? existing.id : null)} />
      <div className="scroll">
        <div className="form">
          <label>
            Nombre *
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej.: Lentejas con verduras" autoFocus={!existing} />
          </label>
          <label>
            Enlace (Instagram, web…)
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" inputMode="url" />
          </label>
          <label>
            Texto de la receta
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder="Pega aquí la receta si la tienes en texto" />
          </label>
          <div className="label">Foto</div>
          {imagePath ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <RecipeImage path={imagePath} />
              <button className="link-btn" style={{ color: '#B3261E', alignSelf: 'flex-start' }} onClick={() => setImagePath(null)}>
                Quitar foto
              </button>
            </div>
          ) : (
            <label className="secondary file-btn">
              {uploading ? 'Subiendo…' : 'Añadir foto (captura o imagen de la receta)'}
              <input type="file" accept="image/*" onChange={(e) => onImage(e.target.files?.[0])} style={{ display: 'none' }} />
            </label>
          )}
          {msg && <p className="error">{msg}</p>}

          <label>
            Ingredientes, uno por línea
            <textarea
              value={ingText}
              onChange={(e) => setIngText(e.target.value)}
              rows={6}
              placeholder={'2 cebollas\n300 g de lentejas\n1 pimiento rojo'}
            />
          </label>
          {body.trim() && (
            <button
              className="secondary"
              onClick={() => {
                const found = extractIngredientLines(body);
                if (found.length === 0) setMsg('No he encontrado ingredientes en el texto. Escríbelos abajo, uno por línea.');
                else {
                  setIngText(found.join('\n'));
                  setMsg(null);
                }
              }}
            >
              Sacar ingredientes del texto
            </button>
          )}
          {preview.length > 0 && (
            <ul className="card">
              {preview.map((p, i) => (
                <li key={i} className="ing-row">
                  <span>{p.line}</span>
                  <span className="small" style={p.product ? undefined : { color: '#8A3B00' }}>
                    {!p.parsed ? 'no se entiende' : p.product ? `→ ${p.product.name}${p.product.is_staple ? ' (básico)' : ''}` : `→ producto nuevo: ${p.parsed.name}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="small">Sin ingredientes la receta sirve para el menú, pero no añade nada a la lista de la compra.</p>

          <div className="label">Etiquetas</div>
          <div className="row-gap" style={{ flexWrap: 'wrap' }}>
            {TAGS.map((t) => {
              const on = tags.includes(t.id);
              return (
                <button
                  key={t.id}
                  className="chip"
                  aria-pressed={on}
                  style={on ? { background: '#2E7D5B', color: '#fff' } : { background: '#fff', color: '#1E2320', border: '1px solid #D9DAD4' }}
                  onClick={() => setTags(on ? tags.filter((x) => x !== t.id) : [...tags, t.id])}
                >
                  {t.label}
                </button>
              );
            })}
            <button
              className="chip"
              aria-pressed={favorite}
              style={favorite ? { background: '#FCEBCB', color: '#7F4D00' } : { background: '#fff', color: '#1E2320', border: '1px solid #D9DAD4' }}
              onClick={() => setFavorite(!favorite)}
            >
              {favorite ? '★ Favorita' : '☆ Favorita'}
            </button>
          </div>
          <p className="small">«Comida» o «Cena» hace que se proponga sobre todo para ese momento. Sin ninguna, vale para los dos.</p>

          <button className="primary" disabled={!name.trim() || uploading} onClick={save}>
            Guardar receta
          </button>
          {existing && (
            <button className="link-btn" style={{ color: '#B3261E' }} onClick={remove}>
              <Trash size={16} /> Borrar receta
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Hoja inferior ───────────────────────── */

function Sheet({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);
  return (
    <div className="sheet-backdrop" onClick={close}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title.charAt(0).toUpperCase() + title.slice(1)}</h2>
          <button className="icon-btn" aria-label="Cerrar" onClick={close}>
            ✕
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

/* ───────────────────────── Para la pantalla Hoy ───────────────────────── */

export function todayMenu(data: Data) {
  const now = new Date();
  const day = (now.getDay() + 6) % 7;
  const week = weekStartOf(now);
  if (day > 4) return { week, day, weekend: true, comida: null, cena: null };
  return { week, day, weekend: false, comida: slotDish(data, week, day, 'comida'), cena: slotDish(data, week, day, 'cena') };
}

export function proposeTodayOps(data: Data, ctx: Ctx, meal: Meal, exclude: Set<string>): { ops: Op[]; recipe?: Recipe } {
  const now = new Date();
  const day = (now.getDay() + 6) % 7;
  const week = weekStartOf(now);
  const recipe = proposeRecipe(data, { meal, exclude: new Set([...weekRecipeIds(data, week), ...exclude]) }) ?? proposeRecipe(data, { meal, exclude });
  if (!recipe) return { ops: [] };
  return { recipe, ops: [{ kind: 'upsertRow', table: 'menu_slots', row: slotRow(ctx, week, day, meal, { recipe_id: recipe.id }) }] };
}
