import React, { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, FolderKanban, BrainCircuit, Database, 
  PlayCircle, BarChart3, Package, FileText, Settings, 
  Bell, Search, ChevronDown, HelpCircle, LogOut 
} from 'lucide-react';
import clsx from 'clsx';
import Logo from '../ui/Logo';

// Agrupamos los módulos por contexto
const menuGroups = [
  {
    title: 'Monitoreo',
    items: [
      { name: 'Dashboard', path: '/', icon: LayoutDashboard },
      { name: 'Entrenamientos', path: '/training', icon: PlayCircle },
      { name: 'Evaluación', path: '/evaluation', icon: BarChart3 },
    ]
  },
  {
    title: 'Diseño de IA',
    items: [
      { name: 'Proyectos', path: '/projects', icon: FolderKanban },
      { name: 'Arquitecturas', path: '/architectures', icon: BrainCircuit },
      { name: 'Datasets', path: '/datasets', icon: Database },
      { name: 'Modelos', path: '/model-registry', icon: Package },
    ]
  },
  {
    title: 'Sistema',
    items: [
      { name: 'Reportes', path: '/reports', icon: FileText },
      { name: 'Admin & Config', path: '/admin', icon: Settings },
    ]
  }
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-900 font-sans antialiased">
      
      {/* SIDEBAR EMPRESARIAL */}
      <aside className="w-[260px] bg-[#0f172a] text-slate-300 flex flex-col border-r border-slate-800">
        
        {/* Logo y Workspace */}
        <div className="h-16 flex items-center px-5 border-b border-slate-800/50">
          <div className="flex items-center gap-3 text-white font-semibold tracking-tight">
            <div className="p-1.5 bg-slate-800/50 rounded-lg border border-slate-700/50 shadow-sm">
              <Logo className="w-5 h-5" />
            </div>
            <span className="text-[15px]">
              NeuroLab <span className="font-normal text-slate-400">Enterprise</span>
            </span>
          </div>
        </div>

        {/* Project Selector */}
        <div className="px-4 py-4 border-b border-slate-800/50">
          <button className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 transition-colors">
            <div className="flex items-center gap-2 text-sm text-slate-200">
              <div className="w-5 h-5 rounded bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
                D
              </div>
              <span className="truncate">Data Science Team</span>
            </div>
            <ChevronDown size={14} className="text-slate-500" />
          </button>
        </div>

        {/* Navegación Agrupada */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {menuGroups.map((group, groupIdx) => (
            <div key={groupIdx}>
              <p className="px-2 mb-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {group.title}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <li key={item.name}>
                      <Link
                        to={item.path}
                        className={clsx(
                          "flex items-center gap-3 px-2 py-2 rounded-md text-[13px] font-medium transition-all duration-200 group relative",
                          isActive 
                            ? "bg-indigo-600/10 text-indigo-400" 
                            : "hover:bg-slate-800/60 hover:text-slate-200"
                        )}
                      >
                        {/* Indicador de barra lateral (Enterprise Style) */}
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-indigo-500 rounded-r-md"></div>
                        )}
                        
                        <Icon size={16} className={clsx(
                          "transition-colors",
                          isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-400"
                        )} />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer del Menú (Perfil rápido) */}
        <div className="p-3 border-t border-slate-800/50 bg-[#0b1120]">
          <div className="flex items-center justify-between p-2 rounded-md hover:bg-slate-800/50 cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-medium text-xs shadow-sm">
                DA
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-medium text-slate-200 leading-tight">David Admin</span>
                <span className="text-[11px] text-slate-500 leading-tight">Administrador</span>
              </div>
            </div>
            <LogOut size={16} className="text-slate-500 hover:text-slate-300" />
          </div>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* HEADER SUPERIOR */}
        <header className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-6">
          <div className="flex items-center text-[13px] text-slate-500">
            <span className="hover:text-slate-800 cursor-pointer transition-colors">Workspace</span>
            <span className="mx-2 text-slate-300">/</span>
            <span className="font-medium text-slate-800">
              {menuGroups.flatMap(g => g.items).find(i => i.path === location.pathname)?.name || 'Dashboard'}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Buscador rápido */}
            <div className="relative hidden md:block">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder="Search..." 
                className="pl-8 pr-3 py-1.5 text-sm bg-slate-100 border border-transparent rounded-md focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-64 placeholder:text-slate-400 transition-all"
              />
            </div>
            
            <div className="h-5 w-px bg-slate-200 mx-1"></div>

            {/* Help & Notifications */}
            <button className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors">
              <HelpCircle size={18} />
            </button>
            <button className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 relative transition-colors">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-white"></span>
            </button>
          </div>
        </header>

        {/* CONTENIDO DE LA PÁGINA */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}