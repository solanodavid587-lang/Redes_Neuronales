import { Archive, FolderKanban, Database, Package, Calendar } from 'lucide-react';
import { Project } from '../types';

export default function ProjectCard({ project, onArchive }: { project: Project; onArchive: () => void }) {
  const lastActivity = new Date(project.lastActivity);
  return (
    <article className="group flex flex-col rounded-lg border border-slate-200 bg-white shadow-sm transition-all hover:border-indigo-300 hover:shadow-md">
      <div className="p-5 flex-1">
        <div className="flex justify-between items-start mb-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <FolderKanban size={20} />
          </div>
          {project.status !== 'ARCHIVED' && (
            <button type="button" onClick={onArchive} aria-label={`Archivar ${project.name}`} title="Archivar proyecto" className="rounded p-1.5 text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-slate-700 focus:opacity-100 group-hover:opacity-100">
              <Archive size={16} />
            </button>
          )}
        </div>
        
        <h3 className="text-[15px] font-semibold text-slate-900 truncate" title={project.name}>
          {project.name}
        </h3>
        <p className="text-[13px] text-slate-500 mt-1 line-clamp-2 h-10">
          {project.description}
        </p>

        <div className="mt-4 flex items-center gap-4 text-[13px] text-slate-600">
          <div className="flex items-center gap-1.5">
            <Package size={14} className="text-slate-400" />
            <span>{project.modelsCount} Modelos</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Database size={14} className="text-slate-400" />
            <span>{project.datasetsCount} Datasets</span>
          </div>
        </div>
      </div>

      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 rounded-b-lg flex items-center justify-between text-[12px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <Calendar size={13} />
          <span>{Number.isNaN(lastActivity.getTime()) ? 'Sin actividad' : lastActivity.toLocaleDateString()}</span>
        </div>
        <span className={`px-2 py-0.5 rounded-full font-medium
          ${project.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : ''}
          ${project.status === 'DRAFT' ? 'bg-amber-100 text-amber-700' : ''}
          ${project.status === 'ARCHIVED' ? 'bg-slate-200 text-slate-600' : ''}
        `}>
          {project.status === 'ACTIVE' ? 'Activo' : project.status === 'DRAFT' ? 'Borrador' : 'Archivado'}
        </span>
      </div>
    </article>
  );
}