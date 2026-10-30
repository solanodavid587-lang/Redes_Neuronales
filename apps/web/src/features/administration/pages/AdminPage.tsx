import React, { useState } from 'react';
import { 
  Users, ShieldAlert, Activity, Search, Plus, Filter, 
  MoreVertical, Shield, UserCheck, UserX, Server, Database, Cpu
} from 'lucide-react';
import { User, AuditLog } from '../types';

// Datos Mock de Usuarios
const mockUsers: User[] = [
  { id: 'u1', name: 'David Admin', email: 'david@neurolab.ai', role: 'ADMIN', status: 'ACTIVE', lastLogin: 'Hace 5 min' },
  { id: 'u2', name: 'Ana Torres', email: 'ana.t@neurolab.ai', role: 'AI_ENGINEER', status: 'ACTIVE', lastLogin: 'Hace 2 horas' },
  { id: 'u3', name: 'Carlos Ruiz', email: 'carlos.r@neurolab.ai', role: 'PROJECT_MANAGER', status: 'ACTIVE', lastLogin: 'Ayer' },
  { id: 'u4', name: 'Maria Gomez', email: 'maria.g@neurolab.ai', role: 'REVIEWER', status: 'INACTIVE', lastLogin: 'Hace 1 semana' },
];

// Datos Mock de Auditoría
const mockLogs: AuditLog[] = [
  { id: 'l1', action: 'model.approved', actor: 'Ana Torres', target: 'Clasificador Neumonía v2.1', ip: '192.168.1.45', timestamp: '10:45 AM' },
  { id: 'l2', action: 'training.started', actor: 'David Admin', target: 'Job #1042', ip: '192.168.1.10', timestamp: '10:30 AM' },
  { id: 'l3', action: 'project.created', actor: 'Carlos Ruiz', target: 'Predicción Ventas Q4', ip: '10.0.0.12', timestamp: '09:15 AM' },
  { id: 'l4', action: 'user.login_failed', actor: 'Desconocido', target: 'admin@neurolab.ai', ip: '45.33.22.1', timestamp: '08:00 AM' },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'system'>('users');

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Administración</h1>
          <p className="text-sm text-slate-500 mt-1">Gestiona usuarios, permisos y revisa la salud del sistema.</p>
        </div>
        {activeTab === 'users' && (
          <button className="px-3.5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 shadow-sm transition-colors flex items-center justify-center gap-2">
            <Plus size={16} /> Invitar Usuario
          </button>
        )}
      </div>

      {/* TABS DE NAVEGACIÓN */}
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
              <input type="text" placeholder="Buscar usuarios..." className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none shadow-sm" />
            </div>
            <button className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 shadow-sm flex items-center gap-2">
              <Filter size={16} /> Filtrar
            </button>
          </div>
          
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-medium">Usuario</th>
                  <th className="px-6 py-3 font-medium">Rol</th>
                  <th className="px-6 py-3 font-medium">Estado</th>
                  <th className="px-6 py-3 font-medium">Último Acceso</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mockUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{user.name}</div>
                          <div className="text-slate-500 text-xs">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                        <Shield size={14} className="text-slate-400" />
                        {user.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium
                        ${user.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : ''}
                        ${user.status === 'INACTIVE' ? 'bg-slate-100 text-slate-600 border border-slate-200' : ''}
                      `}>
                        {user.status === 'ACTIVE' ? <UserCheck size={12} /> : <UserX size={12} />}
                        {user.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{user.lastLogin}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-1 text-slate-400 hover:text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity"><MoreVertical size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTENIDO: AUDITORÍA */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-slate-800">Registro de Eventos (Audit Trail)</h3>
            <span className="text-xs text-slate-500">Mostrando últimos 30 días</span>
          </div>
          <table className="w-full text-left text-[13px]">
            <thead className="bg-white border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">Acción</th>
                <th className="px-6 py-3 font-medium">Actor</th>
                <th className="px-6 py-3 font-medium">Recurso Afectado</th>
                <th className="px-6 py-3 font-medium">IP</th>
                <th className="px-6 py-3 font-medium">Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[12px]">
              {mockLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded font-bold
                      ${log.action.includes('approved') ? 'text-emerald-600 bg-emerald-50' : ''}
                      ${log.action.includes('started') ? 'text-blue-600 bg-blue-50' : ''}
                      ${log.action.includes('created') ? 'text-indigo-600 bg-indigo-50' : ''}
                      ${log.action.includes('failed') ? 'text-red-600 bg-red-50' : ''}
                    `}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-3 font-medium text-slate-800">{log.actor}</td>
                  <td className="px-6 py-3 text-slate-600">{log.target}</td>
                  <td className="px-6 py-3 text-slate-400">{log.ip}</td>
                  <td className="px-6 py-3 text-slate-500">{log.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CONTENIDO: SISTEMA */}
      {activeTab === 'system' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
            <Server size={32} className="text-indigo-500 mb-3" />
            <h3 className="text-sm font-semibold text-slate-900">API Backend</h3>
            <p className="text-xs text-slate-500 mt-1 mb-3">FastAPI + Uvicorn</p>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">12ms Latencia</span>
          </div>
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
            <Database size={32} className="text-emerald-500 mb-3" />
            <h3 className="text-sm font-semibold text-slate-900">Base de Datos</h3>
            <p className="text-xs text-slate-500 mt-1 mb-3">PostgreSQL 15</p>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">4ms Latencia</span>
          </div>
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
            <Cpu size={32} className="text-amber-500 mb-3" />
            <h3 className="text-sm font-semibold text-slate-900">Workers ML</h3>
            <p className="text-xs text-slate-500 mt-1 mb-3">TensorFlow / Keras</p>
            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">2/3 Activos</span>
          </div>
        </div>
      )}

    </div>
  );
}