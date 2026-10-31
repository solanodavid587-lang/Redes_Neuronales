import React from 'react';
import { X, Package, Download, ShieldCheck, Box, Clock, User, Fingerprint } from 'lucide-react';
import { ModelVersion } from '../types';

interface Props {
  model: ModelVersion;
  onClose: () => void;
}

export default function ModelDetailsPanel({ model, onClose }: Props) {
  // Simula la descarga del archivo del modelo
  const handleDownload = () => {
    // En un entorno real, aquí harías un fetch a Supabase Storage o S3
    // Ejemplo: window.open(model.downloadUrl, '_blank');
    
    // Simulamos la creación de un archivo falso para que el navegador lo descargue
    const blob = new Blob(["Contenido simulado del modelo TensorFlow"], { type: 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${model.name}_${model.version}.${model.format.toLowerCase() === 'h5' ? 'h5' : 'zip'}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[450px] bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col animate-in slide-in-from-right duration-300">
      {/* HEADER */}
      <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
            <Package size={20} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{model.name} <span className="text-xs font-normal text-slate-500">({model.version})</span></h2>
            <p className="text-xs text-slate-500">{model.projectName}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-md text-slate-500 transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="p-6 flex-1 overflow-y-auto space-y-6">
        
        {/* ESTADO */}
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Estado del Ciclo de Vida</h3>
          <div className={`p-3 rounded-lg border flex items-center gap-3
            ${model.status === 'APPROVED' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : ''}
            ${model.status === 'DRAFT' ? 'bg-slate-50 border-slate-200 text-slate-700' : ''}
            ${model.status === 'REVIEW' ? 'bg-amber-50 border-amber-200 text-amber-800' : ''}
            ${model.status === 'RETIRED' ? 'bg-red-50 border-red-200 text-red-800' : ''}
          `}>
            <ShieldCheck size={20} />
            <div>
              <p className="text-sm font-semibold">
                {model.status === 'APPROVED' ? 'Aprobado para Producción' : 
                 model.status === 'DRAFT' ? 'Borrador' : 
                 model.status === 'REVIEW' ? 'En Revisión' : 'Retirado'}
              </p>
              <p className="text-xs opacity-80">
                {model.status === 'APPROVED' ? 'Listo para ser desplegado vía API.' : 'Requiere aprobación del equipo de MLOps.'}
              </p>
            </div>
          </div>
        </div>

        {/* METADATOS CLAVE */}
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Metadatos del Artefacto</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-2"><Box size={14}/> Arquitectura</span>
              <span className="font-medium text-slate-800">{model.architecture}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-2"><Fingerprint size={14}/> Formato</span>
              <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">{model.format}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-2"><ShieldCheck size={14}/> Accuracy</span>
              <span className="font-bold text-emerald-600">{model.accuracy}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-2"><Clock size={14}/> Tamaño</span>
              <span className="font-medium text-slate-800">{model.size}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-2"><User size={14}/> Autor</span>
              <span className="font-medium text-slate-800">{model.createdBy}</span>
            </div>
          </div>
        </div>

        {/* CHECKSUM */}
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Trazabilidad (Checksum)</h3>
          <div className="bg-slate-900 p-3 rounded-lg font-mono text-[11px] text-emerald-400 break-all leading-relaxed">
            SHA256: {model.checksum}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Este hash garantiza que el archivo no ha sido alterado desde su entrenamiento.</p>
        </div>
      </div>

      {/* ACCIONES */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-3">
        <button 
          onClick={handleDownload}
          className="flex-1 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 shadow-sm flex items-center justify-center gap-2"
        >
          <Download size={16} /> Descargar Modelo
        </button>
      </div>
    </div>
  );
}