import type { UserRole, UserStatus } from '@/lib/types';

const STATUS_META: Record<
  UserStatus,
  { label: string; dot: string; className: string }
> = {
  approved: {
    label: 'Actif',
    dot: '#228a3c',
    className: 'bg-[#228a3c]/10 text-[#1c7333]',
  },
  pending: {
    label: 'En attente',
    dot: '#b7791f',
    className: 'bg-[#b7791f]/12 text-[#8a5a08]',
  },
  rejected: {
    label: 'Refusé',
    dot: '#d4251c',
    className: 'bg-red-soft text-red',
  },
};

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Admin',
  commercial: 'Commercial',
  distributor: 'Distributeur',
};

export function StatusBadge({ status }: { status: UserStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: meta.dot }}
      />
      {meta.label}
    </span>
  );
}

export function RoleBadge({ role }: { role: UserRole }) {
  const isAdmin = role === 'admin';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
        isAdmin
          ? 'bg-ink text-paper-2'
          : 'border border-ink-4 bg-paper text-ink-2'
      }`}
    >
      {ROLE_LABEL[role]}
    </span>
  );
}
