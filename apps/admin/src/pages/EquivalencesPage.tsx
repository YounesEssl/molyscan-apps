import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Loader2,
  RefreshCw,
  Search,
  Plus,
  ArrowRight,
  Link2,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { ExpertEquivalence, PendingEquivalence } from '@/lib/types';
import { Aura } from '@/components/Aura';
import {
  EquivalenceEditDrawer,
  type EquivalenceDraft,
} from '@/components/EquivalenceEditDrawer';

type Tab = 'validated' | 'pending';

function ConfidenceBadge({ value }: { value: number }) {
  const meta =
    value >= 90
      ? { className: 'bg-[#228a3c]/10 text-[#1c7333]' }
      : value >= 70
        ? { className: 'bg-[#b7791f]/12 text-[#8a5a08]' }
        : { className: 'bg-red-soft text-red' };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}
    >
      {value}%
    </span>
  );
}

export function EquivalencesPage() {
  const [tab, setTab] = useState<Tab>('validated');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<ExpertEquivalence | null>(null);
  const [creating, setCreating] = useState(false);
  const [prefill, setPrefill] = useState<EquivalenceDraft | undefined>();

  const validatedQuery = useQuery({
    queryKey: ['equivalences'],
    queryFn: async () => {
      const { data } = await api.get<ExpertEquivalence[]>('/admin/equivalences');
      return data;
    },
  });

  const pendingQuery = useQuery({
    queryKey: ['equivalences-pending'],
    queryFn: async () => {
      const { data } = await api.get<PendingEquivalence[]>(
        '/admin/equivalences/pending',
      );
      return data;
    },
  });

  const equivalences = validatedQuery.data ?? [];
  const pending = pendingQuery.data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return equivalences;
    return equivalences.filter(
      (e) =>
        e.competitorBrand.toLowerCase().includes(q) ||
        e.competitorName.toLowerCase().includes(q) ||
        e.molydalEquivalent.toLowerCase().includes(q),
    );
  }, [equivalences, search]);

  const openCreate = (draft?: EquivalenceDraft) => {
    setEditing(null);
    setPrefill(draft);
    setCreating(true);
  };

  const closeDrawer = () => {
    setCreating(false);
    setEditing(null);
    setPrefill(undefined);
  };

  const refetchAll = () => {
    void validatedQuery.refetch();
    void pendingQuery.refetch();
  };

  const drawerOpen = creating || !!editing;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Aura size={420} color="#ff5b50" opacity={0.1} style={{ top: -170, right: -130 }} />

      <div className="relative mx-auto max-w-6xl px-8 py-12">
        {/* Header */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red">
              Catalogue
            </p>
            <h1 className="mt-2 font-display text-[2.1rem] font-medium tracking-tight text-ink">
              Équivalences <span className="italic text-red">expert</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-2">
              Le jugement des experts Molydal, encodé. Une équivalence validée ici
              devient la réponse déterministe d'un scan — sans IA, sans erreur.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={refetchAll}
              className="flex items-center gap-2 rounded-full border border-ink-4 bg-paper-2 px-4 py-2.5 text-sm font-medium text-ink-2 transition-colors hover:text-ink"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  validatedQuery.isFetching || pendingQuery.isFetching
                    ? 'animate-spin'
                    : ''
                }`}
              />
              Actualiser
            </button>
            <button
              onClick={() => openCreate()}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-red-vivid to-red px-5 py-2.5 text-sm font-semibold text-white shadow-red transition-all hover:brightness-105"
            >
              <Plus className="h-4 w-4" />
              Nouvelle équivalence
            </button>
          </div>
        </header>

        {/* Tabs */}
        <div className="mt-8 inline-flex gap-1 rounded-full border border-ink-4 bg-paper-2 p-1">
          <TabButton active={tab === 'validated'} onClick={() => setTab('validated')}>
            <CheckCircle2 className="h-4 w-4" />
            Validées
            <Count n={equivalences.length} active={tab === 'validated'} />
          </TabButton>
          <TabButton active={tab === 'pending'} onClick={() => setTab('pending')}>
            <Sparkles className="h-4 w-4" />
            À valider
            <Count n={pending.length} active={tab === 'pending'} highlight />
          </TabButton>
        </div>

        {tab === 'validated' ? (
          <ValidatedTab
            query={validatedQuery}
            filtered={filtered}
            total={equivalences.length}
            search={search}
            setSearch={setSearch}
            onEdit={setEditing}
          />
        ) : (
          <PendingTab
            query={pendingQuery}
            pending={pending}
            onValidate={(p) =>
              openCreate({
                competitorBrand: p.competitorBrand,
                competitorName: p.competitorName,
                molydalEquivalent: p.currentGuess ?? undefined,
              })
            }
          />
        )}
      </div>

      {drawerOpen && (
        <EquivalenceEditDrawer
          equivalence={editing}
          prefill={prefill}
          onClose={closeDrawer}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all',
        active ? 'bg-red-soft text-red' : 'text-ink-2 hover:text-ink',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function Count({
  n,
  active,
  highlight,
}: {
  n: number;
  active: boolean;
  highlight?: boolean;
}) {
  if (n === 0) return null;
  return (
    <span
      className={[
        'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold',
        highlight && !active
          ? 'bg-red text-white'
          : active
            ? 'bg-red/15 text-red'
            : 'bg-ink-4 text-ink-2',
      ].join(' ')}
    >
      {n}
    </span>
  );
}

/* ── Validated tab ──────────────────────────────────────────────────────── */

function ValidatedTab({
  query,
  filtered,
  total,
  search,
  setSearch,
  onEdit,
}: {
  query: { isLoading: boolean; isError: boolean };
  filtered: ExpertEquivalence[];
  total: number;
  search: string;
  setSearch: (v: string) => void;
  onEdit: (e: ExpertEquivalence) => void;
}) {
  return (
    <>
      <div className="mt-6 flex items-center gap-2 rounded-full border border-ink-4 bg-paper-2 px-4 py-2.5 shadow-card">
        <Search className="h-4 w-4 text-ink-3" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un concurrent ou un produit Molydal…"
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
        />
      </div>

      <div className="mt-6">
        {query.isLoading ? (
          <div className="flex items-center justify-center py-24 text-ink-3">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : query.isError ? (
          <div className="rounded-[22px] border border-red-border bg-red-soft px-6 py-5 text-sm text-red">
            Impossible de charger les équivalences.
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState hasAny={total > 0} />
        ) : (
          <div className="overflow-hidden rounded-[22px] border border-ink-4 bg-paper-2 shadow-card">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-ink-4 text-xs font-semibold uppercase tracking-[0.1em] text-ink-3">
                  <th className="px-5 py-3.5">Concurrent</th>
                  <th className="px-5 py-3.5">Équivalent Molydal</th>
                  <th className="px-5 py-3.5">Confiance</th>
                  <th className="px-5 py-3.5">Validé par</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-4">
                {filtered.map((e) => (
                  <tr
                    key={e.id}
                    onClick={() => onEdit(e)}
                    className="cursor-pointer transition-colors hover:bg-red-soft/60"
                  >
                    <td className="px-5 py-4">
                      <p className="text-[13px] font-medium uppercase tracking-wide text-ink-3">
                        {e.competitorBrand}
                      </p>
                      <p className="font-medium text-ink">{e.competitorName}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-2">
                        <ArrowRight className="h-3.5 w-3.5 text-red" />
                        <span className="font-display text-[15px] font-semibold text-ink">
                          {e.molydalEquivalent}
                        </span>
                        {e.molydalFamily && (
                          <span className="text-xs text-ink-3">
                            · {e.molydalFamily}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <ConfidenceBadge value={e.confidence} />
                    </td>
                    <td className="px-5 py-4 text-sm text-ink-2">
                      {e.validatedBy ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!query.isLoading && filtered.length > 0 && (
          <p className="mt-3 text-xs text-ink-3">
            {filtered.length} équivalence{filtered.length > 1 ? 's' : ''}
            {filtered.length !== total && ` sur ${total}`}
          </p>
        )}
      </div>
    </>
  );
}

/* ── Pending tab ────────────────────────────────────────────────────────── */

function PendingTab({
  query,
  pending,
  onValidate,
}: {
  query: { isLoading: boolean; isError: boolean };
  pending: PendingEquivalence[];
  onValidate: (p: PendingEquivalence) => void;
}) {
  if (query.isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-ink-3">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (query.isError) {
    return (
      <div className="mt-6 rounded-[22px] border border-red-border bg-red-soft px-6 py-5 text-sm text-red">
        Impossible de charger la file à valider.
      </div>
    );
  }
  if (pending.length === 0) {
    return (
      <div className="mt-6 flex flex-col items-center justify-center rounded-[28px] border border-dashed border-ink-4 bg-paper-2 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#228a3c]/10 text-[#1c7333]">
          <CheckCircle2 className="h-7 w-7" strokeWidth={1.8} />
        </div>
        <h3 className="mt-5 font-display text-lg font-semibold text-ink">
          Tout est à jour
        </h3>
        <p className="mt-1.5 max-w-xs text-sm text-ink-2">
          Chaque produit concurrent scanné a déjà son équivalence validée.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-2.5">
      <p className="text-sm text-ink-2">
        Produits concurrents scannés sans équivalence validée. Valider une entrée
        rend tous ses prochains scans déterministes.
      </p>
      {pending.map((p) => (
        <div
          key={`${p.competitorBrand}|${p.competitorName}`}
          className="flex flex-wrap items-center gap-4 rounded-[20px] border border-ink-4 bg-paper-2 px-5 py-4 shadow-card transition-colors hover:border-red-border"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium uppercase tracking-wide text-ink-3">
              {p.competitorBrand}
            </p>
            <p className="font-medium text-ink">{p.competitorName}</p>
          </div>

          {p.currentGuess && (
            <div className="hidden items-center gap-2 text-sm text-ink-2 sm:flex">
              <span className="text-xs text-ink-3">proposé par l'IA</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-4 bg-paper px-3 py-1 font-medium text-ink-2">
                {p.currentGuess}
                {typeof p.compatibility === 'number' && (
                  <span className="text-xs text-ink-3">{p.compatibility}%</span>
                )}
              </span>
            </div>
          )}

          <span className="inline-flex items-center gap-1.5 rounded-full bg-paper px-2.5 py-1 text-xs font-medium text-ink-3">
            <Link2 className="h-3.5 w-3.5" />
            {p.scanCount} scan{p.scanCount > 1 ? 's' : ''}
          </span>

          <button
            onClick={() => onValidate(p)}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-red-vivid to-red px-4 py-2 text-sm font-semibold text-white shadow-red transition-all hover:brightness-105"
          >
            <CheckCircle2 className="h-4 w-4" />
            Valider
          </button>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ hasAny }: { hasAny: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-ink-4 bg-paper-2 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-soft text-red">
        <Link2 className="h-7 w-7" strokeWidth={1.8} />
      </div>
      <h3 className="mt-5 font-display text-lg font-semibold text-ink">
        {hasAny ? 'Aucun résultat' : 'Aucune équivalence'}
      </h3>
      <p className="mt-1.5 max-w-xs text-sm text-ink-2">
        {hasAny
          ? 'Aucune équivalence ne correspond à votre recherche.'
          : "Créez-en une, ou validez les produits scannés dans l'onglet « À valider »."}
      </p>
    </div>
  );
}
