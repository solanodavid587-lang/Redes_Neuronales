import React, { useState } from 'react';
import { Search, Filter, Package, ShieldCheck, Clock, Layers, Inbox } from 'lucide-react';
import { ModelVersion } from '../types';
import ModelDetailsPanel from '../components/ModelDetailsPanel';

export default function ModelRegistryPage() {
  const [selectedModel, setSelectedModel] = useState<ModelVersion | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // ESTADO VACÍO: Aquí conectarás tu API de Supabase
  const [models] = useState<ModelVersion[]>([]);

  const filteredModels = models.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.projectName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Registro de Modelos</h1>
          <p className="text-sm text-slate-500 mt-1">Gestiona versiones inmutables y el ciclo de vida de tus artefactos de IA.</p>
        </div>
      </div>

      {/* BÚSQUEDA Y FILTROS */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Buscar modelos por nombre, proyecto o versión..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 outline-none shadow-sm"
          />
        </div>
        <button className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 shadow-sm flex items-center justify-center gap-2">
          <Filter size={16} /> Filtrar Estado
        </button>
      </div>

      {/* TABLA O VACÍO */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        {filteredModels.length > 0 ? (
          <table className="w-full text-left text-[13px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">Modelo</th>
                <th className="px-6 py-3 font-medium">Versión</th>
                <th className="px-6 py-3 font-medium">Arquitectura</th>
                <th className="px-6 py-3 font-medium">Estado</th>
                <th className="px-6 py-3 font-medium">Accuracy</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredModels.map((model) => (
                <tr 
                  key={model.id} 
                  onClick={() => setSelectedModel(model)}
                  className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 rounded-md text-slate-600">
                        <Package size={18} />
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{model.name}</div>
                        <div className="text-slate-500 text-xs">{model.projectName}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-600 font-medium text-xs">{model.version}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-slate-600 text-xs">
                      <Layers size={14} className="text-slate-400" /> {model.architecture}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium
                      ${model.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : ''}
                      ${model.status === 'DRAFT' ? 'bg-slate-100 text-slate-700' : ''}
                      ${model.status === 'REVIEW' ? 'bg-amber-100 text-amber-700' : ''}
                      ${model.status === 'RETIRED' ? 'bg-red-100 text-red-700' : ''}
                    `}>
                      {model.status === 'APPROVED' && <ShieldCheck size={12} />}
                      {model.status === 'REVIEW' && <Clock size={12} />}
                      {model.status === 'APPROVED' ? 'Aprobado' : model.status === 'DRAFT' ? 'Borrador' : model.status === 'REVIEW' ? 'En Revisión' : 'Retirado'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-700">{model.accuracy}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors opacity-0 group-hover:opacity-100">Ver Detalles</button>
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
            <h3 className="text-lg font-semibold text-slate-900">No hay modelos registrados</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">Los modelos aprobados en el módulo de evaluación aparecerán automáticamente aquí.</p>
          </div>
        )}
      </div>

      {/* PANEL LATERAL (Drawer) */}
      {selectedModel && (
        <>
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity" onClick={() => setSelectedModel(null)}></div>
          <ModelDetailsPanel model={selectedModel} onClose={() => setSelectedModel(null)} />
        </>
      )}
    </div>
  );
}