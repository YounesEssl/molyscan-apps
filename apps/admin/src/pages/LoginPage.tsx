import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { getApiErrorMessage } from '@/lib/api';
import { Aura } from '@/components/Aura';

export function LoginPage() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === 'authenticated') {
    return <Navigate to="/access-requests" replace />;
  }

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/access-requests', { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Connexion impossible.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-paper px-6 py-12">
      <Aura size={460} color="#ff5b50" opacity={0.22} style={{ top: -140, left: -100 }} />
      <Aura size={400} color="#ffc878" opacity={0.22} style={{ bottom: -120, right: -90 }} />

      <div className="relative w-full max-w-sm">
        <div className="mb-10">
          <span className="font-display text-2xl font-semibold tracking-tight text-ink">
            MolyScan
          </span>
          <span className="ml-2 align-middle text-[11px] font-medium uppercase tracking-[0.2em] text-ink-3">
            Admin
          </span>
        </div>

        <h1 className="font-display text-[2.4rem] font-medium leading-[1.08] tracking-tight text-ink">
          Console d'
          <span className="font-display italic text-red">administration</span>.
        </h1>
        <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-ink-2">
          Validez les demandes d'accès et attribuez les départements de
          l'application terrain Molydal.
        </p>

        <form onSubmit={handleSubmit} className="mt-9 space-y-3.5">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@molydal.com"
              className="w-full rounded-2xl border border-ink-4 bg-paper-2 px-4 py-3.5 text-[15px] text-ink outline-none transition-shadow placeholder:text-ink-3 focus:border-red-border focus:ring-4 focus:ring-red-soft"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-2xl border border-ink-4 bg-paper-2 px-4 py-3.5 text-[15px] text-ink outline-none transition-shadow placeholder:text-ink-3 focus:border-red-border focus:ring-4 focus:ring-red-soft"
            />
          </div>

          {error && (
            <div className="rounded-2xl border border-red-border bg-red-soft px-4 py-3 text-sm text-red">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex h-[56px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-br from-red-vivid to-red text-[15px] font-semibold text-white shadow-red transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ fontFamily: 'Geist, system-ui, sans-serif' }}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p className="mt-8 text-xs text-ink-3">Molydal · Réservé aux administrateurs</p>
      </div>
    </div>
  );
}
