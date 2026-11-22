import type { Category, Data, ListItem, Op, Product, Row as AnyRow, Table } from './types';
import { tone, type Tone } from './palette';

export function norm(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');
}

export function capitalize(s: string): string {
  const t = s.trim().replace(/\s+/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function findProduct(data: Data, name: string): Product | undefined {
  const key = norm(name);
  return data.products.find((p) => norm(p.name) === key);
}

export function otherCategory(data: Data): Category | undefined {
  return data.categories.find((c) => norm(c.name) === 'otros') ?? [...data.categories].sort((a, b) => b.sort - a.sort)[0];
}

const TABLE_KEY = {
  recipes: 'recipes',
  recipe_ingredients: 'ingredients',
  menu_weeks: 'weeks',
  menu_slots: 'slots',
  ledger: 'ledger',
  todos: 'todos',
} as const;

/** Columnas que identifican una fila en cada tabla. */
export const TABLE_PK: Record<Table, string[]> = {
  recipes: ['id'],
  recipe_ingredients: ['id'],
  menu_weeks: ['household_id', 'week_start'],
  menu_slots: ['household_id', 'week_start', 'day', 'meal'],
  ledger: ['id'],
  todos: ['id'],
};

function sameKey(table: Table, a: Record<string, unknown>, b: Record<string, unknown>) {
  return TABLE_PK[table].every((k) => a[k] === b[k]);
}

function matches(row: Record<string, unknown>, match: Record<string, string | number>) {
  return Object.entries(match).every(([k, v]) => row[k] === v);
}

/** Aplica un cambio a los datos locales (sin red). */
export function applyOp(data: Data, op: Op): Data {
  switch (op.kind) {
    case 'upsertCategory': {
      const exists = data.categories.some((c) => c.id === op.category.id);
      return {
        ...data,
        categories: exists ? data.categories.map((c) => (c.id === op.category.id ? op.category : c)) : [...data.categories, op.category],
      };
    }
    case 'upsertProduct': {
      const exists = data.products.some((p) => p.id === op.product.id);
      return {
        ...data,
        products: exists ? data.products.map((p) => (p.id === op.product.id ? op.product : p)) : [...data.products, op.product],
      };
    }
    case 'updateProduct':
      return { ...data, products: data.products.map((p) => (p.id === op.id ? { ...p, ...op.patch } : p)) };
    case 'deleteProduct':
      return {
        ...data,
        products: data.products.filter((p) => p.id !== op.id),
        items: data.items.filter((i) => i.product_id !== op.id),
      };
    case 'upsertItem': {
      const exists = data.items.some((i) => i.id === op.item.id);
      return { ...data, items: exists ? data.items.map((i) => (i.id === op.item.id ? op.item : i)) : [...data.items, op.item] };
    }
    case 'deleteItems': {
      const ids = new Set(op.ids);
      return { ...data, items: data.items.filter((i) => !ids.has(i.id)) };
    }
    case 'markBought': {
      const ids = new Set(op.productIds);
      return {
        ...data,
        products: data.products.map((p) => (ids.has(p.id) ? { ...p, times_bought: p.times_bought + 1 } : p)),
      };
    }
    case 'upsertRow': {
      const key = TABLE_KEY[op.table];
      const rows = data[key] as unknown as Record<string, unknown>[];
      const row = op.row as unknown as Record<string, unknown>;
      const exists = rows.some((r) => sameKey(op.table, r, row));
      const next = exists ? rows.map((r) => (sameKey(op.table, r, row) ? row : r)) : [...rows, row];
      return { ...data, [key]: next as unknown as AnyRow[] };
    }
    case 'deleteRows': {
      const key = TABLE_KEY[op.table];
      const rows = data[key] as unknown as Record<string, unknown>[];
      const gone = rows.filter((r) => matches(r, op.match));
      let next: Data = { ...data, [key]: rows.filter((r) => !matches(r, op.match)) as unknown as AnyRow[] };
      if (op.table === 'recipes') {
        const ids = new Set(gone.map((r) => r.id));
        next = {
          ...next,
          ingredients: next.ingredients.filter((i) => !ids.has(i.recipe_id)),
          slots: next.slots.map((sl) => (sl.recipe_id && ids.has(sl.recipe_id) ? { ...sl, recipe_id: null } : sl)),
        };
      }
      return next;
    }
  }
}

export function applyOps(data: Data, ops: Op[]): Data {
  return ops.reduce(applyOp, data);
}

export interface Ctx {
  householdId: string;
  by: string;
  userId?: string;
  now: () => string;
  newId: () => string;
}

/** Añadir un producto a la lista por su nombre. Crea el producto si no existe; si ya está pendiente, suma 1. */
export function addByName(data: Data, rawName: string, ctx: Ctx, categoryId?: string | null): Op[] {
  const name = capitalize(rawName);
  if (!name) return [];
  const ops: Op[] = [];
  let product = findProduct(data, name);
  if (!product) {
    product = {
      id: ctx.newId(),
      household_id: ctx.householdId,
      name,
      category_id: categoryId ?? otherCategory(data)?.id ?? null,
      is_staple: false,
      times_bought: 0,
      last_bought_at: null,
    };
    ops.push({ kind: 'upsertProduct', product });
  }
  const now = ctx.now();
  const pending = data.items.find((i) => i.product_id === product!.id && !i.bought);
  const bought = data.items.find((i) => i.product_id === product!.id && i.bought);
  if (pending) {
    ops.push({ kind: 'upsertItem', item: { ...pending, qty: pending.qty + 1, updated_at: now } });
  } else if (bought) {
    ops.push({
      kind: 'upsertItem',
      item: { ...bought, qty: 1, bought: false, bought_at: null, added_by: ctx.by, source: 'manual', note: null, updated_at: now },
    });
  } else {
    const item: ListItem = {
      id: ctx.newId(),
      household_id: ctx.householdId,
      product_id: product.id,
      qty: 1,
      note: null,
      bought: false,
      bought_at: null,
      source: 'manual',
      added_by: ctx.by,
      created_at: now,
      updated_at: now,
    };
    ops.push({ kind: 'upsertItem', item });
  }
  return ops;
}

export function toggleBought(data: Data, itemId: string, now: string): Op[] {
  const item = data.items.find((i) => i.id === itemId);
  if (!item) return [];
  return [{ kind: 'upsertItem', item: { ...item, bought: !item.bought, bought_at: item.bought ? null : now, updated_at: now } }];
}

export function setQty(data: Data, itemId: string, qty: number, now: string): Op[] {
  const item = data.items.find((i) => i.id === itemId);
  if (!item) return [];
  if (qty <= 0) return [{ kind: 'deleteItems', ids: [itemId] }];
  return [{ kind: 'upsertItem', item: { ...item, qty, updated_at: now } }];
}

export function setNote(data: Data, itemId: string, note: string, now: string): Op[] {
  const item = data.items.find((i) => i.id === itemId);
  if (!item) return [];
  const clean = note.trim();
  return [{ kind: 'upsertItem', item: { ...item, note: clean ? clean : null, updated_at: now } }];
}

/** Limpiar comprados: se borran de la lista y cuentan como compra para los habituales. */
export function clearBought(data: Data): Op[] {
  const bought = data.items.filter((i) => i.bought);
  if (bought.length === 0) return [];
  return [
    { kind: 'markBought', productIds: [...new Set(bought.map((i) => i.product_id))] },
    { kind: 'deleteItems', ids: bought.map((i) => i.id) },
  ];
}

export interface Row {
  item: ListItem;
  product: Product;
  tone: Tone;
}

export interface Group {
  category: Category | null;
  name: string;
  tone: Tone;
  rows: Row[];
}

function rowsFor(data: Data, items: ListItem[]): Row[] {
  const byId = new Map(data.products.map((p) => [p.id, p]));
  const cats = new Map(data.categories.map((c) => [c.id, c]));
  return items
    .map((item) => {
      const product = byId.get(item.product_id);
      if (!product) return null;
      const cat = product.category_id ? cats.get(product.category_id) : undefined;
      return { item, product, tone: tone(cat?.color) };
    })
    .filter((r): r is Row => r !== null);
}

export function groupPending(data: Data): Group[] {
  const rows = rowsFor(data, data.items.filter((i) => !i.bought));
  const cats = [...data.categories].sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, 'es'));
  const groups: Group[] = cats.map((c) => ({ category: c, name: c.name, tone: tone(c.color), rows: [] as Row[] }));
  const orphan: Group = { category: null, name: 'Sin categoría', tone: tone('gray'), rows: [] };
  const index = new Map(groups.map((g) => [g.category!.id, g]));
  for (const r of rows) {
    const g = r.product.category_id ? index.get(r.product.category_id) : undefined;
    (g ?? orphan).rows.push(r);
  }
  const all = [...groups, orphan].filter((g) => g.rows.length > 0);
  for (const g of all) g.rows.sort((a, b) => a.product.name.localeCompare(b.product.name, 'es'));
  return all;
}

export function boughtRows(data: Data): Row[] {
  return rowsFor(
    data,
    data.items.filter((i) => i.bought),
  ).sort((a, b) => (b.item.bought_at ?? '').localeCompare(a.item.bought_at ?? ''));
}

export function suggestions(data: Data, q: string, max = 6): Product[] {
  const key = norm(q);
  if (!key) return [];
  const starts: Product[] = [];
  const contains: Product[] = [];
  for (const p of data.products) {
    const n = norm(p.name);
    if (n.startsWith(key)) starts.push(p);
    else if (n.includes(key)) contains.push(p);
  }
  const byUse = (a: Product, b: Product) => b.times_bought - a.times_bought || a.name.localeCompare(b.name, 'es');
  return [...starts.sort(byUse), ...contains.sort(byUse)].slice(0, max);
}

/** Habituales: los más comprados que no están ya pendientes. */
export function habituales(data: Data, max = 8): Product[] {
  const pending = new Set(data.items.filter((i) => !i.bought).map((i) => i.product_id));
  return data.products
    .filter((p) => !pending.has(p.id))
    .sort((a, b) => b.times_bought - a.times_bought || a.name.localeCompare(b.name, 'es'))
    .slice(0, max);
}

export function categoryTone(data: Data, product: Product): Tone {
  const c = data.categories.find((x) => x.id === product.category_id);
  return tone(c?.color);
}

/** Cuando dos móviles crean el mismo producto sin conexión, el segundo pasa a usar el del primero. */
export function remapProduct(ops: Op[], from: string, to: string): Op[] {
  return ops
    .filter((op) => !(op.kind === 'upsertProduct' && op.product.id === from))
    .map((op) => {
      if (op.kind === 'upsertItem' && op.item.product_id === from) return { ...op, item: { ...op.item, product_id: to } };
      if (op.kind === 'updateProduct' && op.id === from) return { ...op, id: to };
      if (op.kind === 'deleteProduct' && op.id === from) return { ...op, id: to };
      if (op.kind === 'markBought') return { ...op, productIds: op.productIds.map((p) => (p === from ? to : p)) };
      return op;
    });
}
