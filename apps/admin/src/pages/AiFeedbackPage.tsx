import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import type {
  ConversationSubmission,
  PagedResult,
  PriceRequestParty,
  ScanFeedback,
  SubmittedMessage,
} from '@/lib/types';
import { Pagination } from '@/components/Pagination';

const date = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', {
    timeZone: 'Europe/Paris',
    dateStyle: 'short',
    timeStyle: 'short',
  });
const name = (user: PriceRequestParty) =>
  `${user.firstName} ${user.lastName}`.trim() || user.email;
const pageSize = 25;

export function AiFeedbackPage() {
  const [tab, setTab] = useState<'scan' | 'conversation'>('scan');
  const [vote, setVote] = useState<'down' | 'up' | ''>('down');
  const [search, setSearch] = useState('');
  const [draftSearch, setDraftSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ConversationSubmission | null>(null);
  const scans = useQuery({
    queryKey: ['scan-feedback', { search, vote, page }],
    enabled: tab === 'scan',
    queryFn: async () =>
      (
        await api.get<PagedResult<ScanFeedback>>('/admin/scan-feedback', {
          params: {
            page,
            pageSize,
            search: search || undefined,
            vote: vote || undefined,
          },
        })
      ).data,
  });
  const submissions = useQuery({
    queryKey: ['conversation-submissions', { search, page }],
    enabled: tab === 'conversation',
    queryFn: async () =>
      (
        await api.get<PagedResult<ConversationSubmission>>(
          '/admin/conversation-submissions',
          { params: { page, pageSize, search: search || undefined } },
        )
      ).data,
  });
  const query = tab === 'scan' ? scans : submissions;
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[2.1rem] font-medium tracking-tight text-ink">
            Signalements <span className="italic text-red">IA</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-2">
            Retrouvez les retours de l’équipe et leur auteur pour examiner les
            équivalences proposées et les conversations transmises.
          </p>
        </div>
        <button
          type="button"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-ink-4 bg-paper-2 px-4 py-2.5 text-sm text-ink-2 hover:text-ink disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`}
          />
          Actualiser
        </button>
      </header>
      <div
        role="group"
        aria-label="Type de retour"
        className="mt-8 flex w-fit flex-wrap gap-1 rounded-2xl border border-ink-4 bg-paper-2 p-1"
      >
        {(
          [
            { value: 'scan', label: 'Équivalences de scans' },
            { value: 'conversation', label: 'Conversations transmises' },
          ] as const
        ).map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={tab === item.value}
            aria-controls="feedback-results"
            onClick={() => {
              setTab(item.value);
              setPage(1);
            }}
            className={`cursor-pointer rounded-xl px-4 py-2 text-sm font-medium ${tab === item.value ? 'bg-red-soft text-red' : 'text-ink-2 hover:text-ink'}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(draftSearch.trim());
          setPage(1);
        }}
        className="mt-5 flex flex-wrap gap-2"
      >
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-ink-4 bg-paper-2 px-3">
          <Search className="h-4 w-4 shrink-0 text-ink-2" />
          <span className="sr-only">Rechercher un auteur ou un produit</span>
          <input
            type="search"
            value={draftSearch}
            onChange={(e) => setDraftSearch(e.target.value)}
            placeholder="Auteur, produit…"
            className="w-full min-w-0 bg-transparent py-2.5 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-red"
          />
        </label>
        {tab === 'scan' && (
          <select
            aria-label="Filtrer les avis"
            value={vote}
            onChange={(e) => {
              setVote(e.target.value as typeof vote);
              setPage(1);
            }}
            className="rounded-xl border border-ink-4 bg-paper-2 px-3 py-2 text-sm text-ink"
          >
            <option value="down">À corriger</option>
            <option value="up">Avis positifs</option>
            <option value="">Tous les avis</option>
          </select>
        )}
        <button
          type="submit"
          className="cursor-pointer rounded-xl bg-red px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110"
        >
          Rechercher
        </button>
      </form>
      <div id="feedback-results" className="mt-6">
        {query.isLoading ? (
          <div
            role="status"
            className="flex items-center justify-center gap-2 py-20 text-ink-2"
          >
            <Loader2 className="h-5 w-5 animate-spin" />
            Chargement des retours…
          </div>
        ) : query.isError ? (
          <p
            role="alert"
            className="rounded-xl bg-red-soft p-4 text-sm text-red"
          >
            {getApiErrorMessage(
              query.error,
              'Impossible de charger les retours. Réessayez avec Actualiser.',
            )}
          </p>
        ) : query.data?.items.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-ink-4 bg-paper-2 px-6 py-16 text-center">
            <h2 className="font-display text-lg text-ink">
              Aucun retour sur cette sélection
            </h2>
            <p className="mt-2 text-sm text-ink-2">
              Les avis et conversations envoyés depuis l’application
              apparaîtront ici.
            </p>
          </div>
        ) : tab === 'scan' ? (
          <div className="overflow-x-auto rounded-[22px] border border-ink-4 bg-paper-2 shadow-card">
            <table className="w-full min-w-[750px] text-left text-sm">
              <thead>
                <tr className="border-b border-ink-4 text-xs font-semibold uppercase tracking-wide text-ink-2">
                  <th scope="col" className="px-5 py-4">
                    Produit concurrent
                  </th>
                  <th scope="col" className="px-5 py-4">
                    Retour
                  </th>
                  <th scope="col" className="px-5 py-4">
                    Auteur
                  </th>
                  <th scope="col" className="px-5 py-4">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-4">
                {scans.data?.items.map((item) => (
                  <tr key={item.id} className="align-top hover:bg-paper">
                    <th scope="row" className="px-5 py-4 text-left font-normal">
                      <p className="text-xs text-ink-2">
                        {item.scan.identifiedBrand ||
                          item.scan.competitorProduct?.brand ||
                          'Marque inconnue'}
                      </p>
                      <p className="mt-1 font-semibold text-ink">
                        {item.scan.identifiedName ||
                          item.scan.competitorProduct?.name ||
                          'Produit non identifié'}
                      </p>
                    </th>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold ${item.vote === 'down' ? 'text-red' : 'text-ok'}`}
                      >
                        {item.vote === 'down' ? (
                          <ThumbsDown className="h-3.5 w-3.5" />
                        ) : (
                          <ThumbsUp className="h-3.5 w-3.5" />
                        )}
                        {item.vote === 'down'
                          ? 'Équivalence contestée'
                          : 'Équivalence approuvée'}
                      </span>
                      <p className="mt-1.5 text-ink">{item.equivalentName}</p>
                      {item.vote === 'down' && (
                        <p className="mt-1 text-xs text-ink-2">
                          {item.suggestedName
                            ? `Suggestion : ${item.suggestedName}`
                            : 'Aucune alternative suggérée'}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <Author user={item.user} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-ink-2">
                      {date(item.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[22px] border border-ink-4 bg-paper-2 shadow-card">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead>
                <tr className="border-b border-ink-4 text-xs font-semibold uppercase tracking-wide text-ink-2">
                  <th scope="col" className="px-5 py-4">
                    Conversation
                  </th>
                  <th scope="col" className="px-5 py-4">
                    Auteur de l’envoi
                  </th>
                  <th scope="col" className="px-5 py-4">
                    Date
                  </th>
                  <th scope="col" className="px-5 py-4">
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-4">
                {submissions.data?.items.map((item) => (
                  <tr key={item.id} className="align-top hover:bg-paper">
                    <th scope="row" className="px-5 py-4 text-left font-normal">
                      <p className="font-semibold text-ink">
                        {item.conversation.title}
                      </p>
                      <p className="mt-1 text-xs text-ink-2">
                        {[
                          item.conversation.scannedBrand,
                          item.conversation.scannedName,
                        ]
                          .filter(Boolean)
                          .join(' · ') || 'Conversation libre'}{' '}
                        · {item.conversation._count.messages} messages
                      </p>
                    </th>
                    <td className="px-5 py-4">
                      <Author user={item.user} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-ink-2">
                      {date(item.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => setSelected(item)}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-ink-4 px-3 py-2 text-sm font-medium text-ink hover:bg-red-soft"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Consulter
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {query.data && !query.isError && (
          <Pagination
            page={page}
            pageSize={pageSize}
            total={query.data.total}
            onPage={setPage}
            busy={query.isFetching}
          />
        )}
      </div>
      {selected && (
        <ConversationReview
          key={selected.id}
          submission={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function Author({ user }: { user: PriceRequestParty }) {
  return (
    <>
      <p className="font-medium text-ink">{name(user)}</p>
      <p className="mt-1 break-all text-xs text-ink-2">{user.email}</p>
    </>
  );
}

function ConversationReview({
  submission,
  onClose,
}: {
  submission: ConversationSubmission;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ['conversation-submission', submission.id, page],
    queryFn: async () =>
      (
        await api.get<PagedResult<SubmittedMessage>>(
          `/admin/conversation-submissions/${submission.id}`,
          { params: { page, pageSize } },
        )
      ).data,
  });
  useEffect(() => {
    const current = dialog.current;
    current?.showModal();
    return () => current?.close();
  }, []);
  useEffect(() => {
    content.current?.scrollTo({ top: 0 });
  }, [page]);
  return (
    <dialog
      ref={dialog}
      aria-labelledby="conversation-title"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-3xl overflow-hidden rounded-[22px] border border-ink-4 bg-paper-2 p-0 text-ink shadow-float backdrop:bg-ink/40"
    >
      <div className="flex max-h-[85vh] flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-ink-4 p-5">
          <div>
            <h2
              id="conversation-title"
              className="font-display text-xl font-semibold"
            >
              {submission.conversation.title}
            </h2>
            <p className="mt-1 text-xs text-ink-2">
              Transmise par {name(submission.user)} ·{' '}
              {date(submission.createdAt)} (heure de Paris)
            </p>
            <p className="mt-1 text-xs text-ink-2">
              Contenu actuel de la conversation.
            </p>
          </div>
          <button
            type="button"
            aria-label="Fermer la conversation"
            onClick={onClose}
            className="cursor-pointer rounded-full p-2 hover:bg-paper"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div ref={content} className="min-h-0 overflow-y-auto p-5">
          {query.isLoading ? (
            <p role="status" className="py-12 text-center text-sm text-ink-2">
              Chargement des messages…
            </p>
          ) : query.isError ? (
            <div role="alert" className="text-sm text-red">
              <p>Impossible de charger la conversation.</p>
              <button
                type="button"
                className="mt-3 cursor-pointer underline"
                onClick={() => void query.refetch()}
              >
                Réessayer
              </button>
            </div>
          ) : query.data?.items.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-2">
              Aucun message dans cette conversation.
            </p>
          ) : (
            <ol className="space-y-5">
              {query.data?.items.map((message) => (
                <li key={message.id}>
                  <p className="mb-2 text-xs font-semibold text-ink-2">
                    {message.role === 'user' ? 'Utilisateur' : 'Assistant IA'} ·{' '}
                    {date(message.timestamp)}
                  </p>
                  <div
                    className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-relaxed ${message.role === 'user' ? 'bg-paper' : 'border border-ink-4'}`}
                  >
                    {message.text}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
        {query.data && (
          <footer className="border-t border-ink-4 px-5 pb-4">
            <Pagination
              page={page}
              pageSize={pageSize}
              total={query.data.total}
              onPage={setPage}
              busy={query.isFetching}
            />
          </footer>
        )}
      </div>
    </dialog>
  );
}
