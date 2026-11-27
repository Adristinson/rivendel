// Rivendel · función "avisos": envía las notificaciones del día a los móviles suscritos.
// La llama cada mañana pg_cron (ver 008_avisos_cron.sql). Sin dependencias: solo Web Crypto.
// Las claves VAPID se generan aquí la primera vez y se guardan en app_secrets (no salen del servidor).

const enc = new TextEncoder();

export function b64u(bytes: ArrayBuffer | Uint8Array): string {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function unb64u(s: string): Uint8Array {
  const pad = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  return Uint8Array.from(atob(pad), (c) => c.charCodeAt(0));
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

export interface Vapid {
  publicKey: string; // b64url, punto sin comprimir (65 bytes)
  privateJwk: JsonWebKey;
}

export async function generateVapid(): Promise<Vapid> {
  const kp = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair;
  return {
    publicKey: b64u(await crypto.subtle.exportKey('raw', kp.publicKey)),
    privateJwk: await crypto.subtle.exportKey('jwk', kp.privateKey),
  };
}

/** Cabecera Authorization VAPID (RFC 8292). */
export async function vapidAuth(endpoint: string, vapid: Vapid, subject: string, now = Date.now()): Promise<string> {
  const aud = new URL(endpoint).origin;
  const header = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = b64u(enc.encode(JSON.stringify({ aud, exp: Math.floor(now / 1000) + 12 * 3600, sub: subject })));
  const key = await crypto.subtle.importKey('jwk', vapid.privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(`${header}.${payload}`));
  return `vapid t=${header}.${payload}.${b64u(sig)}, k=${vapid.publicKey}`;
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, bytes: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, bytes * 8));
}

/** Cifra el contenido del aviso para un móvil (RFC 8291, aes128gcm). */
export async function encryptPayload(p256dh: string, auth: string, plaintext: Uint8Array, salt = crypto.getRandomValues(new Uint8Array(16))): Promise<Uint8Array> {
  const uaPublic = unb64u(p256dh);
  const authSecret = unb64u(auth);
  const local = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair;
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', local.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, local.privateKey, 256));
  const ikm = await hkdf(authSecret, shared, concat(enc.encode('WebPush: info\0'), uaPublic, asPublic), 32);
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes, concat(plaintext, new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]); // 4096
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, cipher);
}

export interface Sub {
  id: string;
  household_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function sendPush(sub: Sub, message: unknown, vapid: Vapid, subject: string): Promise<number> {
  const body = await encryptPayload(sub.p256dh, sub.auth, enc.encode(JSON.stringify(message)));
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await vapidAuth(sub.endpoint, vapid, subject),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(24 * 3600),
      Urgency: 'normal',
    },
    body,
  });
  await res.body?.cancel();
  return res.status;
}

// ───────────────────────── Servidor ─────────────────────────

declare const Deno: { env: { get(k: string): string | undefined }; serve(h: (r: Request) => Promise<Response>): void } | undefined;

const SUBJECT = 'mailto:avisos@rivendel.app';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type, authorization, apikey' };

function serviceKey(): string {
  const env = Deno!.env;
  const legacy = env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacy) return legacy;
  try {
    const keys = JSON.parse(env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>;
    return keys.default ?? Object.values(keys)[0] ?? '';
  } catch {
    return '';
  }
}

async function rest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const key = serviceKey();
  const headers: Record<string, string> = { apikey: key, 'Content-Type': 'application/json', ...(init.headers as Record<string, string>) };
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;
  const res = await fetch(`${Deno!.env.get('SUPABASE_URL')}/rest/v1/${path}`, { ...init, headers });
  const text = await res.text();
  if (!res.ok) throw new Error(`${path}: ${res.status} ${text}`);
  return (text ? JSON.parse(text) : null) as T;
}

async function getVapid(): Promise<Vapid> {
  const rows = await rest<{ value: Vapid }[]>('app_secrets?key=eq.vapid&select=value');
  if (rows.length) return rows[0].value;
  const v = await generateVapid();
  await rest('app_secrets?on_conflict=key', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates' },
    body: JSON.stringify({ key: 'vapid', value: v }),
  });
  const again = await rest<{ value: Vapid }[]>('app_secrets?key=eq.vapid&select=value');
  return again[0].value;
}

async function deliver(subs: Sub[], message: unknown, vapid: Vapid): Promise<{ sent: number; removed: number }> {
  let sent = 0;
  let removed = 0;
  for (const s of subs) {
    try {
      const status = await sendPush(s, message, vapid, SUBJECT);
      if (status === 404 || status === 410) {
        await rest(`push_subscriptions?id=eq.${s.id}`, { method: 'DELETE' });
        removed++;
      } else if (status < 300) sent++;
    } catch {
      /* un móvil que falla no para al resto */
    }
  }
  return { sent, removed };
}

async function handle(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
  try {
    const vapid = await getVapid();
    const body = (await req.json().catch(() => ({}))) as { test?: string };
    if (body.test) {
      const subs = await rest<Sub[]>(`push_subscriptions?endpoint=eq.${encodeURIComponent(body.test)}&select=*`);
      const r = await deliver(subs, { title: 'Rivendel', body: 'Los avisos funcionan en este móvil.', tag: 'prueba' }, vapid);
      return json({ ok: true, ...r, found: subs.length });
    }
    const avisos = await rest<{ household_id: string; todo_id: string; kind: string; title: string; body: string }[]>('rpc/avisos_pendientes', {
      method: 'POST',
      body: '{}',
    });
    let sent = 0;
    let removed = 0;
    const households = [...new Set(avisos.map((a) => a.household_id))];
    for (const h of households) {
      let subs = await rest<Sub[]>(`push_subscriptions?household_id=eq.${h}&select=*`);
      for (const a of avisos.filter((x) => x.household_id === h)) {
        const r = await deliver(subs, { title: a.title, body: a.body, tag: `${a.todo_id}-${a.kind}`, url: './' }, vapid);
        sent += r.sent;
        removed += r.removed;
        if (r.removed) subs = await rest<Sub[]>(`push_subscriptions?household_id=eq.${h}&select=*`);
      }
    }
    return json({ ok: true, avisos: avisos.length, sent, removed });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
}

if (typeof Deno !== 'undefined') Deno.serve(handle);
