import { useMemo, useState, type FormEvent } from 'react';
import { Inbox, Package, Plus, Search, ShieldCheck, Clock, Layers, X } from 'lucide-react';
import type { ModelVersion, ModelStatus } from '../types';
import ModelDetailsPanel from '../components/ModelDetailsPanel';
import { api, type Page } from '../../../lib/api';
import { useApiResource } from '../../../hooks/useApiResource';
import { ErrorState, LoadingState } from '../../../components/ui/Feedback';
import { useEffect } from 'react';
import type { Project } from '../../projects/types';
import type { ArchitectureConfig } from '../../architectures/types';
import { useAuth } from '../../../auth/AuthProvider';
import { canRegisterModels } from '../../../auth/permissions';

interface ArchitectureOption extends ArchitectureConfig {
  id: string;
  projectId: string | null;
  name: string;
}

export default function ModelRegistryPage() {
  const { user } = useAuth();
  const mayRegister = canRegisterModels(user?.role);
  const { data, loading, error, reload } = useApiResource<ModelVersion>('/model-versions?limit=100');
  const [selectedModel, setSelectedModel] = useState<ModelVersion | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [architectures, setArchitectures] = useState<ArchitectureOption[]>([]);
  const [projectId, setProjectId] = useState('');
  const [architectureId, setArchitectureId] = useState('');
  const [name, setName] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [format, setFormat] = useState<'SavedModel' | 'H5' | 'ONNX'>('SavedModel');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');
  const models = data?.items ?? [];
  const filtered = useMemo(() => models.filter(model =>
    `${model.name} ${model.projectName} ${model.version}`.toLowerCase().includes(search.toLowerCase())
    && (statusFilter === 'ALL' || model.status === statusFilter),
  ), [models, search, statusFilter]);

  useEffect(() => {
    if (!modalOpen) return;
    let active = true;
    Promise.all([
      api.get<Page<Project>>('/projects?limit=100'),
      api.get<Page<ArchitectureOption>>('/architectures?limit=100'),
    ]).then(([projectPage, architecturePage]) => {
      if (!active) return;
      setProjects(projectPage.items.filter(project => project.status !== 'ARCHIVED'));
      setArchitectures(architecturePage.items);
    }).catch(loadError => {
      if (active) setFormError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los recursos.');
    });
    return () => { active = false; };
  }, [modalOpen]);

  async function createModel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      await api.post('/model-versions', { projectId, architectureId, name: name.trim(), version: version.trim(), format });
      setModalOpen(false);
      setName('');
      setArchitectureId('');
      reload();
    } catch (requestError) {
      setFormError(requestError instanceof Error ? requestError.message : 'No se pudo registrar el modelo.');
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(model: ModelVersion, status: ModelStatus) {
    try {
      const updated = await api.patch<ModelVersion>(`/model-versions/${model.id}`, { status });
      setSelectedModel(updated);
      reload();
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : 'No se pudo actualizar el estado.');
    }
  }

  async function deleteModel(model: ModelVersion) {
    if (!window.confirm(`¿Eliminar el borrador "${model.name}" (${model.version})?`)) return;
    setActionError('');
    try {
      await api.delete(`/model-versions/${model.id}`);
      setSelectedModel(null);
      reload();
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : 'No se pudo eliminar el modelo.');
    }
  }

  const availableArchitectures = architectures.filter(item => item.projectId === projectId);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="text-2xl font-semibold tracking-tight text-slate-900">Registro de modelos</h1><p className="mt-1 text-sm text-slate-500">Consulta versiones, metadatos y estado de revisión.</p></div>
        {mayRegister && <button onClick={() => setModalOpen(true)} className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-700"><Plus size={16} /> Registrar modelo</button>}
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} aria-label="Buscar modelos" placeholder="Buscar por nombre, proyecto o versión…" className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-4 text-sm outline-none focus:ring-1 focus:ring-indigo-500" /></label>
        <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Filtrar por estado" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"><option value="ALL">Todos los estados</option><option value="DRAFT">Borrador</option><option value="REVIEW">En revisión</option><option value="APPROVED">Aprobados</option><option value="RETIRED">Retirados</option></select>
      </div>

      <section className="min-h-80 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <LoadingState /> : filtered.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-[13px]">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500"><tr><th className="px-6 py-3 font-medium">Modelo</th><th className="px-6 py-3 font-medium">Versión</th><th className="px-6 py-3 font-medium">Arquitectura</th><th className="px-6 py-3 font-medium">Estado</th><th className="px-6 py-3 font-medium">Exactitud</th><th className="px-6 py-3" /></tr></thead>
              <tbody className="divide-y divide-slate-100">{filtered.map(model => (
                <tr key={model.id} className="cursor-pointer hover:bg-slate-50/60" onClick={() => { setSelectedModel(model); setActionError(''); }}>
                  <td className="px-6 py-4"><div className="flex items-center gap-3"><span className="rounded-md bg-slate-100 p-2 text-slate-600"><Package size={18} /></span><span><span className="block font-medium text-slate-900">{model.name}</span><span className="text-xs text-slate-500">{model.projectName}</span></span></div></td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-600">{model.version}</td>
                  <td className="px-6 py-4 text-xs text-slate-600"><span className="flex items-center gap-1.5"><Layers size={14} className="text-slate-400" />{model.architecture}</span></td>
                  <td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${model.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : model.status === 'REVIEW' ? 'bg-amber-100 text-amber-700' : model.status === 'RETIRED' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>{model.status === 'APPROVED' ? <ShieldCheck size={12} /> : model.status === 'REVIEW' ? <Clock size={12} /> : null}{model.status}</span></td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-700">{model.accuracy}</td><td className="px-6 py-4 text-right text-xs font-medium text-indigo-600">Detalles</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center"><Inbox size={36} className="mb-4 text-slate-300" /><h2 className="font-semibold text-slate-900">{search ? 'No hay resultados' : 'No hay modelos registrados'}</h2><p className="mt-1 text-sm text-slate-500">Registra metadatos de un modelo para iniciar su seguimiento.</p></div>}
      </section>

      {selectedModel && <ModelDetailsPanel model={selectedModel} role={user?.role} canDelete={mayRegister} onClose={() => setSelectedModel(null)} onDelete={() => deleteModel(selectedModel)} onStatusChange={status => updateStatus(selectedModel, status)} error={actionError} />}

      {mayRegister && modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <button aria-label="Cerrar modal" onClick={() => setModalOpen(false)} className="absolute inset-0 bg-slate-900/40" />
        <section role="dialog" aria-modal="true" aria-labelledby="create-model-title" className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl">
          <header className="flex items-center justify-between border-b p-5"><h2 id="create-model-title" className="font-semibold">Registrar versión de modelo</h2><button onClick={() => setModalOpen(false)} aria-label="Cerrar" className="rounded p-1 hover:bg-slate-100"><X size={20} /></button></header>
          <form onSubmit={createModel} className="space-y-4 p-5">
            <label className="block text-sm font-medium">Proyecto<select required value={projectId} onChange={event => { setProjectId(event.target.value); setArchitectureId(''); }} className="mt-1 w-full rounded-md border px-3 py-2"><option value="">Selecciona un proyecto…</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
            <label className="block text-sm font-medium">Arquitectura<select required value={architectureId} onChange={event => setArchitectureId(event.target.value)} disabled={!projectId} className="mt-1 w-full rounded-md border px-3 py-2 disabled:bg-slate-50"><option value="">Selecciona una arquitectura…</option>{availableArchitectures.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">Nombre<input required maxLength={120} value={name} onChange={event => setName(event.target.value)} className="mt-1 w-full rounded-md border px-3 py-2" /></label><label className="block text-sm font-medium">Versión<input required maxLength={40} value={version} onChange={event => setVersion(event.target.value)} className="mt-1 w-full rounded-md border px-3 py-2" /></label></div>
            <label className="block text-sm font-medium">Formato<select value={format} onChange={event => setFormat(event.target.value as typeof format)} className="mt-1 w-full rounded-md border bg-white px-3 py-2"><option>SavedModel</option><option>H5</option><option>ONNX</option></select></label>
            <p className="text-xs text-slate-500">Esto registra metadatos. La carga del artefacto binario no está disponible todavía.</p>
            {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
            <footer className="flex justify-end gap-3 border-t pt-4"><button type="button" onClick={() => setModalOpen(false)} className="rounded-md border px-4 py-2 text-sm">Cancelar</button><button disabled={saving} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? 'Guardando…' : 'Registrar'}</button></footer>
          </form>
        </section>
      </div>}
    </div>
  );
}
