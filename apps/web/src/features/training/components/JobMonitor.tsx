import React, { useEffect, useState } from 'react';
import { X, Terminal, Activity, Square } from 'lucide-react';
import { TrainingJob } from '../types';

interface Props {
  job: TrainingJob;
  onClose: () => void;
}

export default function JobMonitor({ job, onClose }: Props) {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    setLogs([
      `[INFO] Initializing job ${job.id}...`,
      `[INFO] Loading dataset...`,
      `[INFO] Compiling model: ${job.architecture}`,
      `[INFO] Starting training at epoch ${job.epoch}...`
    ]);

    if (job.status === 'RUNNING') {
      const interval = setInterval(() => {
        setLogs(prev => [
          ...prev, 
          `[EPOCH] Epoch ${prev.length - 2}: loss=${(Math.random() * 0.5).toFixed(4)} - accuracy=${(Math.random() * 0.9 + 0.1).toFixed(4)}`
        ]);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [job]);

  return (
    <div className="fixed inset-y-0 right-0 w-[500px] bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col animate-in slide-in-from-right duration-300">
      <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            Job {job.id} 
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${job.status === 'RUNNING' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {job.status}
            </span>
          </h2>
          <p className="text-xs text-slate-500">{job.projectName} • {job.architecture}</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-md text-slate-500 transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-px bg-slate-200 border-b border-slate-200">
        <div className="bg-white p-4 text-center">
          <p className="text-xs text-slate-500 mb-1">Época</p>
          <p className="text-lg font-bold text-slate-900">{job.epoch} <span className="text-sm font-normal text-slate-400">/ {job.totalEpochs}</span></p>
        </div>
        <div className="bg-white p-4 text-center">
          <p className="text-xs text-slate-500 mb-1">Pérdida</p>
          <p className="text-lg font-bold text-red-600">{job.loss}</p>
        </div>
        <div className="bg-white p-4 text-center">
          <p className="text-xs text-slate-500 mb-1">Precisión</p>
          <p className="text-lg font-bold text-emerald-600">{job.accuracy}</p>
        </div>
      </div>

      <div className="p-5 border-b border-slate-200">
        <div className="flex justify-between text-xs font-medium text-slate-500 mb-2">
          <span>Progreso del Entrenamiento</span>
          <span>{job.progress}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5">
          <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-1000" style={{ width: `${job.progress}%` }}></div>
        </div>
      </div>

      <div className="flex-1 bg-[#0f172a] p-4 overflow-y-auto font-mono text-[12px] leading-relaxed text-slate-300">
        <div className="flex items-center gap-2 text-slate-500 mb-4 pb-2 border-b border-slate-800">
          <Terminal size={14} /> <span>Live Output</span>
        </div>
        {logs.map((log, i) => (
          <div key={i} className="mb-1">
            <span className="text-indigo-400 mr-2">❯</span>
            <span className={log.includes('EPOCH') ? 'text-emerald-400' : 'text-slate-300'}>{log}</span>
          </div>
        ))}
        {job.status === 'RUNNING' && <div className="animate-pulse text-slate-500 mt-2">_</div>}
      </div>

      <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
        <button className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 flex items-center gap-2">
          <Square size={14} fill="currentColor" /> Detener Entrenamiento
        </button>
      </div>
    </div>
  );
}