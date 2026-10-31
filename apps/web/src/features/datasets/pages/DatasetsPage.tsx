import { useMemo, useState } from 'react';
import {
  Database, FileJson, FileSpreadsheet, FileText, HardDrive, Image as ImageIcon,
  Inbox, Search, Trash2, UploadCloud,
} from 'lucide-react';
import type { Dataset } from '../types';
import UploadDatasetModal from '../components/UploadDatasetModal';
import { api } from '../../../lib/api';
import { useApiResource } from '../../../hooks/useApiResource';
import { ErrorState, LoadingState } from '../../../components/ui/Feedback';
import { datasetBucket, supabase } from '../../../lib/supabase';

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}

export default function DatasetsPage() {
  const { data, loading, error, reload } = useApiResource<Dataset>('/datasets?limit=100');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [actionError, setActionError] = useState('');
  const datasets = data?.items ?? [];
  const filtered = useMemo(() => datasets.filter(dataset =>
    dataset.name.toLowerCase().includes(search.toLowerCase())
    && (statusFilter === 'ALL' || dataset.status === statusFilter),
  ), [datasets, search, statusFilter]);
  const storageUsed = datasets.reduce((total, dataset) => total + (dataset.sizeBytes ?? 0), 0);

  async function deleteDataset(dataset: Dataset) {
    if (!window.confirm(`¿Eliminar "${dataset.name}" y su archivo de Storage?`)) return;
    setActionError('');
    try {
      await api.delete(`/datasets/${dataset.id}`);
      reload();
      if (dataset.storagePath && supabase) {
        const [bucket, ...pathParts] = dataset.storagePath.split('/');
        const { error: storageError } = await supabase.storage.from(bucket || datasetBucket).remove([pathParts.join('/')]);
        if (storageError) {
          setActionError(`Se eliminó el registro, pero no el archivo de Storage: ${storageError.message}`);
        }
      }
    } catch (deleteError) {
      setActionError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar el dataset.');
    }
  }

  function getFormatIcon(format: string) {
    switch (format) {
      case 'CSV': return <FileSpreadsheet size={18} className="text-emerald-600" />;
      case 'IMAGES': return <ImageIcon size={18} className="text-blue-600" />;
      case 'JSON': return <FileJson size={18} className="text-amber-600" />;
      default: return <FileText size={18} className="text-slate-600" />;
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Datasets</h1>
          <p className="mt-1 text-sm text-slate-500">Gestiona archivos para entrenamiento, validación y prueba.</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          <UploadCloud size={16} /> Subir dataset
        </button>
      </header>

      <section className="flex items-center gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm" aria-label="Almacenamiento de datasets">
        <div className="rounded-lg bg-indigo-50 p-3 text-indigo-600"><HardDrive size={24} /></div>
        <div>
          <p className="text-sm font-semibold text-slate-800">Almacenamiento registrado</p>
          <p className="mt-1 text-xs text-slate-500">{formatBytes(storageUsed)} en {datasets.length} dataset{datasets.length === 1 ? '' : 's'}</p>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={event => setSearch(event.target.value)} aria-label="Buscar datasets" placeholder="Buscar por nombre…" className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-4 text-sm outline-none focus:ring-1 focus:ring-indigo-500" />
        </label>
        <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Filtrar datasets por estado" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
          <option value="ALL">Todos los estados</option>
          <option value="READY">Listos</option>
          <option value="PROCESSING">Procesando</option>
          <option value="ERROR">Con error</option>
        </select>
      </div>

      {actionError && <ErrorState message={actionError} />}
      <section className="min-h-80 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <LoadingState /> : filtered.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr><th className="px-6 py-3 font-medium">Dataset</th><th className="px-6 py-3 font-medium">Formato</th><th className="px-6 py-3 font-medium">Tamaño / filas</th><th className="px-6 py-3 font-medium">Split</th><th className="px-6 py-3 font-medium">Estado</th><th className="px-6 py-3" /></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(dataset => (
                  <tr key={dataset.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-md bg-slate-100 p-2">{getFormatIcon(dataset.format)}</div>
                        <div><p className="font-medium text-slate-900">{dataset.name}</p><p className="mt-0.5 text-xs text-slate-500">{new Date(dataset.uploadedAt).toLocaleDateString()}</p></div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><span className="rounded bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">{dataset.format}</span></td>
                    <td className="px-6 py-4 text-slate-600">{dataset.size} <span className="text-slate-400">· {dataset.rows.toLocaleString()} filas</span></td>
                    <td className="px-6 py-4 text-xs text-slate-600">Train {Math.round(dataset.trainSplit * 100)}% · Val {Math.round(dataset.valSplit * 100)}%</td>
                    <td className="px-6 py-4"><span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${dataset.status === 'READY' ? 'bg-emerald-50 text-emerald-700' : dataset.status === 'ERROR' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{dataset.status}</span></td>
                    <td className="px-6 py-4 text-right"><button onClick={() => deleteDataset(dataset)} aria-label={`Eliminar ${dataset.name}`} title="Eliminar dataset" className="rounded p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex min-h-80 flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-4 rounded-full border border-slate-100 bg-slate-50 p-4"><Inbox size={28} className="text-slate-300" /></div>
            <h2 className="font-semibold text-slate-900">{search ? 'No se encontraron datasets' : 'No hay datasets aún'}</h2>
            <p className="mt-1 max-w-sm text-sm text-slate-500">Carga un archivo para asociarlo a tus entrenamientos.</p>
            {!search && <button onClick={() => setModalOpen(true)} className="mt-4 inline-flex items-center gap-2 rounded-md bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"><Database size={16} /> Subir mi primer dataset</button>}
          </div>
        )}
      </section>

      <UploadDatasetModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onUploaded={reload} />
    </div>
  );
}
