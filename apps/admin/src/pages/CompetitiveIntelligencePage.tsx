import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, RefreshCw, Search } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import type { CompetitiveIntelligence } from '@/lib/types';
import { Pagination } from '@/components/Pagination';

const controlClass =
  'w-full rounded-xl border border-ink-4 bg-paper-2 px-3 py-2.5 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-red';
const count = (n: number) => n.toLocaleString('fr-FR');
function dateInput(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function CompetitiveIntelligencePage() {
  const [groupBy, setGroupBy] = useState<'product' | 'brand'>('product');
  const [from, setFrom] = useState(() => dateInput(89));
  const [to, setTo] = useState(() => dateInput(0));
  const [search, setSearch] = useState('');
  const [draftSearch, setDraftSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const invalidDates = !!(from && to && from > to);
  const query = useQuery({
    queryKey: ['competitive-intelligence', { groupBy, from, to, search, page }],
    enabled: !invalidDates,
    queryFn: async () =>
      (
        await api.get<CompetitiveIntelligence>(
          '/admin/competitive-intelligence',
          {
            params: {
              groupBy,
              from: from || undefined,
              to: to || undefined,
              search: search || undefined,
              page,
              pageSize,
            },
          },
        )
      ).data,
  });
  const data = query.data;
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[2.1rem] font-medium tracking-tight text-ink">
            Veille <span className="italic text-red">concurrentielle</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-2">
            Les produits et marques rencontrés sur le terrain, regroupés à
            partir de l’historique des scans.
          </p>
        </div>
        <button
          type="button"
          disabled={invalidDates || query.isFetching}
          onClick={() => void query.refetch()}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-ink-4 bg-paper-2 px-4 py-2.5 text-sm text-ink-2 hover:text-ink disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`}
          />
          Actualiser
        </button>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <label className="block text-sm font-medium text-ink">
          Regrouper par
          <select
            className={`${controlClass} mt-2`}
            value={groupBy}
            onChange={(e) => {
              setGroupBy(e.target.value as 'product' | 'brand');
              setPage(1);
            }}
          >
            <option value="product">Produit et marque</option>
            <option value="brand">Marque</option>
          </select>
        </label>
        <label className="block text-sm font-medium text-ink">
          Du
          <input
            type="date"
            className={`${controlClass} mt-2`}
            value={from}
            max={to || undefined}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label className="block text-sm font-medium text-ink">
          Au (inclus)
          <input
            type="date"
            className={`${controlClass} mt-2`}
            value={to}
            min={from || undefined}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
          />
        </label>
      </div>
      <p className="mt-2 text-xs text-ink-2">
        Dates en heure de Paris. Effacez les dates pour consulter tout
        l’historique. Les scans sans produit identifié sont exclus.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(draftSearch.trim());
          setPage(1);
        }}
        className="mt-5 flex gap-2"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-ink-4 bg-paper-2 px-3">
          <Search className="h-4 w-4 shrink-0 text-ink-2" />
          <input
            type="search"
            aria-label="Rechercher un produit ou une marque"
            value={draftSearch}
            onChange={(e) => setDraftSearch(e.target.value)}
            placeholder="Produit ou marque…"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-red"
          />
        </div>
        <button
          type="submit"
          className="cursor-pointer rounded-xl bg-red px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110"
        >
          Rechercher
        </button>
      </form>

      {invalidDates ? (
        <p
          role="alert"
          className="mt-6 rounded-xl bg-red-soft p-4 text-sm text-red"
        >
          La date de fin doit suivre la date de début.
        </p>
      ) : query.isLoading ? (
        <div
          role="status"
          className="flex items-center justify-center gap-2 py-20 text-ink-2"
        >
          <Loader2 className="h-5 w-5 animate-spin" />
          Chargement des statistiques…
        </div>
      ) : query.isError ? (
        <p
          role="alert"
          className="mt-6 rounded-xl bg-red-soft p-4 text-sm text-red"
        >
          {getApiErrorMessage(
            query.error,
            'Impossible de charger les statistiques. Réessayez avec Actualiser.',
          )}
        </p>
      ) : (
        data && (
          <>
            <p className="mb-4 mt-7 text-sm text-ink-2" aria-live="polite">
              <strong className="font-semibold text-ink">
                {count(data.summary.scanCount)} scans
              </strong>{' '}
              · {count(data.summary.productCount)} produits ·{' '}
              {count(data.summary.brandCount)} marques sur la sélection
            </p>
            {data.items.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-ink-4 bg-paper-2 px-6 py-16 text-center">
                <h2 className="font-display text-lg text-ink">
                  Aucun scan sur cette sélection
                </h2>
                <p className="mt-2 text-sm text-ink-2">
                  Élargissez la période ou modifiez la recherche.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-[22px] border border-ink-4 bg-paper-2 shadow-card">
                <table className="w-full min-w-[650px] text-left text-sm">
                  <caption className="sr-only">
                    Scans regroupés par{' '}
                    {groupBy === 'brand' ? 'marque' : 'produit et marque'},
                    triés du plus fréquent au moins fréquent
                  </caption>
                  <thead>
                    <tr className="border-b border-ink-4 text-xs font-semibold uppercase tracking-wide text-ink-2">
                      <th scope="col" className="px-5 py-4">
                        Marque
                      </th>
                      {groupBy === 'product' && (
                        <th scope="col" className="px-5 py-4">
                          Produit
                        </th>
                      )}
                      <th scope="col" className="px-5 py-4 text-right">
                        Scans
                      </th>
                      <th scope="col" className="px-5 py-4 text-right">
                        Auteurs
                      </th>
                      <th scope="col" className="px-5 py-4 text-right">
                        Sans résultat
                      </th>
                      <th scope="col" className="px-5 py-4">
                        Dernier scan
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-4">
                    {data.items.map((row) => (
                      <tr
                        key={`${row.brand}|${row.product}`}
                        className="hover:bg-paper"
                      >
                        <th
                          scope="row"
                          className="px-5 py-4 font-semibold text-ink"
                        >
                          {row.brand}
                        </th>
                        {groupBy === 'product' && (
                          <td className="px-5 py-4 text-ink">{row.product}</td>
                        )}
                        <td className="px-5 py-4 text-right font-semibold tabular-nums text-ink">
                          {count(row.scanCount)}
                        </td>
                        <td className="px-5 py-4 text-right tabular-nums text-ink-2">
                          {count(row.userCount)}
                        </td>
                        <td className="px-5 py-4 text-right tabular-nums text-ink-2">
                          {count(row.noMatchCount)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-ink-2">
                          {new Date(row.lastScanAt).toLocaleString('fr-FR', {
                            timeZone: 'Europe/Paris',
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination
              page={page}
              pageSize={pageSize}
              total={data.total}
              onPage={setPage}
              busy={query.isFetching}
            />
          </>
        )
      )}
    </div>
  );
}
