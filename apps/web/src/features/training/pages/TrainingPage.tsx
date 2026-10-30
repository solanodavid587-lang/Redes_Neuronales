import React, { useState } from 'react';
import { PlayCircle, Plus, Search, Filter, MoreVertical } from 'lucide-react';
import { TrainingJob } from '../types';
import JobMonitor from '../components/JobMonitor';

const mockJobs: TrainingJob[] = [
  { id: '1042', projectName: 'Predicción Ventas Q4', architecture: 'Feedforward', status: 'RUNNING', progress: 45, epoch: 45, totalEpochs: 100, loss: '0.3421', accuracy: '0.8912', startedAt: 'Hace 2 min' },
  { id: '1041', projectName: 'Clasificación Imágenes', architecture: 'CNN', status: 'COMPLETED', progress: 100, epoch: 100, totalEpochs: 100, loss: '0.1204', accuracy: '0.9850', startedAt: 'Hace 1 hora' },
  { id: '1040', projectName: 'Detección Fraude', architecture: 'RNN', status: 'FAILED', progress: 24, epoch: 12, totalEpochs: 50, loss: 'N/A', accuracy: 'N/A', startedAt: 'Hace 3 horas' },
  { id: '1039', projectName: 'Generación Textos', architecture: 'GAN', status: 'QUEUED', progress: 0, epoch: 0, totalEpochs: 200, loss: '-', accuracy: '-', startedAt: 'Hace 5 horas' },
];

export default function TrainingPage() {
  const [selectedJob, setSelectedJob] = useState<TrainingJob | null>(null);

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Entrenamientos</h1>
          <p className="text-sm text-slate-500 mt-1">Monitorea la cola de trabajos y el progreso en tiempo real.</p>
        </div>
        <button className="px-3.5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 shadow-sm transition-colors flex items-center justify-center gap-2">
          <Plus size={16} /> Nuevo Entrenamiento
        </button>
      </div>

      {/* BARRA DE BÚSQUEDA */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Buscar por ID o Proyecto..." 
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
          />
        </div>
        <button className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 shadow-sm flex items-center justify-center gap-2">
          <Filter size={16} /> Estado
        </button>
      </div>

      {/* TABLA DE ENTRENAMIENTOS */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
            <tr>
              <th className="px-6 py-3 font-medium">ID del Job</th>
              <th className="px-6 py-3 font-medium">Proyecto / Arquitectura</th>
              <th className="px-6 py-3 font-medium">Estado</th>
              <th className="px-6 py-3 font-medium">Progreso</th>
              <th className="px-6 py-3 font-medium">Última Métrica</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {mockJobs.map((job) => (
              <tr 
                key={job.id} 
                onClick={() => setSelectedJob(job)}
                className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
              >
                <td className="px-6 py-4 font-mono text-slate-600 font-medium">
                  #{job.id}
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-900">{job.projectName}</div>
                  <div className="text-slate-500 text-xs">{job.architecture}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full
                      ${job.status === 'RUNNING' ? 'bg-amber-500 animate-pulse' : ''}
                      ${job.status === 'COMPLETED' ? 'bg-emerald-500' : ''}
                      ${job.status === 'FAILED' ? 'bg-red-500' : ''}
                      ${job.status === 'QUEUED' ? 'bg-slate-400' : ''}
                    `}></span>
                    <span className="font-medium text-slate-700 capitalize text-xs">
                      {job.status === 'RUNNING' ? 'Ejecutando' : 
                       job.status === 'COMPLETED' ? 'Completado' : 
                       job.status === 'FAILED' ? 'Fallido' : 'En Cola'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-full bg-slate-100 rounded-full h-1.5 max-w-[100px]">
                      <div 
                        className={`h-1.5 rounded-full ${job.status === 'FAILED' ? 'bg-red-500' : 'bg-indigo-500'}`} 
                        style={{ width: `${job.progress}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-slate-500 w-12 text-right">{job.progress}%</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {job.status !== 'QUEUED' ? (
                    <div className="flex flex-col gap-0.5 font-mono text-xs">
                      <span className="text-slate-500">Loss: <span className="text-red-600">{job.loss}</span></span>
                      <span className="text-slate-500">Acc: <span className="text-emerald-600">{job.accuracy}</span></span>
                    </div>
                  ) : (
                    <span className="text-slate-400 text-xs italic">Esperando...</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors opacity-0 group-hover:opacity-100">
                    Ver Monitor
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PANEL LATERAL (Drawer) */}
      {selectedJob && (
        <>
          {/* Fondo oscuro traslúcido */}
          <div 
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity" 
            onClick={() => setSelectedJob(null)}
          ></div>
          <JobMonitor job={selectedJob} onClose={() => setSelectedJob(null)} />
        </>
      )}

    </div>
  );
}