import { supabase } from './supabase';

const BUCKET = 'recetas';

/** Reduce la foto a 1200 px como máximo para que ocupe poco. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1200 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return await new Promise((res) => canvas.toBlob((b) => res(b ?? file), 'image/jpeg', 0.82));
  } catch {
    return file;
  }
}

export async function uploadRecipeImage(householdId: string, recipeId: string, file: File): Promise<string> {
  const path = `${householdId}/${recipeId}-${Date.now()}.jpg`;
  const blob = await shrink(file);
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  return path;
}

export async function removeRecipeImage(path: string) {
  await supabase.storage.from(BUCKET).remove([path]);
}

const cache = new Map<string, { url: string; until: number }>();

export async function imageUrl(path: string): Promise<string | null> {
  const hit = cache.get(path);
  if (hit && hit.until > Date.now()) return hit.url;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 6);
  if (error || !data) return null;
  cache.set(path, { url: data.signedUrl, until: Date.now() + 1000 * 60 * 60 * 5 });
  return data.signedUrl;
}
