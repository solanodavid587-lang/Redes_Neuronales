import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { BrainCircuit, Database, PlayCircle, Server, X } from 'lucide-react';
import type { Page } from '../../../lib/api';
import { api } from '../../../lib/api';
import { ErrorState, LoadingState } from '../../../components/ui/Feedback';
import type { Project } from '../../projects/types';
import type { Dataset } from '../../datasets/types';
import type { Layer } from '../../architectures/types';

interface ArchitectureOption {
  id: string;
  projectId: string | null;
  name: string;
  family: string;
  layers: Layer[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function NewTrainingModal({ isOpen, onClose, onCreated }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [architectures, setArchitectures] = useState<ArchitectureOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [datasetId, setDatasetId] = useState('');
  const [architectureId, setArchitectureId] = useState('');
  const [epochs, setEpochs] = useState(10);
  const [batchSize, setBatchSize] = useState(32);
  const [optimizer, setOptimizer] = useState('adam');
  const [learningRate, setLearningRate] = useState('0.001');

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([
      api.get<Page<Project>>('/projects?limit=100'),
      api.get<Page<Dataset>>('/datasets?limit=100'),
      api.get<Page<ArchitectureOption>>('/architectures?limit=100'),
    ]).then(([projectPage, datasetPage, architecturePage]) => {
      if (!active) return;
      setProjects(projectPage.items);
      setDatasets(datasetPage.items);
      setArchitectures(architecturePage.items);
    }).catch(loadError => {
      if (active) setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los recursos.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [isOpen]);

  const projectDatasets = useMemo(() => datasets.filter(item =>
    item.status === 'READY' && (!item.projectId || item.projectId === projectId),
  ), [datasets, projectId]);
  const projectArchitectures = useMemo(() => architectures.filter(item =>
    item.projectId === projectId,
  ), [architectures, projectId]);

  function changeProject(nextProjectId: string) {
    setProjectId(nextProjectId);
    setDatasetId('');
    setArchitectureId('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.post('/training-jobs', {
        projectId,
        datasetId,
        architectureId,
        totalEpochs: epochs,
        configuration: { batchSize, optimizer, learningRate: Number(learningRate) },
      });
      onCreated();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo encolar el entrenamiento.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button aria-label="Cerrar modal" onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <section role="dialog" aria-modal="true" aria-labelledby="new-training-title" className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 p-5">
          <h2 id="new-training-title" className="flex items-center gap-2 text-lg font-semibold"><PlayCircle className="text-indigo-600" size={20} /> Nuevo entrenamiento</h2>
          <button onClick={onClose} aria-label="Cerrar" className="rounded p-1 text-slate-500 hover:bg-slate-100"><X size={20} /></button>
        </header>
        {loading ? <LoadingState label="Cargando proyectos y recursos…" /> : (
          <form onSubmit={handleSubmit} className="space-y-5 p-5">
            {error && <ErrorState message={error} />}
            <label className="block text-sm font-medium text-slate-700">Proyecto
              <select required value={projectId} onChange={event => changeProject(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2">
                <option value="">Selecciona un proyecto…</option>
                {projects.filter(project => project.status !== 'ARCHIVED').map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700"><span className="flex items-center gap-2"><BrainCircuit size={14} /> Arquitectura</span>
                <select required disabled={!projectId} value={architectureId} onChange={event => setArchitectureId(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 disabled:bg-slate-50">
                  <option value="">Selecciona arquitectura…</option>
                  {projectArchitectures.map(item => <option key={item.id} value={item.id}>{item.name} · {item.family}</option>)}
                </select>
                {projectId && !projectArchitectures.length && <span className="mt-1 block text-xs text-amber-700">Este proyecto aún no tiene arquitecturas guardadas.</span>}
              </label>
              <label className="block text-sm font-medium text-slate-700"><span className="flex items-center gap-2"><Database size={14} /> Dataset</span>
                <select required disabled={!projectId} value={datasetId} onChange={event => setDatasetId(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 disabled:bg-slate-50">
                  <option value="">Selecciona dataset…</option>
                  {projectDatasets.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                {projectId && !projectDatasets.length && <span className="mt-1 block text-xs text-amber-700">No hay datasets listos para este proyecto.</span>}
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">Épocas
                <input type="number" required min={1} max={10000} value={epochs} onChange={event => setEpochs(Number(event.target.value))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono" />
              </label>
              <label className="block text-sm font-medium text-slate-700">Batch size
                <select value={batchSize} onChange={event => setBatchSize(Number(event.target.value))} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono">
                  {[32, 64, 128, 256].map(size => <option key={size} value={size}>{size}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">Optimizador
                <select value={optimizer} onChange={event => setOptimizer(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2">
                  <option value="adam">Adam</option><option value="sgd">SGD</option><option value="rmsprop">RMSprop</option>
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">Learning rate
                <input type="number" required min="0.000001" max="1" step="any" value={learningRate} onChange={event => setLearningRate(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono" />
              </label>
            </div>
            <div className="flex gap-3 rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-indigo-900">
              <Server size={18} className="mt-0.5 shrink-0" />
              <p className="text-xs">El trabajo se guardará en la cola. La ejecución requiere un worker conectado; el estado no cambiará hasta que el worker envíe métricas.</p>
            </div>
            <footer className="flex justify-end gap-3 border-t border-slate-200 pt-4">
              <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">Cancelar</button>
              <button type="submit" disabled={submitting || !projectId || !datasetId || !architectureId} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">{submitting ? 'Encolando…' : 'Crear trabajo'}</button>
            </footer>
          </form>
        )}
      </section>
    </div>
  );
}
