import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import { Aura } from '@/components/Aura';

type Phase = 'request' | 'reset' | 'done';

const inputClass =
  'w-full rounded-2xl border border-ink-4 bg-paper-2 px-4 py-3.5 text-[15px] text-ink outline-none transition-shadow placeholder:text-ink-3 focus:border-red-border focus:ring-4 focus:ring-red-soft';

export function ForgotPasswordPage() {
  const [phase, setPhase] = useState<Phase>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequest = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Adresse email invalide.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
    } catch {
      // Réponse générique : on avance même en cas d'erreur (anti-énumération).
    } finally {
      setLoading(false);
      setPhase('reset');
    }
  };

  const handleReset = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    if (code.trim().length !== 6) {
      setError('Le code doit contenir 6 chiffres.');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email: email.trim(),
        code: code.trim(),
        password,
      });
      setPhase('done');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Réinitialisation impossible. Vérifiez le code.'));
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
            Molyscan
          </span>
          <span className="ml-2 align-middle text-[11px] font-medium uppercase tracking-[0.2em] text-ink-3">
            Admin
          </span>
        </div>

        {phase === 'done' ? (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#228a3c]/10">
              <CheckCircle2 className="h-8 w-8 text-[#1c7333]" strokeWidth={1.8} />
            </div>
            <h1 className="mt-6 font-display text-2xl font-medium tracking-tight text-ink">
              Mot de passe réinitialisé
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
              Votre mot de passe a bien été mis à jour. Vous pouvez maintenant
              vous connecter.
            </p>
            <Link
              to="/login"
              className="mt-8 flex h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-br from-red-vivid to-red text-[15px] font-semibold text-white shadow-red transition-all hover:brightness-105"
            >
              Se connecter
            </Link>
          </div>
        ) : phase === 'request' ? (
          <>
            <h1 className="font-display text-[2.2rem] font-medium leading-[1.1] tracking-tight text-ink">
              Mot de passe{' '}
              <span className="font-display italic text-red">oublié</span> ?
            </h1>
            <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-ink-2">
              Renseignez votre email admin. Si un compte existe, vous recevrez
              un code à 6 chiffres.
            </p>

            <form onSubmit={handleRequest} className="mt-9 space-y-3.5">
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
                  className={inputClass}
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
                className="mt-2 flex h-[56px] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-br from-red-vivid to-red text-[15px] font-semibold text-white shadow-red transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? 'Envoi…' : 'Envoyer le code'}
              </button>
            </form>

            <div className="mt-6 flex justify-center">
              <Link
                to="/login"
                className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-red hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Retour à la connexion
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="font-display text-[2.2rem] font-medium leading-[1.1] tracking-tight text-ink">
              Nouveau{' '}
              <span className="font-display italic text-red">mot de passe</span>
            </h1>
            <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-ink-2">
              Saisissez le code reçu par email à{' '}
              <span className="font-medium text-ink">{email}</span>, puis
              choisissez un nouveau mot de passe.
            </p>

            <form onSubmit={handleReset} className="mt-9 space-y-3.5">
              <div>
                <label htmlFor="code" className="mb-1.5 block text-sm font-medium text-ink">
                  Code à 6 chiffres
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="123456"
                  className={`${inputClass} tracking-[0.3em]`}
                />
              </div>
              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
                  Nouveau mot de passe
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium text-ink">
                  Confirmer le mot de passe
                </label>
                <input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputClass}
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
                className="mt-2 flex h-[56px] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-br from-red-vivid to-red text-[15px] font-semibold text-white shadow-red transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? 'Réinitialisation…' : 'Réinitialiser le mot de passe'}
              </button>
            </form>

            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => { setPhase('request'); setError(null); }}
                className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-red hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Modifier l'email
              </button>
            </div>
          </>
        )}

        {phase !== 'done' && (
          <p className="mt-8 text-xs text-ink-3">Molydal · Réservé aux administrateurs</p>
        )}
      </div>
    </div>
  );
}
