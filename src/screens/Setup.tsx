import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';

export function Setup({ defaultName, onDone }: { defaultName: string; onDone: () => void }) {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [name, setName] = useState(defaultName);
  const [home, setHome] = useState('Rivendel');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res =
      mode === 'create'
        ? await supabase.rpc('create_household', { p_name: home.trim(), p_display_name: name.trim() })
        : await supabase.rpc('join_household', { p_code: code.trim(), p_display_name: name.trim() });
    setBusy(false);
    if (res.error) setError(res.error.message.includes('Código') ? 'Ese código no existe.' : res.error.message);
    else onDone();
  }

  return (
    <div className="center">
      <form className="auth form" onSubmit={submit}>
        <div>
          <h1 className="brand-title">Vuestro hogar</h1>
          <p className="note">
            Uno de los dos crea el hogar. El otro se une con el código que aparece después en Más → Hogar.
          </p>
        </div>
        <div className="tabs" style={{ background: 'var(--brand-soft)' }}>
          <button type="button" aria-pressed={mode === 'create'} onClick={() => setMode('create')} style={{ color: 'var(--brand-ink)' }}>
            Crear hogar
          </button>
          <button type="button" aria-pressed={mode === 'join'} onClick={() => setMode('join')} style={{ color: 'var(--brand-ink)' }}>
            Unirme con código
          </button>
        </div>
        <label>
          Tu nombre
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        {mode === 'create' ? (
          <label>
            Nombre del hogar
            <input value={home} onChange={(e) => setHome(e.target.value)} required />
          </label>
        ) : (
          <label>
            Código de invitación
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required maxLength={6} autoCapitalize="characters" />
          </label>
        )}
        {error && <p className="error" role="alert">{error}</p>}
        <button className="primary" disabled={busy}>
          {busy ? 'Un momento…' : mode === 'create' ? 'Crear hogar' : 'Unirme'}
        </button>
        <button type="button" className="link-btn" onClick={() => supabase.auth.signOut()}>
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
