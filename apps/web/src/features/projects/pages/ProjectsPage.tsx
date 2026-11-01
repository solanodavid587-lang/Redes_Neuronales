import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FolderKanban, Plus, Search, X } from 'lucide-react';
import ProjectCard from '../components/ProjectCard';
import type { ModelFamily, Project, ProjectStatus } from '../types';
import type { Dataset } from '../../datasets/types';
import { api } from '../../../lib/api';
import { useApiResource } from '../../../hooks/useApiResource';
import { ErrorState, LoadingState } from '../../../components/ui/Feedback';
import { useAuth } from '../../../auth/AuthProvider';
import { canDeleteProjects, canManageProjects } from '../../../auth/permissions';

export default function ProjectsPage() {
  const location = useLocation();
  const { user } = useAuth();
  const { data, loading, error, reload } = useApiResource<Project>('/projects?limit=100');
  const { data: datasetData, loading: datasetsLoading, error: datasetError, reload: reloadDatasets } = useApiResource<Dataset>('/datasets?limit=100');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [objective, setObjective] = useState('');
  const [modelFamily, setModelFamily] = useState<ModelFamily>('CNN');
  const [datasetId, setDatasetId] = useState('');
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>('ACTIVE');
  const mayManage = canManageProjects(user?.role);
  const mayDelete = canDeleteProjects(user?.role);
  const availableDatasets = (datasetData?.items ?? []).filter(dataset =>
    dataset.status === 'READY' && !dataset.projectId,
  );

  useEffect(() => {
    if (location.state?.openNew) setModalOpen(true);
  }, [location.state]);

  const projects = useMemo(() => (data?.items ?? []).filter(project => {
    const matchesText = `${project.name} ${project.description} ${project.objective} ${project.modelFamily}`.toLowerCase().includes(search.toLowerCase());
    return matchesText && (statusFilter === 'ALL' || project.status === statusFilter);
  }), [data, search, statusFilter]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      if (editingProject) {
        await api.patch<Project>(`/projects/${editingProject.id}`, {
          name: name.trim(),
          description: description.trim(),
          objective: objective.trim(),
          modelFamily,
          status: projectStatus,
        });
      } else {
        await api.post<Project>('/projects', {
          name: name.trim(),
          description: description.trim(),
          objective: objective.trim(),
          modelFamily,
          datasetId,
        });
      }
      setName('');
      setDescription('');
      setObjective('');
      setModelFamily('CNN');
      setDatasetId('');
      setProjectStatus('ACTIVE');
      setEditingProject(null);
      setModalOpen(false);
      reload();
      reloadDatasets();
    } catch (requestError) {
      setFormError(requestError instanceof Error ? requestError.message : 'No se pudo crear el proyecto.');
    } finally {
      setSaving(false);
    }
  }

  function openCreate() {
    setEditingProject(null);
    setName('');
    setDescription('');
    setObjective('');
    setModelFamily('CNN');
    setDatasetId('');
    setProjectStatus('ACTIVE');
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(project: Project) {
    setEditingProject(project);
    setName(project.name);
    setDescription(project.description);
    setObjective(project.objective);
    setModelFamily(project.modelFamily);
    setProjectStatus(project.status);
    setFormError('');
    setModalOpen(true);
  }

  async function archiveProject(project: Project) {
    if (!window.confirm(`¿Archivar el proyecto "${project.name}"?`)) return;
    setActionError('');
    try {
      await api.delete(`/projects/${project.id}`);
      reload();
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : 'No se pudo archivar el proyecto.');
    }
  }

  async function deleteProject(project: Project) {
    if (!window.confirm(
      `¿Eliminar permanentemente el proyecto "${project.name}"? Sus datasets y arquitecturas se conservarán sin proyecto asociado. Primero debes eliminar sus entrenamientos y modelos.`,
    )) return;
    setActionError('');
    try {
      await api.delete(`/projects/${project.id}/permanent`);
      reload();
      reloadDatasets();
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : 'No se pudo eliminar el proyecto.');
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Proyectos</h1>
          <p className="mt-1 text-sm text-slate-500">Administra tus espacios de trabajo y experimentos de IA.</p>
        </div>
        {mayManage && <button onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
          <Plus size={16} /> Nuevo proyecto
        </button>}
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={event => setSearch(event.target.value)} aria-label="Buscar proyectos" placeholder="Buscar por nombre o descripción…" className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-4 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
        </label>
        <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Filtrar por estado" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
          <option value="ALL">Todos los estados</option>
          <option value="ACTIVE">Activos</option>
          <option value="DRAFT">Borradores</option>
          <option value="ARCHIVED">Archivados</option>
        </select>
      </div>

      {actionError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{actionError}</p>}
      {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <LoadingState /> : (
        projects.length ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {projects.map(project => <ProjectCard key={project.id} project={project} canManage={mayManage} canDelete={mayDelete} onEdit={() => openEdit(project)} onArchive={() => archiveProject(project)} onDelete={() => void deleteProject(project)} />)}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white py-20 text-center">
            <FolderKanban size={40} className="mx-auto mb-4 text-slate-300" />
            <h2 className="font-semibold text-slate-900">{search || statusFilter !== 'ALL' ? 'No hay resultados' : 'No hay proyectos aún'}</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">Crea un proyecto para organizar datasets, arquitecturas y entrenamientos.</p>
            {!search && statusFilter === 'ALL' && mayManage && <button onClick={openCreate} className="mt-5 rounded-md bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100">Crear mi primer proyecto</button>}
          </div>
        )
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
          <button aria-label="Cerrar modal" className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <section role="dialog" aria-modal="true" aria-labelledby="create-project-title" className="relative w-full max-w-md rounded-xl bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-slate-200 p-5">
              <h2 id="create-project-title" className="text-lg font-semibold">{editingProject ? 'Editar proyecto' : 'Crear proyecto'}</h2>
              <button onClick={() => setModalOpen(false)} aria-label="Cerrar" disabled={saving} className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><X size={20} /></button>
            </header>
            <form onSubmit={handleCreate} className="space-y-4 p-5">
              <label className="block text-sm font-medium text-slate-700">Nombre
                <input autoFocus required maxLength={120} value={name} onChange={event => setName(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
              </label>
              <label className="block text-sm font-medium text-slate-700">Descripción
                <textarea rows={3} maxLength={4000} value={description} onChange={event => setDescription(event.target.value)} className="mt-1 w-full resize-none rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
              </label>
              <label className="block text-sm font-medium text-slate-700">Objetivo del proyecto
                <textarea required rows={2} maxLength={4000} value={objective} onChange={event => setObjective(event.target.value)} placeholder="Describe qué quieres clasificar o predecir" className="mt-1 w-full resize-none rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" />
              </label>
              <label className="block text-sm font-medium text-slate-700">Familia de red
                <select required value={modelFamily} onChange={event => setModelFamily(event.target.value as ModelFamily)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2">
                  <option value="CNN">CNN · datos espaciales e imágenes</option>
                  <option value="RNN">RNN · datos secuenciales y series temporales</option>
                </select>
                {editingProject && <span className="mt-1 block text-xs font-normal text-slate-500">La familia no se puede cambiar después de crear arquitecturas en el proyecto.</span>}
              </label>
              {editingProject ? (
                <label className="block text-sm font-medium text-slate-700">Estado
                  <select value={projectStatus} onChange={event => setProjectStatus(event.target.value as ProjectStatus)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2">
                    <option value="ACTIVE">Activo</option>
                    <option value="DRAFT">Borrador</option>
                    <option value="ARCHIVED">Archivado</option>
                  </select>
                </label>
              ) : (
                <label className="block text-sm font-medium text-slate-700">Dataset inicial <span className="text-red-600">*</span>
                  <select required value={datasetId} onChange={event => setDatasetId(event.target.value)} disabled={datasetsLoading || !availableDatasets.length} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 disabled:bg-slate-50">
                    <option value="">{datasetsLoading ? 'Cargando datasets…' : 'Selecciona un dataset listo…'}</option>
                    {availableDatasets.map(dataset => <option key={dataset.id} value={dataset.id}>{dataset.name} · {dataset.format} · {dataset.size}</option>)}
                  </select>
                  {datasetError && <span role="alert" className="mt-1 block text-xs text-red-700">{datasetError}</span>}
                  {!datasetsLoading && !availableDatasets.length && <span className="mt-1 block text-xs text-amber-700">Primero carga un dataset. <Link to="/datasets" onClick={() => setModalOpen(false)} className="font-semibold underline">Ir a datasets</Link></span>}
                </label>
              )}
              {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setModalOpen(false); setEditingProject(null); }} disabled={saving} className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50">Cancelar</button>
                <button disabled={saving || (!editingProject && !datasetId)} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">{saving ? 'Guardando…' : editingProject ? 'Guardar cambios' : 'Crear proyecto'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
