import { useQuery } from '@tanstack/react-query';
import { Inbox, Loader2, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import type { AccessRequest, Department } from '@/lib/types';
import { AccessRequestCard } from '@/components/AccessRequestCard';
import { Aura } from '@/components/Aura';

export function AccessRequestsPage() {
  const requestsQuery = useQuery({
    queryKey: ['access-requests'],
    queryFn: async () => {
      const { data } = await api.get<AccessRequest[]>('/admin/access-requests');
      return data;
    },
  });

  const departmentsQuery = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data } = await api.get<Department[]>('/admin/departments');
      return data;
    },
  });

  const requests = requestsQuery.data ?? [];
  const departments = departmentsQuery.data ?? [];

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Aura size={420} color="#ff5b50" opacity={0.12} style={{ top: -160, right: -120 }} />

      <div className="relative mx-auto max-w-4xl px-8 py-12">
        <header className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red">
              Validation des comptes
            </p>
            <h1 className="mt-2 font-display text-[2.1rem] font-medium tracking-tight text-ink">
              Demandes d'<span className="italic text-red">accès</span>
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-2">
              Examinez chaque demande, attribuez un ou plusieurs départements,
              puis approuvez ou refusez. L'utilisateur est notifié par email.
            </p>
          </div>
          <button
            onClick={() => requestsQuery.refetch()}
            className="flex cursor-pointer items-center gap-2 rounded-full border border-ink-4 bg-paper-2 px-4 py-2 text-sm font-medium text-ink-2 transition-colors hover:text-ink"
          >
            <RefreshCw
              className={`h-4 w-4 ${requestsQuery.isFetching ? 'animate-spin' : ''}`}
            />
            Actualiser
          </button>
        </header>

        <div className="mt-9">
          {requestsQuery.isLoading ? (
            <div className="flex items-center justify-center py-24 text-ink-3">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : requestsQuery.isError ? (
            <div className="rounded-[22px] border border-red-border bg-red-soft px-6 py-5 text-sm text-red">
              Impossible de charger les demandes. Vérifiez votre connexion puis
              réessayez.
            </div>
          ) : requests.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <AccessRequestCard
                  key={request.id}
                  request={request}
                  departments={departments}
                  departmentsLoading={departmentsQuery.isLoading}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-ink-4 bg-paper-2 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-soft text-red">
        <Inbox className="h-7 w-7" strokeWidth={1.8} />
      </div>
      <h3 className="mt-5 font-display text-lg font-semibold text-ink">
        Aucune demande en attente
      </h3>
      <p className="mt-1.5 max-w-xs text-sm text-ink-2">
        Les nouvelles demandes d'inscription apparaîtront ici dès qu'un
        utilisateur en crée une depuis l'application.
      </p>
    </div>
  );
}
