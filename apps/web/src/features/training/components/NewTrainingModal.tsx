import React, { useState } from 'react';
import { X, PlayCircle, Server, Database, BrainCircuit } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewTrainingModal({ isOpen, onClose }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulamos el envío del job a la cola de FastAPI
    setTimeout(() => {
      setIsSubmitting(false);
      alert("Trabajo de entrenamiento encolado exitosamente.");
      onClose();
    }, 1500);
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 transition-opacity" onClick={onClose}></div>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl pointer-events-auto animate-in zoom-in-95 duration-200">
          
          <div className="flex justify-between items-center p-5 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <PlayCircle className="text-indigo-600" size={20} /> Nuevo Entrenamiento
            </h2>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 rounded">
              <X size={20} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            
            {/* SELECCIÓN DE RECURSOS */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                  <BrainCircuit size={14} className="text-slate-400" /> Arquitectura
                </label>
                <select required className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">Selecciona una arquitectura...</option>
                  <option value="1">Feedforward - Predicción Ventas (v1)</option>
                  <option value="2">CNN - Clasificación Imágenes (v2)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                  <Database size={14} className="text-slate-400" /> Dataset
                </label>
                <select required className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">Selecciona un dataset...</option>
                  <option value="1">ventas_historicas_2026.csv</option>
                  <option value="2">radiografias_torax.zip</option>
                </select>
              </div>
            </div>

            <div className="h-px w-full bg-slate-100 my-2"></div>

            {/* HIPERPARÁMETROS */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Épocas (Epochs)</label>
                <input type="number" defaultValue={100} min={1} className="w-full text-sm font-mono border border-slate-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Batch Size</label>
                <select className="w-full text-sm font-mono border border-slate-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="32">32</option>
                  <option value="64">64</option>
                  <option value="128">128</option>
                  <option value="256">256</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Optimizador</label>
                <select className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="adam">Adam</option>
                  <option value="sgd">SGD</option>
                  <option value="rmsprop">RMSprop</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Learning Rate</label>
                <input type="text" defaultValue="0.001" className="w-full text-sm font-mono border border-slate-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg flex items-start gap-3 mt-4">
              <Server size={18} className="text-indigo-600 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-indigo-900">Cola de Entrenamiento</p>
                <p className="text-[11px] text-indigo-700 mt-0.5">El job se enviará a los workers de TensorFlow. El progreso se verá reflejado en tiempo real.</p>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-200">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">
                Cancelar
              </button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                {isSubmitting ? 'Encolando...' : 'Iniciar Entrenamiento'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}