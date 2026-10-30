import React, { useState } from 'react';
import { Search, Filter, Package, ShieldCheck, Clock, Layers } from 'lucide-react';
import { ModelVersion } from '../types';
import ModelDetailsPanel from '../components/ModelDetailsPanel';

const mockModels: ModelVersion[] = [
  {
    id: 'm-001',
    name: 'Clasificador de Neumonía',
    version: 'v2.1.0',
    projectName: 'Clasificación Imágenes Médicas',
    architecture: 'CNN (ResNet50)',
    status: 'APPROVED',
    accuracy: '98.5%',
    size: '95.4 MB',
    format: 'SavedModel',
    createdAt: '2026-10-28',
    createdBy: 'David Admin',
    checksum: 'a3f5c891b2e4d6a7f8e9c0b1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1'
  },
  {
    id: 'm-002',
    name: 'Predictor de Ventas',
    version: 'v1.0.0',
    projectName: 'Predicción Ventas Q4',
    architecture: 'Feedforward (MLP)',
    status: 'REVIEW',
    accuracy: '89.1%',
    size: '12.1 MB',
    format: 'H5',
    createdAt: '2026-10-27',
    createdBy: 'David Admin',
    checksum: 'b4e6d902c3f5e7b8a9f0d1c2e3f4b5a6c7d8e9f0b1c2d3e4f5a6b7c8d9e0f1a2'
  },
  {
    id: 'm-003',
    name: 'Detector de Fraude',
    version: 'v0.9.0-beta',
    projectName: 'Detección Fraude',
    architecture: 'RNN (LSTM)',
    status: 'DRAFT',
    accuracy: '82.3%',
    size: '45.8 MB',
    format: 'ONNX',
    createdAt: '2026-10-25',
    createdBy: 'Ana Torres',
    checksum: 'c5f7e013d4a6f8c9b0a1e2d3f4c5b6a7d8e9f0c1b2a3d4e5f6c7b8a9d0f1e2b3'
  },
  {
    id: 'm-004',
    name: 'Generador de Campañas',
    version: 'v1.2.0',
    projectName: 'Generación Textos',
    architecture: 'GAN',
    status: 'RETIRED',
    accuracy: 'N/A',
    size: '210.5 MB',
    format: 'SavedModel',
    createdAt: '2026-09-10',
    createdBy: 'Carlos Ruiz',
    checksum: 'd6a8f124e5b7a9d0c1b2f3e4d5c6b7a8e9f0d1c2b3a4e5f6d7c8b9a0e1f2d3c4'
  }
];

export default function ModelRegistryPage() {
  const [selectedModel, setSelectedModel] = useState<ModelVersion | null>(null);

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Registro de Modelos</h1>
          <p className="text-sm text-slate-500 mt-1">Gestiona versiones inmutables y el ciclo de vida de tus artefactos de IA.</p>
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Buscar modelos por nombre, proyecto o versión..." 
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
          />
        </div>
        <button className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 shadow-sm flex items-center justify-center gap-2">
          <Filter size={16} /> Filtrar Estado
        </button>
      </div>

      {/* TABLA DE MODELOS */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
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
            {mockModels.map((model) => (
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
                <td className="px-6 py-4 font-mono text-slate-600 font-medium text-xs">
                  {model.version}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 text-slate-600 text-xs">
                    <Layers size={14} className="text-slate-400" />
                    {model.architecture}
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
                    {model.status === 'APPROVED' ? 'Aprobado' : 
                     model.status === 'DRAFT' ? 'Borrador' : 
                     model.status === 'REVIEW' ? 'En Revisión' : 'Retirado'}
                  </span>
                </td>
                <td className="px-6 py-4 font-mono text-xs text-slate-700">
                  {model.accuracy}
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors opacity-0 group-hover:opacity-100">
                    Ver Detalles
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PANEL LATERAL (Drawer) */}
      {selectedModel && (
        <>
          <div 
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity" 
            onClick={() => setSelectedModel(null)}
          ></div>
          <ModelDetailsPanel model={selectedModel} onClose={() => setSelectedModel(null)} />
        </>
      )}

    </div>
  );
}