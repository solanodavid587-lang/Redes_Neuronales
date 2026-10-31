import React, { useState } from 'react';
import { Download, Target, TrendingUp, AlertTriangle, CheckCircle2, Inbox, FileSpreadsheet } from 'lucide-react';
import LineChart from '../components/LineChart';
import { EvaluationRun } from '../types';

export default function EvaluationPage() {
  // Simulamos que el usuario tiene que seleccionar un Job de la lista
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  
  // ESTADO VACÍO: Aquí se llenará con el fetch a la API
  const [run, setRun] = useState<EvaluationRun | null>(null);

  // Función para exportar CSV (Simula la descarga desde el backend)
  const handleExport = () => {
    if (!run) return;
    
    // Generamos un CSV falso
    const csvContent = "data:text/csv;charset=utf-8,Epoch,TrainLoss,ValLoss,TrainAcc,ValAcc\n" +
      run.metrics.map(m => `${m.epoch},${m.trainLoss},${m.valLoss},${m.trainAcc},${m.valAcc}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `metricas_job_${run.jobId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER CON SELECTOR DE JOB */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Evaluación de Métricas</h1>
          <p className="text-sm text-slate-500 mt-1">Analiza el rendimiento de tus modelos entrenados.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            value={selectedJobId}
            onChange={(e) => {
              setSelectedJobId(e.target.value);
              // Aquí harías el fetch con e.target.value
              // setRun(null); 
            }}
            className="text-sm border border-slate-300 rounded-md py-2 px-3 bg-white focus:ring-2 focus:ring-indigo-500 outline-none min-w-[200px]"
          >
            <option value="">Seleccionar Entrenamiento (Job)...</option>
            {/* Estos se llenarán desde la API de jobs completados */}
            <option value="1041">#1041 - Clasificación Imágenes</option>
            <option value="1038">#1038 - Predicción Ventas</option>
          </select>
          
          <button 
            onClick={handleExport}
            disabled={!run}
            className="px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Download size={16} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      {run ? (
        <>
          {/* TARJETAS DE RESUMEN */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><Target size={24} /></div>
              <div>
                <p className="text-xs font-medium text-slate-500">Exactitud (Accuracy)</p>
                <p className="text-xl font-bold text-slate-900">
                  {((run.confusionMatrix?.truePositive! + run.confusionMatrix?.trueNegative!) / 
                    (run.confusionMatrix?.truePositive! + run.confusionMatrix?.trueNegative! + run.confusionMatrix?.falsePositive! + run.confusionMatrix?.falseNegative!) * 100).toFixed(2)}%
                </p>
              </div>
            </div>
            {/* ... Otras 2 tarjetas de precisión y recall ... */}
          </div>

          {/* GRÁFICOS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LineChart 
              data={run.metrics.map(m => ({ epoch: m.epoch, train: m.trainLoss, val: m.valLoss }))} 
              title="Curva de Pérdida (Loss)" 
              yLabel="Épocas" 
              colorTrain="#6366f1" 
              colorVal="#f43f5e" 
            />
            <LineChart 
              data={run.metrics.map(m => ({ epoch: m.epoch, train: m.trainAcc, val: m.valAcc }))} 
              title="Curva de Exactitud (Accuracy)" 
              yLabel="Épocas" 
              colorTrain="#6366f1" 
              colorVal="#10b981" 
            />
          </div>
        </>
      ) : (
        // ESTADO VACÍO (Si no se ha seleccionado un Job)
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
            <Inbox size={32} className="text-slate-300" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Ningún entrenamiento seleccionado</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">Selecciona un Job completado en el menú superior para visualizar sus métricas y matriz de confusión.</p>
        </div>
      )}

    </div>
  );
}