import type { Data, Ingredient, ListItem, Meal, MenuSlot, Op, Product, Recipe } from './types';
import { capitalize, norm, otherCategory, type Ctx } from './logic';

/* ───────────────────────── Ingredientes ───────────────────────── */

const UNITS: [RegExp, string][] = [
  [/^(kg|kilos?|kilogramos?)$/, 'kg'],
  [/^(g|gr|grs|gramos?)$/, 'g'],
  [/^(l|litros?)$/, 'l'],
  [/^(ml|mililitros?)$/, 'ml'],
  [/^(cda|cdas|cucharadas?)$/, 'cda'],
  [/^(cdta|cdtas|cucharaditas?)$/, 'cdta'],
  [/^(tazas?|vasos?)$/, 'taza'],
  [/^(latas?|botes?)$/, 'lata'],
  [/^(paquetes?|bolsas?|sobres?)$/, 'paquete'],
  [/^(dientes?)$/, 'diente'],
  [/^(pizcas?|pellizcos?)$/, 'pizca'],
  [/^(rodajas?|lonchas?|filetes?|piezas?|unidades?|ud|uds)$/, 'ud'],
];

const WORD_NUM: Record<string, number> = {
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  medio: 0.5, media: 0.5, 'un par de': 2,
};

export interface ParsedIngredient {
  raw: string;
  qty: number | null;
  unit: string | null;
  name: string;
}

function parseNumber(tok: string): number | null {
  const t = tok.replace(',', '.');
  if (/^\d+\/\d+$/.test(t)) {
    const [a, b] = t.split('/').map(Number);
    return b ? a / b : null;
  }
  if (/^\d+(\.\d+)?$/.test(t)) return Number(t);
  if (t === '½') return 0.5;
  if (t === '¼') return 0.25;
  return WORD_NUM[t] ?? null;
}

/** "2 cebollas", "200 g de arroz", "1/2 kg de patatas", "Sal al gusto"… */
export function parseIngredientLine(line: string): ParsedIngredient | null {
  const raw = line.replace(/^[\s•·*\-–—✓✔▪◦●]+/, '').replace(/\s+/g, ' ').trim();
  if (!raw) return null;
  let rest = raw.toLowerCase();
  let qty: number | null = null;
  let unit: string | null = null;

  if (rest.startsWith('un par de ')) {
    qty = 2;
    rest = rest.slice('un par de '.length);
  } else {
    const m = rest.match(/^(\d+\s+\d+\/\d+|\d+(?:[.,]\d+)?\/?\d*|[½¼]|[a-záéíóúñ]+)\s*(.*)$/);
    if (m) {
      let q: number | null;
      if (/^\d+\s+\d+\/\d+$/.test(m[1])) {
        const [whole, frac] = m[1].split(/\s+/);
        q = Number(whole) + (parseNumber(frac) ?? 0);
      } else q = parseNumber(m[1]);
      if (q !== null) {
        qty = q;
        rest = m[2];
      }
    }
    // "200g" pegado
    const glued = rest === raw.toLowerCase() ? rest.match(/^(\d+(?:[.,]\d+)?)(kg|g|gr|ml|l)\b\s*(.*)$/) : null;
    if (glued) {
      qty = Number(glued[1].replace(',', '.'));
      unit = UNITS.find(([re]) => re.test(glued[2]))?.[1] ?? null;
      rest = glued[3];
    }
  }

  if (!unit) {
    const um = rest.match(/^([a-záéíóúñ]+)\.?\s+(.*)$/);
    if (um) {
      const found = UNITS.find(([re]) => re.test(um[1]));
      if (found) {
        unit = found[1];
        rest = um[2];
      }
    }
  }

  rest = rest
    .replace(/^de(l)?\s+/, '')
    .replace(/\(.*?\)/g, '')
    .split(/,|\bpara\b|\bal gusto\b|\bopcional\b/)[0]
    .trim();
  if (!rest) return null;
  return { raw, qty, unit, name: capitalize(rest) };
}

const SECTION_START = /^\s*(ingredientes|ingredients)\b.*:?\s*$/i;
const SECTION_END = /^\s*(preparaci[oó]n|elaboraci[oó]n|pasos|instrucciones|modo de preparaci[oó]n|procedimiento|method|steps)\b/i;

/** Saca las líneas de ingredientes de un texto de receta pegado. */
export function extractIngredientLines(text: string): string[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const start = lines.findIndex((l) => SECTION_START.test(l));
  let candidates: string[];
  if (start >= 0) {
    const after = lines.slice(start + 1);
    const end = after.findIndex((l) => SECTION_END.test(l));
    candidates = (end >= 0 ? after.slice(0, end) : after).filter(Boolean);
  } else {
    candidates = lines.filter((l) => /^([•·*\-–—✓✔▪◦●]|\d)/.test(l) && l.length < 80 && !/^\d+[.)]\s+\S+.*\s\S+.*\s\S+.*\s\S+.*\s\S+/.test(l));
  }
  return candidates.map((l) => l.replace(/^[\s•·*\-–—✓✔▪◦●]+/, '').trim()).filter((l) => l && !SECTION_START.test(l));
}

function singular(s: string): string {
  if (s.endsWith('ces')) return s.slice(0, -3) + 'z';
  if (/(ones|ales|eles|ores|ines)$/.test(s)) return s.slice(0, -2);
  if (s.endsWith('s') && !s.endsWith('ss')) return s.slice(0, -1);
  return s;
}

function variants(s: string): string[] {
  const n = norm(s);
  const words = n.split(' ');
  const sing = words.map(singular).join(' ');
  return [...new Set([n, sing])];
}

/** Busca el producto del catálogo que corresponde a un ingrediente ("cebollas" → Cebolla). */
export function matchProduct(products: Product[], name: string): Product | undefined {
  const want = variants(name);
  const exact = products.find((p) => variants(p.name).some((v) => want.includes(v)));
  if (exact) return exact;
  // "tomate triturado" → Tomate solo si el producto es una palabra completa al principio
  const first = want[want.length - 1];
  return products
    .filter((p) => {
      const pv = variants(p.name).at(-1)!;
      return first === pv || first.startsWith(pv + ' ');
    })
    .sort((a, b) => b.name.length - a.name.length)[0];
}

/** Guarda los ingredientes de una receta: reemplaza los anteriores y crea productos nuevos si hace falta. */
export function ingredientOps(
  data: Data,
  recipeId: string,
  lines: string[],
  ctx: Ctx,
  categoryFor?: (name: string) => string | undefined,
): Op[] {
  const ops: Op[] = [{ kind: 'deleteRows', table: 'recipe_ingredients', match: { recipe_id: recipeId } }];
  const products = [...data.products];
  let sort = 0;
  for (const line of lines) {
    const parsed = parseIngredientLine(line);
    if (!parsed) continue;
    let product = matchProduct(products, parsed.name);
    if (!product) {
      product = {
        id: ctx.newId(),
        household_id: ctx.householdId,
        name: parsed.name,
        category_id: categoryFor?.(parsed.name) ?? otherCategory(data)?.id ?? null,
        is_staple: false,
        times_bought: 0,
        last_bought_at: null,
      };
      products.push(product);
      ops.push({ kind: 'upsertProduct', product });
    }
    const ing: Ingredient = {
      id: ctx.newId(),
      household_id: ctx.householdId,
      recipe_id: recipeId,
      product_id: product.id,
      qty: parsed.qty,
      unit: parsed.unit,
      raw: parsed.raw,
      sort: sort++,
    };
    ops.push({ kind: 'upsertRow', table: 'recipe_ingredients', row: ing });
  }
  return ops;
}

export function ingredientsOf(data: Data, recipeId: string): Ingredient[] {
  return data.ingredients.filter((i) => i.recipe_id === recipeId).sort((a, b) => a.sort - b.sort);
}

export function isIncomplete(data: Data, recipeId: string): boolean {
  return !data.ingredients.some((i) => i.recipe_id === recipeId);
}

/* ───────────────────────── Semanas ───────────────────────── */

export const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const WEEKDAYS = [0, 1, 2, 3, 4];
export const MEALS: Meal[] = ['comida', 'cena'];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Lunes de la semana de una fecha. */
export function weekStartOf(d: Date): string {
  const day = (d.getDay() + 6) % 7;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
  return isoDate(monday);
}

export function addWeeks(week: string, n: number): string {
  const d = parseDate(week);
  d.setDate(d.getDate() + 7 * n);
  return isoDate(d);
}

export function dayDate(week: string, day: number): Date {
  const d = parseDate(week);
  d.setDate(d.getDate() + day);
  return d;
}

export function weekLabel(week: string): string {
  const a = parseDate(week);
  const b = dayDate(week, 4);
  const f = (d: Date) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  return `${f(a)} – ${f(b)}`;
}

export function getSlot(data: Data, week: string, day: number, meal: Meal): MenuSlot | undefined {
  return data.slots.find((s) => s.week_start === week && s.day === day && s.meal === meal);
}

export function getWeek(data: Data, week: string) {
  return data.weeks.find((w) => w.week_start === week);
}

/** Hueco anterior en orden (lunes comida, lunes cena, martes comida…). */
export function previousSlotKey(day: number, meal: Meal): { day: number; meal: Meal } | null {
  if (meal === 'cena') return { day, meal: 'comida' };
  if (day === 0) return null;
  return { day: day - 1, meal: 'cena' };
}

export function nextSlotKey(day: number, meal: Meal): { day: number; meal: Meal } | null {
  if (meal === 'comida') return { day, meal: 'cena' };
  if (day >= 4) return null;
  return { day: day + 1, meal: 'comida' };
}

/** Lo que se come en un hueco, resolviendo "sale para dos días". */
export function slotDish(data: Data, week: string, day: number, meal: Meal): { recipe?: Recipe; text?: string; leftover: boolean } | null {
  const s = getSlot(data, week, day, meal);
  if (!s) return null;
  if (s.leftover) {
    const prev = previousSlotKey(day, meal);
    const base = prev ? slotDish(data, week, prev.day, prev.meal) : null;
    return base ? { ...base, leftover: true } : null;
  }
  const recipe = s.recipe_id ? data.recipes.find((r) => r.id === s.recipe_id) : undefined;
  if (!recipe && !s.text) return null;
  return { recipe, text: s.text ?? undefined, leftover: false };
}

export function slotRow(ctx: Ctx, week: string, day: number, meal: Meal, patch: Partial<MenuSlot>): MenuSlot {
  return {
    household_id: ctx.householdId,
    week_start: week,
    day,
    meal,
    recipe_id: null,
    text: null,
    leftover: false,
    updated_at: ctx.now(),
    ...patch,
  };
}

/* ───────────────────────── Propuestas ───────────────────────── */

/** Última fecha en que se comió cada receta. */
export function lastEaten(data: Data): Map<string, string> {
  const out = new Map<string, string>();
  for (const s of data.slots) {
    if (!s.recipe_id || s.leftover) continue;
    const d = isoDate(dayDate(s.week_start, s.day));
    const prev = out.get(s.recipe_id);
    if (!prev || d > prev) out.set(s.recipe_id, d);
  }
  return out;
}

export interface ProposeOpts {
  meal?: Meal;
  exclude?: Set<string>;
  today?: string;
  random?: () => number;
}

export function scoreRecipe(r: Recipe, last: Map<string, string>, opts: ProposeOpts): number {
  const today = opts.today ?? isoDate(new Date());
  const l = last.get(r.id);
  const days = l ? Math.max(0, (parseDate(today).getTime() - parseDate(l).getTime()) / 864e5) : 45;
  let score = Math.min(days, 45) / 7; // 0–6,4: cuanto más tiempo sin comerla, mejor
  if (r.favorite) score += 2;
  if (opts.meal && r.tags.includes(opts.meal)) score += 1;
  return score + (opts.random ?? Math.random)() * 2.5;
}

/** Elige una receta del recetario para un hueco. */
export function proposeRecipe(data: Data, opts: ProposeOpts = {}): Recipe | undefined {
  const last = lastEaten(data);
  const other: Meal | undefined = opts.meal === 'comida' ? 'cena' : opts.meal === 'cena' ? 'comida' : undefined;
  let pool = data.recipes.filter((r) => !(other && r.tags.includes(other) && !r.tags.includes(opts.meal!)));
  const fresh = pool.filter((r) => !opts.exclude?.has(r.id));
  if (fresh.length > 0) pool = fresh;
  if (pool.length === 0) return undefined;
  return pool
    .map((r) => ({ r, s: scoreRecipe(r, last, opts) }))
    .sort((a, b) => b.s - a.s)[0].r;
}

/** Rellena los huecos vacíos de la semana con recetas del recetario. */
export function proposeWeek(data: Data, week: string, ctx: Ctx, random?: () => number): Op[] {
  const ops: Op[] = [];
  const used = new Set(data.slots.filter((s) => s.week_start === week && s.recipe_id).map((s) => s.recipe_id!));
  for (const day of WEEKDAYS) {
    for (const meal of MEALS) {
      const s = getSlot(data, week, day, meal);
      if (s && (s.recipe_id || s.text || s.leftover)) continue;
      const r = proposeRecipe(data, { meal, exclude: used, random });
      if (!r) return ops;
      used.add(r.id);
      ops.push({ kind: 'upsertRow', table: 'menu_slots', row: slotRow(ctx, week, day, meal, { recipe_id: r.id }) });
    }
  }
  return ops;
}

/* ───────────────────────── Revisión al aprobar ───────────────────────── */

const TO_BASE: Record<string, [string, number]> = { kg: ['g', 1000], l: ['ml', 1000] };

export interface ReviewRow {
  product: Product;
  count: number; // unidades sueltas (sin unidad de medida)
  amounts: Record<string, number>; // g, ml, cda…
  recipes: string[];
  checked: boolean;
}

export function fmtAmount(unit: string, n: number): string {
  if (unit === 'g' && n >= 1000) return `${+(n / 1000).toFixed(2)} kg`;
  if (unit === 'ml' && n >= 1000) return `${+(n / 1000).toFixed(2)} l`;
  const plural: Record<string, string> = { paquete: 'paquetes', lata: 'latas', diente: 'dientes', taza: 'tazas', pizca: 'pizcas', cda: 'cdas', cdta: 'cdtas' };
  return `${+n.toFixed(2)} ${n !== 1 && plural[unit] ? plural[unit] : unit}`;
}

export function reviewSummary(r: ReviewRow): string {
  const parts = Object.entries(r.amounts).map(([u, n]) => fmtAmount(u, n));
  return parts.join(' · ');
}

/** Ingredientes sumados de unas recetas, sin los básicos de casa. */
export function reviewForRecipes(data: Data, recipeIds: string[]): { rows: ReviewRow[]; incomplete: Recipe[] } {
  const byProduct = new Map<string, ReviewRow>();
  const incomplete: Recipe[] = [];
  for (const rid of recipeIds) {
    const recipe = data.recipes.find((r) => r.id === rid);
    if (!recipe) continue;
    const ings = ingredientsOf(data, rid);
    if (ings.length === 0) {
      if (!incomplete.includes(recipe)) incomplete.push(recipe);
      continue;
    }
    for (const ing of ings) {
      const product = data.products.find((p) => p.id === ing.product_id);
      if (!product || product.is_staple) continue;
      const row = byProduct.get(product.id) ?? { product, count: 0, amounts: {}, recipes: [], checked: true };
      if (ing.unit && ing.unit !== 'ud') {
        const [u, f] = TO_BASE[ing.unit] ?? [ing.unit, 1];
        if (ing.qty !== null) row.amounts[u] = (row.amounts[u] ?? 0) + ing.qty * f;
        else row.count = Math.max(row.count, 1);
      } else {
        row.count += ing.qty ?? 1;
      }
      if (!row.recipes.includes(recipe.name)) row.recipes.push(recipe.name);
      byProduct.set(product.id, row);
    }
  }
  const rows = [...byProduct.values()].map((r) => ({
    ...r,
    count: r.count > 0 ? Math.ceil(r.count) : Object.keys(r.amounts).length > 0 ? 0 : 1,
  }));
  rows.sort((a, b) => a.product.name.localeCompare(b.product.name, 'es'));
  return { rows, incomplete };
}

/** Recetas que se cocinan en la semana (sin contar las sobras). */
export function weekRecipeIds(data: Data, week: string): string[] {
  return data.slots
    .filter((s) => s.week_start === week && s.recipe_id && !s.leftover && s.day <= 4)
    .sort((a, b) => a.day - b.day || (a.meal === 'comida' ? -1 : 1))
    .map((s) => s.recipe_id!);
}

/** Pasa a la lista de la compra las filas marcadas de la revisión. */
export function addReviewToList(data: Data, rows: ReviewRow[], ctx: Ctx): Op[] {
  const ops: Op[] = [];
  const now = ctx.now();
  for (const r of rows) {
    if (!r.checked) continue;
    const amount = reviewSummary(r);
    const qtyToAdd = Math.max(r.count, 1);
    const pending = data.items.find((i) => i.product_id === r.product.id && !i.bought);
    const bought = data.items.find((i) => i.product_id === r.product.id && i.bought);
    if (pending) {
      const note = [pending.note, amount].filter(Boolean).join(' + ') || null;
      ops.push({
        kind: 'upsertItem',
        item: { ...pending, qty: r.count > 0 ? pending.qty + r.count : pending.qty, note, updated_at: now },
      });
    } else {
      const base: ListItem = bought ?? {
        id: ctx.newId(),
        household_id: ctx.householdId,
        product_id: r.product.id,
        qty: 1,
        note: null,
        bought: false,
        bought_at: null,
        source: 'menu',
        added_by: ctx.by,
        created_at: now,
        updated_at: now,
      };
      ops.push({
        kind: 'upsertItem',
        item: { ...base, qty: qtyToAdd, note: amount || null, bought: false, bought_at: null, source: 'menu', added_by: ctx.by, updated_at: now },
      });
    }
  }
  return ops;
}

/** Al quitar una receta de un menú aprobado: resta sus ingredientes de lo pendiente que vino del menú. */
export function removeRecipeFromList(data: Data, recipeId: string, now: string): Op[] {
  const ops: Op[] = [];
  for (const ing of ingredientsOf(data, recipeId)) {
    const item = data.items.find((i) => i.product_id === ing.product_id && !i.bought && i.source === 'menu');
    if (!item) continue;
    const minus = ing.unit && ing.unit !== 'ud' ? 0 : ing.qty ?? 1;
    const qty = item.qty - minus;
    if (qty <= 0 || minus === 0) ops.push({ kind: 'deleteItems', ids: [item.id] });
    else ops.push({ kind: 'upsertItem', item: { ...item, qty, updated_at: now } });
  }
  // Evita operar dos veces sobre el mismo elemento
  const seen = new Set<string>();
  return ops.filter((op) => {
    const id = op.kind === 'deleteItems' ? op.ids[0] : op.kind === 'upsertItem' ? op.item.id : '';
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export const TAGS: { id: string; label: string }[] = [
  { id: 'comida', label: 'Comida' },
  { id: 'cena', label: 'Cena' },
  { id: 'rapida', label: 'Rápida' },
  { id: 'batch', label: 'Batch cooking' },
  { id: 'lorenzo', label: 'Le gusta a Lorenzo' },
];
