import { useEffect, useMemo, useState } from 'react';
import { Inbox, Play, Plus, Search, Trash2 } from 'lucide-react';
import type { TrainingJob } from '../types';
import NewTrainingModal from '../components/NewTrainingModal';
import JobMonitor from '../components/JobMonitor';
import { useApiResource } from '../../../hooks/useApiResource';
import { ErrorState, LoadingState } from '../../../components/ui/Feedback';
import { useAuth } from '../../../auth/AuthProvider';
import { canQueueTraining } from '../../../auth/permissions';
import { api } from '../../../lib/api';

function statusLabel(status: TrainingJob['status']) {
  const labels = { QUEUED: 'En cola', RUNNING: 'Ejecutando', COMPLETED: 'Completado', FAILED: 'Fallido', CANCELLED: 'Cancelado' };
  return labels[status];
}

export default function TrainingPage() {
  const { user } = useAuth();
  const mayQueue = canQueueTraining(user?.role);
  const isAdmin = user?.role === 'ADMIN';
  const { data, loading, error, reload } = useApiResource<TrainingJob>('/training-jobs?limit=100');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<TrainingJob | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actionError, setActionError] = useState('');
  const jobs = data?.items ?? [];
  const filtered = useMemo(() => jobs.filter(job =>
    `${job.id} ${job.projectName} ${job.architecture}`.toLowerCase().includes(search.toLowerCase())
    && (statusFilter === 'ALL' || job.status === statusFilter),
  ), [jobs, search, statusFilter]);

  async function deleteJob(job: TrainingJob) {
    if (!window.confirm(`¿Eliminar el trabajo de entrenamiento ${job.id}?`)) return;
    setActionError('');
    try {
      await api.delete(`/training-jobs/${job.id}`);
      reload();
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : 'No se pudo eliminar el entrenamiento.');
    }
  }

  async function startAgain(job: TrainingJob) {
    setActionError('');
    try {
      await api.post(`/training-jobs/${job.id}/start`, {});
      reload();
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : 'No se pudo iniciar de nuevo el entrenamiento.');
    }
  }

  useEffect(() => {
    if (!jobs.some(job => job.status === 'RUNNING' || job.status === 'QUEUED')) return;
    const timer = window.setInterval(reload, 5000);
    return () => window.clearInterval(timer);
  }, [jobs, reload]);

  useEffect(() => {
    if (selectedJob) setSelectedJob(jobs.find(job => job.id === selectedJob.id) ?? null);
  }, [jobs, selectedJob]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Entrenamientos</h1>
          <p className="mt-1 text-sm text-slate-500">Consulta los trabajos en cola y su progreso reportado por el worker.</p>
        </div>
        {mayQueue && <button onClick={() => setModalOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-700"><Plus size={16} /> Nuevo entrenamiento</button>}
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={event => setSearch(event.target.value)} aria-label="Buscar trabajos" placeholder="Buscar por ID, proyecto o arquitectura…" className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-4 text-sm outline-none focus:ring-1 focus:ring-indigo-500" />
        </label>
        <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Filtrar por estado" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
          <option value="ALL">Todos los estados</option><option value="QUEUED">En cola</option><option value="RUNNING">Ejecutando</option><option value="COMPLETED">Completados</option><option value="FAILED">Fallidos</option><option value="CANCELLED">Cancelados</option>
        </select>
      </div>

      {actionError && <ErrorState message={actionError} />}
      <section className="min-h-80 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <LoadingState /> : filtered.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500"><tr><th className="px-6 py-3 font-medium">Trabajo</th><th className="px-6 py-3 font-medium">Arquitectura</th><th className="px-6 py-3 font-medium">Red</th><th className="px-6 py-3 font-medium">Estado</th><th className="px-6 py-3 font-medium">Progreso</th><th className="px-6 py-3 font-medium">Métricas</th><th className="px-6 py-3" /></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(job => (
                  <tr key={job.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-4"><p className="font-mono text-xs text-slate-500">#{job.id}</p><p className="mt-1 font-medium text-slate-900">{job.projectName}</p></td>
                    <td className="px-6 py-4 text-slate-600">{job.architecture}</td>
                    <td className="px-6 py-4"><span className="rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700">{job.modelFamily}</span></td>
                    <td className="px-6 py-4"><span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${job.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' : job.status === 'FAILED' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{statusLabel(job.status)}</span></td>
                    <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(job.progress, 100)}%` }} /></div><span className="text-xs text-slate-500">{job.epoch}/{job.totalEpochs} · {job.progress}%</span></div></td>
                    <td className="px-6 py-4 text-xs text-slate-600">Loss {job.loss} · Acc {job.accuracy}</td>
                    <td className="px-6 py-4 text-right"><div className="flex items-center justify-end gap-2">{mayQueue && job.status === 'FAILED' && <button onClick={() => void startAgain(job)} className="inline-flex items-center gap-1 rounded bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"><Play size={13} /> Iniciar</button>}<button onClick={() => setSelectedJob(job)} className="rounded bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100">Ver métricas</button>{mayQueue && (job.status !== 'RUNNING' && (isAdmin || ['QUEUED', 'FAILED', 'CANCELLED'].includes(job.status))) && <button onClick={() => void deleteJob(job)} aria-label={`Eliminar entrenamiento ${job.id}`} title="Eliminar trabajo" className="rounded p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
            <Inbox size={36} className="mb-4 text-slate-300" />
            <h2 className="font-semibold text-slate-900">{search ? 'No se encontraron trabajos' : 'Aún no hay entrenamientos'}</h2>
            <p className="mt-1 max-w-sm text-sm text-slate-500">Crea un trabajo con una arquitectura y un dataset listos.</p>
            {!search && mayQueue && <button onClick={() => setModalOpen(true)} className="mt-4 rounded-md bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100">Crear primer entrenamiento</button>}
          </div>
        )}
      </section>

      {mayQueue && <NewTrainingModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onCreated={reload} />}
      {selectedJob && <JobMonitor job={selectedJob} onClose={() => setSelectedJob(null)} />}
    </div>
  );
}
