import React, { useState } from 'react';
import { Search, Plus, Filter, FolderKanban, X } from 'lucide-react';
import ProjectCard from '../components/ProjectCard';
import { Project } from '../types';

export default function ProjectsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ESTADO VACÍO: Aquí conectarás tu API de Supabase
  const [projects] = useState<Project[]>([]);

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 relative">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Proyectos</h1>
          <p className="text-sm text-slate-500 mt-1">Administra tus espacios de trabajo y experimentos de IA.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-3.5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 shadow-sm transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={16} /> Nuevo Proyecto
        </button>
      </div>

      {/* BARRA DE HERRAMIENTAS */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Buscar proyectos..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
          />
        </div>
        <button className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 shadow-sm flex items-center justify-center gap-2">
          <Filter size={16} /> Filtros
        </button>
      </div>

      {/* CUADRÍCULA DE PROYECTOS O ESTADO VACÍO */}
      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredProjects.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="text-center py-24 bg-white rounded-lg border border-slate-200 border-dashed">
          <FolderKanban size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No hay proyectos aún</h3>
          <p className="text-slate-500 mt-1 max-w-sm mx-auto">Crea tu primer proyecto para empezar a diseñar redes neuronales y entrenar modelos.</p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="mt-5 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
          >
            Crear mi primer proyecto
          </button>
        </div>
      )}

      {/* MODAL DE NUEVO PROYECTO */}
      {isModalOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setIsModalOpen(false)}></div>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md pointer-events-auto animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center p-5 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">Crear Nuevo Proyecto</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                  <X size={20} />
                </button>
              </div>
              <form className="p-5 space-y-4" onSubmit={(e) => { 
                e.preventDefault(); 
                alert("Proyecto creado y guardado en Supabase (Simulación)"); 
                setIsModalOpen(false); 
              }}>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Proyecto</label>
                  <input type="text" required placeholder="Ej. Predicción de Ventas" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                  <textarea rows={3} placeholder="Describe el objetivo..." className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none"></textarea>
                </div>
                <div className="pt-2 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancelar</button>
                  <button type="submit" className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-md hover:bg-indigo-700">Crear Proyecto</button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}