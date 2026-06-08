import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, RefreshCw, Search, Users as UsersIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { AdminUser, Department, UserRole, UserStatus } from '@/lib/types';
import { Aura } from '@/components/Aura';
import { RoleBadge, StatusBadge } from '@/components/UserBadges';
import { UserEditDrawer } from '@/components/UserEditDrawer';

type StatusFilter = 'all' | UserStatus;
type RoleFilter = 'all' | UserRole;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'approved', label: 'Actifs' },
  { value: 'pending', label: 'En attente' },
  { value: 'rejected', label: 'Refusés' },
];

const ROLE_FILTERS: { value: RoleFilter; label: string }[] = [
  { value: 'all', label: 'Tous rôles' },
  { value: 'commercial', label: 'Commerciaux' },
  { value: 'distributor', label: 'Distributeurs' },
  { value: 'admin', label: 'Admins' },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function FilterPills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={[
              'cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
              active
                ? 'bg-ink text-paper-2'
                : 'border border-ink-4 bg-paper-2 text-ink-2 hover:text-ink',
            ].join(' ')}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[20px] border border-ink-4 bg-paper-2 px-5 py-4 shadow-card">
      <p className="font-display text-3xl font-medium tracking-tight text-ink">
        {value}
      </p>
      <p className="mt-0.5 text-xs font-medium uppercase tracking-[0.12em] text-ink-3">
        {label}
      </p>
    </div>
  );
}

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [editing, setEditing] = useState<AdminUser | null>(null);

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get<AdminUser[]>('/admin/users');
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

  const users = usersQuery.data ?? [];
  const departments = departmentsQuery.data ?? [];

  const stats = useMemo(
    () => ({
      total: users.length,
      active: users.filter((u) => u.status === 'approved').length,
      pending: users.filter((u) => u.status === 'pending').length,
      admins: users.filter((u) => u.role === 'admin').length,
    }),
    [users],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (!q) return true;
      return (
        u.firstName.toLowerCase().includes(q) ||
        u.lastName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    });
  }, [users, search, statusFilter, roleFilter]);

  // Garde une référence vive de l'utilisateur édité après un refetch.
  const editingLive = editing
    ? users.find((u) => u.id === editing.id) ?? editing
    : null;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Aura size={420} color="#ff5b50" opacity={0.1} style={{ top: -170, right: -130 }} />

      <div className="relative mx-auto max-w-6xl px-8 py-12">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red">
              Annuaire
            </p>
            <h1 className="mt-2 font-display text-[2.1rem] font-medium tracking-tight text-ink">
              Comptes <span className="italic text-red">utilisateurs</span>
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-2">
              Gérez les rôles, les statuts et les départements attribués à
              chaque membre de l'application terrain.
            </p>
          </div>
          <button
            onClick={() => usersQuery.refetch()}
            className="flex cursor-pointer items-center gap-2 rounded-full border border-ink-4 bg-paper-2 px-4 py-2 text-sm font-medium text-ink-2 transition-colors hover:text-ink"
          >
            <RefreshCw
              className={`h-4 w-4 ${usersQuery.isFetching ? 'animate-spin' : ''}`}
            />
            Actualiser
          </button>
        </header>

        {/* Statistiques */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Comptes" value={stats.total} />
          <StatCard label="Actifs" value={stats.active} />
          <StatCard label="En attente" value={stats.pending} />
          <StatCard label="Admins" value={stats.admins} />
        </div>

        {/* Barre d'outils */}
        <div className="mt-8 flex flex-col gap-4">
          <div className="flex items-center gap-2 rounded-full border border-ink-4 bg-paper-2 px-4 py-2.5 shadow-card">
            <Search className="h-4 w-4 text-ink-3" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom ou email…"
              className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <FilterPills
              options={STATUS_FILTERS}
              value={statusFilter}
              onChange={setStatusFilter}
            />
            <FilterPills
              options={ROLE_FILTERS}
              value={roleFilter}
              onChange={setRoleFilter}
            />
          </div>
        </div>

        {/* Liste */}
        <div className="mt-7">
          {usersQuery.isLoading ? (
            <div className="flex items-center justify-center py-24 text-ink-3">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : usersQuery.isError ? (
            <div className="rounded-[22px] border border-red-border bg-red-soft px-6 py-5 text-sm text-red">
              Impossible de charger les utilisateurs. Vérifiez votre connexion
              puis réessayez.
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState hasUsers={users.length > 0} />
          ) : (
            <div className="overflow-hidden rounded-[22px] border border-ink-4 bg-paper-2 shadow-card">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-ink-4 text-xs font-semibold uppercase tracking-[0.1em] text-ink-3">
                    <th className="px-5 py-3.5 font-semibold">Utilisateur</th>
                    <th className="px-5 py-3.5 font-semibold">Rôle</th>
                    <th className="px-5 py-3.5 font-semibold">Statut</th>
                    <th className="px-5 py-3.5 font-semibold">Départements</th>
                    <th className="px-5 py-3.5 font-semibold">Inscrit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-4">
                  {filtered.map((u) => (
                    <UserRow
                      key={u.id}
                      user={u}
                      isSelf={u.id === currentUser?.id}
                      onClick={() => setEditing(u)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!usersQuery.isLoading && filtered.length > 0 && (
            <p className="mt-3 text-xs text-ink-3">
              {filtered.length} utilisateur{filtered.length > 1 ? 's' : ''}{' '}
              affiché{filtered.length > 1 ? 's' : ''}
              {filtered.length !== users.length && ` sur ${users.length}`}
            </p>
          )}
        </div>
      </div>

      {editingLive && (
        <UserEditDrawer
          user={editingLive}
          departments={departments}
          departmentsLoading={departmentsQuery.isLoading}
          currentUserId={currentUser?.id}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function UserRow({
  user,
  isSelf,
  onClick,
}: {
  user: AdminUser;
  isSelf: boolean;
  onClick: () => void;
}) {
  const initials = `${user.firstName?.[0] ?? ''}${
    user.lastName?.[0] ?? ''
  }`.toUpperCase();

  const shownDepts = user.departments.slice(0, 3);
  const extra = user.departments.length - shownDepts.length;

  return (
    <tr
      onClick={onClick}
      className="cursor-pointer transition-colors hover:bg-red-soft/60"
    >
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-vivid to-red text-xs font-semibold text-white">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-2 truncate font-medium text-ink">
              {user.firstName} {user.lastName}
              {isSelf && (
                <span className="rounded-full bg-ink/5 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-3">
                  Vous
                </span>
              )}
            </p>
            <p className="truncate text-sm text-ink-3">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-4">
        <RoleBadge role={user.role} />
      </td>
      <td className="px-5 py-4">
        <StatusBadge status={user.status} />
      </td>
      <td className="px-5 py-4">
        {user.departments.length === 0 ? (
          <span className="text-sm text-ink-3">—</span>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            {shownDepts.map((d) => (
              <span
                key={d.id}
                className="rounded-full border border-ink-4 bg-paper px-2 py-0.5 text-xs text-ink-2"
              >
                {d.code ?? d.name}
              </span>
            ))}
            {extra > 0 && (
              <span className="text-xs font-medium text-ink-3">+{extra}</span>
            )}
          </div>
        )}
      </td>
      <td className="px-5 py-4 whitespace-nowrap text-sm text-ink-2">
        {formatDate(user.createdAt)}
      </td>
    </tr>
  );
}

function EmptyState({ hasUsers }: { hasUsers: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-ink-4 bg-paper-2 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-soft text-red">
        <UsersIcon className="h-7 w-7" strokeWidth={1.8} />
      </div>
      <h3 className="mt-5 font-display text-lg font-semibold text-ink">
        {hasUsers ? 'Aucun résultat' : 'Aucun utilisateur'}
      </h3>
      <p className="mt-1.5 max-w-xs text-sm text-ink-2">
        {hasUsers
          ? 'Aucun compte ne correspond à votre recherche ou à vos filtres.'
          : 'Les comptes apparaîtront ici dès leur création depuis l’application.'}
      </p>
    </div>
  );
}
