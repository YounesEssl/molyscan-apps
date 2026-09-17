import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
  busy = false,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  busy?: boolean;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <nav
      aria-label="Pagination"
      className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-ink-2"
    >
      <p aria-live="polite">
        {total === 0
          ? 'Aucun résultat'
          : `${((page - 1) * pageSize + 1).toLocaleString('fr-FR')}–${Math.min(page * pageSize, total).toLocaleString('fr-FR')} sur ${total.toLocaleString('fr-FR')}`}
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={busy || page <= 1}
          onClick={() => onPage(page - 1)}
          className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-ink-4 bg-paper-2 px-3 py-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          Précédent
        </button>
        <span className="tabular-nums">
          {page} / {pages}
        </span>
        <button
          type="button"
          disabled={busy || page >= pages}
          onClick={() => onPage(page + 1)}
          className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-ink-4 bg-paper-2 px-3 py-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          Suivant
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}
