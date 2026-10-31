import React, { useState, useRef } from 'react';
import { X, UploadCloud, File, CheckCircle2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function UploadDatasetModal({ isOpen, onClose }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = () => {
    if (!file) return;
    setIsUploading(true);
    
    // Simulamos la subida a MinIO/S3 y la inserción en Supabase
    setTimeout(() => {
      setIsUploading(false);
      alert(`Archivo "${file.name}" subido y registrado exitosamente.`);
      setFile(null);
      onClose();
    }, 2000);
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 transition-opacity" onClick={onClose}></div>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg pointer-events-auto animate-in zoom-in-95 duration-200">
          
          <div className="flex justify-between items-center p-5 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Subir Nuevo Dataset</h2>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <div className="p-6 space-y-5">
            {/* DRAG & DROP ZONE */}
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center
                ${isDragging ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'}
                ${file ? 'bg-slate-50 border-emerald-300' : ''}
              `}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".csv,.json,.zip,.txt"
                onChange={(e) => { if (e.target.files) setFile(e.target.files[0]) }}
              />
              
              {file ? (
                <>
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                    <File size={24} />
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{file.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-3">
                    <UploadCloud size={24} />
                  </div>
                  <p className="text-sm font-medium text-slate-700">Haz clic o arrastra un archivo aquí</p>
                  <p className="text-xs text-slate-500 mt-1">Soporta CSV, JSON, ZIP (Imágenes) o TXT. Máx 2GB.</p>
                </>
              )}
            </div>

            {/* OPCIONES EXTRA (Si hay archivo) */}
            {file && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">División Train %</label>
                  <input type="number" defaultValue={80} min={1} max={99} className="w-full text-sm border border-slate-300 rounded px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">División Val %</label>
                  <input type="number" defaultValue={20} min={1} max={99} disabled className="w-full text-sm bg-slate-100 border border-slate-200 rounded px-3 py-2 text-slate-500" />
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 rounded-b-xl">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">
              Cancelar
            </button>
            <button 
              onClick={handleUpload} 
              disabled={!file || isUploading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isUploading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Subiendo...</>
              ) : (
                <><CheckCircle2 size={16} /> Confirmar Subida</>
              )}
            </button>
          </div>

        </div>
      </div>
    </>
  );
}