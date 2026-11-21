import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';

export function Auth() {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    if (mode === 'in') {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) setError(error.message.includes('Invalid') ? 'Email o contraseña incorrectos.' : error.message);
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { name: name.trim() } },
      });
      if (error) setError(error.message);
      else if (!data.session) setInfo('Cuenta creada. Revisa tu email para confirmarla y después entra.');
    }
    setBusy(false);
  }

  return (
    <div className="center">
      <form className="auth form" onSubmit={submit}>
        <div>
          <h1 className="brand-title">Rivendel</h1>
          <p className="note">La organización de casa, en un solo sitio.</p>
        </div>
        {mode === 'up' && (
          <label>
            Tu nombre
            <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="given-name" />
          </label>
        )}
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
          />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        {info && <p className="note" role="status">{info}</p>}
        <button className="primary" disabled={busy}>
          {busy ? 'Un momento…' : mode === 'in' ? 'Entrar' : 'Crear cuenta'}
        </button>
        <button type="button" className="link-btn" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
          {mode === 'in' ? 'Es la primera vez: crear cuenta' : 'Ya tengo cuenta: entrar'}
        </button>
      </form>
    </div>
  );
}
