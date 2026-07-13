import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PackageSearch, RefreshCw, CheckCircle2, AlertTriangle, Clock3, CalendarClock } from 'lucide-react';
import { api } from '@/lib/api';
import { Aura } from '@/components/Aura';

type SyncRun = {
  id: string; status: string; trigger: string; requestedBy?: string | null;
  productsSeen: number; productsChanged: number; productsRemoved: number;
  referencesSeen: number; chunksCreated: number; error?: string | null;
  startedAt?: string | null; finishedAt?: string | null; createdAt: string;
};
type RagStatus = {
  running: boolean; productCount: number; referenceCount: number; assistantProductCount: number;
  activeIndex?: { version: number; embeddingModel: string; chunkCount: number; activatedAt?: string | null } | null;
  latestRun?: SyncRun | null; recentRuns: SyncRun[];
};

export function RagManagementPage() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['rag-status'],
    queryFn: async () => (await api.get<RagStatus>('/admin/rag/status')).data,
    refetchInterval: (q) => q.state.data?.running || ['queued', 'running', 'validating'].includes(q.state.data?.latestRun?.status ?? '') ? 2500 : 15000,
  });
  const sync = useMutation({
    mutationFn: async () => (await api.post('/admin/rag/sync')).data,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['rag-status'] }),
  });
  const data = query.data;
  const busy = data?.running || ['queued', 'running', 'validating'].includes(data?.latestRun?.status ?? '') || sync.isPending;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Aura size={460} color="#ff5b50" opacity={0.09} style={{ top: -180, right: -120 }} />
      <div className="relative mx-auto max-w-6xl px-8 py-12">
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red">Catalogue produits</p>
            <h1 className="mt-2 font-display text-[2.1rem] font-medium tracking-tight text-ink">Mettre à jour les <span className="italic text-red">produits Molydal</span></h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-2">Récupérez les dernières informations produits enregistrées dans Sellbase pour que l’assistant Molyscan utilise un catalogue à jour.</p>
          </div>
          <button disabled={busy} onClick={() => sync.mutate()} className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-gradient-to-br from-red-vivid to-red px-5 py-2.5 text-sm font-semibold text-white shadow-red disabled:cursor-not-allowed disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
            {busy ? 'Mise à jour en cours…' : 'Mettre à jour maintenant'}
          </button>
        </header>

        {sync.isError && <div className="mt-6 rounded-2xl border border-red-border bg-red-soft p-4 text-sm text-red">Impossible de lancer la mise à jour. Veuillez réessayer dans quelques minutes.</div>}

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Metric label="Produits utilisés par l’assistant" value={data?.assistantProductCount ?? '—'} icon={PackageSearch} />
          <Metric label="Dernière mise à jour réussie" value={formatDate(data?.activeIndex?.activatedAt)} icon={CheckCircle2} />
          <Metric label="Prochaine mise à jour automatique" value="1er du mois" icon={CalendarClock} />
        </div>

        <section className="mt-7 rounded-[28px] border border-ink-4 bg-paper-2 p-6 shadow-card">
          <div className="flex items-center justify-between"><h2 className="font-display text-xl text-ink">État actuel</h2><Status status={data?.latestRun?.status ?? (query.isLoading ? 'loading' : 'idle')} /></div>
          <div className="mt-5 grid gap-4 text-sm md:grid-cols-2">
            <Info label="Dernière tentative" value={formatDate(data?.latestRun?.createdAt)} />
            <Info label="Lancée par" value={data?.latestRun?.trigger === 'scheduled' ? 'Mise à jour mensuelle automatique' : data?.latestRun ? 'Un administrateur' : '—'} />
          </div>
          {data?.latestRun?.error && <div className="mt-5 rounded-2xl bg-red-soft p-4 text-sm text-red"><strong>La mise à jour n’a pas abouti.</strong> Le catalogue précédent reste disponible. Vous pouvez réessayer dans quelques minutes.</div>}
        </section>

        <section className="mt-7 overflow-hidden rounded-[28px] border border-ink-4 bg-paper-2 shadow-card">
          <div className="border-b border-ink-4 px-6 py-5"><h2 className="font-display text-xl text-ink">Dernières mises à jour</h2></div>
          <div className="divide-y divide-ink-4">
            {(data?.recentRuns ?? []).map((run) => (
              <div key={run.id} className="grid gap-3 px-6 py-4 text-sm md:grid-cols-[150px_130px_1fr_170px] md:items-center">
                <Status status={run.status} />
                <span className="text-ink-2">{run.trigger === 'scheduled' ? 'Mensuelle' : 'Manuelle'}</span>
                <span className="text-ink-2">{run.productsSeen} produits consultés · {run.productsChanged} ajoutés ou modifiés{run.productsRemoved ? ` · ${run.productsRemoved} retirés` : ''}</span>
                <span className="text-right text-xs text-ink-3">{formatDate(run.createdAt)}</span>
              </div>
            ))}
            {!data?.recentRuns?.length && <p className="px-6 py-10 text-center text-sm text-ink-3">Aucune mise à jour pour le moment.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof PackageSearch }) { return <div className="rounded-[24px] border border-ink-4 bg-paper-2 p-5 shadow-card"><Icon className="h-5 w-5 text-red"/><p className="mt-4 text-2xl font-semibold text-ink">{value}</p><p className="mt-1 text-xs text-ink-3">{label}</p></div>; }
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs uppercase tracking-wide text-ink-3">{label}</p><p className="mt-1 font-medium text-ink">{value}</p></div>; }
function Status({ status }: { status: string }) { const ok = status === 'completed' || status === 'active'; const bad = status === 'failed'; const Icon = ok ? CheckCircle2 : bad ? AlertTriangle : Clock3; return <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${ok ? 'bg-ok-bg text-ok' : bad ? 'bg-red-soft text-red' : 'bg-black/[0.05] text-ink-2'}`}><Icon className="h-3.5 w-3.5" />{({ completed:'À jour', failed:'À réessayer', queued:'Démarrage…', running:'Récupération des produits…', validating:'Vérification…', skipped:'Aucun changement', loading:'Chargement…', idle:'Pas encore mise à jour' } as Record<string,string>)[status] ?? status}</span>; }
function formatDate(value?: string | null) { return value ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'; }
