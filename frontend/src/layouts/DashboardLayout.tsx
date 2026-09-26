import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  Users,
  UserX,
  Receipt,
  Calendar,
  BarChart3,
  Settings,
  UserCog,
  ClipboardCheck,
} from 'lucide-react';
import { useAuthStore } from '../store/auth';
import SealMark from '../components/SealMark';
import GlobalSearch from '../components/GlobalSearch';
import AlertesBell from '../components/AlertesBell';
import UserAvatar from '../components/UserAvatar';
import UserMenu from '../components/UserMenu';

const navItems = [
  { to: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard, roles: ['HUISSIER', 'CLERC', 'COMPTABLE', 'SECRETAIRE', 'AGENT_TERRAIN'] },
  { to: '/dossiers', label: 'Dossiers', icon: FolderOpen, roles: ['HUISSIER', 'CLERC', 'COMPTABLE', 'SECRETAIRE', 'AGENT_TERRAIN'] },
  { to: '/actes', label: 'Actes', icon: FileText, roles: ['HUISSIER', 'CLERC'] },
  { to: '/actes/a-valider', label: 'Gestion des actes', icon: ClipboardCheck, roles: ['HUISSIER'] },
  { to: '/clients', label: 'Clients', icon: Users, roles: ['HUISSIER', 'CLERC', 'COMPTABLE'] },
  { to: '/debiteurs', label: 'Debiteurs', icon: UserX, roles: ['HUISSIER', 'CLERC', 'COMPTABLE'] },
  { to: '/facturation', label: 'Facturation', icon: Receipt, roles: ['HUISSIER', 'COMPTABLE'] },
  { to: '/agenda', label: 'Agenda', icon: Calendar, roles: ['HUISSIER', 'CLERC', 'COMPTABLE', 'SECRETAIRE', 'AGENT_TERRAIN'] },
  { to: '/rapports', label: 'Rapports', icon: BarChart3, roles: ['HUISSIER', 'COMPTABLE'] },
  { to: '/administration', label: 'Administration', icon: Settings, roles: ['HUISSIER'] },
  { to: '/utilisateurs', label: 'Utilisateurs', icon: UserCog, roles: ['HUISSIER'] },
];

export default function DashboardLayout() {
  const { user } = useAuthStore();

  const visibleItems = navItems.filter((item) => !user || item.roles.includes(user.role));

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 text-white flex flex-col fixed inset-y-0 bg-gradient-to-b from-navy-900 via-navy-800 to-navy-900">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <SealMark size={30} className="text-brass-400 shrink-0" />
          <span className="font-serif font-semibold text-[15px] leading-tight">
            LOGINET
            <br />
            Huissiers
          </span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {visibleItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm border-l-2 transition-colors ${
                  isActive
                    ? 'bg-white/[0.08] border-brass-400 text-white font-medium'
                    : 'border-transparent text-navy-100 hover:bg-white/[0.05] hover:border-white/20'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <div className="flex items-center gap-2.5 px-3">
            <UserAvatar
              userId={user?.id}
              initiales={(user?.nom?.[0] ?? '') + (user?.prenom?.[0] ?? '')}
              size={32}
            />
            <div className="text-xs text-navy-100 leading-tight min-w-0">
              <p className="truncate">{user?.nom} {user?.prenom}</p>
              <p className="text-brass-400">{user?.role}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-40 bg-gradient-to-r from-navy-50 via-white to-brass-50 border-b border-navy-100 px-6 py-3 flex items-center justify-between gap-4">
          <GlobalSearch />
          <div className="flex items-center gap-4">
            <AlertesBell />
            <UserMenu />
          </div>
        </header>

        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}



