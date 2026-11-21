import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { configured, supabase } from './lib/supabase';
import { Store, useStore } from './lib/store';
import type { Household } from './lib/types';
import type { Ctx } from './lib/logic';
import { Auth } from './screens/Auth';
import { Setup } from './screens/Setup';
import { Compra } from './screens/Compra';
import { Mas } from './screens/Mas';
import { Hoy } from './screens/Hoy';
import { Comida } from './screens/Comida';
import { Cart, Food, Home, More } from './icons';

type Tab = 'hoy' | 'compra' | 'comida' | 'mas';
interface Membership {
  household: Household;
  displayName: string;
}

const CACHE = 'rivendel:membership';

function readCache(userId: string): Membership | null {
  try {
    const raw = localStorage.getItem(CACHE);
    if (!raw) return null;
    const v = JSON.parse(raw) as Membership & { userId: string };
    return v.userId === userId ? v : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    if (!configured) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!configured) {
    return (
      <div className="center">
        <div className="auth">
          <h1 className="brand-title">Rivendel</h1>
          <p className="note">Falta conectar la app con Supabase (VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY).</p>
        </div>
      </div>
    );
  }
  if (session === undefined) return <div className="center note">Cargando…</div>;
  if (!session) return <Auth />;
  return <Signed session={session} />;
}

function Signed({ session }: { session: Session }) {
  const userId = session.user.id;
  const [membership, setMembership] = useState<Membership | null | undefined>(() => readCache(userId) ?? undefined);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('members')
      .select('display_name, households(id, name, invite_code)')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    if (error) {
      // Sin conexión: seguimos con lo guardado en el móvil.
      setMembership((m) => (m === undefined ? null : m));
      return;
    }
    if (!data) {
      localStorage.removeItem(CACHE);
      setMembership(null);
      return;
    }
    const m: Membership = {
      household: data.households as unknown as Household,
      displayName: data.display_name as string,
    };
    localStorage.setItem(CACHE, JSON.stringify({ ...m, userId }));
    setMembership(m);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (membership === undefined) return <div className="center note">Cargando…</div>;
  if (membership === null) {
    const meta = session.user.user_metadata as { name?: string };
    return <Setup defaultName={meta?.name ?? ''} onDone={load} />;
  }
  return <Home_ membership={membership} userId={userId} />;
}

function Home_({ membership, userId }: { membership: Membership; userId: string }) {
  const { household, displayName } = membership;
  const store = useMemo(() => new Store(household.id), [household.id]);
  useEffect(() => {
    store.start();
    return () => store.stop();
  }, [store]);
  const state = useStore(store);
  const [tab, setTab] = useState<Tab>('compra');
  const [masView, setMasView] = useState<'menu' | 'cuentas'>('menu');
  const ctx: Ctx = useMemo(
    () => ({
      householdId: household.id,
      by: displayName,
      userId,
      now: () => new Date().toISOString(),
      newId: () => crypto.randomUUID(),
    }),
    [household.id, displayName, userId],
  );
  const pending = state.data.items.filter((i) => !i.bought).length;

  return (
    <div className="app">
      {tab === 'hoy' && (
        <Hoy store={store} state={state} ctx={ctx} name={displayName} goCompra={() => setTab('compra')} goComida={() => setTab('comida')} goCuentas={() => { setMasView('cuentas'); setTab('mas'); }} />
      )}
      {tab === 'compra' && <Compra store={store} state={state} ctx={ctx} />}
      {tab === 'comida' && <Comida store={store} state={state} ctx={ctx} goCompra={() => setTab('compra')} />}
      {tab === 'mas' && <Mas key={masView} store={store} state={state} ctx={ctx} household={household} initial={masView} />}

      {state.error && (
        <div className="toast" role="alert">
          {state.error}
          <button onClick={() => store.clearError()}>Vale</button>
        </div>
      )}

      <nav className="nav" aria-label="Secciones">
        <button aria-current={tab === 'hoy' ? 'page' : undefined} onClick={() => setTab('hoy')}>
          <Home />
          Hoy
        </button>
        <button aria-current={tab === 'compra' ? 'page' : undefined} onClick={() => setTab('compra')}>
          <span className="ico">
            <Cart />
            {pending > 0 && <span className="badge">{pending}</span>}
          </span>
          Compra
        </button>
        <button aria-current={tab === 'comida' ? 'page' : undefined} onClick={() => setTab('comida')}>
          <Food />
          Comida
        </button>
        <button aria-current={tab === 'mas' ? 'page' : undefined} onClick={() => { setMasView('menu'); setTab('mas'); }}>
          <More />
          Más
        </button>
      </nav>
    </div>
  );
}
