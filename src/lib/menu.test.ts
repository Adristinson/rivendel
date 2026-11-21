import { describe, expect, it } from 'vitest';
import { applyOps, type Ctx } from './logic';
import {
  addReviewToList,
  extractIngredientLines,
  ingredientOps,
  matchProduct,
  parseIngredientLine,
  proposeRecipe,
  proposeWeek,
  removeRecipeFromList,
  reviewForRecipes,
  slotDish,
  slotRow,
  weekRecipeIds,
  weekStartOf,
} from './menu';
import type { Data, Recipe } from './types';

let n = 0;
const ctx: Ctx = { householdId: 'h', by: 'Adri', now: () => '2026-11-21T10:00:00Z', newId: () => `id${++n}` };
const P = (id: string, name: string, staple = false) => ({ id, household_id: 'h', name, category_id: 'fv', is_staple: staple, times_bought: 0, last_bought_at: null });
const R = (id: string, name: string, extra: Partial<Recipe> = {}): Recipe => ({ id, household_id: 'h', name, url: null, body: null, image_path: null, tags: [], favorite: false, created_by: null, created_at: '', updated_at: '', ...extra });

function base(): Data {
  return {
    categories: [{ id: 'fv', household_id: 'h', name: 'Fruta y verdura', sort: 1, color: 'green' }, { id: 'otr', household_id: 'h', name: 'Otros', sort: 99, color: 'gray' }],
    products: [P('ceb', 'Cebolla'), P('pat', 'Patata'), P('tom', 'Tomate'), P('ace', 'Aceite', true), P('ajo', 'Ajo'), P('pol', 'Pollo')],
    items: [],
    recipes: [],
    ingredients: [],
    weeks: [],
    slots: [],
    ledger: [],
    members: [],
  };
}

describe('leer ingredientes', () => {
  it.each([
    ['2 cebollas', 2, null, 'Cebollas'],
    ['200 g de arroz', 200, 'g', 'Arroz'],
    ['200g arroz', 200, 'g', 'Arroz'],
    ['1/2 kg de patatas', 0.5, 'kg', 'Patatas'],
    ['1 1/2 tazas de leche', 1.5, 'taza', 'Leche'],
    ['- 3 dientes de ajo picados', 3, 'diente', 'Ajo picados'],
    ['Un chorrito de aceite', 1, null, 'Chorrito de aceite'],
    ['Sal al gusto', null, null, 'Sal'],
    ['• 1 pechuga de pollo (unos 300 g)', 1, null, 'Pechuga de pollo'],
    ['2 cucharadas de aceite de oliva', 2, 'cda', 'Aceite de oliva'],
  ])('%s', (line, qty, unit, name) => {
    expect(parseIngredientLine(line)).toMatchObject({ qty, unit, name });
  });

  it('saca la sección de ingredientes de un texto pegado', () => {
    const text = `Lentejas de la abuela\nIngredientes:\n- 300 g de lentejas\n- 1 cebolla\n- 2 zanahorias\n\nPreparación\n1. Pon todo en la olla y cuécelo 40 minutos a fuego medio.`;
    expect(extractIngredientLines(text)).toEqual(['300 g de lentejas', '1 cebolla', '2 zanahorias']);
  });

  it('sin cabecera, toma las líneas que parecen ingredientes', () => {
    expect(extractIngredientLines('Tortilla\n4 huevos\n3 patatas\nBate y cuaja.')).toEqual(['4 huevos', '3 patatas']);
  });

  it('enlaza plurales y variantes con el catálogo', () => {
    const d = base();
    expect(matchProduct(d.products, 'Cebollas')?.id).toBe('ceb');
    expect(matchProduct(d.products, 'Tomates')?.id).toBe('tom');
    expect(matchProduct(d.products, 'Aceite de oliva')?.id).toBe('ace');
    expect(matchProduct(d.products, 'Ajo picados')?.id).toBe('ajo');
    expect(matchProduct(d.products, 'Lentejas')).toBeUndefined();
  });

  it('crea productos que faltan al guardar ingredientes', () => {
    const d = applyOps(base(), ingredientOps(base(), 'r1', ['300 g de lentejas', '2 cebollas'], ctx));
    expect(d.ingredients).toHaveLength(2);
    expect(d.products.find((p) => p.name === 'Lentejas')?.category_id).toBe('otr');
    expect(d.ingredients.find((i) => i.raw === '2 cebollas')?.product_id).toBe('ceb');
  });
});

describe('menú', () => {
  it('la semana empieza en lunes', () => {
    expect(weekStartOf(new Date(2026, 10, 21))).toBe('2026-11-16'); // sábado → lunes anterior
    expect(weekStartOf(new Date(2026, 10, 23))).toBe('2026-11-23');
  });

  it('propone sin repetir y respetando comida/cena', () => {
    const d = { ...base(), recipes: [R('a', 'Ensalada', { tags: ['comida'] }), R('b', 'Crema', { tags: ['cena'] }), R('c', 'Pasta')] };
    const r = () => 0.5;
    expect(proposeRecipe(d, { meal: 'cena', exclude: new Set(['c']), random: r })?.id).toBe('b');
    const week = applyOps(d, proposeWeek(d, '2026-11-23', ctx, r));
    expect(week.slots).toHaveLength(10);
    expect(week.slots.filter((s) => s.meal === 'comida').every((s) => s.recipe_id !== 'b')).toBe(true);
  });

  it('prefiere lo que no se ha comido hace tiempo', () => {
    const d = { ...base(), recipes: [R('a', 'A'), R('b', 'B')], slots: [slotRow(ctx, '2026-11-16', 4, 'cena', { recipe_id: 'a' })] };
    expect(proposeRecipe(d, { today: '2026-11-23', random: () => 0 })?.id).toBe('b');
  });

  it('"sale para dos días" muestra el plato anterior y no suma ingredientes dos veces', () => {
    let d = { ...base(), recipes: [R('a', 'Guiso')] };
    d = applyOps(d, ingredientOps(d, 'a', ['2 cebollas', '500 g patatas'], ctx));
    d = { ...d, slots: [slotRow(ctx, 'w', 0, 'comida', { recipe_id: 'a' }), slotRow(ctx, 'w', 0, 'cena', { leftover: true })] };
    expect(slotDish(d, 'w', 0, 'cena')?.recipe?.name).toBe('Guiso');
    expect(weekRecipeIds(d, 'w')).toEqual(['a']);
  });
});

describe('revisión y lista', () => {
  function withRecipes() {
    let d = { ...base(), recipes: [R('a', 'Guiso'), R('b', 'Tortilla'), R('c', 'Sin ingredientes')] };
    d = applyOps(d, ingredientOps(d, 'a', ['2 cebollas', '1 kg de patatas', 'aceite'], ctx));
    d = applyOps(d, ingredientOps(d, 'b', ['1 cebolla', '500 g de patatas'], ctx));
    return d;
  }

  it('suma ingredientes, convierte unidades y quita básicos', () => {
    const { rows, incomplete } = reviewForRecipes(withRecipes(), ['a', 'b', 'c']);
    expect(rows.map((r) => r.product.name)).toEqual(['Cebolla', 'Patata']);
    expect(rows[0]).toMatchObject({ count: 3, recipes: ['Guiso', 'Tortilla'] });
    expect(rows[1].amounts).toEqual({ g: 1500 });
    expect(incomplete.map((r) => r.name)).toEqual(['Sin ingredientes']);
  });

  it('pasa a la lista solo lo marcado y se suma a lo pendiente', () => {
    let d = withRecipes();
    d = { ...d, items: [{ id: 'x', household_id: 'h', product_id: 'ceb', qty: 1, note: null, bought: false, bought_at: null, source: 'manual', added_by: 'Almu', created_at: '', updated_at: '' }] };
    const { rows } = reviewForRecipes(d, ['a', 'b']);
    rows[1].checked = false; // patatas ya en casa
    d = applyOps(d, addReviewToList(d, rows, ctx));
    expect(d.items).toHaveLength(1);
    expect(d.items[0]).toMatchObject({ product_id: 'ceb', qty: 4 });
  });

  it('quitar una receta del menú resta sus ingredientes', () => {
    let d = withRecipes();
    d = applyOps(d, addReviewToList(d, reviewForRecipes(d, ['a', 'b']).rows, ctx));
    d = applyOps(d, removeRecipeFromList(d, 'b', ctx.now()));
    expect(d.items.find((i) => i.product_id === 'ceb')?.qty).toBe(2);
    expect(d.items.find((i) => i.product_id === 'pat')).toBeUndefined();
  });
});
