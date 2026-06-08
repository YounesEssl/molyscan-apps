import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, Loader2, Mail, Calendar } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import type { AccessRequest, Department } from '@/lib/types';
import { DepartmentMultiSelect } from './DepartmentMultiSelect';
import { RoleBadge } from './UserBadges';

interface Props {
  request: AccessRequest;
  departments: Department[];
  departmentsLoading: boolean;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function AccessRequestCard({
  request,
  departments,
  departmentsLoading,
}: Props) {
  const queryClient = useQueryClient();
  // Pré-sélectionne le département choisi par le distributeur à l'inscription
  // (vide pour un commercial : l'admin choisit).
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(request.departments.map((d) => d.id)),
  );
  const [error, setError] = useState<string | null>(null);
  const isDistributor = request.role === 'distributor';

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['access-requests'] });
    void queryClient.invalidateQueries({ queryKey: ['users'] });
  };

  const approve = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(
        `/admin/access-requests/${request.id}/approve`,
        { departmentIds: [...selected] },
      );
      return data;
    },
    onSuccess: invalidate,
    onError: (err) => setError(getApiErrorMessage(err, 'Approbation impossible.')),
  });

  const reject = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(
        `/admin/access-requests/${request.id}/reject`,
      );
      return data;
    },
    onSuccess: invalidate,
    onError: (err) => setError(getApiErrorMessage(err, 'Refus impossible.')),
  });

  const busy = approve.isPending || reject.isPending;
  const initials = `${request.firstName?.[0] ?? ''}${
    request.lastName?.[0] ?? ''
  }`.toUpperCase();

  const toggle = (id: string) => {
    setError(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <article className="overflow-hidden rounded-[22px] border border-ink-4 bg-paper-2 shadow-card">
      <div className="flex flex-wrap items-start gap-4 p-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-vivid to-red text-sm font-semibold text-white">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="font-display text-xl font-semibold tracking-tight text-ink">
              {request.firstName} {request.lastName}
            </h3>
            <RoleBadge role={request.role} />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-2">
            <span className="inline-flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              {request.email}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Demandé le {formatDate(request.createdAt)}
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-ink-4 px-6 py-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-2">
            {isDistributor ? 'Département demandé' : 'Départements à attribuer'}
          </p>
          <span className="text-xs font-medium text-ink-3">
            {selected.size} sélectionné{selected.size > 1 ? 's' : ''}
          </span>
        </div>
        {isDistributor && (
          <p className="mt-1.5 text-xs text-ink-3">
            Choisi par le distributeur à l'inscription modifiable avant
            approbation.
          </p>
        )}

        <div className="mt-3">
          <DepartmentMultiSelect
            departments={departments}
            loading={departmentsLoading}
            selected={selected}
            onToggle={toggle}
            disabled={busy}
          />
        </div>

        {error && <p className="mt-4 text-sm text-red">{error}</p>}

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setError(null);
              reject.mutate();
            }}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-ink-4 px-5 py-2.5 text-sm font-semibold text-ink-2 transition-colors hover:border-red-border hover:bg-red-soft hover:text-red disabled:cursor-not-allowed disabled:opacity-50"
          >
            {reject.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
            Refuser
          </button>
          <button
            type="button"
            disabled={busy || selected.size === 0}
            onClick={() => {
              setError(null);
              approve.mutate();
            }}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-gradient-to-br from-red-vivid to-red px-6 py-2.5 text-sm font-semibold text-white shadow-red transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            {approve.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Approuver
            {selected.size > 0 && (
              <span className="rounded-full bg-white/25 px-1.5 text-xs">
                {selected.size}
              </span>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
