import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, RefreshCw, Search, Tag } from 'lucide-react';
import { api } from '@/lib/api';
import type { PriceRequest } from '@/lib/types';
import { Aura } from '@/components/Aura';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function fullName(p: { firstName: string; lastName: string }): string {
  return `${p.firstName} ${p.lastName}`.trim();
}

export function PriceRequestsPage() {
  const [search, setSearch] = useState('');

  const query = useQuery({
    queryKey: ['price-requests'],
    queryFn: async () => {
      const { data } = await api.get<PriceRequest[]>('/admin/price-requests');
      return data;
    },
  });

  const requests = query.data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter((r) => {
      const hay = [
        fullName(r.user),
        r.user.email,
        r.productName ?? '',
        r.molydalRef ?? '',
        r.routedDepartment?.name ?? '',
        ...r.recipients.map((x) => `${fullName(x)} ${x.email}`),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [requests, search]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Aura size={420} color="#ff5b50" opacity={0.1} style={{ top: -170, right: -130 }} />

      <div className="relative mx-auto max-w-6xl px-8 py-12">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red">
              Suivi
            </p>
            <h1 className="mt-2 font-display text-[2.1rem] font-medium tracking-tight text-ink">
              Demandes de <span className="italic text-red">prix</span>
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-2">
              Chaque demande émise par un distributeur, le produit concerné, et
              le ou les commerciaux à qui elle a été envoyée par email.
            </p>
          </div>
          <button
            onClick={() => query.refetch()}
            className="flex items-center gap-2 rounded-full border border-ink-4 bg-paper-2 px-4 py-2 text-sm font-medium text-ink-2 transition-colors hover:text-ink"
          >
            <RefreshCw className={`h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </header>

        <div className="mt-8 flex items-center gap-2 rounded-full border border-ink-4 bg-paper-2 px-4 py-2.5 shadow-card">
          <Search className="h-4 w-4 text-ink-3" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par distributeur, produit, commercial…"
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
          />
        </div>

        <div className="mt-7">
          {query.isLoading ? (
            <div className="flex items-center justify-center py-24 text-ink-3">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : query.isError ? (
            <div className="rounded-[22px] border border-red-border bg-red-soft px-6 py-5 text-sm text-red">
              Impossible de charger les demandes de prix. Réessayez.
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState hasAny={requests.length > 0} />
          ) : (
            <div className="overflow-hidden rounded-[22px] border border-ink-4 bg-paper-2 shadow-card">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-ink-4 text-xs font-semibold uppercase tracking-[0.1em] text-ink-3">
                    <th className="px-5 py-3.5 font-semibold">Distributeur</th>
                    <th className="px-5 py-3.5 font-semibold">Produit</th>
                    <th className="px-5 py-3.5 font-semibold">Département</th>
                    <th className="px-5 py-3.5 font-semibold">Envoyé à</th>
                    <th className="px-5 py-3.5 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-4">
                  {filtered.map((r) => (
                    <PriceRequestRow key={r.id} request={r} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!query.isLoading && filtered.length > 0 && (
            <p className="mt-3 text-xs text-ink-3">
              {filtered.length} demande{filtered.length > 1 ? 's' : ''}
              {filtered.length !== requests.length && ` sur ${requests.length}`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function PriceRequestRow({ request: r }: { request: PriceRequest }) {
  return (
    <tr className="align-top">
      <td className="px-5 py-4">
        <p className="font-medium text-ink">{fullName(r.user)}</p>
        <p className="truncate text-sm text-ink-3">{r.user.email}</p>
      </td>
      <td className="px-5 py-4">
        <p className="font-medium text-ink">{r.productName || '—'}</p>
        {r.molydalRef && (
          <p className="font-mono text-xs text-ink-3">{r.molydalRef}</p>
        )}
      </td>
      <td className="px-5 py-4">
        {r.routedDepartment ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-ink-2">
            {r.routedDepartment.code && (
              <span className="font-mono text-xs text-ink-3">
                {r.routedDepartment.code}
              </span>
            )}
            {r.routedDepartment.name}
          </span>
        ) : (
          <span className="text-sm text-ink-3">—</span>
        )}
      </td>
      <td className="px-5 py-4">
        {r.routedToAdmins && (
          <span className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-[#b7791f]/12 px-2.5 py-1 text-xs font-semibold text-[#8a5a08]">
            <Tag className="h-3 w-3" />
            Repli admins
          </span>
        )}
        <div className="flex flex-wrap gap-1.5">
          {r.recipients.length === 0 ? (
            <span className="text-sm text-ink-3">Aucun destinataire</span>
          ) : (
            r.recipients.map((p) => (
              <span
                key={p.id}
                title={p.email}
                className="rounded-full border border-ink-4 bg-paper px-2.5 py-0.5 text-xs text-ink-2"
              >
                {fullName(p)}
              </span>
            ))
          )}
        </div>
      </td>
      <td className="px-5 py-4 whitespace-nowrap text-sm text-ink-2">
        {formatDate(r.createdAt)}
      </td>
    </tr>
  );
}

function EmptyState({ hasAny }: { hasAny: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-ink-4 bg-paper-2 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-soft text-red">
        <Tag className="h-7 w-7" strokeWidth={1.8} />
      </div>
      <h3 className="mt-5 font-display text-lg font-semibold text-ink">
        {hasAny ? 'Aucun résultat' : 'Aucune demande de prix'}
      </h3>
      <p className="mt-1.5 max-w-xs text-sm text-ink-2">
        {hasAny
          ? 'Aucune demande ne correspond à votre recherche.'
          : 'Les demandes émises par les distributeurs depuis l’application apparaîtront ici.'}
      </p>
    </div>
  );
}
