import React, { useState } from 'react';
import { Search, Plus, Filter, FolderKanban } from 'lucide-react';
import ProjectCard from '../components/ProjectCard';
import { Project } from '../types';


// Datos Mock (Luego se conectarán al backend)
const mockProjects: Project[] = [
  {
    id: '1',
    name: 'Predicción de Ventas Q4',
    description: 'Modelo de regresión para predecir el volumen de ventas del próximo trimestre basado en históricos.',
    status: 'ACTIVE',
    owner: 'David Admin',
    createdAt: '2026-10-01',
    modelsCount: 4,
    datasetsCount: 2,
    lastActivity: 'Hace 2 horas'
  },
  {
    id: '2',
    name: 'Clasificación de Imágenes Médicas',
    description: 'Red convolucional para detectar neumonía en radiografías de tórax.',
    status: 'ACTIVE',
    owner: 'David Admin',
    createdAt: '2026-09-15',
    modelsCount: 12,
    datasetsCount: 5,
    lastActivity: 'Ayer'
  },
  {
    id: '3',
    name: 'Detección de Fraude Transaccional',
    description: 'Red recurrente para analizar secuencias de transacciones y detectar anomalías en tiempo real.',
    status: 'DRAFT',
    owner: 'David Admin',
    createdAt: '2026-10-20',
    modelsCount: 0,
    datasetsCount: 1,
    lastActivity: 'Hace 3 días'
  },
  {
    id: '4',
    name: 'Generación de Textos Publicitarios',
    description: 'GAN condicional para generar copys de marketing personalizados.',
    status: 'ARCHIVED',
    owner: 'David Admin',
    createdAt: '2026-08-01',
    modelsCount: 8,
    datasetsCount: 3,
    lastActivity: 'Hace 1 mes'
  }
];

export default function ProjectsPage() {
  const [searchTerm, setSearchTerm] = useState('');

  // Lógica de filtrado simple
  const filteredProjects = mockProjects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* HEADER DE LA PÁGINA */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Proyectos</h1>
          <p className="text-sm text-slate-500 mt-1">Administra tus espacios de trabajo y experimentos de IA.</p>
        </div>
        <button className="px-3.5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 shadow-sm transition-colors flex items-center justify-center gap-2">
          <Plus size={16} /> Nuevo Proyecto
        </button>
      </div>

      {/* BARRA DE HERRAMIENTAS (Buscador y Filtros) */}
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

      {/* CUADRÍCULA DE PROYECTOS */}
      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredProjects.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-lg border border-slate-200 border-dashed">
          <FolderKanban size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No se encontraron proyectos</h3>
          <p className="text-slate-500 mt-1">Prueba con otro término de búsqueda o crea un nuevo proyecto.</p>
        </div>
      )}
    </div>
  );
}