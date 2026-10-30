import React from 'react';
import { 
  FolderKanban, PlayCircle, Package, Cpu, ArrowUpRight, ArrowDownRight, 
  MoreVertical, ExternalLink, Activity, Server, Database, Box, Plus
} from 'lucide-react';

const kpis = [
  { title: 'Proyectos Activos', value: '12', trend: '+2', isPositive: true, icon: FolderKanban, color: 'text-blue-600', bg: 'bg-blue-50' },
  { title: 'Entrenamientos', value: '3', trend: '+1', isPositive: true, icon: PlayCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
  { title: 'Modelos Aprobados', value: '45', trend: '+5', isPositive: true, icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { title: 'Uso de Clúster', value: '68%', trend: '-10%', isPositive: false, icon: Cpu, color: 'text-indigo-600', bg: 'bg-indigo-50' },
];

const recentJobs = [
  { id: '#1042', project: 'Predicción Ventas Q4', arch: 'Feedforward', status: 'RUNNING', epoch: '45/100', progress: 45, time: 'Hace 2 min' },
  { id: '#1041', project: 'Clasificación Imágenes', arch: 'CNN', status: 'COMPLETED', epoch: '100/100', progress: 100, time: 'Hace 1 hora' },
  { id: '#1040', project: 'Detección Fraude', arch: 'RNN', status: 'FAILED', epoch: '12/50', progress: 24, time: 'Hace 3 horas' },
  { id: '#1039', project: 'Generación Textos', arch: 'GAN', status: 'QUEUED', epoch: '0/200', progress: 0, time: 'Hace 5 horas' },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      
      {/* HEADER DEL DASHBOARD */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Overview</h1>
          <p className="text-sm text-slate-500 mt-1">Monitorea el rendimiento de tus modelos y la infraestructura.</p>
        </div>
        <div className="flex gap-2">
          {/* Botón reemplazado */}
          <button className="px-3.5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 shadow-sm transition-colors flex items-center gap-2">
            <Plus size={16} /> Nuevo Proyecto
          </button>
        </div>
      </div>

      {/* TARJETAS KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[13px] font-medium text-slate-500">{kpi.title}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{kpi.value}</p>
                </div>
                <div className={`p-2 rounded-md ${kpi.bg} ${kpi.color}`}>
                  <Icon size={18} />
                </div>
              </div>
              <div className="mt-4 flex items-center text-[13px]">
                <span className={`flex items-center font-medium ${kpi.isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                  {kpi.isPositive ? <ArrowUpRight size={14} className="mr-1"/> : <ArrowDownRight size={14} className="mr-1"/>}
                  {kpi.trend}
                </span>
                <span className="text-slate-400 ml-1.5">vs semana anterior</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* SECCIÓN INFERIOR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* TABLA DE ENTRENAMIENTOS */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-[15px] font-semibold text-slate-900">Trabajos Recientes</h2>
            <a href="/training" className="text-[13px] text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
              Ver todo <ExternalLink size={12} />
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 font-medium">Trabajo</th>
                  <th className="px-5 py-3 font-medium">Arquitectura</th>
                  <th className="px-5 py-3 font-medium">Estado</th>
                  <th className="px-5 py-3 font-medium">Progreso</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-900">{job.project}</div>
                      <div className="text-slate-500 text-xs flex items-center gap-2 mt-0.5">
                        <span>{job.id}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span>{job.time}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="border border-slate-200 text-slate-600 px-2 py-0.5 rounded text-[11px] font-medium bg-white">
                        {job.arch}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full
                          ${job.status === 'RUNNING' ? 'bg-amber-500' : ''}
                          ${job.status === 'COMPLETED' ? 'bg-emerald-500' : ''}
                          ${job.status === 'FAILED' ? 'bg-red-500' : ''}
                          ${job.status === 'QUEUED' ? 'bg-slate-400' : ''}
                        `}></span>
                        <span className="font-medium text-slate-700 capitalize">
                          {job.status.toLowerCase()}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-full bg-slate-100 rounded-full h-1.5 max-w-[80px]">
                          <div 
                            className={`h-1.5 rounded-full ${job.status === 'FAILED' ? 'bg-red-500' : 'bg-indigo-500'}`} 
                            style={{ width: `${job.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-slate-500 w-10">{job.epoch}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button className="p-1 text-slate-400 hover:text-slate-700 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* PANEL DE INFRAESTRUCTURA (Estilo Terminal) */}
        <div className="bg-[#0f172a] rounded-lg shadow-sm border border-slate-800 flex flex-col overflow-hidden text-slate-300">
          <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center bg-[#0b1120]">
            <h2 className="text-[14px] font-medium text-white flex items-center gap-2">
              <Activity size={16} className="text-indigo-400" /> System Health
            </h2>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">Operational</span>
          </div>
          
          <div className="p-5 flex-1 font-mono text-[12px] space-y-4">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server size={14} className="text-slate-500" />
                <span>API Gateway</span>
              </div>
              <span className="text-slate-400">12ms</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database size={14} className="text-slate-500" />
                <span>PostgreSQL</span>
              </div>
              <span className="text-slate-400">5ms</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Box size={14} className="text-slate-500" />
                <span>Object Storage</span>
              </div>
              <span className="text-slate-400">45GB / 1TB</span>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <div className="flex justify-between text-slate-400 mb-2">
                <span>ML Workers</span>
                <span className="text-amber-400">2 / 3 Online</span>
              </div>
              <div className="flex gap-1">
                <div className="h-1.5 flex-1 bg-emerald-500 rounded-sm"></div>
                <div className="h-1.5 flex-1 bg-emerald-500 rounded-sm"></div>
                <div className="h-1.5 flex-1 bg-slate-700 rounded-sm"></div>
              </div>
            </div>

             <div className="pt-2">
              <div className="flex justify-between text-slate-400 mb-2">
                <span>Queue (Jobs)</span>
                <span className="text-indigo-400">2 pending</span>
              </div>
              <div className="flex gap-1">
                <div className="h-1.5 w-full bg-indigo-500 rounded-sm"></div>
                <div className="h-1.5 w-full bg-indigo-500 rounded-sm"></div>
                <div className="h-1.5 w-full bg-slate-800 rounded-sm"></div>
                <div className="h-1.5 w-full bg-slate-800 rounded-sm"></div>
              </div>
            </div>

          </div>
          <div className="p-3 bg-[#0b1120] border-t border-slate-800 text-center">
            <button className="text-[12px] text-slate-400 hover:text-white transition-colors">
              Ir al panel de administración &rarr;
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}