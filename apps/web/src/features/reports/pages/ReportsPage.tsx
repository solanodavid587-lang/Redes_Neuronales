import React from 'react';
import { 
  FileText, Download, FileSpreadsheet, FolderKanban, 
  BrainCircuit, PlayCircle, Package, Clock, CheckCircle2, AlertCircle 
} from 'lucide-react';
import { ReportTemplate, GeneratedReport } from '../types';

// Datos Mock
const templates: ReportTemplate[] = [
  { 
    id: 't1', 
    title: 'Ficha de Proyecto', 
    description: 'Resumen ejecutivo del proyecto, datasets asociados y modelos generados.', 
    icon: 'project' 
  },
  { 
    id: 't2', 
    title: 'Resumen de Arquitectura', 
    description: 'Detalle de capas, parámetros y configuración de la red neuronal.', 
    icon: 'architecture' 
  },
  { 
    id: 't3', 
    title: 'Historial de Entrenamiento', 
    description: 'Logs completos, curvas de pérdida y métricas por época.', 
    icon: 'training' 
  },
  { 
    id: 't4', 
    title: 'Auditoría de Modelos', 
    description: 'Trazabilidad de versiones, checksums y estado de aprobación.', 
    icon: 'model' 
  },
];

const recentReports: GeneratedReport[] = [
  { id: 'r-101', name: 'Reporte_Prediccion_Ventas_Q4', format: 'PDF', status: 'READY', size: '2.4 MB', requestedBy: 'David Admin', date: 'Hace 10 min' },
  { id: 'r-102', name: 'Metricas_CNN_Radiografias', format: 'CSV', status: 'READY', size: '450 KB', requestedBy: 'Ana Torres', date: 'Hace 2 horas' },
  { id: 'r-103', name: 'Auditoria_Modelos_Octubre', format: 'PDF', status: 'GENERATING', size: '--', requestedBy: 'David Admin', date: 'Hace 5 min' },
];

export default function ReportsPage() {
  // Función para renderizar el ícono correcto según la plantilla
  const getTemplateIcon = (type: string) => {
    switch (type) {
      case 'project': return <FolderKanban size={24} className="text-indigo-600" />;
      case 'architecture': return <BrainCircuit size={24} className="text-blue-600" />;
      case 'training': return <PlayCircle size={24} className="text-amber-600" />;
      case 'model': return <Package size={24} className="text-emerald-600" />;
      default: return <FileText size={24} className="text-slate-600" />;
    }
  };

  return (
    <div className="space-y-8">
      
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Centro de Reportes</h1>
        <p className="text-sm text-slate-500 mt-1">Genera documentos de auditoría, resúmenes ejecutivos y exportaciones de datos.</p>
      </div>

      {/* PLANTILLAS DE REPORTES */}
      <div>
        <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <FileText size={16} className="text-slate-500" /> Plantillas Disponibles
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {templates.map((tpl) => (
            <div key={tpl.id} className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all flex flex-col group cursor-pointer">
              <div className="p-2.5 bg-slate-50 rounded-lg w-fit mb-4 group-hover:bg-indigo-50 transition-colors">
                {getTemplateIcon(tpl.icon)}
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">{tpl.title}</h3>
              <p className="text-xs text-slate-500 flex-1 mb-4">{tpl.description}</p>
              
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="flex-1 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors flex items-center justify-center gap-1.5">
                  <FileText size={12} /> PDF
                </button>
                <button className="flex-1 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors flex items-center justify-center gap-1.5">
                  <FileSpreadsheet size={12} /> CSV
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* HISTORIAL DE EXPORTACIONES */}
      <div>
        <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Clock size={16} className="text-slate-500" /> Exportaciones Recientes
        </h2>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">Nombre del Archivo</th>
                <th className="px-6 py-3 font-medium">Formato</th>
                <th className="px-6 py-3 font-medium">Estado</th>
                <th className="px-6 py-3 font-medium">Solicitado por</th>
                <th className="px-6 py-3 font-medium">Fecha</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentReports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-2">
                    <FileText size={16} className="text-slate-400" />
                    {report.name}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium border
                      ${report.format === 'PDF' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}
                    `}>
                      {report.format}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      {report.status === 'READY' && <CheckCircle2 size={14} className="text-emerald-500" />}
                      {report.status === 'GENERATING' && <Clock size={14} className="text-amber-500 animate-pulse" />}
                      {report.status === 'FAILED' && <AlertCircle size={14} className="text-red-500" />}
                      <span className="font-medium text-slate-700 text-xs">
                        {report.status === 'READY' ? 'Listo' : report.status === 'GENERATING' ? 'Generando...' : 'Fallido'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 text-xs">
                    {report.requestedBy}
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    {report.date}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      disabled={report.status !== 'READY'}
                      className={`p-1.5 rounded transition-colors ${report.status === 'READY' ? 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50' : 'text-slate-200 cursor-not-allowed'}`}
                    >
                      <Download size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}