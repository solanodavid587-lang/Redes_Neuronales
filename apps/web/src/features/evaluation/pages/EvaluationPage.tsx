import React, { useState } from 'react';
import { Download, Target, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import LineChart from '../components/LineChart';
import { EvaluationRun } from '../types';

// Generador de datos simulados para el gráfico
const generateMetrics = () => {
  return Array.from({ length: 20 }).map((_, i) => ({
    epoch: i + 1,
    trainLoss: Math.max(0.05, 1.5 * Math.exp(-0.15 * i)),
    valLoss: Math.max(0.15, 1.6 * Math.exp(-0.12 * i) + (i > 15 ? 0.1 : 0)), // Simula un poco de overfitting al final
    trainAcc: Math.min(0.99, 0.4 + 0.6 * (1 - Math.exp(-0.2 * i))),
    valAcc: Math.min(0.95, 0.35 + 0.6 * (1 - Math.exp(-0.18 * i))),
  }));
};

const mockRun: EvaluationRun = {
  id: 'eval-001',
  jobId: '1041',
  projectName: 'Clasificación de Imágenes Médicas',
  architecture: 'CNN',
  status: 'COMPLETED',
  metrics: generateMetrics(),
  confusionMatrix: {
    truePositive: 850,
    falsePositive: 45,
    trueNegative: 910,
    falseNegative: 30,
  }
};

export default function EvaluationPage() {
  const [run] = useState<EvaluationRun>(mockRun);

  // Calcular métricas derivadas
  const total = run.confusionMatrix.truePositive + run.confusionMatrix.falsePositive + run.confusionMatrix.trueNegative + run.confusionMatrix.falseNegative;
  const accuracy = ((run.confusionMatrix.truePositive + run.confusionMatrix.trueNegative) / total) * 100;
  const precision = (run.confusionMatrix.truePositive / (run.confusionMatrix.truePositive + run.confusionMatrix.falsePositive)) * 100;
  const recall = (run.confusionMatrix.truePositive / (run.confusionMatrix.truePositive + run.confusionMatrix.falseNegative)) * 100;

  // Preparar datos para el gráfico
  const lossData = run.metrics.map(m => ({ epoch: m.epoch, train: m.trainLoss, val: m.valLoss }));
  const accData = run.metrics.map(m => ({ epoch: m.epoch, train: m.trainAcc, val: m.valAcc }));

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Evaluación de Métricas</h1>
          <p className="text-sm text-slate-500 mt-1">Análisis de rendimiento para el Job <span className="font-mono font-medium text-slate-700">#{run.jobId}</span></p>
        </div>
        <button className="px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 shadow-sm transition-colors flex items-center justify-center gap-2">
          <Download size={16} /> Exportar Reporte PDF
        </button>
      </div>

      {/* TARJETAS DE RESUMEN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><Target size={24} /></div>
          <div>
            <p className="text-xs font-medium text-slate-500">Exactitud (Accuracy)</p>
            <p className="text-xl font-bold text-slate-900">{accuracy.toFixed(2)}%</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><TrendingUp size={24} /></div>
          <div>
            <p className="text-xs font-medium text-slate-500">Precisión</p>
            <p className="text-xl font-bold text-slate-900">{precision.toFixed(2)}%</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg"><AlertTriangle size={24} /></div>
          <div>
            <p className="text-xs font-medium text-slate-500">Sensibilidad (Recall)</p>
            <p className="text-xl font-bold text-slate-900">{recall.toFixed(2)}%</p>
          </div>
        </div>
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LineChart 
          data={lossData} 
          title="Curva de Pérdida (Loss)" 
          yLabel="Épocas" 
          colorTrain="#6366f1" // Indigo
          colorVal="#f43f5e"   // Rose (Para notar el overfitting)
        />
        <LineChart 
          data={accData} 
          title="Curva de Exactitud (Accuracy)" 
          yLabel="Épocas" 
          colorTrain="#6366f1" 
          colorVal="#10b981"   // Emerald
        />
      </div>

      {/* MATRIZ DE CONFUSIÓN Y DETALLES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Matriz Visual */}
        <div className="lg:col-span-2 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Matriz de Confusión (Test Set)</h3>
          
          <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto text-center text-sm">
            {/* Verdaderos Positivos */}
            <div className="bg-emerald-500 text-white p-4 rounded-lg flex flex-col justify-center shadow-inner">
              <span className="text-2xl font-bold">{run.confusionMatrix.truePositive}</span>
              <span className="text-xs opacity-90 mt-1">Verdadero Positivo</span>
            </div>
            {/* Falsos Positivos */}
            <div className="bg-red-400 text-white p-4 rounded-lg flex flex-col justify-center shadow-inner">
              <span className="text-2xl font-bold">{run.confusionMatrix.falsePositive}</span>
              <span className="text-xs opacity-90 mt-1">Falso Positivo</span>
            </div>
            {/* Falsos Negativos */}
            <div className="bg-red-400 text-white p-4 rounded-lg flex flex-col justify-center shadow-inner">
              <span className="text-2xl font-bold">{run.confusionMatrix.falseNegative}</span>
              <span className="text-xs opacity-90 mt-1">Falso Negativo</span>
            </div>
            {/* Verdaderos Negativos */}
            <div className="bg-emerald-500 text-white p-4 rounded-lg flex flex-col justify-center shadow-inner">
              <span className="text-2xl font-bold">{run.confusionMatrix.trueNegative}</span>
              <span className="text-xs opacity-90 mt-1">Verdadero Negativo</span>
            </div>
          </div>
        </div>

        {/* Observaciones del Modelo */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500" /> Veredicto del Modelo
          </h3>
          <div className="space-y-4 text-sm text-slate-600 flex-1">
            <p>El modelo muestra un rendimiento excelente en la clasificación de imágenes médicas. La exactitud del <strong className="text-slate-900">{accuracy.toFixed(1)}%</strong> supera el umbral requerido del 90%.</p>
            <div className="bg-slate-50 p-3 rounded border border-slate-100 text-xs">
              <span className="font-semibold text-slate-800 block mb-1">Observaciones técnicas:</span>
              <ul className="list-disc list-inside space-y-1 text-slate-500">
                <li>Ligero <em>overfitting</em> detectado después de la época 15.</li>
                <li>Se recomienda aplicar <em>Early Stopping</em> o aumentar el <em>Dropout</em>.</li>
              </ul>
            </div>
          </div>
          <button className="mt-4 w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-medium rounded-md transition-colors border border-indigo-200">
            Aprobar y Guardar en Registro (M08)
          </button>
        </div>

      </div>
    </div>
  );
}