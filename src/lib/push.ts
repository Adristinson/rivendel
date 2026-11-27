import { supabase } from './supabase';

const FN = `${import.meta.env.VITE_SUPABASE_URL as string}/functions/v1/avisos`;

export type PushState = 'unsupported' | 'blocked' | 'off' | 'on';

export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  return (await navigator.serviceWorker.getRegistration()) ?? null;
}

export async function pushState(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  const reg = await registration();
  const sub = await reg?.pushManager.getSubscription();
  return sub ? 'on' : 'off';
}

function keyBytes(b64url: string): Uint8Array {
  const pad = b64url.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64url.length + 3) % 4);
  return Uint8Array.from(atob(pad), (c) => c.charCodeAt(0));
}

/** Activa los avisos en este móvil: pide permiso, se suscribe y lo guarda en Supabase. */
export async function enablePush(householdId: string): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return perm === 'denied' ? 'blocked' : 'off';
  const reg = await navigator.serviceWorker.ready;
  let { data: key } = await supabase.rpc('push_public_key');
  if (!key) {
    // Primera vez: la función crea las claves del servidor.
    await fetch(FN, { method: 'POST', body: '{}' }).catch(() => undefined);
    ({ data: key } = await supabase.rpc('push_public_key'));
  }
  if (!key) throw new Error('El servidor de avisos no está listo todavía.');
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key as string) as BufferSource }));
  const j = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ household_id: householdId, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }, { onConflict: 'endpoint' });
  if (error) throw error;
  return 'on';
}

export async function disablePush(): Promise<PushState> {
  const reg = await registration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
    await sub.unsubscribe();
  }
  return 'off';
}

export async function testPush(): Promise<boolean> {
  const reg = await registration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return false;
  const res = await fetch(FN, { method: 'POST', body: JSON.stringify({ test: sub.endpoint }) });
  const j = (await res.json().catch(() => ({}))) as { sent?: number };
  return (j.sent ?? 0) > 0;
}
