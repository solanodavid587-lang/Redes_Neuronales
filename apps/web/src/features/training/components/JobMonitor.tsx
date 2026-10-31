import { useEffect, useState } from 'react';
import { Activity, X } from 'lucide-react';
import type { TrainingJob } from '../types';
import { api, errorMessage } from '../../../lib/api';

interface Props {
  job: TrainingJob;
  onClose: () => void;
}

interface Metric {
  epoch: number;
  trainLoss: number;
  valLoss: number;
  trainAcc: number;
  valAcc: number;
}

export default function JobMonitor({ job, onClose }: Props) {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get<{ items: Metric[] }>(`/training-jobs/${job.id}/metrics`)
      .then(result => { if (active) setMetrics(result.items); })
      .catch(requestError => { if (active) setError(errorMessage(requestError)); });
    return () => { active = false; };
  }, [job.id, job.epoch]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <aside role="dialog" aria-modal="true" aria-labelledby="job-monitor-title" className="flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="min-w-0">
            <h2 id="job-monitor-title" className="flex items-center gap-2 text-sm font-semibold text-slate-900">Trabajo #{job.id}
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-700">{job.status}</span>
            </h2>
            <p className="mt-1 truncate text-xs text-slate-500">{job.projectName} · {job.architecture}</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar monitor" className="rounded p-2 text-slate-500 hover:bg-slate-200"><X size={18} /></button>
        </header>
        <div className="grid grid-cols-3 gap-px border-b border-slate-200 bg-slate-200">
          <div className="bg-white p-4 text-center"><p className="text-xs text-slate-500">Época</p><p className="mt-1 font-bold">{job.epoch}<span className="font-normal text-slate-400"> / {job.totalEpochs}</span></p></div>
          <div className="bg-white p-4 text-center"><p className="text-xs text-slate-500">Pérdida</p><p className="mt-1 font-bold text-red-600">{job.loss}</p></div>
          <div className="bg-white p-4 text-center"><p className="text-xs text-slate-500">Precisión</p><p className="mt-1 font-bold text-emerald-600">{job.accuracy}</p></div>
        </div>
        <div className="border-b border-slate-200 p-5">
          <div className="mb-2 flex justify-between text-xs font-medium text-slate-500"><span>Progreso reportado</span><span>{job.progress}%</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${Math.min(job.progress, 100)}%` }} /></div>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800"><Activity size={16} className="text-indigo-600" /> Métricas por época</h3>
          {error ? <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p> : metrics.length ? (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500"><tr><th className="p-3">Época</th><th className="p-3">Train loss</th><th className="p-3">Val loss</th><th className="p-3">Train acc</th><th className="p-3">Val acc</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{metrics.map(metric => <tr key={metric.epoch}><td className="p-3 font-medium">{metric.epoch}</td><td className="p-3">{metric.trainLoss.toFixed(4)}</td><td className="p-3">{metric.valLoss.toFixed(4)}</td><td className="p-3">{(metric.trainAcc * 100).toFixed(1)}%</td><td className="p-3">{(metric.valAcc * 100).toFixed(1)}%</td></tr>)}</tbody>
              </table>
            </div>
          ) : <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">El worker aún no ha enviado métricas para este trabajo.</p>}
        </div>
        <footer className="border-t border-slate-200 bg-slate-50 p-4 text-right">
          <button onClick={onClose} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100">Cerrar</button>
        </footer>
      </aside>
    </div>
  );
}
