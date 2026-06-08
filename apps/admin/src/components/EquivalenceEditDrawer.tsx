import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2, Trash2, ArrowRight } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import type { ExpertEquivalence } from '@/lib/types';

export interface EquivalenceDraft {
  competitorBrand: string;
  competitorName: string;
  molydalEquivalent?: string;
}

interface Props {
  /** Existing entry to edit, or null when creating. */
  equivalence: ExpertEquivalence | null;
  /** Prefill values (e.g. when validating a pending competitor). */
  prefill?: EquivalenceDraft;
  onClose: () => void;
}

const CONFIDENCE_OPTIONS = [
  { value: 100, label: 'Certain' },
  { value: 90, label: 'Élevé' },
  { value: 75, label: 'Bon' },
  { value: 50, label: 'Moyen' },
];

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-2">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-ink-3">{hint}</p>}
    </div>
  );
}

const inputClass =
  'w-full rounded-2xl border border-ink-4 bg-paper px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-red-border focus:bg-paper-2';

export function EquivalenceEditDrawer({ equivalence, prefill, onClose }: Props) {
  const queryClient = useQueryClient();
  const isEdit = !!equivalence;

  const [competitorBrand, setCompetitorBrand] = useState('');
  const [competitorName, setCompetitorName] = useState('');
  const [molydalEquivalent, setMolydalEquivalent] = useState('');
  const [molydalFamily, setMolydalFamily] = useState('');
  const [confidence, setConfidence] = useState(100);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    setCompetitorBrand(equivalence?.competitorBrand ?? prefill?.competitorBrand ?? '');
    setCompetitorName(equivalence?.competitorName ?? prefill?.competitorName ?? '');
    setMolydalEquivalent(
      equivalence?.molydalEquivalent ?? prefill?.molydalEquivalent ?? '',
    );
    setMolydalFamily(equivalence?.molydalFamily ?? '');
    setConfidence(equivalence?.confidence ?? 100);
    setNote(equivalence?.note ?? '');
    setError(null);
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [equivalence, prefill]);

  const close = () => {
    setEntered(false);
    setTimeout(onClose, 180);
  };

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['equivalences'] });
    void queryClient.invalidateQueries({ queryKey: ['equivalences-pending'] });
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        competitorBrand: competitorBrand.trim(),
        competitorName: competitorName.trim(),
        molydalEquivalent: molydalEquivalent.trim(),
        molydalFamily: molydalFamily.trim() || undefined,
        confidence,
        note: note.trim() || undefined,
      };
      if (isEdit) {
        await api.patch(`/admin/equivalences/${equivalence.id}`, payload);
      } else {
        await api.post('/admin/equivalences', payload);
      }
    },
    onSuccess: () => {
      invalidate();
      close();
    },
    onError: (err) =>
      setError(getApiErrorMessage(err, 'Enregistrement impossible.')),
  });

  const remove = useMutation({
    mutationFn: async () => {
      await api.delete(`/admin/equivalences/${equivalence!.id}`);
    },
    onSuccess: () => {
      invalidate();
      close();
    },
    onError: (err) => setError(getApiErrorMessage(err, 'Suppression impossible.')),
  });

  const busy = save.isPending || remove.isPending;
  const canSave =
    competitorBrand.trim() && competitorName.trim() && molydalEquivalent.trim();

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        onClick={close}
        className={`absolute inset-0 cursor-pointer bg-ink/30 backdrop-blur-[2px] transition-opacity duration-200 ${
          entered ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <aside
        className={`relative flex h-full w-full max-w-md flex-col bg-paper-2 shadow-2xl transition-transform duration-200 ease-out ${
          entered ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-ink-4 p-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red">
              {isEdit ? 'Modifier' : 'Nouvelle équivalence'}
            </p>
            <h2 className="mt-1 truncate font-display text-xl font-semibold tracking-tight text-ink">
              {competitorBrand || competitorName
                ? `${competitorBrand} ${competitorName}`.trim()
                : 'Équivalence'}
            </h2>
          </div>
          <button
            type="button"
            onClick={close}
            className="shrink-0 cursor-pointer rounded-full p-2 text-ink-3 transition-colors hover:bg-black/[0.04] hover:text-ink"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Marque concurrent">
              <input
                value={competitorBrand}
                onChange={(e) => setCompetitorBrand(e.target.value)}
                placeholder="Molykote"
                className={inputClass}
              />
            </Field>
            <Field label="Nom concurrent">
              <input
                value={competitorName}
                onChange={(e) => setCompetitorName(e.target.value)}
                placeholder="BR-2 Plus"
                className={inputClass}
              />
            </Field>
          </div>

          {/* Mapping arrow */}
          <div className="flex items-center justify-center">
            <span className="flex items-center gap-2 rounded-full bg-red-soft px-3 py-1 text-xs font-semibold text-red">
              <ArrowRight className="h-3.5 w-3.5" />
              équivaut à
            </span>
          </div>

          <Field label="Équivalent Molydal" hint="Le nom exact du produit Molydal.">
            <input
              value={molydalEquivalent}
              onChange={(e) => setMolydalEquivalent(e.target.value)}
              placeholder="MO/3"
              className={inputClass}
            />
          </Field>

          <Field label="Famille Molydal (optionnel)">
            <input
              value={molydalFamily}
              onChange={(e) => setMolydalFamily(e.target.value)}
              placeholder="GRAISSES"
              className={inputClass}
            />
          </Field>

          <Field
            label="Confiance"
            hint="Un scan affichera ce niveau de compatibilité."
          >
            <div className="flex gap-1.5 rounded-full border border-ink-4 bg-paper p-1">
              {CONFIDENCE_OPTIONS.map((opt) => {
                const active = opt.value === confidence;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={busy}
                    onClick={() => setConfidence(opt.value)}
                    className={[
                      'flex-1 cursor-pointer rounded-full px-2 py-2 text-center text-sm font-medium transition-all disabled:cursor-not-allowed',
                      active
                        ? 'bg-gradient-to-br from-red-vivid to-red text-white shadow-red'
                        : 'text-ink-2 hover:text-ink',
                    ].join(' ')}
                  >
                    <span className="block text-[13px] font-semibold">
                      {opt.value}%
                    </span>
                    <span className="block text-[10px] opacity-80">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Note (optionnel)">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Raison du choix, contexte d'application…"
              className={`${inputClass} resize-none`}
            />
          </Field>

          {error && <p className="text-sm text-red">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-ink-4 p-6">
          {isEdit ? (
            <button
              type="button"
              onClick={() => {
                setError(null);
                remove.mutate();
              }}
              disabled={busy}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-red-border px-4 py-2.5 text-sm font-semibold text-red transition-colors hover:bg-red-soft disabled:cursor-not-allowed disabled:opacity-50"
            >
              {remove.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Supprimer
            </button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={close}
              disabled={busy}
              className="cursor-pointer rounded-full border border-ink-4 px-5 py-2.5 text-sm font-semibold text-ink-2 transition-colors hover:bg-black/[0.03] hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                save.mutate();
              }}
              disabled={busy || !canSave}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-gradient-to-br from-red-vivid to-red px-6 py-2.5 text-sm font-semibold text-white shadow-red transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
