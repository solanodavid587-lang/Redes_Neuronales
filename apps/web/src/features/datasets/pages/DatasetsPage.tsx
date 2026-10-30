import React, { useState } from 'react';
import { 
  Database, UploadCloud, Search, Filter, MoreVertical, 
  FileSpreadsheet, Image as ImageIcon, FileJson, FileText, HardDrive
} from 'lucide-react';
import { Dataset } from '../types';

// Datos Mock
const mockDatasets: Dataset[] = [
  {
    id: 'ds-001',
    name: 'ventas_historicas_2020_2026.csv',
    format: 'CSV',
    size: '12.4 MB',
    rows: 150000,
    status: 'READY',
    trainSplit: 80,
    valSplit: 20,
    uploadedAt: '2026-10-25'
  },
  {
    id: 'ds-002',
    name: 'radiografias_torax_png.zip',
    format: 'IMAGES',
    size: '2.1 GB',
    rows: 5800,
    status: 'READY',
    trainSplit: 70,
    valSplit: 30,
    uploadedAt: '2026-10-22'
  },
  {
    id: 'ds-003',
    name: 'transacciones_fraude.json',
    format: 'JSON',
    size: '450.0 MB',
    rows: 1200000,
    status: 'PROCESSING',
    trainSplit: 90,
    valSplit: 10,
    uploadedAt: '2026-10-28'
  }
];

export default function DatasetsPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDatasets = mockDatasets.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Función auxiliar para renderizar el ícono correcto
  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'CSV': return <FileSpreadsheet size={18} className="text-emerald-600" />;
      case 'IMAGES': return <ImageIcon size={18} className="text-blue-600" />;
      case 'JSON': return <FileJson size={18} className="text-amber-600" />;
      default: return <FileText size={18} className="text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Datasets</h1>
          <p className="text-sm text-slate-500 mt-1">Gestiona los datos de entrenamiento, validación y prueba.</p>
        </div>
        <button className="px-3.5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 shadow-sm transition-colors flex items-center justify-center gap-2">
          <UploadCloud size={16} /> Subir Dataset
        </button>
      </div>

      {/* INDICADOR DE ALMACENAMIENTO */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-6">
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
          <HardDrive size={24} />
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-end mb-1">
            <span className="text-sm font-semibold text-slate-800">Uso de Almacenamiento</span>
            <span className="text-xs text-slate-500">2.5 GB de 10 GB usados</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '25%' }}></div>
          </div>
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Buscar datasets por nombre..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm"
          />
        </div>
        <button className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 shadow-sm flex items-center justify-center gap-2">
          <Filter size={16} /> Filtros
        </button>
      </div>

      {/* TABLA DE DATASETS */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
            <tr>
              <th className="px-6 py-3 font-medium">Nombre del Archivo</th>
              <th className="px-6 py-3 font-medium">Formato</th>
              <th className="px-6 py-3 font-medium">Registros</th>
              <th className="px-6 py-3 font-medium">División (Train/Val)</th>
              <th className="px-6 py-3 font-medium">Estado</th>
              <th className="px-6 py-3 font-medium">Tamaño</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredDatasets.map((ds) => (
              <tr key={ds.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-md">
                      {getFormatIcon(ds.format)}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">{ds.name}</div>
                      <div className="text-slate-500 text-xs">Subido el {ds.uploadedAt}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[11px] font-medium">
                    {ds.format}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                  {ds.rows.toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-indigo-600 font-medium" title="Entrenamiento">{ds.trainSplit}%</span>
                    <span className="text-slate-300">/</span>
                    <span className="text-emerald-600 font-medium" title="Validación">{ds.valSplit}%</span>
                  </div>
                  <div className="w-full flex h-1.5 rounded-full overflow-hidden mt-1 max-w-[80px]">
                    <div className="bg-indigo-500" style={{ width: `${ds.trainSplit}%` }}></div>
                    <div className="bg-emerald-500" style={{ width: `${ds.valSplit}%` }}></div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full
                      ${ds.status === 'READY' ? 'bg-emerald-500' : ''}
                      ${ds.status === 'PROCESSING' ? 'bg-amber-500 animate-pulse' : ''}
                      ${ds.status === 'ERROR' ? 'bg-red-500' : ''}
                    `}></span>
                    <span className="font-medium text-slate-700 capitalize text-xs">
                      {ds.status === 'READY' ? 'Listo' : ds.status === 'PROCESSING' ? 'Procesando' : 'Error'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600 text-xs">
                  {ds.size}
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="p-1 text-slate-400 hover:text-slate-700 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}