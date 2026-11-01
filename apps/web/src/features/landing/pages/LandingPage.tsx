import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, ArrowDown, ArrowRight, BarChart3, Boxes, BrainCircuit,
  Check, CircleHelp, Database, FileText, Fingerprint, FolderKanban,
  Layers3, LockKeyhole, Network, Package, PlayCircle, ShieldCheck,
  Workflow,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Logo from '../../../components/ui/Logo';
import { api } from '../../../lib/api';
import { useAuth } from '../../../auth/AuthProvider';

type HealthStatus = 'checking' | 'ready' | 'unavailable';

const modules = [
  {
    icon: Activity,
    title: 'Dashboard y monitoreo',
    description: 'Resumen de trabajos recientes, métricas operativas y modelos aprobados.',
    status: 'Disponible',
    color: 'bg-indigo-50 text-indigo-600',
  },
  {
    icon: FolderKanban,
    title: 'Proyectos',
    description: 'Organización de experimentos, descripción, estado y recursos asociados.',
    status: 'Disponible',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: Database,
    title: 'Datasets',
    description: 'Registro de datasets y carga de archivos CSV, JSON, ZIP o TXT a Storage.',
    status: 'Disponible',
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    icon: BrainCircuit,
    title: 'Diseñador de arquitecturas',
    description: 'Diseño de capas CNN y RNN con topología, forma de entrada y validación estructural.',
    status: 'Disponible',
    color: 'bg-violet-50 text-violet-600',
  },
  {
    icon: PlayCircle,
    title: 'Cola de entrenamiento',
    description: 'Creación de trabajos y seguimiento de épocas y métricas comunicadas por un worker.',
    status: 'Requiere worker ML',
    color: 'bg-amber-50 text-amber-700',
  },
  {
    icon: BarChart3,
    title: 'Evaluación',
    description: 'Visualización de pérdida y exactitud, además de exportación de métricas CSV.',
    status: 'Disponible con métricas',
    color: 'bg-cyan-50 text-cyan-700',
  },
  {
    icon: Package,
    title: 'Registro de modelos',
    description: 'Versiones, metadatos, checksum y transiciones de revisión del ciclo de vida.',
    status: 'Metadatos',
    color: 'bg-rose-50 text-rose-600',
  },
  {
    icon: FileText,
    title: 'Reportes y auditoría',
    description: 'Solicitudes persistidas y registro de acciones. La generación de archivos requiere un worker.',
    status: 'Solicitudes',
    color: 'bg-orange-50 text-orange-700',
  },
];

const platformLayers = [
  {
    number: '01',
    title: 'Experiencia web',
    description: 'Interfaz React y TypeScript con vistas adaptables para cada módulo.',
    technology: 'React · TypeScript · Vite',
    icon: Layers3,
  },
  {
    number: '02',
    title: 'API de aplicación',
    description: 'FastAPI valida solicitudes, protege rutas y aplica aislamiento por usuario.',
    technology: 'FastAPI · JWT · OpenAPI',
    icon: Network,
  },
  {
    number: '03',
    title: 'Persistencia y archivos',
    description: 'PostgreSQL mediante el Session Pooler de Supabase y bucket privado para datasets.',
    technology: 'PostgreSQL · Supabase Storage',
    icon: Database,
  },
  {
    number: '04',
    title: 'Procesamiento asíncrono',
    description: 'Los workers ejecutan entrenamiento y generación de archivos cuando se conectan.',
    technology: 'Worker ML · Métricas por época',
    icon: Boxes,
  },
];

const workflow = [
  { title: 'Organiza', text: 'Crea un proyecto y centraliza los recursos del experimento.' },
  { title: 'Prepara', text: 'Carga un dataset y construye una arquitectura neuronal.' },
  { title: 'Entrena', text: 'Encola el trabajo para un worker y recibe su progreso.' },
  { title: 'Evalúa', text: 'Compara métricas, registra versiones y consulta auditoría.' },
];

export default function LandingPage() {
  const { user } = useAuth();
  const [health, setHealth] = useState<HealthStatus>('checking');

  useEffect(() => {
    let active = true;
    api.get<{ status: string }>('/health/ready')
      .then(result => { if (active) setHealth(result.status === 'ready' ? 'ready' : 'unavailable'); })
      .catch(() => { if (active) setHealth('unavailable'); });
    return () => { active = false; };
  }, []);

  const loginPath = user ? '/dashboard' : '/login';

  return (
    <div className="min-h-screen overflow-hidden bg-white text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="#inicio" className="flex items-center gap-2.5" aria-label="NeuroLab, inicio">
            <span className="rounded-lg bg-slate-950 p-2"><Logo className="h-5 w-5" /></span>
            <span className="text-sm font-bold tracking-tight">NeuroLab <span className="font-normal text-slate-500">Enterprise</span></span>
          </a>
          <nav className="hidden items-center gap-7 md:flex" aria-label="Navegación de la página">
            <a href="#plataforma" className="text-sm text-slate-600 transition hover:text-indigo-600">Plataforma</a>
            <a href="#modulos" className="text-sm text-slate-600 transition hover:text-indigo-600">Módulos</a>
            <a href="#arquitectura" className="text-sm text-slate-600 transition hover:text-indigo-600">Arquitectura</a>
            <a href="#seguridad" className="text-sm text-slate-600 transition hover:text-indigo-600">Seguridad</a>
          </nav>
          <Link to={loginPath} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
            {user ? 'Ir al panel' : 'Iniciar sesión'} <ArrowRight size={15} />
          </Link>
        </div>
      </header>

      <main>
        <section id="inicio" className="relative isolate border-b border-slate-100 bg-slate-950">
          <div className="absolute inset-0 -z-10 opacity-60" aria-hidden="true">
            <div className="absolute -right-36 -top-56 h-[36rem] w-[36rem] rounded-full bg-indigo-600/30 blur-3xl" />
            <div className="absolute -bottom-64 left-1/4 h-[32rem] w-[32rem] rounded-full bg-violet-600/20 blur-3xl" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,.08)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
          </div>
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-32">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-300/20 bg-indigo-400/10 px-3 py-1.5 text-xs font-medium text-indigo-200">
                <span className={`h-1.5 w-1.5 rounded-full ${health === 'ready' ? 'bg-emerald-400' : health === 'unavailable' ? 'bg-rose-400' : 'animate-pulse bg-amber-300'}`} />
                {health === 'ready' ? 'API y base de datos disponibles' : health === 'unavailable' ? 'Estado del backend no disponible' : 'Comprobando disponibilidad del sistema'}
              </div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-indigo-300">Plataforma para operaciones de IA</p>
              <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Del experimento al modelo, <span className="bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-transparent">en un solo espacio.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                NeuroLab Enterprise reúne proyectos, datasets, diseño de redes neuronales,
                trabajos de entrenamiento y evaluación en una plataforma con acceso protegido
                y trazabilidad de recursos.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to={loginPath} className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-950/30 transition hover:bg-indigo-400">
                  {user ? 'Abrir mi espacio de trabajo' : 'Acceder al espacio de trabajo'} <ArrowRight size={16} />
                </Link>
                <a href="#modulos" className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-white/5">
                  Explorar módulos <ArrowDown size={16} />
                </a>
              </div>
              <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-xs text-slate-400">
                <span className="inline-flex items-center gap-2"><ShieldCheck size={15} className="text-emerald-400" /> Acceso autenticado</span>
                <span className="inline-flex items-center gap-2"><Database size={15} className="text-indigo-300" /> PostgreSQL en Supabase</span>
                <span className="inline-flex items-center gap-2"><Activity size={15} className="text-violet-300" /> Métricas de entrenamiento</span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl">
              <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-indigo-500/20 to-violet-500/10 blur-2xl" />
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/90 shadow-2xl shadow-black/30">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg bg-indigo-500/15 p-2 text-indigo-300"><Activity size={18} /></span>
                    <div><p className="text-sm font-semibold text-white">NeuroLab Workspace</p><p className="text-xs text-slate-400">Vista general de la plataforma</p></div>
                  </div>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-medium text-emerald-300">OPERACIONES ML</span>
                </div>
                <div className="grid grid-cols-2 gap-3 p-5">
                  <OverviewTile icon={FolderKanban} label="Proyectos" value="Organizados" detail="Experimentos y recursos" />
                  <OverviewTile icon={Database} label="Datasets" value="Centralizados" detail="Archivos y particiones" />
                  <OverviewTile icon={BrainCircuit} label="Arquitecturas" value="Configurables" detail="CNN · RNN" />
                  <OverviewTile icon={BarChart3} label="Evaluación" value="Trazable" detail="Curvas y métricas por época" />
                </div>
                <div className="mx-5 mb-5 rounded-xl border border-white/10 bg-slate-950/70 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div><p className="text-xs font-medium text-slate-300">Ciclo de trabajo</p><p className="mt-1 text-[11px] text-slate-500">Un flujo desde los datos hasta la revisión</p></div>
                    <Workflow size={18} className="text-indigo-300" />
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    {workflow.map((step, index) => (
                      <div key={step.title} className="flex min-w-0 flex-1 items-center">
                        <div className="min-w-0 text-center">
                          <div className="mx-auto mb-2 flex h-7 w-7 items-center justify-center rounded-full border border-indigo-400/30 bg-indigo-500/15 text-[10px] font-bold text-indigo-200">{index + 1}</div>
                          <p className="truncate text-[10px] font-medium text-slate-300">{step.title}</p>
                        </div>
                        {index < workflow.length - 1 && <div className="mx-1 mb-5 h-px flex-1 bg-slate-700" />}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 border-t border-white/10 px-5 py-3 text-[11px] text-slate-500">
                  <LockKeyhole size={13} className="text-emerald-400" />
                  Las rutas internas requieren una sesión válida emitida por el backend.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="plataforma" className="scroll-mt-20 py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Una plataforma, un flujo"
              title="Control claro sobre el ciclo de vida del modelo"
              description="NeuroLab conecta el trabajo cotidiano de datos y aprendizaje automático: prepara recursos, persiste configuraciones, coordina ejecuciones y facilita la evaluación."
            />
            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {workflow.map((step, index) => (
                <article key={step.title} className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                  <span className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-sm font-bold text-indigo-600">0{index + 1}</span>
                  <h3 className="text-base font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="modulos" className="scroll-mt-20 border-y border-slate-100 bg-slate-50 py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Módulos del sistema"
              title="Una vista detallada de cada área"
              description="Los módulos comparten contexto de proyecto y persistencia. El estado indica qué puede usarse con la API disponible y qué necesita una integración adicional."
            />
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {modules.map(module => {
                const Icon = module.icon;
                return (
                  <article key={module.title} className="flex min-h-52 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <span className={`rounded-xl p-2.5 ${module.color}`}><Icon size={20} /></span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-600">{module.status}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">{module.title}</h3>
                    <p className="mt-2 text-xs leading-5 text-slate-600">{module.description}</p>
                  </article>
                );
              })}
            </div>
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <CircleHelp size={18} className="mt-0.5 shrink-0" />
              <p><strong>Nota sobre procesamiento:</strong> encolar un trabajo guarda su solicitud, pero la ejecución efectiva y el avance dependen de conectar un worker ML. La generación y descarga de reportes también necesita un worker dedicado.</p>
            </div>
          </div>
        </section>

        <section id="arquitectura" className="scroll-mt-20 py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Arquitectura de la solución"
              title="Capas separadas, responsabilidades explícitas"
              description="La aplicación mantiene la interfaz, el API, la base de datos, el almacenamiento y la ejecución de modelos como componentes diferenciados."
            />
            <div className="mt-12 grid gap-4 lg:grid-cols-2">
              {platformLayers.map(layer => {
                const Icon = layer.icon;
                return (
                  <article key={layer.number} className="flex gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white"><Icon size={21} /></span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-bold text-indigo-600">{layer.number}</span><h3 className="text-base font-semibold text-slate-900">{layer.title}</h3></div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{layer.description}</p>
                      <p className="mt-3 text-xs font-medium text-slate-500">{layer.technology}</p>
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold text-slate-900">Persistencia principal</h3>
              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                <p className="flex items-start gap-2 text-slate-600"><Check size={16} className="mt-0.5 shrink-0 text-emerald-600" /><span><strong>PostgreSQL:</strong> proyectos, datasets, arquitecturas, ejecuciones, métricas, modelos y eventos de auditoría.</span></p>
                <p className="flex items-start gap-2 text-slate-600"><Check size={16} className="mt-0.5 shrink-0 text-emerald-600" /><span><strong>Autenticación local:</strong> cuentas en PostgreSQL, contraseñas con hash y tokens para las rutas privadas.</span></p>
                <p className="flex items-start gap-2 text-slate-600"><Check size={16} className="mt-0.5 shrink-0 text-emerald-600" /><span><strong>Supabase Storage:</strong> bucket privado para los archivos de datasets.</span></p>
              </div>
            </div>
          </div>
        </section>

        <section id="seguridad" className="scroll-mt-20 bg-slate-950 py-20 text-white sm:py-24">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[.8fr_1.2fr] lg:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Seguridad y acceso</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Tu espacio comienza con una sesión autenticada.</h2>
              <p className="mt-4 text-sm leading-7 text-slate-300">Las páginas internas requieren iniciar sesión. La API valida el token Supabase y consulta los registros asociados a la identidad del usuario.</p>
              <Link to={loginPath} className="mt-7 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-indigo-50">
                {user ? 'Abrir panel' : 'Iniciar sesión'} <ArrowRight size={16} />
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <SecurityCard icon={LockKeyhole} title="Inicio de sesión" text="Acceso con correo y contraseña mediante el backend; las claves se guardan como hashes." />
              <SecurityCard icon={Fingerprint} title="Tokens de sesión" text="La interfaz adjunta el token de acceso a las solicitudes de la API." />
              <SecurityCard icon={Database} title="Aislamiento por usuario" text="Las consultas del API limitan los recursos al identificador de usuario autenticado." />
              <SecurityCard icon={ShieldCheck} title="Storage privado" text="Los objetos de datasets deben protegerse con políticas por carpeta y propietario." />
            </div>
          </div>
        </section>

        <section className="border-b border-slate-100 py-16 sm:py-20">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 sm:px-6 md:flex-row md:items-center lg:px-8">
            <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Siguiente paso</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Entra a tu espacio de trabajo</h2><p className="mt-2 text-sm text-slate-600">Usa la cuenta autorizada para acceder a las herramientas de NeuroLab.</p></div>
            <Link to={loginPath} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700">{user ? 'Ir al dashboard' : 'Acceder con correo y contraseña'} <ArrowRight size={16} /></Link>
          </div>
        </section>
      </main>

      <footer className="bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-slate-500 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <span>© {new Date().getFullYear()} NeuroLab Enterprise · Plataforma de gestión de experimentos de IA</span>
          <span className="inline-flex items-center gap-2"><span className={`h-1.5 w-1.5 rounded-full ${health === 'ready' ? 'bg-emerald-500' : health === 'unavailable' ? 'bg-rose-500' : 'bg-amber-400'}`} />{health === 'ready' ? 'API y base de datos en línea' : health === 'unavailable' ? 'Backend sin conexión' : 'Verificando estado del sistema'}</span>
        </div>
      </footer>
    </div>
  );
}

function OverviewTile({ icon: Icon, label, value, detail }: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between"><p className="text-xs text-slate-400">{label}</p><Icon size={15} className="text-indigo-300" /></div>
      <p className="mt-3 text-sm font-semibold text-white">{value}</p>
      <p className="mt-1 text-[10px] text-slate-500">{detail}</p>
    </div>
  );
}

function SectionHeading({ eyebrow, title, description }: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{title}</h2>
      <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">{description}</p>
    </div>
  );
}

function SecurityCard({ icon: Icon, title, text }: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <span className="inline-flex rounded-lg bg-indigo-400/10 p-2.5 text-indigo-300"><Icon size={19} /></span>
      <h3 className="mt-4 text-sm font-semibold text-white">{title}</h3>
      <p className="mt-2 text-xs leading-5 text-slate-400">{text}</p>
    </article>
  );
}
