import { NavLink, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  UserCheck,
  Users,
  Tag,
  Link2,
  LogOut,
  DatabaseZap,
  ChartNoAxesCombined,
  MessageSquareWarning,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import type { AccessRequest } from '@/lib/types';
import { Brand } from '@/components/Brand';

const navItems = [
  { to: '/access-requests', label: "Demandes d'accès", icon: UserCheck },
  { to: '/users', label: 'Utilisateurs', icon: Users },
  { to: '/price-requests', label: 'Demandes de prix', icon: Tag },
  { to: '/equivalences', label: 'Équivalences', icon: Link2 },
  { to: '/ai-feedback', label: 'Signalements IA', icon: MessageSquareWarning },
  {
    to: '/competitive-intelligence',
    label: 'Veille concurrentielle',
    icon: ChartNoAxesCombined,
  },
  { to: '/catalogue', label: 'Catalogue produits', icon: DatabaseZap },
];

export function Layout() {
  const { user, logout } = useAuth();

  const { data: pending } = useQuery({
    queryKey: ['access-requests'],
    queryFn: async () => {
      const { data } = await api.get<AccessRequest[]>('/admin/access-requests');
      return data;
    },
  });

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : '';

  return (
    <div className="flex min-h-screen flex-col bg-paper md:flex-row">
      <aside className="flex w-full shrink-0 flex-col border-b border-ink-4 bg-paper-2 md:sticky md:top-0 md:h-screen md:w-64 md:border-r md:border-b-0 lg:w-72">
        <div className="flex items-center justify-between px-7 py-5 md:block md:pb-10 md:pt-8">
          <Brand />
          <button
            type="button"
            onClick={logout}
            aria-label="Se déconnecter"
            className="cursor-pointer rounded-full p-2 text-ink-2 hover:bg-red-soft hover:text-ink md:hidden"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-4 pb-3 md:block md:flex-1 md:overflow-y-auto md:pb-0">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  'flex shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-medium transition-colors',
                  isActive
                    ? 'bg-red-soft text-red'
                    : 'text-ink-2 hover:bg-black/[0.03] hover:text-ink',
                ].join(' ')
              }
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
              <span>{label}</span>
              {to === '/access-requests' && pending && pending.length > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red px-1.5 text-[11px] font-semibold text-white">
                  {pending.length}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="hidden border-t border-ink-4 p-4 md:block">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-red-vivid to-red text-sm font-semibold text-white">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="truncate text-xs text-ink-3">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="mt-1 flex w-full cursor-pointer items-center gap-2.5 rounded-2xl px-4 py-2.5 text-sm font-medium text-ink-2 transition-colors hover:bg-black/[0.03] hover:text-ink"
          >
            <LogOut className="h-[18px] w-[18px]" strokeWidth={2} />
            Se déconnecter
          </button>
        </div>
      </aside>

      <main className="relative min-w-0 flex-1 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
