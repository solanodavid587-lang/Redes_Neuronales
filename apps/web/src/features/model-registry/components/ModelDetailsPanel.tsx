import { useState } from 'react';
import { Box, Clock, Fingerprint, Package, ShieldCheck, User, X } from 'lucide-react';
import type { ModelStatus, ModelVersion } from '../types';
import { InlineNotice } from '../../../components/ui/Feedback';

interface Props {
  model: ModelVersion;
  onClose: () => void;
  onStatusChange: (status: ModelStatus) => Promise<void>;
  error: string;
}

const nextStatuses: Record<ModelStatus, ModelStatus[]> = {
  DRAFT: ['REVIEW', 'RETIRED'],
  REVIEW: ['APPROVED', 'DRAFT', 'RETIRED'],
  APPROVED: ['RETIRED'],
  RETIRED: [],
};

const statusNames: Record<ModelStatus, string> = {
  DRAFT: 'Borrador',
  REVIEW: 'En revisión',
  APPROVED: 'Aprobado',
  RETIRED: 'Retirado',
};

export default function ModelDetailsPanel({ model, onClose, onStatusChange, error }: Props) {
  const [updating, setUpdating] = useState(false);

  async function changeStatus(status: ModelStatus) {
    setUpdating(true);
    try {
      await onStatusChange(status);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <aside role="dialog" aria-modal="true" aria-labelledby="model-details-title" className="flex h-full w-full max-w-[450px] flex-col border-l border-slate-200 bg-white shadow-2xl">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-slate-50 px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-lg bg-indigo-100 p-2 text-indigo-600"><Package size={20} /></div>
            <div className="min-w-0"><h2 id="model-details-title" className="truncate text-sm font-semibold text-slate-900">{model.name} <span className="font-normal text-slate-500">({model.version})</span></h2><p className="truncate text-xs text-slate-500">{model.projectName}</p></div>
          </div>
          <button onClick={onClose} aria-label="Cerrar detalles" className="rounded p-2 text-slate-500 hover:bg-slate-200"><X size={18} /></button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Ciclo de vida</h3>
            <div className={`flex items-center gap-3 rounded-lg border p-3 ${model.status === 'APPROVED' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : model.status === 'REVIEW' ? 'border-amber-200 bg-amber-50 text-amber-800' : model.status === 'RETIRED' ? 'border-red-200 bg-red-50 text-red-800' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
              <ShieldCheck size={20} /><div><p className="text-sm font-semibold">{statusNames[model.status]}</p><p className="text-xs opacity-80">Metadatos y estado de revisión</p></div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {nextStatuses[model.status].map(status => (
                <button key={status} disabled={updating} onClick={() => void changeStatus(status)} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                  {status === 'REVIEW' ? 'Solicitar revisión' : status === 'APPROVED' ? 'Aprobar' : status === 'RETIRED' ? 'Retirar' : 'Volver a borrador'}
                </button>
              ))}
            </div>
            {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
          </section>

          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Metadatos del artefacto</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-3 border-b border-slate-100 py-1"><span className="flex items-center gap-2 text-slate-500"><Box size={14} /> Arquitectura</span><span className="text-right font-medium text-slate-800">{model.architecture}</span></div>
              <div className="flex justify-between gap-3 border-b border-slate-100 py-1"><span className="flex items-center gap-2 text-slate-500"><Fingerprint size={14} /> Formato</span><span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700">{model.format}</span></div>
              <div className="flex justify-between gap-3 border-b border-slate-100 py-1"><span className="flex items-center gap-2 text-slate-500"><ShieldCheck size={14} /> Exactitud</span><span className="font-bold text-emerald-600">{model.accuracy}</span></div>
              <div className="flex justify-between gap-3 border-b border-slate-100 py-1"><span className="flex items-center gap-2 text-slate-500"><Clock size={14} /> Tamaño</span><span className="font-medium text-slate-800">{model.size}</span></div>
              <div className="flex justify-between gap-3 border-b border-slate-100 py-1"><span className="flex items-center gap-2 text-slate-500"><User size={14} /> Autor</span><span className="font-medium text-slate-800">{model.createdBy}</span></div>
              <div className="flex justify-between gap-3 py-1"><span className="text-slate-500">Creado</span><span className="font-medium text-slate-800">{new Date(model.createdAt).toLocaleString()}</span></div>
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Checksum</h3>
            <div className="break-all rounded-lg bg-slate-900 p-3 font-mono text-[11px] leading-relaxed text-emerald-400">{model.checksum || 'No registrado'}</div>
          </section>
          <InlineNotice tone="warning">El registro contiene metadatos; el archivo binario no está almacenado ni disponible para descarga.</InlineNotice>
        </div>

        <footer className="border-t border-slate-200 bg-slate-50 p-4 text-right"><button onClick={onClose} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100">Cerrar</button></footer>
      </aside>
    </div>
  );
}
