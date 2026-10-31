import React, { useState } from 'react';
import { X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewProjectModal({ isOpen, onClose }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Aquí conectarás con tu API de FastAPI/Supabase en el futuro
    alert(`Proyecto "${name}" creado exitosamente (Simulación)`);
    setName('');
    setDescription('');
    onClose();
  };

  return (
    <>
      {/* Fondo oscuro traslúcido */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 transition-opacity" 
        onClick={onClose}
      ></div>
      
      {/* Ventana Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md pointer-events-auto animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center p-5 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Crear Nuevo Proyecto</h2>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Proyecto</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Predicción de Ventas"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
              <textarea 
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe el objetivo del proyecto..."
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none"
              ></textarea>
            </div>
            <div className="pt-2 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">
                Cancelar
              </button>
              <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
                Crear Proyecto
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}