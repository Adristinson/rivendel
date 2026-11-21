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

export interface Data {
  categories: Category[];
  products: Product[];
  items: ListItem[];
}

/** Cambios que se aplican al momento en el móvil y se envían a Supabase cuando hay conexión. */
export type Op =
  | { kind: 'upsertProduct'; product: Product }
  | { kind: 'updateProduct'; id: string; patch: Partial<Product> }
  | { kind: 'deleteProduct'; id: string }
  | { kind: 'upsertItem'; item: ListItem }
  | { kind: 'deleteItems'; ids: string[] }
  | { kind: 'markBought'; productIds: string[] };
