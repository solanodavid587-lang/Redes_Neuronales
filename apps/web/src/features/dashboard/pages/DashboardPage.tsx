import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Zap, Clock, CheckCircle2, TrendingUp, ExternalLink, Activity, 
  Plus, ArrowUpRight, ArrowDownRight, AlertTriangle, XCircle, 
  Box, Inbox
} from 'lucide-react';
import { api, errorMessage } from '../../../lib/api';
import { ErrorState } from '../../../components/ui/Feedback';

// --- TIPOS ---
interface KpiData { 
  computeCost: string; 
  computeCostTrend: string; 
  avgTrainingTime: string; 
  avgTrainingTimeTrend: string; 
  jobSuccessRate: string; 
  jobSuccessRateTrend: string; 
  modelsInProduction: string; 
  modelsInProductionTrend: string; 
}

interface Job { 
  id: string; 
  projectName: string;
  architecture: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'QUEUED'; 
  progress: number; 
  epoch: number;
  totalEpochs: number;
  startedAt: string;
}

interface Alert { 
  id: number; 
  type: 'warning' | 'error' | 'info'; 
  msg: string; 
  time: string; 
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [kpis, setKpis] = useState<KpiData>({
    computeCost: '—',
    computeCostTrend: '—',
    avgTrainingTime: '—',
    avgTrainingTimeTrend: '—',
    jobSuccessRate: '—',
    jobSuccessRateTrend: '—',
    modelsInProduction: '0',
    modelsInProductionTrend: '—',
  });

  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<Alert[] | null>(null);

  useEffect(() => {
    let active = true;
    async function fetchDashboardData() {
      setIsLoading(true);
      setLoadError('');
      try {
        const summary = await api.get<{
          kpis: KpiData;
          recentJobs: Job[];
          alerts: Alert[] | null;
        }>('/dashboard/summary');
        if (!active) return;
        setKpis(summary.kpis);
        setRecentJobs(summary.recentJobs);
        setSystemAlerts(summary.alerts);
      } catch (error) {
        if (active) setLoadError(errorMessage(error));
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void fetchDashboardData();
    return () => { active = false; };
  }, [refreshKey]);

  // --- TARJETAS KPI ---
  const kpiCards = [
    { title: 'Costo de cómputo', value: kpis.computeCost, trend: kpis.computeCostTrend, isPositive: kpis.computeCostTrend.startsWith('-'), subtitle: kpis.computeCost === '—' ? 'Integración de costos pendiente' : 'vs. mes anterior', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
    { title: 'Tiempo medio de entrenamiento', value: kpis.avgTrainingTime, trend: kpis.avgTrainingTimeTrend, isPositive: kpis.avgTrainingTimeTrend.startsWith('-'), subtitle: kpis.avgTrainingTime === '—' ? 'Sin datos de duración' : 'por trabajo', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Tasa de éxito', value: kpis.jobSuccessRate, trend: kpis.jobSuccessRateTrend, isPositive: !kpis.jobSuccessRateTrend.startsWith('-'), subtitle: 'Entrenamientos completados', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Modelos aprobados', value: kpis.modelsInProduction, trend: kpis.modelsInProductionTrend, isPositive: !kpis.modelsInProductionTrend.startsWith('-'), subtitle: 'En el registro de modelos', icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Panel general</h1>
          <p className="text-sm text-slate-500 mt-1">Estado de los entrenamientos, modelos y métricas disponibles.</p>
        </div>
        <div className="flex gap-2">
          {/* BOTÓN: Redirige a /projects y envía el estado "openNew" */}
          <button 
            onClick={() => navigate('/projects', { state: { openNew: true } })}
            className="px-3.5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 shadow-sm transition-colors flex items-center gap-2"
          >
            <Plus size={16} /> Nuevo Proyecto
          </button>
        </div>
      </div>

      {/* TARJETAS KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[13px] font-medium text-slate-500">{kpi.title}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{kpi.value}</p>
                </div>
                <div className={`p-2 rounded-md ${kpi.bg} ${kpi.color}`}>
                  <Icon size={18} />
                </div>
              </div>
              <div className="mt-4 flex items-center text-[13px]">
                <span className={`flex items-center font-medium ${kpi.trend === '—' ? 'text-slate-400' : kpi.isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                  {kpi.trend === '—' ? null : kpi.isPositive ? <ArrowUpRight size={14} className="mr-1"/> : <ArrowDownRight size={14} className="mr-1"/>}
                  {kpi.trend}
                </span>
                <span className="text-slate-400 ml-1.5">{kpi.subtitle}</span>
              </div>
            </div>
          );
        })}
      </div>

      {loadError && <ErrorState message={loadError} onRetry={() => setRefreshKey(value => value + 1)} />}

      {/* SECCIÓN CENTRAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* TABLA DE ENTRENAMIENTOS */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-[15px] font-semibold text-slate-900">Trabajos Recientes</h2>
            <Link to="/training" className="text-[13px] text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
              Ver todo <ExternalLink size={12} />
            </Link>
          </div>
          
          <div className="flex-1 flex flex-col">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : recentJobs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3 font-medium">Trabajo</th>
                      <th className="px-5 py-3 font-medium">Arquitectura</th>
                      <th className="px-5 py-3 font-medium">Estado</th>
                      <th className="px-5 py-3 font-medium">Progreso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentJobs.map((job) => (
                      <tr key={job.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-slate-900">{job.projectName}</div>
                          <div className="text-slate-500 text-xs flex items-center gap-2 mt-0.5">
                            <span>{job.id}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <span>{new Date(job.startedAt).toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="border border-slate-200 text-slate-600 px-2 py-0.5 rounded text-[11px] font-medium bg-white">
                            {job.architecture}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full
                              ${job.status === 'RUNNING' ? 'bg-amber-500 animate-pulse' : ''}
                              ${job.status === 'COMPLETED' ? 'bg-emerald-500' : ''}
                              ${job.status === 'FAILED' ? 'bg-red-500' : ''}
                              ${job.status === 'QUEUED' ? 'bg-slate-400' : ''}
                            `}></span>
                            <span className="font-medium text-slate-700 capitalize text-xs">
                              {job.status === 'RUNNING' ? 'Ejecutando' : 
                               job.status === 'COMPLETED' ? 'Completado' : 
                               job.status === 'FAILED' ? 'Fallido' : 'En Cola'}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-full bg-slate-100 rounded-full h-1.5 max-w-[80px]">
                              <div 
                                className={`h-1.5 rounded-full ${job.status === 'FAILED' ? 'bg-red-500' : 'bg-indigo-500'}`} 
                                style={{ width: `${job.progress}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-slate-500 w-10">{job.epoch}/{job.totalEpochs}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                  <Inbox size={24} className="text-slate-400" />
                </div>
                <h3 className="text-sm font-medium text-slate-900">No hay entrenamientos recientes</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-[250px]">Cuando un worker CNN/RNN comunique métricas, aparecerán aquí en tiempo real.</p>
                <Link to="/training" className="mt-4 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors">
                  Ir a Entrenamientos
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* PANEL DE ALERTAS */}
        <div className="bg-[#0f172a] rounded-lg shadow-sm border border-slate-800 flex flex-col overflow-hidden text-slate-300">
          <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center bg-[#0b1120]">
            <h2 className="text-[14px] font-medium text-white flex items-center gap-2">
              <Activity size={16} className="text-indigo-400" /> Alertas del Sistema
            </h2>
            <span className={`text-[11px] font-mono px-2 py-0.5 rounded ${systemAlerts?.length ? 'text-amber-400 bg-amber-400/10' : 'text-slate-500 bg-slate-800'}`}>
              {systemAlerts === null ? 'No configuradas' : `${systemAlerts.length} Pendientes`}
            </span>
          </div>
          
          <div className="p-5 flex-1 space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-400"></div>
              </div>
            ) : systemAlerts === null ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Activity size={24} className="mb-2 text-slate-500" />
                <p className="text-[13px] text-slate-300">Alertas no configuradas.</p>
                <p className="text-[11px] text-slate-500">Conecta un servicio de monitoreo para habilitarlas.</p>
              </div>
            ) : systemAlerts.length > 0 ? (
              systemAlerts.map(alert => (
                <div key={alert.id} className="flex gap-3 items-start">
                  <div className="mt-0.5">
                    {alert.type === 'warning' && <AlertTriangle size={16} className="text-amber-500" />}
                    {alert.type === 'error' && <XCircle size={16} className="text-red-500" />}
                    {alert.type === 'info' && <Box size={16} className="text-indigo-400" />}
                  </div>
                  <div>
                    <p className="text-[13px] text-slate-200 leading-snug">{alert.msg}</p>
                    <p className="text-[11px] text-slate-500 mt-1 font-mono">{alert.time}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CheckCircle2 size={24} className="text-emerald-500 mb-2 opacity-50" />
                <p className="text-[13px] text-slate-400">Todo en orden.</p>
                <p className="text-[11px] text-slate-500">No hay alertas pendientes.</p>
              </div>
            )}
          </div>
          
          <div className="p-3 bg-[#0b1120] border-t border-slate-800 text-center">
            <Link to="/admin" className="text-[12px] text-slate-400 hover:text-white transition-colors">
              Ir al panel de administración &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}