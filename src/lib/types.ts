export interface Category {
  id: string;
  household_id: string;
  name: string;
  sort: number;
  color: string;
}

export interface Product {
  id: string;
  household_id: string;
  name: string;
  category_id: string | null;
  is_staple: boolean;
  times_bought: number;
  last_bought_at: string | null;
  created_at?: string;
}

export interface ListItem {
  id: string;
  household_id: string;
  product_id: string;
  qty: number;
  note: string | null;
  bought: boolean;
  bought_at: string | null;
  source: 'manual' | 'menu';
  added_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Member {
  household_id: string;
  user_id: string;
  display_name: string;
}

export interface Household {
  id: string;
  name: string;
  invite_code: string;
}

export interface Recipe {
  id: string;
  household_id: string;
  name: string;
  url: string | null;
  body: string | null;
  image_path: string | null;
  tags: string[];
  favorite: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Ingredient {
  id: string;
  household_id: string;
  recipe_id: string;
  product_id: string | null;
  qty: number | null;
  unit: string | null;
  raw: string;
  sort: number;
}

export interface MenuWeek {
  household_id: string;
  week_start: string; // YYYY-MM-DD, lunes
  status: 'draft' | 'approved';
  approved_at: string | null;
}

export type Meal = 'comida' | 'cena';

export interface MenuSlot {
  household_id: string;
  week_start: string;
  day: number; // 0 = lunes
  meal: Meal;
  recipe_id: string | null;
  text: string | null;
  leftover: boolean;
  updated_at: string;
}

export interface LedgerEntry {
  id: string;
  household_id: string;
  kind: 'gasto' | 'pago';
  amount: number;
  concept: string;
  paid_by: string;
  other_user: string;
  payer_share: number; // % del gasto que corresponde a quien paga
  date: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Data {
  categories: Category[];
  products: Product[];
  items: ListItem[];
  recipes: Recipe[];
  ingredients: Ingredient[];
  weeks: MenuWeek[];
  slots: MenuSlot[];
  ledger: LedgerEntry[];
  members: Member[];
}

export type Table = 'recipes' | 'recipe_ingredients' | 'menu_weeks' | 'menu_slots' | 'ledger';
export type Row = Recipe | Ingredient | MenuWeek | MenuSlot | LedgerEntry;

/** Cambios que se aplican al momento en el móvil y se envían a Supabase cuando hay conexión. */
export type Op =
  | { kind: 'upsertProduct'; product: Product }
  | { kind: 'upsertCategory'; category: Category }
  | { kind: 'updateProduct'; id: string; patch: Partial<Product> }
  | { kind: 'deleteProduct'; id: string }
  | { kind: 'upsertItem'; item: ListItem }
  | { kind: 'deleteItems'; ids: string[] }
  | { kind: 'markBought'; productIds: string[] }
  | { kind: 'upsertRow'; table: Table; row: Row }
  | { kind: 'deleteRows'; table: Table; match: Record<string, string | number> };
