import { useMemo, useRef, useState, type FormEvent } from 'react';
import {
  Database, Eye, FileJson, FileSpreadsheet, FileText, HardDrive, Image as ImageIcon,
  Inbox, Pencil, Search, Trash2, UploadCloud, X,
} from 'lucide-react';
import type { Dataset, DatasetPreview } from '../types';
import UploadDatasetModal from '../components/UploadDatasetModal';
import { api } from '../../../lib/api';
import { useApiResource } from '../../../hooks/useApiResource';
import { ErrorState, LoadingState } from '../../../components/ui/Feedback';
import { datasetBucket, supabase } from '../../../lib/supabase';
import { useAuth } from '../../../auth/AuthProvider';
import { canManageDatasets } from '../../../auth/permissions';
import type { Project } from '../../projects/types';
import { InlineNotice } from '../../../components/ui/Feedback';

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}

export default function DatasetsPage() {
  const { user } = useAuth();
  const mayManage = canManageDatasets(user?.role);
  const { data, loading, error, reload } = useApiResource<Dataset>('/datasets?limit=100');
  const { data: projectData, error: projectsError, reload: reloadProjects } = useApiResource<Project>('/projects?limit=100');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [formatFilter, setFormatFilter] = useState('ALL');
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDataset, setEditingDataset] = useState<Dataset | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTrainSplit, setEditTrainSplit] = useState(80);
  const [editTargetColumn, setEditTargetColumn] = useState('');
  const [editFeatureColumns, setEditFeatureColumns] = useState('');
  const [editSequenceLength, setEditSequenceLength] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');
  const [actionError, setActionError] = useState('');
  const [previewDataset, setPreviewDataset] = useState<Dataset | null>(null);
  const [datasetPreview, setDatasetPreview] = useState<DatasetPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const previewRequestId = useRef(0);
  const datasets = data?.items ?? [];
  const filtered = useMemo(() => datasets.filter(dataset =>
    `${dataset.name} ${dataset.description ?? ''}`.toLowerCase().includes(search.trim().toLowerCase())
    && (statusFilter === 'ALL' || dataset.status === statusFilter)
    && (formatFilter === 'ALL' || dataset.format === formatFilter)
    && (projectFilter === 'ALL' || (projectFilter === 'NONE' ? !dataset.projectId : dataset.projectId === projectFilter)),
  ), [datasets, search, statusFilter, formatFilter, projectFilter]);
  const storageUsed = datasets.reduce((total, dataset) => total + (dataset.sizeBytes ?? 0), 0);
  const hasActiveFilters = Boolean(search.trim()) || statusFilter !== 'ALL' || formatFilter !== 'ALL' || projectFilter !== 'ALL';

  async function deleteDataset(dataset: Dataset) {
    if (!window.confirm(`¿Eliminar "${dataset.name}" y su archivo? No se puede borrar si es el último dataset de un proyecto o está siendo usado por un entrenamiento.`)) return;
    setActionError('');
    try {
      await api.delete(`/datasets/${dataset.id}`);
      reload();
      if (dataset.storagePath?.startsWith(`${datasetBucket}/`) && supabase) {
        const [bucket, ...pathParts] = dataset.storagePath.split('/');
        const { error: storageError } = await supabase.storage.from(bucket || datasetBucket).remove([pathParts.join('/')]);
        if (storageError) {
          setActionError(`Se eliminó el registro, pero no el archivo de Storage: ${storageError.message}`);
        }
      }
    } catch (deleteError) {
      reload();
      setActionError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar el dataset.');
    }
  }

  async function saveDataset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingDataset) return;
    setSavingEdit(true);
    setEditError('');
    try {
      await api.patch(`/datasets/${editingDataset.id}`, {
        name: editName.trim(),
        description: editDescription.trim(),
        trainSplit: editTrainSplit / 100,
        valSplit: (100 - editTrainSplit) / 100,
        targetColumn: editTargetColumn.trim() || null,
        featureColumns: editFeatureColumns.split(',').map(column => column.trim()).filter(Boolean),
        sequenceLength: editSequenceLength ? Number(editSequenceLength) : null,
      });
      setEditingDataset(null);
      reload();
    } catch (requestError) {
      setEditError(requestError instanceof Error ? requestError.message : 'No se pudo actualizar el dataset.');
    } finally {
      setSavingEdit(false);
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

  async function openDatasetPreview(dataset: Dataset) {
    const requestId = ++previewRequestId.current;
    setPreviewDataset(dataset);
    setDatasetPreview(null);
    setPreviewError('');
    if (dataset.format !== 'CSV') {
      setPreviewError('La vista de registros está disponible para archivos CSV.');
      return;
    }

    setPreviewLoading(true);
    try {
      const result = await api.get<DatasetPreview>(`/datasets/${dataset.id}/preview?limit=100`);
      if (previewRequestId.current === requestId) setDatasetPreview(result);
    } catch (requestError) {
      if (previewRequestId.current === requestId) {
        setPreviewError(requestError instanceof Error ? requestError.message : 'No se pudieron cargar los registros.');
      }
    } finally {
      if (previewRequestId.current === requestId) setPreviewLoading(false);
    }
  }

  function closeDatasetPreview() {
    previewRequestId.current += 1;
    setPreviewDataset(null);
    setDatasetPreview(null);
    setPreviewError('');
    setPreviewLoading(false);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Datasets</h1>
          <p className="mt-1 text-sm text-slate-500">Gestiona archivos para entrenamiento, validación y prueba.</p>
        </div>
        {mayManage && <button onClick={() => setModalOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          <UploadCloud size={16} /> Subir dataset
        </button>}
      </header>

      <section className="flex items-center gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm" aria-label="Almacenamiento de datasets">
        <div className="rounded-lg bg-indigo-50 p-3 text-indigo-600"><HardDrive size={24} /></div>
        <div>
          <p className="text-sm font-semibold text-slate-800">Almacenamiento registrado</p>
          <p className="mt-1 text-xs text-slate-500">{formatBytes(storageUsed)} en {datasets.length} dataset{datasets.length === 1 ? '' : 's'}</p>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={event => setSearch(event.target.value)} aria-label="Buscar datasets" placeholder="Buscar por nombre o descripción…" className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-4 text-sm outline-none focus:ring-1 focus:ring-indigo-500" />
        </label>
        <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Filtrar datasets por estado" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
          <option value="ALL">Todos los estados</option>
          <option value="READY">Listos</option>
          <option value="PROCESSING">Procesando</option>
          <option value="ERROR">Con error</option>
        </select>
        <select value={formatFilter} onChange={event => setFormatFilter(event.target.value)} aria-label="Filtrar datasets por formato" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
          <option value="ALL">Todos los formatos</option>
          <option value="CSV">CSV</option>
          <option value="JSON">JSON</option>
          <option value="IMAGES">Imágenes / ZIP</option>
          <option value="TEXT">Texto</option>
        </select>
        <select value={projectFilter} onChange={event => setProjectFilter(event.target.value)} aria-label="Filtrar datasets por proyecto" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
          <option value="ALL">Todos los proyectos</option>
          <option value="NONE">Sin proyecto</option>
          {(projectData?.items ?? []).map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
      </div>

      {actionError && <ErrorState message={actionError} />}
      {projectsError && <InlineNotice tone="warning">No se pudieron cargar los proyectos para filtrar: {projectsError} <button type="button" onClick={reloadProjects} className="ml-2 underline">Reintentar</button></InlineNotice>}
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
                        <div><button type="button" onClick={() => void openDatasetPreview(dataset)} className="text-left font-medium text-indigo-700 hover:text-indigo-900 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500">{dataset.name}</button><p className="mt-0.5 text-xs text-slate-500">{dataset.targetColumn ? `Objetivo: ${dataset.targetColumn}` : dataset.description || new Date(dataset.uploadedAt).toLocaleDateString()}</p></div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><span className="rounded bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">{dataset.format}</span></td>
                    <td className="px-6 py-4 text-slate-600">{dataset.size} <span className="text-slate-400">· {dataset.rows.toLocaleString()} filas</span></td>
                    <td className="px-6 py-4 text-xs text-slate-600">Train {Math.round(dataset.trainSplit * 100)}% · Val {Math.round(dataset.valSplit * 100)}%</td>
                    <td className="px-6 py-4"><span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${dataset.status === 'READY' ? 'bg-emerald-50 text-emerald-700' : dataset.status === 'ERROR' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{dataset.status}</span></td>
                    <td className="px-6 py-4 text-right"><div className="flex justify-end gap-1">
                      <button onClick={() => void openDatasetPreview(dataset)} aria-label={`Ver registros de ${dataset.name}`} title="Ver registros" className="rounded p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"><Eye size={16} /></button>
                      {mayManage && <>
                      <button onClick={() => { setEditingDataset(dataset); setEditName(dataset.name); setEditDescription(dataset.description ?? ''); setEditTrainSplit(Math.round(dataset.trainSplit * 100)); setEditTargetColumn(dataset.targetColumn ?? ''); setEditFeatureColumns(dataset.featureColumns?.join(', ') ?? ''); setEditSequenceLength(dataset.sequenceLength ? String(dataset.sequenceLength) : ''); setEditError(''); }} aria-label={`Editar ${dataset.name}`} title="Editar dataset" className="rounded p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"><Pencil size={16} /></button>
                      <button onClick={() => deleteDataset(dataset)} aria-label={`Eliminar ${dataset.name}`} title="Eliminar dataset" className="rounded p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button>
                      </>}
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex min-h-80 flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-4 rounded-full border border-slate-100 bg-slate-50 p-4"><Inbox size={28} className="text-slate-300" /></div>
            <h2 className="font-semibold text-slate-900">{hasActiveFilters ? 'No se encontraron datasets con esos filtros' : 'No hay datasets aún'}</h2>
            <p className="mt-1 max-w-sm text-sm text-slate-500">Carga un archivo para asociarlo a tus entrenamientos.</p>
            {!hasActiveFilters && mayManage && <button onClick={() => setModalOpen(true)} className="mt-4 inline-flex items-center gap-2 rounded-md bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"><Database size={16} /> Subir mi primer dataset</button>}
          </div>
        )}
      </section>

      {mayManage && <UploadDatasetModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onUploaded={reload} />}
      {previewDataset && <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <button aria-label="Cerrar vista previa" onClick={closeDatasetPreview} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
        <section role="dialog" aria-modal="true" aria-labelledby="dataset-preview-title" className="relative flex max-h-[85vh] w-full max-w-6xl flex-col rounded-xl bg-white shadow-2xl">
          <header className="flex items-center justify-between border-b border-slate-200 p-5">
            <div>
              <h2 id="dataset-preview-title" className="text-lg font-semibold text-slate-900">Registros del dataset</h2>
              <p className="mt-1 text-sm text-slate-500">{previewDataset.name}</p>
            </div>
            <button type="button" onClick={closeDatasetPreview} aria-label="Cerrar" className="rounded p-1 text-slate-500 hover:bg-slate-100"><X size={20} /></button>
          </header>
          {previewLoading ? <div className="p-6"><LoadingState label="Leyendo registros…" /></div> : previewError ? (
            <p role="alert" className="m-5 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{previewError}</p>
          ) : datasetPreview ? (
            <>
              <div className="overflow-auto p-5">
                {datasetPreview.records.length ? <table className="min-w-full border-separate border-spacing-0 text-left text-xs">
                  <thead className="sticky top-0 bg-slate-100">
                    <tr>{datasetPreview.columns.map((column, index) => <th key={`${column}-${index}`} className="whitespace-nowrap border-b border-slate-200 px-3 py-2 font-semibold text-slate-700">{column}</th>)}</tr>
                  </thead>
                  <tbody>
                    {datasetPreview.records.map((record, rowIndex) => <tr key={rowIndex} className="odd:bg-white even:bg-slate-50">
                      {datasetPreview.columns.map((column, columnIndex) => {
                        const value = record[column];
                        return <td key={`${column}-${columnIndex}`} className="max-w-72 whitespace-pre-wrap break-words border-b border-slate-100 px-3 py-2 text-slate-700">{Array.isArray(value) ? value.join(', ') : value ?? ''}</td>;
                      })}
                    </tr>)}
                  </tbody>
                </table> : <p className="py-8 text-center text-sm text-slate-500">El CSV no contiene registros.</p>}
              </div>
              <footer className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
                Vista previa: {datasetPreview.rowsReturned} registro{datasetPreview.rowsReturned === 1 ? '' : 's'}{datasetPreview.hasMore ? ' · mostrando los primeros registros' : ' · fin del archivo'}.
              </footer>
            </>
          ) : null}
        </section>
      </div>}
      {mayManage && editingDataset && <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <button aria-label="Cerrar edición" disabled={savingEdit} onClick={() => setEditingDataset(null)} className="absolute inset-0 bg-slate-900/40" />
        <section role="dialog" aria-modal="true" aria-labelledby="edit-dataset-title" className="relative w-full max-w-md rounded-xl bg-white shadow-2xl">
          <header className="flex items-center justify-between border-b border-slate-200 p-5">
            <h2 id="edit-dataset-title" className="text-lg font-semibold">Editar dataset</h2>
            <button type="button" disabled={savingEdit} onClick={() => setEditingDataset(null)} aria-label="Cerrar" className="rounded p-1 text-slate-500 hover:bg-slate-100"><X size={20} /></button>
          </header>
          <form onSubmit={saveDataset} className="max-h-[80vh] space-y-5 overflow-y-auto p-5">
            <label className="block text-sm font-medium text-slate-700">Nombre <span className="text-red-600">*</span>
              <input required minLength={1} maxLength={255} value={editName} onChange={event => setEditName(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
            </label>
            <label className="block text-sm font-medium text-slate-700">Descripción
              <textarea rows={2} maxLength={4000} value={editDescription} onChange={event => setEditDescription(event.target.value)} className="mt-1 w-full resize-none rounded-md border border-slate-300 px-3 py-2" />
            </label>
            <label className="block text-sm font-medium text-slate-700">Columna objetivo
              <input maxLength={255} value={editTargetColumn} onChange={event => setEditTargetColumn(event.target.value)} placeholder="Ej. etiqueta" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
            </label>
            <label className="block text-sm font-medium text-slate-700">Columnas de entrada
              <input value={editFeatureColumns} onChange={event => setEditFeatureColumns(event.target.value)} placeholder="columna1, columna2" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
            </label>
            <label className="block text-sm font-medium text-slate-700">Longitud de secuencia (RNN)
              <input type="number" min={1} max={1000000} value={editSequenceLength} onChange={event => setEditSequenceLength(event.target.value)} placeholder="Opcional" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
            </label>
            <label className="block text-sm font-medium text-slate-700">División para entrenamiento: {editTrainSplit}%
              <input type="range" min={1} max={99} value={editTrainSplit} onChange={event => setEditTrainSplit(Number(event.target.value))} className="mt-2 w-full accent-indigo-600" />
              <span className="flex justify-between text-xs font-normal text-slate-500"><span>Train {editTrainSplit}%</span><span>Validación {100 - editTrainSplit}%</span></span>
            </label>
            {editError && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{editError}</p>}
            <footer className="flex justify-end gap-3 border-t border-slate-200 pt-4">
              <button type="button" disabled={savingEdit} onClick={() => setEditingDataset(null)} className="rounded-md border border-slate-300 px-4 py-2 text-sm">Cancelar</button>
              <button disabled={savingEdit || !editName.trim()} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{savingEdit ? 'Guardando…' : 'Guardar cambios'}</button>
            </footer>
          </form>
        </section>
      </div>}
    </div>
  );
}
