import React, { useState } from 'react';
import { X, Mail, UserPlus } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function InviteUserModal({ isOpen, onClose }: Props) {
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    // Simulamos la llamada a la API de FastAPI para enviar la invitación (SendGrid, etc.)
    setTimeout(() => {
      setIsSending(false);
      alert("Invitación enviada exitosamente al correo.");
      onClose();
    }, 1500);
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 transition-opacity" onClick={onClose}></div>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md pointer-events-auto animate-in zoom-in-95 duration-200">
          
          <div className="flex justify-between items-center p-5 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <UserPlus size={20} className="text-indigo-600" /> Invitar Usuario
            </h2>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 rounded">
              <X size={20} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="email" 
                  required 
                  placeholder="correo@empresa.com" 
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm" 
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Rol en el Sistema</label>
              <select required className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white">
                <option value="AI_ENGINEER">Ingeniero de IA (Entrena modelos)</option>
                <option value="REVIEWER">Revisor (Solo lectura y aprobación)</option>
                <option value="PROJECT_MANAGER">Project Manager</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
            
            <div className="pt-4 flex justify-end gap-3 border-t border-slate-200 mt-6">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">
                Cancelar
              </button>
              <button type="submit" disabled={isSending} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                {isSending ? 'Enviando...' : 'Enviar Invitación'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}