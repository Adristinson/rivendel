import { describe, expect, it } from 'vitest';
import {
  addByName,
  applyOps,
  clearBought,
  groupPending,
  habituales,
  remapProduct,
  setQty,
  suggestions,
  toggleBought,
  type Ctx,
} from './logic';
import type { Data } from './types';

let n = 0;
const ctx: Ctx = { householdId: 'h', by: 'Adri', now: () => '2026-11-21T10:00:00Z', newId: () => `id${++n}` };

function base(): Data {
  return {
    categories: [
      { id: 'fv', household_id: 'h', name: 'Fruta y verdura', sort: 1, color: 'green' },
      { id: 'lac', household_id: 'h', name: 'Lácteos', sort: 2, color: 'blue' },
      { id: 'otr', household_id: 'h', name: 'Otros', sort: 99, color: 'gray' },
    ],
    products: [
      { id: 'leche', household_id: 'h', name: 'Leche', category_id: 'lac', is_staple: false, times_bought: 5, last_bought_at: null },
      { id: 'kefir', household_id: 'h', name: 'Kéfir', category_id: 'lac', is_staple: false, times_bought: 1, last_bought_at: null },
      { id: 'tomate', household_id: 'h', name: 'Tomate', category_id: 'fv', is_staple: false, times_bought: 2, last_bought_at: null },
    ],
    items: [],
    recipes: [],
    ingredients: [],
    weeks: [],
    slots: [],
    ledger: [],
    members: [],
    todos: [],
    freezer: [],
    packTemplate: [],
    trips: [],
    tripItems: [],
    places: [],
  };
}

describe('añadir productos', () => {
  it('añade un producto existente sin crear otro', () => {
    const d = applyOps(base(), addByName(base(), 'leche', ctx));
    expect(d.products).toHaveLength(3);
    expect(d.items).toHaveLength(1);
    expect(d.items[0]).toMatchObject({ product_id: 'leche', qty: 1, added_by: 'Adri', bought: false });
  });

  it('ignora tildes y mayúsculas al buscar', () => {
    const d = applyOps(base(), addByName(base(), '  KEFIR ', ctx));
    expect(d.items[0].product_id).toBe('kefir');
  });

  it('suma cantidad si ya está pendiente', () => {
    let d = applyOps(base(), addByName(base(), 'Leche', ctx));
    d = applyOps(d, addByName(d, 'leche', ctx));
    expect(d.items).toHaveLength(1);
    expect(d.items[0].qty).toBe(2);
  });

  it('reactiva un producto ya comprado en vez de duplicarlo', () => {
    let d = applyOps(base(), addByName(base(), 'Leche', ctx));
    d = applyOps(d, toggleBought(d, d.items[0].id, ctx.now()));
    d = applyOps(d, addByName(d, 'Leche', ctx));
    expect(d.items).toHaveLength(1);
    expect(d.items[0]).toMatchObject({ bought: false, qty: 1 });
  });

  it('crea un producto nuevo en Otros', () => {
    const d = applyOps(base(), addByName(base(), 'papel de cocina', ctx));
    const p = d.products.find((x) => x.name === 'Papel de cocina');
    expect(p?.category_id).toBe('otr');
    expect(d.items[0].product_id).toBe(p?.id);
  });

  it('no hace nada con texto vacío', () => {
    expect(addByName(base(), '   ', ctx)).toEqual([]);
  });
});

describe('lista', () => {
  it('agrupa por categoría en orden y omite comprados', () => {
    let d = base();
    for (const name of ['Tomate', 'Leche', 'Kéfir']) d = applyOps(d, addByName(d, name, ctx));
    d = applyOps(d, toggleBought(d, d.items.find((i) => i.product_id === 'kefir')!.id, ctx.now()));
    const g = groupPending(d);
    expect(g.map((x) => x.name)).toEqual(['Fruta y verdura', 'Lácteos']);
    expect(g[1].rows.map((r) => r.product.name)).toEqual(['Leche']);
  });

  it('cantidad 0 quita el producto de la lista', () => {
    let d = applyOps(base(), addByName(base(), 'Leche', ctx));
    d = applyOps(d, setQty(d, d.items[0].id, 0, ctx.now()));
    expect(d.items).toHaveLength(0);
  });

  it('limpiar comprados borra y cuenta la compra', () => {
    let d = applyOps(base(), addByName(base(), 'Kéfir', ctx));
    d = applyOps(d, toggleBought(d, d.items[0].id, ctx.now()));
    d = applyOps(d, clearBought(d));
    expect(d.items).toHaveLength(0);
    expect(d.products.find((p) => p.id === 'kefir')?.times_bought).toBe(2);
  });
});

describe('sugerencias y habituales', () => {
  it('prioriza lo que empieza por el texto y lo más comprado', () => {
    expect(suggestions(base(), 'e').map((p) => p.name)).toEqual(['Leche', 'Tomate', 'Kéfir']);
    expect(suggestions(base(), 'le').map((p) => p.name)).toEqual(['Leche']);
    expect(suggestions(base(), 'ke')[0].name).toBe('Kéfir');
  });

  it('los habituales excluyen lo que ya está en la lista y van por uso', () => {
    const d = applyOps(base(), addByName(base(), 'Leche', ctx));
    expect(habituales(d).map((p) => p.name)).toEqual(['Tomate', 'Kéfir']);
  });
});

describe('sin conexión', () => {
  it('reasigna un producto duplicado creado en otro móvil', () => {
    const d = base();
    const ops = addByName(d, 'Huevos', ctx);
    const created = ops[0].kind === 'upsertProduct' ? ops[0].product.id : '';
    const out = remapProduct(ops, created, 'huevos-servidor');
    expect(out).toHaveLength(1);
    expect(out[0].kind === 'upsertItem' && out[0].item.product_id).toBe('huevos-servidor');
  });
});
