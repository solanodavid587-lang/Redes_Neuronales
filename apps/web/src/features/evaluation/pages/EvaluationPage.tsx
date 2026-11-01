import { useEffect, useMemo, useState } from 'react';
import { Download, Inbox } from 'lucide-react';
import LineChart from '../components/LineChart';
import type { TrainingJob } from '../../training/types';
import { api, errorMessage, type Page } from '../../../lib/api';
import { ErrorState, LoadingState } from '../../../components/ui/Feedback';

interface MetricPoint {
  epoch: number;
  trainLoss: number;
  valLoss: number;
  trainAcc: number;
  valAcc: number;
}

export default function EvaluationPage() {
  const [jobs, setJobs] = useState<TrainingJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [metrics, setMetrics] = useState<MetricPoint[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get<Page<TrainingJob>>('/training-jobs?limit=100')
      .then(result => {
        if (!active) return;
        const completedJobs = result.items.filter(job => job.status === 'COMPLETED');
        setJobs(completedJobs);
        if (completedJobs.length) setSelectedJobId(completedJobs[0].id);
      })
      .catch(requestError => { if (active) setError(errorMessage(requestError)); })
      .finally(() => { if (active) setLoadingJobs(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedJobId) {
      setMetrics([]);
      return;
    }
    let active = true;
    setLoadingMetrics(true);
    setError('');
    api.get<{ items: MetricPoint[] }>(`/training-jobs/${selectedJobId}/metrics`)
      .then(result => { if (active) setMetrics(result.items); })
      .catch(requestError => { if (active) setError(errorMessage(requestError)); })
      .finally(() => { if (active) setLoadingMetrics(false); });
    return () => { active = false; };
  }, [selectedJobId]);

  const selectedJob = jobs.find(job => job.id === selectedJobId);
  const latest = metrics[metrics.length - 1];
  const chartLoss = useMemo(() => metrics.map(metric => ({
    epoch: metric.epoch, train: metric.trainLoss, val: metric.valLoss,
  })), [metrics]);
  const chartAccuracy = useMemo(() => metrics.map(metric => ({
    epoch: metric.epoch, train: metric.trainAcc, val: metric.valAcc,
  })), [metrics]);

  function exportCsv() {
    if (!metrics.length || !selectedJob) return;
    const rows = [
      ['epoch', 'train_loss', 'validation_loss', 'train_accuracy', 'validation_accuracy'],
      ...metrics.map(metric => [metric.epoch, metric.trainLoss, metric.valLoss, metric.trainAcc, metric.valAcc]),
    ];
    const csv = `\uFEFF${rows.map(row => row.join(',')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `metricas_${selectedJob.id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Evaluación de métricas</h1>
          <p className="mt-1 text-sm text-slate-500">Compara las curvas de entrenamiento de trabajos completados.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select value={selectedJobId} onChange={event => setSelectedJobId(event.target.value)} aria-label="Seleccionar entrenamiento completado" disabled={loadingJobs || !jobs.length} className="min-w-60 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-50">
            {!jobs.length && <option value="">No hay trabajos completados</option>}
            {jobs.map(job => <option key={job.id} value={job.id}>#{job.id} · {job.projectName}</option>)}
          </select>
          <button onClick={exportCsv} disabled={!metrics.length} className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Download size={16} /> Exportar CSV</button>
        </div>
      </header>

      {error && <ErrorState message={error} />}
      {loadingJobs || loadingMetrics ? <LoadingState label="Cargando métricas…" /> : selectedJob && metrics.length ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Exactitud (accuracy)', value: latest ? `${(latest.valAcc * 100).toFixed(2)}%` : '—', color: 'text-emerald-600', detail: 'Aciertos sobre el total' },
              { label: 'Precisión (macro)', value: selectedJob.precision == null ? '—' : `${(selectedJob.precision * 100).toFixed(2)}%`, color: 'text-sky-600', detail: 'Controla falsos positivos' },
              { label: 'Recall (macro)', value: selectedJob.recall == null ? '—' : `${(selectedJob.recall * 100).toFixed(2)}%`, color: 'text-amber-600', detail: 'Controla falsos negativos' },
              { label: 'F1-score (macro)', value: selectedJob.f1Score == null ? '—' : `${(selectedJob.f1Score * 100).toFixed(2)}%`, color: 'text-violet-600', detail: 'Balance entre precisión y recall' },
            ].map(metric => (
              <article key={metric.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-medium text-slate-500">{metric.label}</p>
                <p className={`mt-2 text-2xl font-bold tracking-tight ${metric.color}`}>{metric.value}</p>
                <p className="mt-1 text-xs text-slate-500">{metric.detail}</p>
              </article>
            ))}
          </section>
          <section className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Pérdida de validación</h2>
              <p className="mt-1 text-xs text-slate-500">{selectedJob.projectName} · {selectedJob.architecture} · {metrics.length} épocas</p>
            </div>
            <p className="font-mono text-2xl font-bold text-rose-600">{latest?.valLoss.toFixed(4) ?? '—'}</p>
          </section>
          <section className="grid gap-6 lg:grid-cols-2">
            <LineChart data={chartLoss} title="Curva de pérdida" yLabel="Época" colorTrain="#818cf8" colorVal="#fb7185" minDomain={0} />
            <LineChart data={chartAccuracy} title="Curva de exactitud" yLabel="Época" colorTrain="#818cf8" colorVal="#34d399" minDomain={0} maxDomain={1} />
          </section>
          {selectedJob.confusionMatrix?.length ? (
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">Matriz de confusión</h2>
                  <p className="mt-1 text-xs text-slate-500">Filas: clase real · columnas: predicción · promedio macro para precisión, recall y F1</p>
                </div>
                <span className="text-xs text-slate-500">{selectedJob.modelFamily} · validación</span>
              </div>
              <div className="overflow-x-auto">
                <table className="mx-auto border-separate border-spacing-1 text-center text-xs">
                  <thead>
                    <tr><th className="min-w-24 px-3 py-2 text-slate-500">Real ↓ / Pred. →</th>
                      {selectedJob.confusionMatrix.map((_, index) => <th key={index} className="min-w-12 px-3 py-2 font-medium text-slate-700">{index}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedJob.confusionMatrix.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        <th className="px-3 py-2 font-medium text-slate-700">{rowIndex}</th>
                        {row.map((count, columnIndex) => {
                          const peak = Math.max(1, ...selectedJob.confusionMatrix!.flat());
                          const intensity = Math.round(18 + (count / peak) * 55);
                          return <td key={columnIndex} className={`rounded-md px-3 py-2 font-mono ${rowIndex === columnIndex ? 'text-emerald-950' : 'text-rose-950'}`} style={{ backgroundColor: rowIndex === columnIndex ? `rgb(16 185 129 / ${intensity}%)` : `rgb(244 63 94 / ${intensity}%)` }}>{count}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <div className="flex min-h-80 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-6 text-center shadow-sm">
          <Inbox size={36} className="mb-4 text-slate-400" />
          <h2 className="font-semibold text-slate-900">No hay métricas para evaluar</h2>
          <p className="mt-1 max-w-sm text-sm text-slate-500">Completa un entrenamiento y asegúrate de que el worker haya enviado métricas por época.</p>
        </div>
      )}
    </div>
  );
}
