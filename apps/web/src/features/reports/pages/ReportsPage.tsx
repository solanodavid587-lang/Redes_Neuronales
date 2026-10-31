import { useState } from 'react';
import {
  AlertCircle, BrainCircuit, CheckCircle2, Clock, FileSpreadsheet, FileText,
  FolderKanban, Inbox, Package, PlayCircle,
} from 'lucide-react';
import type { ReportFormat, ReportTemplate, GeneratedReport } from '../types';
import { api } from '../../../lib/api';
import { useApiResource } from '../../../hooks/useApiResource';
import { ErrorState, InlineNotice, LoadingState } from '../../../components/ui/Feedback';

const templates: ReportTemplate[] = [
  { id: 'project', title: 'Ficha de Proyecto', description: 'Resumen del proyecto y sus recursos asociados.', icon: 'project' },
  { id: 'architecture', title: 'Resumen de Arquitectura', description: 'Detalle de capas y configuración de la red.', icon: 'architecture' },
  { id: 'training', title: 'Historial de Entrenamiento', description: 'Métricas y resultados reportados por época.', icon: 'training' },
  { id: 'model', title: 'Auditoría de Modelos', description: 'Versiones, checksums y estado de revisión.', icon: 'model' },
];

export default function ReportsPage() {
  const { data, loading, error, reload } = useApiResource<GeneratedReport>('/reports?limit=100');
  const [requestError, setRequestError] = useState('');
  const [requesting, setRequesting] = useState('');

  async function generate(template: ReportTemplate, format: ReportFormat) {
    setRequesting(`${template.id}-${format}`);
    setRequestError('');
    try {
      await api.post('/reports', {
        name: `${template.title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}`,
        format,
      });
      reload();
    } catch (requestFailure) {
      setRequestError(requestFailure instanceof Error ? requestFailure.message : 'No se pudo solicitar el reporte.');
    } finally {
      setRequesting('');
    }
  }

  function templateIcon(icon: string) {
    const icons = {
      project: <FolderKanban size={24} className="text-indigo-600" />,
      architecture: <BrainCircuit size={24} className="text-blue-600" />,
      training: <PlayCircle size={24} className="text-amber-600" />,
      model: <Package size={24} className="text-emerald-600" />,
    };
    return icons[icon as keyof typeof icons] ?? <FileText size={24} />;
  }

  const reports = data?.items ?? [];

  return (
    <div className="space-y-8">
      <header><h1 className="text-2xl font-semibold tracking-tight text-slate-900">Centro de reportes</h1><p className="mt-1 text-sm text-slate-500">Solicita reportes y consulta su estado de generación.</p></header>
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800"><FileText size={16} className="text-slate-500" /> Plantillas disponibles</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {templates.map(template => (
            <article key={template.id} className="group flex flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md">
              <div className="mb-4 w-fit rounded-lg bg-slate-50 p-2.5 transition group-hover:bg-indigo-50">{templateIcon(template.icon)}</div>
              <h3 className="mb-1 text-sm font-semibold text-slate-900">{template.title}</h3>
              <p className="mb-4 flex-1 text-xs text-slate-500">{template.description}</p>
              <div className="flex gap-2">
                {(['PDF', 'CSV'] as ReportFormat[]).map(format => {
                  const key = `${template.id}-${format}`;
                  return <button key={format} disabled={Boolean(requesting)} onClick={() => void generate(template, format)} className="flex flex-1 items-center justify-center gap-1.5 rounded bg-slate-100 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50">{format === 'PDF' ? <FileText size={12} /> : <FileSpreadsheet size={12} />}{requesting === key ? 'Solicitando…' : format}</button>;
                })}
              </div>
            </article>
          ))}
        </div>
      </section>

      {requestError && <ErrorState message={requestError} />}
      <InlineNotice tone="warning">El backend registra la solicitud. La generación del archivo y su descarga requieren todavía un worker de reportes y almacenamiento configurado.</InlineNotice>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800"><Clock size={16} className="text-slate-500" /> Solicitudes recientes</h2>
        <div className="min-h-64 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <LoadingState /> : reports.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[13px]">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-500"><tr><th className="px-6 py-3 font-medium">Solicitud</th><th className="px-6 py-3 font-medium">Formato</th><th className="px-6 py-3 font-medium">Estado</th><th className="px-6 py-3 font-medium">Solicitado por</th><th className="px-6 py-3 font-medium">Fecha</th><th className="px-6 py-3" /></tr></thead>
                <tbody className="divide-y divide-slate-100">{reports.map(report => (
                  <tr key={report.id}>
                    <td className="px-6 py-4 font-medium text-slate-900">{report.name}</td>
                    <td className="px-6 py-4"><span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px]">{report.format}</span></td>
                    <td className="px-6 py-4"><span className="inline-flex items-center gap-1.5 text-xs text-amber-700">{report.status === 'FAILED' ? <AlertCircle size={14} /> : report.status === 'READY' ? <CheckCircle2 size={14} /> : <Clock size={14} className="animate-pulse" />}{report.status === 'FAILED' ? 'Fallido' : report.status === 'READY' ? 'Listo' : 'Pendiente del worker'}</span></td>
                    <td className="px-6 py-4 text-xs text-slate-600">{report.requestedBy}</td><td className="px-6 py-4 text-xs text-slate-500">{new Date(report.date).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right"><button disabled title={report.status !== 'READY' ? 'El archivo aún no está disponible' : 'No hay endpoint de descarga configurado'} className="rounded px-3 py-1.5 text-xs text-slate-400 disabled:cursor-not-allowed">Descarga no disponible</button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center"><Inbox size={32} className="mb-3 text-slate-300" /><h3 className="font-medium text-slate-900">Todavía no hay solicitudes</h3><p className="mt-1 text-sm text-slate-500">Elige una plantilla y solicita un reporte.</p></div>}
        </div>
      </section>
    </div>
  );
}
