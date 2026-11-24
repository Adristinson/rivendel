import { useSyncExternalStore } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { applyOps, remapProduct, TABLE_PK } from './logic';
import type { Data, Op, Product } from './types';

export interface StoreState {
  data: Data;
  online: boolean;
  pending: number;
  loaded: boolean;
  error: string | null;
}

const EMPTY: Data = { categories: [], products: [], items: [], recipes: [], ingredients: [], weeks: [], slots: [], ledger: [], members: [], todos: [], freezer: [] };

interface PgError {
  message?: string;
  code?: string;
}

function isNetworkError(e: unknown): boolean {
  const err = e as PgError;
  if (!err) return false;
  if (!err.code) return true;
  return /fetch|network|timeout/i.test(err.message ?? '');
}

function stripProduct(p: Product) {
  const { created_at: _c, ...rest } = p;
  return rest;
}

/**
 * Datos del hogar con copia local y cola de cambios.
 * Todo cambio se aplica al momento en pantalla, se guarda en el móvil
 * y se envía a Supabase cuando hay conexión.
 */
export class Store {
  private server: Data = EMPTY;
  private outbox: Op[] = [];
  private state: StoreState;
  private listeners = new Set<() => void>();
  private flushing = false;
  private channel: RealtimeChannel | null = null;
  private refetchTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setInterval> | null = null;
  private readonly key: string;
  private readonly householdId: string;

  constructor(householdId: string) {
    this.householdId = householdId;
    this.key = `rivendel:v1:${householdId}`;
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) {
        const saved = JSON.parse(raw) as { server: Data; outbox: Op[] };
        this.server = { ...EMPTY, ...(saved.server ?? {}) };
        this.outbox = saved.outbox ?? [];
      }
    } catch {
      /* copia local ilegible: se rehace desde Supabase */
    }
    this.state = {
      data: applyOps(this.server, this.outbox),
      online: typeof navigator === 'undefined' ? true : navigator.onLine,
      pending: this.outbox.length,
      loaded: this.server !== EMPTY,
      error: null,
    };
  }

  start() {
    window.addEventListener('online', this.onOnline);
    window.addEventListener('offline', this.onOffline);
    document.addEventListener('visibilitychange', this.onVisible);
    this.retryTimer = setInterval(() => {
      if (this.outbox.length > 0) void this.flush();
    }, 15000);
    this.channel = supabase
      .channel(`hogar-${this.householdId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'list_items' }, () => this.scheduleRefetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => this.scheduleRefetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => this.scheduleRefetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recipes' }, () => this.scheduleRefetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recipe_ingredients' }, () => this.scheduleRefetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_weeks' }, () => this.scheduleRefetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_slots' }, () => this.scheduleRefetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ledger' }, () => this.scheduleRefetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'todos' }, () => this.scheduleRefetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'freezer' }, () => this.scheduleRefetch())
      .subscribe();
    void this.flush();
  }

  stop() {
    window.removeEventListener('online', this.onOnline);
    window.removeEventListener('offline', this.onOffline);
    document.removeEventListener('visibilitychange', this.onVisible);
    if (this.retryTimer) clearInterval(this.retryTimer);
    if (this.refetchTimer) clearTimeout(this.refetchTimer);
    if (this.channel) void supabase.removeChannel(this.channel);
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getState = () => this.state;

  dispatch(ops: Op[]) {
    if (ops.length === 0) return;
    this.outbox = [...this.outbox, ...ops];
    this.persist();
    this.emit();
    void this.flush();
  }

  private onOnline = () => {
    this.setPartial({ online: true });
    void this.flush();
  };

  private onOffline = () => this.setPartial({ online: false });

  private onVisible = () => {
    if (document.visibilityState === 'visible') void this.flush();
  };

  private scheduleRefetch() {
    if (this.refetchTimer) clearTimeout(this.refetchTimer);
    this.refetchTimer = setTimeout(() => {
      if (this.outbox.length > 0) void this.flush();
      else void this.refetch();
    }, 250);
  }

  private persist() {
    try {
      localStorage.setItem(this.key, JSON.stringify({ server: this.server, outbox: this.outbox }));
    } catch {
      /* sin espacio: seguimos en memoria */
    }
  }

  private emit() {
    this.state = { ...this.state, data: applyOps(this.server, this.outbox), pending: this.outbox.length };
    this.listeners.forEach((l) => l());
  }

  private setPartial(p: Partial<StoreState>) {
    this.state = { ...this.state, ...p };
    this.listeners.forEach((l) => l());
  }

  async flush(): Promise<void> {
    if (this.flushing) return;
    this.flushing = true;
    try {
      while (this.outbox.length > 0) {
        const op = this.outbox[0];
        try {
          await this.send(op);
          this.outbox = this.outbox.slice(1);
          this.persist();
        } catch (e) {
          if (isNetworkError(e)) {
            this.setPartial({ online: false });
            return;
          }
          const err = e as PgError;
          if (op.kind === 'upsertProduct' && err.code === '23505') {
            // Otro móvil creó el mismo producto: usamos el suyo.
            const { data } = await supabase
              .from('products')
              .select('id')
              .eq('household_id', this.householdId)
              .ilike('name', op.product.name)
              .maybeSingle();
            this.outbox = data ? remapProduct(this.outbox, op.product.id, data.id as string) : this.outbox.slice(1);
          } else {
            console.error('Cambio descartado', op, e);
            this.outbox = this.outbox.slice(1);
            this.setPartial({ error: 'Un cambio no se pudo guardar y se ha descartado.' });
          }
          this.persist();
        }
      }
      await this.refetch();
    } finally {
      this.flushing = false;
      this.emit();
    }
  }

  private async send(op: Op) {
    let res: { error: PgError | null };
    switch (op.kind) {
      case 'upsertCategory':
        res = await supabase.from('categories').upsert(op.category);
        break;
      case 'upsertProduct':
        res = await supabase.from('products').upsert(stripProduct(op.product));
        break;
      case 'updateProduct':
        res = await supabase.from('products').update(op.patch).eq('id', op.id);
        break;
      case 'deleteProduct':
        res = await supabase.from('products').delete().eq('id', op.id);
        break;
      case 'upsertItem':
        res = await supabase.from('list_items').upsert(op.item);
        break;
      case 'deleteItems':
        res = await supabase.from('list_items').delete().in('id', op.ids);
        break;
      case 'markBought':
        for (const id of op.productIds) {
          const r = await supabase.rpc('mark_bought', { p_product: id });
          if (r.error) throw r.error;
        }
        res = { error: null };
        break;
      case 'upsertRow':
        res = await supabase.from(op.table).upsert(op.row as never, { onConflict: TABLE_PK[op.table].join(',') });
        // Si la base de datos aún no tiene el historial de tareas (migración 006), guardamos sin él.
        if (res.error && op.table === 'todos' && /done_log/.test(res.error.message ?? '')) {
          const { done_log: _omit, ...rest } = op.row as unknown as Record<string, unknown>;
          res = await supabase.from('todos').upsert(rest as never, { onConflict: 'id' });
        }
        break;
      case 'deleteRows': {
        let q = supabase.from(op.table).delete();
        for (const [k, v] of Object.entries(op.match)) q = q.eq(k, v);
        res = await q;
        break;
      }
    }
    if (res.error) throw res.error;
  }

  async refetch(): Promise<void> {
    const h = this.householdId;
    const [c, p, i, r, g, w, s, l, m, t, f] = await Promise.all([
      supabase.from('categories').select('*').eq('household_id', h),
      supabase.from('products').select('*').eq('household_id', h),
      supabase.from('list_items').select('*').eq('household_id', h),
      supabase.from('recipes').select('*').eq('household_id', h),
      supabase.from('recipe_ingredients').select('*').eq('household_id', h),
      supabase.from('menu_weeks').select('*').eq('household_id', h),
      supabase.from('menu_slots').select('*').eq('household_id', h),
      supabase.from('ledger').select('*').eq('household_id', h),
      supabase.from('members').select('household_id, user_id, display_name').eq('household_id', h),
      supabase.from('todos').select('*').eq('household_id', h),
      supabase.from('freezer').select('*').eq('household_id', h),
    ]);
    const err = c.error ?? p.error ?? i.error;
    // Si el módulo 2 aún no está en la base de datos, la lista sigue funcionando.
    const optional = <T,>(x: { data: T[] | null; error: unknown }) => (x.error ? [] : (x.data ?? []));
    if (err) {
      if (isNetworkError(err)) this.setPartial({ online: false });
      return;
    }
    this.server = {
      categories: c.data ?? [],
      products: p.data ?? [],
      items: i.data ?? [],
      recipes: optional(r),
      ingredients: optional(g),
      weeks: optional(w),
      slots: optional(s),
      ledger: optional(l).map((e) => ({ ...(e as object), amount: Number((e as { amount: number }).amount) })),
      members: optional(m),
      todos: optional(t).map((x) => ({ ...(x as object), done_log: (x as { done_log?: string[] }).done_log ?? [] })),
      freezer: optional(f),
    } as Data;
    this.persist();
    this.state = { ...this.state, online: true, loaded: true };
    this.emit();
  }

  clearError() {
    this.setPartial({ error: null });
  }
}

export function useStore(store: Store): StoreState {
  return useSyncExternalStore(store.subscribe, store.getState);
}
