import React, { useState } from 'react';
import { Plus, Search, Filter, MoreVertical, Inbox } from 'lucide-react';
import { TrainingJob } from '../types';
import NewTrainingModal from '../components/NewTrainingModal';
import JobMonitor from '../components/JobMonitor';

export default function TrainingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<TrainingJob | null>(null);
  
  // ESTADO VACÍO: Aquí conectarás tu API
  const [jobs] = useState<TrainingJob[]>([]);

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Entrenamientos</h1>
          <p className="text-sm text-slate-500 mt-1">Monitorea la cola de trabajos y el progreso en tiempo real.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-3.5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 shadow-sm transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={16} /> Nuevo Entrenamiento
        </button>
      </div>

      {/* BÚSQUEDA */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" placeholder="Buscar por ID o Proyecto..." className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none shadow-sm" />
        </div>
        <button className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 shadow-sm flex items-center justify-center gap-2">
          <Filter size={16} /> Estado
        </button>
      </div>

      {/* TABLA O VACÍO */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        {jobs.length > 0 ? (
          <table className="w-full text-left text-[13px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">ID del Job</th>
                <th className="px-6 py-3 font-medium">Proyecto / Arquitectura</th>
                <th className="px-6 py-3 font-medium">Estado</th>
                <th className="px-6 py-3 font-medium">Progreso</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobs.map((job) => (
                <tr 
                  key={job.id} 
                  onClick={() => setSelectedJob(job)}
                  className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-4 font-mono text-slate-600 font-medium">#{job.id}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{job.projectName}</div>
                    <div className="text-slate-500 text-xs">{job.architecture}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${job.status === 'RUNNING' ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'}`}></span>
                      <span className="font-medium text-slate-700 capitalize text-xs">{job.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-full bg-slate-100 rounded-full h-1.5 max-w-[100px]">
                        <div className={`h-1.5 rounded-full ${job.status === 'FAILED' ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${job.progress}%` }}></div>
                      </div>
                      <span className="text-xs text-slate-500 w-10">{job.progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors opacity-0 group-hover:opacity-100">Ver Monitor</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
              <Inbox size={32} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">No hay trabajos registrados</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">Inicia tu primer entrenamiento seleccionando una arquitectura y un dataset.</p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="mt-5 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
            >
              Crear primer entrenamiento
            </button>
          </div>
        )}
      </div>

      {/* MODALES Y PANELES */}
      <NewTrainingModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      
      {selectedJob && (
        <>
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity" onClick={() => setSelectedJob(null)}></div>
          <JobMonitor job={selectedJob} onClose={() => setSelectedJob(null)} />
        </>
      )}
    </div>
  );
}