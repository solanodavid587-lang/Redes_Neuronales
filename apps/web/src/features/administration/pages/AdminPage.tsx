import React, { useState } from 'react';
import { 
  Users, ShieldAlert, Activity, Search, Plus, Filter, 
  MoreVertical, Shield, UserCheck, UserX, Server, Database, Cpu, Inbox
} from 'lucide-react';
import { User, AuditLog } from '../types';
import InviteUserModal from '../components/InviteUserModal';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'system'>('users');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // ESTADO VACÍO: Aquí conectarás tu API de Supabase
  const [users] = useState<User[]>([]);
  const [logs] = useState<AuditLog[]>([]);

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Administración</h1>
          <p className="text-sm text-slate-500 mt-1">Gestiona usuarios, permisos y revisa la salud del sistema.</p>
        </div>
        {activeTab === 'users' && (
          <button 
            onClick={() => setIsInviteModalOpen(true)}
            className="px-3.5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Invitar Usuario
          </button>
        )}
      </div>

      {/* TABS */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6">
          <button 
            onClick={() => setActiveTab('users')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2
              ${activeTab === 'users' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}
            `}
          >
            <Users size={16} /> Usuarios y Roles
          </button>
          <button 
            onClick={() => setActiveTab('audit')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2
              ${activeTab === 'audit' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}
            `}
          >
            <ShieldAlert size={16} /> Auditoría
          </button>
          <button 
            onClick={() => setActiveTab('system')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2
              ${activeTab === 'system' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}
            `}
          >
            <Activity size={16} /> Estado del Sistema
          </button>
        </nav>
      </div>

      {/* CONTENIDO: USUARIOS */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="Buscar usuarios por nombre o correo..." className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none shadow-sm" />
            </div>
            <button className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 shadow-sm flex items-center gap-2">
              <Filter size={16} /> Filtrar
            </button>
          </div>
          
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden min-h-[300px] flex flex-col">
            {users.length > 0 ? (
              <table className="w-full text-left text-[13px]">
                {/* ... Tabla de usuarios real ... */}
              </table>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                  <Inbox size={24} className="text-slate-300" />
                </div>
                <h3 className="text-sm font-medium text-slate-900">No hay usuarios registrados</h3>
                <p className="text-xs text-slate-500 mt-1">Invita a tu equipo para que colaboren en los proyectos de IA.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONTENIDO: AUDITORÍA */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden min-h-[300px] flex flex-col">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-slate-800">Registro de Eventos (Audit Trail)</h3>
          </div>
          {logs.length > 0 ? (
            <table className="w-full text-left text-[13px]">
              {/* ... Tabla de logs real ... */}
            </table>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                <Inbox size={24} className="text-slate-300" />
              </div>
              <h3 className="text-sm font-medium text-slate-900">No hay eventos de auditoría</h3>
              <p className="text-xs text-slate-500 mt-1">Las acciones de los usuarios (login, creación, aprobación) aparecerán aquí.</p>
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO: SISTEMA */}
      {activeTab === 'system' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
            <Server size={32} className="text-indigo-500 mb-3" />
            <h3 className="text-sm font-semibold text-slate-900">API Backend</h3>
            <p className="text-xs text-slate-500 mt-1 mb-3">FastAPI + Uvicorn</p>
            <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-bold">Esperando ping...</span>
          </div>
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
            <Database size={32} className="text-emerald-500 mb-3" />
            <h3 className="text-sm font-semibold text-slate-900">Base de Datos</h3>
            <p className="text-xs text-slate-500 mt-1 mb-3">PostgreSQL (Supabase)</p>
            <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-bold">Esperando ping...</span>
          </div>
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
            <Cpu size={32} className="text-amber-500 mb-3" />
            <h3 className="text-sm font-semibold text-slate-900">Workers ML</h3>
            <p className="text-xs text-slate-500 mt-1 mb-3">TensorFlow / Keras</p>
            <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-bold">0 / 0 Activos</span>
          </div>
        </div>
      )}

      {/* MODAL */}
      <InviteUserModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} />
    </div>
  );
}