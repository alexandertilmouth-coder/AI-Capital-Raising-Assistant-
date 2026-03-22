import { useState } from 'react';
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import {
  Sparkles,
  Eye,
  TrendingUp,
  FileText,
  Database,
  MessageSquare,
  Mic,
  FolderKanban,
  BarChart3,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Brand Visibility', path: '/dashboard/brand-visibility', icon: Eye },
  { label: 'Closed Funds', path: '/dashboard/closed-funds', icon: TrendingUp },
  { label: 'Investment Materials', path: '/dashboard/materials', icon: FileText },
  { label: 'Investor Database', path: '/dashboard/investor-database', icon: Database },
  { label: 'Investor Feedback', path: '/dashboard/feedback', icon: MessageSquare },
  { label: 'Transcript Analyser', path: '/dashboard/transcripts', icon: Mic },
  { label: 'Strategy Classification', path: '/dashboard/strategy', icon: FolderKanban },
  { label: 'Active Raises', path: '/dashboard/active-raises', icon: BarChart3 },
] as const;

const routeTitles: Record<string, string> = {
  '/dashboard/brand-visibility': 'Brand Visibility',
  '/dashboard/closed-funds': 'Closed Funds',
  '/dashboard/materials': 'Investment Materials',
  '/dashboard/investor-database': 'Investor Database',
  '/dashboard/feedback': 'Investor Feedback',
  '/dashboard/transcripts': 'Transcript Analyser',
  '/dashboard/strategy': 'Strategy Classification',
  '/dashboard/active-raises': 'Active Raises',
};

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const pageTitle = routeTitles[location.pathname] ?? 'Dashboard';
  const userInitial = (user?.email?.[0] ?? 'U').toUpperCase();

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-5">
          <Sparkles className="h-5 w-5 text-blue-600" />
          <span className="text-lg font-bold tracking-tight text-slate-900">
            AI Capital
          </span>
          <button
            type="button"
            className="ml-auto rounded-md p-1 text-slate-400 hover:text-slate-600 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-blue-50 font-medium text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Sign out */}
        <div className="border-t border-slate-200 px-3 py-3">
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-500 transition-colors hover:text-red-500"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <h1 className="text-base font-semibold text-slate-900">
              {pageTitle}
            </h1>
          </div>

          {user?.email && (
            <div className="flex items-center gap-2.5">
              <span className="hidden text-sm text-slate-500 sm:block">
                {user.email}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white">
                {userInitial}
              </div>
            </div>
          )}
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
