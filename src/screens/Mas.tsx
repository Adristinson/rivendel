import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import type { Store, StoreState } from '../lib/store';
import type { Household, Member } from '../lib/types';
import { capitalize, findProduct, otherCategory, type Ctx } from '../lib/logic';
import { COLOR_NAMES, tone } from '../lib/palette';
import { Back, Chevron, Trash } from '../icons';
import { Cuentas } from './Cuentas';
import { disablePush, enablePush, pushState, testPush, type PushState } from '../lib/push';
import { Pendientes } from './Pendientes';

type View = 'menu' | 'catalogo' | 'hogar' | 'cuentas' | 'pendientes';

export function Mas({
  store,
  state,
  ctx,
  household,
  initial = 'menu',
  close,
}: {
  store: Store;
  state: StoreState;
  ctx: Ctx;
  household: Household;
  initial?: View;
  close?: () => void;
}) {
  const [view, setView] = useState<View>(initial);
  const [push, setPush] = useState<PushState | 'loading'>('loading');
  const [pushMsg, setPushMsg] = useState<string | null>(null);
  useEffect(() => {
    pushState().then(setPush, () => setPush('unsupported'));
  }, []);

  async function togglePush() {
    setPushMsg(null);
    try {
      if (push === 'on') setPush(await disablePush());
      else {
        const s = await enablePush(household.id);
        setPush(s);
        if (s === 'on') setPushMsg(null);
        if (s === 'blocked') setPushMsg('Los avisos están bloqueados para esta app: actívalos en los ajustes del navegador o del móvil.');
      }
    } catch (e) {
      setPushMsg('No se pudieron activar: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  if (view === 'catalogo') return <Catalogo store={store} state={state} ctx={ctx} back={() => setView('menu')} />;
  if (view === 'hogar') return <Hogar household={household} back={() => setView('menu')} />;
  if (view === 'cuentas') return <Cuentas store={store} state={state} ctx={ctx} back={() => setView('menu')} />;
  if (view === 'pendientes') return <Pendientes store={store} state={state} ctx={ctx} back={() => setView('menu')} />;


  async function exportar() {
    const h = household.id;
    const [c, p, i, m] = await Promise.all([
      supabase.from('categories').select('*').eq('household_id', h),
      supabase.from('products').select('*').eq('household_id', h),
      supabase.from('list_items').select('*').eq('household_id', h),
      supabase.from('members').select('display_name, created_at').eq('household_id', h),
    ]);
    const online = !c.error && !p.error && !i.error;
    const payload = {
      app: 'Rivendel',
      version: 1,
      exported_at: new Date().toISOString(),
      source: online ? 'servidor' : 'copia local del móvil',
      household: { name: household.name },
      members: m.data ?? [],
      ...(online ? { categories: c.data, products: p.data, list_items: i.data } : {
        categories: state.data.categories,
        products: state.data.products,
        list_items: state.data.items,
      }),
      recipes: state.data.recipes,
      recipe_ingredients: state.data.ingredients,
      menu_weeks: state.data.weeks,
      menu_slots: state.data.slots,
      ledger: state.data.ledger,
      todos: state.data.todos,
      freezer: state.data.freezer,
      pack_template: state.data.packTemplate,
      trips: state.data.trips,
      trip_items: state.data.tripItems,
      places: state.data.places,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `rivendel-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="screen">
      <header className="band" style={{ paddingTop: 'calc(10px + env(safe-area-inset-top))' }}>
        {close && (
          <div className="band-row">
            <button className="icon-btn" onClick={close} aria-label="Volver" style={{ marginLeft: -12 }}>
              <Back />
            </button>
            <span className="band-kicker">Hoy</span>
          </div>
        )}
        <h1>Ajustes</h1>
      </header>
      <div className="scroll">
        <ul className="menu-list">
          <li>
            <button onClick={() => setView('catalogo')}>
              <span style={{ flex: 1 }}>
                Productos
                <div className="sub">{state.data.products.length} en el catálogo · categorías y básicos</div>
              </span>
              <Chevron />
            </button>
          </li>
          <li>
            <button onClick={() => setView('hogar')}>
              <span style={{ flex: 1 }}>
                Hogar
                <div className="sub">Código para invitar y miembros</div>
              </span>
              <Chevron />
            </button>
          </li>
          <li>
            <button onClick={togglePush} disabled={push === 'loading' || push === 'unsupported'}>
              <span style={{ flex: 1 }}>
                Avisos en este móvil
                <div className="sub">
                  {push === 'on'
                    ? 'Activados · toca para desactivar'
                    : push === 'blocked'
                      ? 'Bloqueados en el navegador'
                      : push === 'unsupported'
                        ? 'Este navegador no admite avisos (instala la app en la pantalla de inicio)'
                        : 'Filtro del agua, pagos y cosas con fecha límite · toca para activar'}
                </div>
              </span>
              <span className={`switch${push === 'on' ? ' on' : ''}`} aria-hidden />
            </button>
          </li>
          {push === 'on' && (
            <li>
              <button
                onClick={async () => {
                  setPushMsg('Enviando…');
                  setPushMsg((await testPush().catch(() => false)) ? 'Enviado: debería llegarte en unos segundos.' : 'No se pudo enviar el aviso de prueba.');
                }}
              >
                <span style={{ flex: 1 }}>
                  Enviar un aviso de prueba
                  <div className="sub">Para comprobar que llegan</div>
                </span>
              </button>
            </li>
          )}
          <li>
            <button onClick={exportar}>
              <span style={{ flex: 1 }}>
                Exportar datos
                <div className="sub">Descarga una copia completa en un archivo</div>
              </span>
            </button>
          </li>
        </ul>

        {pushMsg && <p className="note">{pushMsg}</p>}
        <p className="note">
          Los avisos llegan por la mañana (sobre las 9) el día que toca algo marcado con «Avisar al móvil», y una semana antes de cada pago. Cada uno de
          vosotros tiene que activarlos en su móvil.
        </p>
        <p className="note">Has entrado como {ctx.by}.</p>
        <button className="secondary" onClick={() => supabase.auth.signOut()}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

function SubHeader({ title, back }: { title: string; back: () => void }) {
  return (
    <header className="band" style={{ paddingTop: 'calc(10px + env(safe-area-inset-top))' }}>
      <div className="band-row">
        <button className="icon-btn" onClick={back} aria-label="Volver" style={{ marginLeft: -12 }}>
          <Back />
        </button>
        <span className="band-kicker">Ajustes</span>
      </div>
      <h1>{title}</h1>
    </header>
  );
}

function Catalogo({ store, state, ctx, back }: { store: Store; state: StoreState; ctx: Ctx; back: () => void }) {
  const { data } = state;
  const cats = useMemo(() => [...data.categories].sort((a, b) => a.sort - b.sort), [data.categories]);
  const [name, setName] = useState('');
  const [cat, setCat] = useState<string>('');
  const [msg, setMsg] = useState<string | null>(null);
  const [catName, setCatName] = useState('');
  const [catColor, setCatColor] = useState('sea');

  function addCategory(e: FormEvent) {
    e.preventDefault();
    const n = capitalize(catName);
    if (!n) return;
    if (data.categories.some((c) => c.name.toLowerCase() === n.toLowerCase())) {
      setMsg(`La categoría «${n}» ya existe.`);
      return;
    }
    const maxSort = Math.max(0, ...data.categories.filter((c) => c.sort < 99).map((c) => c.sort));
    store.dispatch([
      { kind: 'upsertCategory', category: { id: ctx.newId(), household_id: ctx.householdId, name: n, sort: maxSort + 1, color: catColor } },
    ]);
    setCatName('');
    setMsg(`Categoría «${n}» creada.`);
  }

  function addProduct(e: FormEvent) {
    e.preventDefault();
    const n = capitalize(name);
    if (!n) return;
    if (findProduct(data, n)) {
      setMsg(`«${n}» ya está en el catálogo.`);
      return;
    }
    store.dispatch([
      {
        kind: 'upsertProduct',
        product: {
          id: ctx.newId(),
          household_id: ctx.householdId,
          name: n,
          category_id: cat || otherCategory(data)?.id || null,
          is_staple: false,
          times_bought: 0,
          last_bought_at: null,
        },
      },
    ]);
    setName('');
    setMsg(`«${n}» añadido al catálogo.`);
  }

  function rename(id: string, current: string) {
    const v = window.prompt('Nuevo nombre', current);
    if (!v) return;
    const n = capitalize(v);
    const clash = findProduct(data, n);
    if (clash && clash.id !== id) {
      setMsg(`Ya existe «${clash.name}».`);
      return;
    }
    store.dispatch([{ kind: 'updateProduct', id, patch: { name: n } }]);
  }

  function remove(id: string, n: string) {
    if (window.confirm(`¿Borrar «${n}» del catálogo? También se quitará de la lista.`)) {
      store.dispatch([{ kind: 'deleteProduct', id }]);
    }
  }

  return (
    <div className="screen">
      <SubHeader title="Productos" back={back} />
      <div className="scroll">
        <form className="form" onSubmit={addProduct}>
          <label>
            Nuevo producto
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej.: Huevos" />
          </label>
          <label>
            Categoría
            <select value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="">Otros</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button className="primary" disabled={!name.trim()}>
            Añadir al catálogo
          </button>
          {msg && <p className="note" role="status">{msg}</p>}
        </form>
        <form className="form" onSubmit={addCategory}>
          <label>
            Nueva categoría
            <input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Ej.: Congelados" />
          </label>
          <label>
            Color
            <select value={catColor} onChange={(e) => setCatColor(e.target.value)}>
              {Object.entries(COLOR_NAMES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <button className="secondary" disabled={!catName.trim()}>
            Crear categoría
          </button>
        </form>
        <p className="note">
          Los <strong>básicos de casa</strong> (como el aceite) no se añadirán solos desde el menú: solo cuando alguien los
          apunte porque se han acabado.
        </p>
        {cats.map((c) => {
          const t = tone(c.color);
          const prods = data.products.filter((p) => p.category_id === c.id).sort((a, b) => a.name.localeCompare(b.name, 'es'));
          if (prods.length === 0) return null;
          return (
            <section className="group" key={c.id}>
              <h2 className="group-title" style={{ background: t.bg, color: t.fg }}>
                <span className="dot" style={{ background: t.dot }} />
                {c.name}
              </h2>
              <ul className="card">
                {prods.map((p) => (
                  <li key={p.id} className="prod-row">
                    <div className="prod-top">
                      <button className="prod-name" onClick={() => rename(p.id, p.name)} aria-label={`Renombrar ${p.name}`}>
                        {p.name}
                        {p.times_bought > 0 && (
                          <span className="small"> · comprado {p.times_bought} {p.times_bought === 1 ? 'vez' : 'veces'}</span>
                        )}
                      </button>
                      <button className="icon-btn" style={{ color: '#B3261E' }} aria-label={`Borrar ${p.name}`} onClick={() => remove(p.id, p.name)}>
                        <Trash />
                      </button>
                    </div>
                    <div className="prod-controls">
                      <select
                        aria-label={`Categoría de ${p.name}`}
                        value={p.category_id ?? ''}
                        onChange={(e) => store.dispatch([{ kind: 'updateProduct', id: p.id, patch: { category_id: e.target.value || null } }])}
                      >
                        {cats.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.name}
                          </option>
                        ))}
                      </select>
                      <label className="staple">
                        Básico
                        <button
                          className="switch"
                          role="switch"
                          aria-checked={p.is_staple}
                          aria-label={`${p.name}: básico de casa`}
                          onClick={() => store.dispatch([{ kind: 'updateProduct', id: p.id, patch: { is_staple: !p.is_staple } }])}
                        />
                      </label>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Hogar({ household, back }: { household: Household; back: () => void }) {
  const [members, setMembers] = useState<Member[] | null>(null);
  useEffect(() => {
    supabase
      .from('members')
      .select('*')
      .eq('household_id', household.id)
      .then(({ data }) => setMembers((data as Member[]) ?? []));
  }, [household.id]);

  return (
    <div className="screen">
      <SubHeader title={household.name} back={back} />
      <div className="scroll">
        <div className="form">
          <div className="label">Código para unirse a este hogar</div>
          <div className="code" aria-label={`Código ${household.invite_code.split('').join(' ')}`}>
            {household.invite_code}
          </div>
          <p className="note">
            La otra persona crea su cuenta, elige «Unirme con código» y escribe este código. Después conviene desactivar los
            registros nuevos en Supabase (lo explica la guía de puesta en marcha).
          </p>
        </div>
        <div className="label">Miembros</div>
        <ul className="menu-list">
          {members === null && (
            <li>
              <div className="item sub">Cargando…</div>
            </li>
          )}
          {members?.map((m) => (
            <li key={m.user_id}>
              <div className="item">{m.display_name}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
