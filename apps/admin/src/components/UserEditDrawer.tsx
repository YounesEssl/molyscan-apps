import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2, Mail, Building2, Phone, ShieldAlert } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';
import type { AdminUser, Department, UserRole, UserStatus } from '@/lib/types';
import { DepartmentMultiSelect } from './DepartmentMultiSelect';

interface Props {
  user: AdminUser;
  departments: Department[];
  departmentsLoading: boolean;
  currentUserId: string | undefined;
  onClose: () => void;
}

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'commercial', label: 'Commercial' },
  { value: 'distributor', label: 'Distributeur' },
  { value: 'admin', label: 'Admin' },
];

const STATUS_OPTIONS: { value: UserStatus; label: string }[] = [
  { value: 'approved', label: 'Actif' },
  { value: 'pending', label: 'En attente' },
  { value: 'rejected', label: 'Refusé' },
];

function Segmented<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-1.5 rounded-full border border-ink-4 bg-paper p-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={[
              'flex-1 rounded-full px-3 py-2 text-sm font-medium transition-all',
              active
                ? 'bg-gradient-to-br from-red-vivid to-red text-white shadow-red'
                : 'text-ink-2 hover:text-ink disabled:hover:text-ink-2',
              disabled && !active ? 'opacity-50' : '',
            ].join(' ')}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function UserEditDrawer({
  user,
  departments,
  departmentsLoading,
  currentUserId,
  onClose,
}: Props) {
  const queryClient = useQueryClient();
  const isSelf = user.id === currentUserId;

  const [role, setRole] = useState<UserRole>(user.role);
  const [status, setStatus] = useState<UserStatus>(user.status);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(user.departments.map((d) => d.id)),
  );
  const [error, setError] = useState<string | null>(null);
  const [entered, setEntered] = useState(false);

  // Animation d'entrée + reset si on change d'utilisateur.
  useEffect(() => {
    setRole(user.role);
    setStatus(user.status);
    setSelected(new Set(user.departments.map((d) => d.id)));
    setError(null);
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [user]);

  const close = () => {
    setEntered(false);
    setTimeout(onClose, 180);
  };

  const save = useMutation({
    mutationFn: async () => {
      const { data } = await api.patch(`/admin/users/${user.id}`, {
        role,
        status,
        departmentIds: [...selected],
      });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      void queryClient.invalidateQueries({ queryKey: ['access-requests'] });
      close();
    },
    onError: (err) =>
      setError(getApiErrorMessage(err, 'Enregistrement impossible.')),
  });

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const initials = `${user.firstName?.[0] ?? ''}${
    user.lastName?.[0] ?? ''
  }`.toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        onClick={close}
        className={`absolute inset-0 bg-ink/30 backdrop-blur-[2px] transition-opacity duration-200 ${
          entered ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <aside
        className={`relative flex h-full w-full max-w-md flex-col bg-paper-2 shadow-2xl transition-transform duration-200 ease-out ${
          entered ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* En-tête */}
        <div className="flex items-start justify-between gap-4 border-b border-ink-4 p-6">
          <div className="flex min-w-0 items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-vivid to-red text-sm font-semibold text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <h2 className="truncate font-display text-xl font-semibold tracking-tight text-ink">
                {user.firstName} {user.lastName}
              </h2>
              <p className="truncate text-sm text-ink-2">{user.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="shrink-0 rounded-full p-2 text-ink-3 transition-colors hover:bg-black/[0.04] hover:text-ink"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Corps */}
        <div className="flex-1 space-y-7 overflow-y-auto p-6">
          {/* Coordonnées */}
          {(user.company || user.phone) && (
            <div className="space-y-2 rounded-2xl border border-ink-4 bg-paper px-4 py-3.5 text-sm text-ink-2">
              {user.company && (
                <p className="flex items-center gap-2.5">
                  <Building2 className="h-4 w-4 text-ink-3" />
                  {user.company}
                </p>
              )}
              {user.phone && (
                <p className="flex items-center gap-2.5">
                  <Phone className="h-4 w-4 text-ink-3" />
                  {user.phone}
                </p>
              )}
              <p className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-ink-3" />
                {user._count.scans} scan{user._count.scans > 1 ? 's' : ''} ·{' '}
                {user._count.workflows} demande
                {user._count.workflows > 1 ? 's' : ''} de prix
              </p>
            </div>
          )}

          {isSelf && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-ink-4 bg-paper px-4 py-3 text-sm text-ink-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
              C'est votre compte : le rôle et le statut sont verrouillés pour
              éviter de vous bloquer l'accès.
            </div>
          )}

          <div>
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-ink-2">
              Rôle
            </p>
            <Segmented
              options={ROLE_OPTIONS}
              value={role}
              onChange={setRole}
              disabled={isSelf || save.isPending}
            />
          </div>

          <div>
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-ink-2">
              Statut du compte
            </p>
            <Segmented
              options={STATUS_OPTIONS}
              value={status}
              onChange={setStatus}
              disabled={isSelf || save.isPending}
            />
            <p className="mt-2 text-xs text-ink-3">
              Passer à « Actif » ou « Refusé » notifie l'utilisateur par email.
            </p>
          </div>

          <div>
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-ink-2">
              Départements attribués
            </p>
            <DepartmentMultiSelect
              departments={departments}
              loading={departmentsLoading}
              selected={selected}
              onToggle={toggle}
              disabled={save.isPending}
            />
          </div>

          {error && <p className="text-sm text-red">{error}</p>}
        </div>

        {/* Pied */}
        <div className="flex items-center justify-end gap-3 border-t border-ink-4 p-6">
          <button
            type="button"
            onClick={close}
            disabled={save.isPending}
            className="rounded-full border border-ink-4 px-5 py-2.5 text-sm font-semibold text-ink-2 transition-colors hover:bg-black/[0.03] hover:text-ink disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => {
              setError(null);
              save.mutate();
            }}
            disabled={save.isPending}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-red-vivid to-red px-6 py-2.5 text-sm font-semibold text-white shadow-red transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer
          </button>
        </div>
      </aside>
    </div>
  );
}
