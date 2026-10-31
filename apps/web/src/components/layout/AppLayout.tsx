import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3, BookOpen, BrainCircuit, Database, FileText,
  FolderKanban, LayoutDashboard, LogOut, Menu, Package, PlayCircle,
  Search, Settings, X,
} from 'lucide-react';
import clsx from 'clsx';
import Logo from '../ui/Logo';
import { useAuth } from '../../auth/AuthProvider';

const menuGroups = [
  {
    title: 'Monitoreo',
    items: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { name: 'Entrenamientos', path: '/training', icon: PlayCircle },
      { name: 'Evaluación', path: '/evaluation', icon: BarChart3 },
      { name: 'Fundamentos', path: '/fundamentals', icon: BookOpen },
    ],
  },
  {
    title: 'Diseño de IA',
    items: [
      { name: 'Proyectos', path: '/projects', icon: FolderKanban },
      { name: 'Arquitecturas', path: '/architectures', icon: BrainCircuit },
      { name: 'Datasets', path: '/datasets', icon: Database },
      { name: 'Modelos', path: '/model-registry', icon: Package },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { name: 'Reportes', path: '/reports', icon: FileText },
      { name: 'Admin & Config', path: '/admin', icon: Settings },
    ],
  },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [signOutError, setSignOutError] = useState('');
  const visibleGroups = menuGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => item.path !== '/admin' || user?.role === 'ADMIN'),
    }))
    .filter(group => group.items.length > 0);
  const navItems = visibleGroups.flatMap(group => group.items);
  const userName = user?.email?.split('@')[0] || 'Usuario';
  const initials = userName.split(/\s+/).slice(0, 2).map((part: string) => part[0]?.toUpperCase()).join('');

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim().toLocaleLowerCase();
    const match = navItems.find(item => item.name.toLocaleLowerCase().includes(query));
    if (match) {
      navigate(match.path);
      setSearch('');
    }
  }

  async function handleSignOut() {
    setSignOutError('');
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : 'No se pudo cerrar sesión.');
    }
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc] text-slate-900 font-sans antialiased md:h-screen">
      {mobileMenuOpen && (
        <button
          aria-label="Cerrar navegación"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/40 md:hidden"
        />
      )}
      <aside className={clsx(
        'fixed inset-y-0 left-0 z-40 w-[260px] bg-[#0f172a] text-slate-300 flex flex-col border-r border-slate-800 transition-transform md:static md:translate-x-0',
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        <div className="h-16 flex items-center px-5 border-b border-slate-800/50">
          <div className="flex items-center gap-3 text-white font-semibold tracking-tight">
            <div className="p-1.5 bg-slate-800/50 rounded-lg border border-slate-700/50 shadow-sm">
              <Logo className="w-5 h-5" />
            </div>
            <span className="text-[15px]">NeuroLab <span className="font-normal text-slate-400">Enterprise</span></span>
          </div>
        </div>

        <div className="px-4 py-4 border-b border-slate-800/50">
          <div className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-slate-800/40 border border-slate-700/50 text-sm text-slate-200">
            <div className="w-5 h-5 rounded bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">N</div>
            <span className="truncate">NeuroLab Workspace</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6" aria-label="Navegación principal">
          {visibleGroups.map(group => (
            <div key={group.title}>
              <p className="px-2 mb-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{group.title}</p>
              <ul className="space-y-0.5">
                {group.items.map(item => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <li key={item.name}>
                      <Link
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        aria-current={isActive ? 'page' : undefined}
                        className={clsx(
                          'flex items-center gap-3 px-2 py-2 rounded-md text-[13px] font-medium transition-colors group relative',
                          isActive ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-slate-800/60 hover:text-slate-200',
                        )}
                      >
                        {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-indigo-500 rounded-r-md" />}
                        <Icon size={16} className={isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-400'} />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-800/50 bg-[#0b1120]">
          <button onClick={handleSignOut} className="flex w-full items-center justify-between p-2 rounded-md hover:bg-slate-800/50 transition-colors text-left">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-medium text-xs">{initials}</div>
              <div className="flex min-w-0 flex-col">
                <span className="max-w-36 truncate text-[13px] font-medium text-slate-200">{userName}</span>
                <span className="max-w-36 truncate text-[11px] text-slate-500">{user?.email}</span>
              </div>
            </div>
            <LogOut size={16} className="shrink-0 text-slate-500" />
          </button>
          {signOutError && <p role="alert" className="px-2 pt-2 text-xs text-red-300">{signOutError}</p>}
        </div>
      </aside>

      <div className="min-w-0 flex-1 flex flex-col overflow-hidden">
        <header className="h-16 shrink-0 bg-white border-b border-slate-200/80 flex items-center justify-between px-4 sm:px-6">
          <div className="flex min-w-0 items-center text-[13px] text-slate-500">
            <button
              type="button"
              className="mr-3 rounded-md p-2 text-slate-500 hover:bg-slate-100 md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Cerrar navegación' : 'Abrir navegación'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <span className="hidden sm:inline">Workspace</span>
            <span className="mx-2 text-slate-300">/</span>
            <span className="truncate font-medium text-slate-800">
              {navItems.find(item => item.path === location.pathname)?.name || 'Dashboard'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <form onSubmit={submitSearch} className="relative hidden md:block">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="search"
                placeholder="Buscar módulo…"
                aria-label="Buscar y abrir módulo"
                value={search}
                onChange={event => setSearch(event.target.value)}
                className="pl-8 pr-3 py-1.5 text-sm bg-slate-100 border border-transparent rounded-md focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-64 placeholder:text-slate-400 transition-all"
              />
            </form>
            <div className="hidden h-5 w-px bg-slate-200 sm:block" />
            <span className="hidden max-w-48 truncate text-xs text-slate-500 sm:block">{user?.email}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
