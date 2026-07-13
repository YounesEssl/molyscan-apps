import { NavLink, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { UserCheck, Users, Tag, Link2, LogOut, DatabaseZap } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import type { AccessRequest } from '@/lib/types';

const navItems = [
  { to: '/access-requests', label: "Demandes d'accès", icon: UserCheck },
  { to: '/users', label: 'Utilisateurs', icon: Users },
  { to: '/price-requests', label: 'Demandes de prix', icon: Tag },
  { to: '/equivalences', label: 'Équivalences', icon: Link2 },
  { to: '/rag', label: 'PIM & RAG', icon: DatabaseZap },
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
    <div className="flex min-h-screen bg-paper">
      <aside className="sticky top-0 flex h-screen w-72 flex-col border-r border-ink-4 bg-paper-2">
        <div className="px-7 pb-10 pt-8">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-xl font-semibold tracking-tight text-ink">
              Molyscan
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-red">
              Admin
            </span>
          </div>
        </div>

        <nav className="flex-1 px-4">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-medium transition-colors',
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

        <div className="border-t border-ink-4 p-4">
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

      <main className="relative flex-1 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
