import React, { useState } from 'react';
import { 
  FileText, Download, FileSpreadsheet, FolderKanban, 
  BrainCircuit, PlayCircle, Package, Clock, CheckCircle2, AlertCircle, Inbox
} from 'lucide-react';
import { ReportTemplate, GeneratedReport, ReportFormat } from '../types';

// Plantillas fijas (esto no cambia)
const templates: ReportTemplate[] = [
  { id: 't1', title: 'Ficha de Proyecto', description: 'Resumen ejecutivo del proyecto, datasets asociados y modelos generados.', icon: 'project' },
  { id: 't2', title: 'Resumen de Arquitectura', description: 'Detalle de capas, parámetros y configuración de la red neuronal.', icon: 'architecture' },
  { id: 't3', title: 'Historial de Entrenamiento', description: 'Logs completos, curvas de pérdida y métricas por época.', icon: 'training' },
  { id: 't4', title: 'Auditoría de Modelos', description: 'Trazabilidad de versiones, checksums y estado de aprobación.', icon: 'model' },
];

export default function ReportsPage() {
  // ESTADO VACÍO INICIAL: Aquí conectarás tu API
  const [recentReports, setRecentReports] = useState<GeneratedReport[]>([]);

  // Función para generar un reporte (Simula el backend asíncrono)
  const handleGenerate = (template: ReportTemplate, format: ReportFormat) => {
    const newReportId = `r-${Date.now()}`;
    const newReport: GeneratedReport = {
      id: newReportId,
      name: `${template.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`,
      format,
      status: 'GENERATING',
      size: '--',
      requestedBy: 'David Admin', // Vendría del Auth Context
      date: 'Hace un momento',
    };

    // Agregamos el reporte a la tabla en estado "Generando"
    setRecentReports(prev => [newReport, ...prev]);

    // Simulamos el tiempo del worker de Python (2 segundos)
    setTimeout(() => {
      setRecentReports(prev => prev.map(r => 
        r.id === newReportId 
          ? { ...r, status: 'READY', size: format === 'PDF' ? '1.2 MB' : '450 KB' } 
          : r
      ));
    }, 2000);
  };

  // Función para descargar un reporte ya listo
  const handleDownload = (report: GeneratedReport) => {
    // En un entorno real, esto haría un fetch al endpoint de descarga de FastAPI/Supabase
    const content = `Reporte: ${report.name}\nFecha: ${new Date().toLocaleString()}\nFormato: ${report.format}`;
    const blob = new Blob([content], { type: report.format === 'PDF' ? 'application/pdf' : 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.name}.${report.format.toLowerCase()}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // Renderiza el ícono según la plantilla
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
            <div key={tpl.id} className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all flex flex-col group">
              <div className="p-2.5 bg-slate-50 rounded-lg w-fit mb-4 group-hover:bg-indigo-50 transition-colors">
                {getTemplateIcon(tpl.icon)}
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">{tpl.title}</h3>
              <p className="text-xs text-slate-500 flex-1 mb-4">{tpl.description}</p>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => handleGenerate(tpl, 'PDF')}
                  className="flex-1 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors flex items-center justify-center gap-1.5"
                >
                  <FileText size={12} /> PDF
                </button>
                <button 
                  onClick={() => handleGenerate(tpl, 'CSV')}
                  className="flex-1 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors flex items-center justify-center gap-1.5"
                >
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
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden min-h-[250px] flex flex-col">
          {recentReports.length > 0 ? (
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
                      <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${report.format === 'PDF' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                        {report.format}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        {report.status === 'READY' && <CheckCircle2 size={14} className="text-emerald-500" />}
                        {report.status === 'GENERATING' && <Clock size={14} className="text-amber-500 animate-pulse" />}
                        <span className="font-medium text-slate-700 text-xs">
                          {report.status === 'READY' ? 'Listo' : 'Generando...'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-xs">{report.requestedBy}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{report.date}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDownload(report)}
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
          ) : (
            // ESTADO VACÍO
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                <Inbox size={24} className="text-slate-300" />
              </div>
              <h3 className="text-sm font-medium text-slate-900">No hay exportaciones recientes</h3>
              <p className="text-xs text-slate-500 mt-1">Selecciona una plantilla arriba para generar tu primer reporte.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}