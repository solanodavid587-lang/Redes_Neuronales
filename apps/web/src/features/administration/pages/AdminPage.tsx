import { useEffect, useState, type FormEvent } from 'react';
import {
  Activity, Cpu, Database, Server, ShieldAlert, UserPlus, Users,
} from 'lucide-react';
import { api, errorMessage } from '../../../lib/api';
import { ErrorState, InlineNotice, LoadingState } from '../../../components/ui/Feedback';
import { useAuth } from '../../../auth/AuthProvider';

type AdminTab = 'users' | 'audit' | 'system';
interface AuditEntry {
  id: string;
  action: string;
  actor: string;
  target: string;
  timestamp: string;
}

interface ApiHealth {
  status: string;
  database?: string;
}

interface ManagedUser {
  id: string;
  email: string;
  role: 'ADMIN' | 'PROJECT_MANAGER' | 'AI_ENGINEER' | 'REVIEWER';
  isActive: boolean;
  createdAt: string;
}

export default function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [accounts, setAccounts] = useState<ManagedUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [creating, setCreating] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<ManagedUser['role']>('AI_ENGINEER');
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState('');
  const [health, setHealth] = useState<ApiHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState('');

  useEffect(() => {
    let active = true;
    if (activeTab === 'users' && user?.role === 'ADMIN') {
      setUsersLoading(true);
      setUsersError('');
      api.get<{ items: ManagedUser[] }>('/auth/users')
        .then(result => { if (active) setAccounts(result.items); })
        .catch(error => { if (active) setUsersError(errorMessage(error)); })
        .finally(() => { if (active) setUsersLoading(false); });
    } else if (activeTab === 'audit') {
      setAuditLoading(true);
      setAuditError('');
      api.get<{ items: AuditEntry[] }>('/audit?limit=100')
        .then(result => { if (active) setLogs(result.items); })
        .catch(error => { if (active) setAuditError(errorMessage(error)); })
        .finally(() => { if (active) setAuditLoading(false); });
    }
    if (activeTab === 'system') {
      setHealthLoading(true);
      setHealthError('');
      api.get<ApiHealth>('/health/ready')
        .then(result => { if (active) setHealth(result); })
        .catch(error => {
          if (active) {
            setHealth(null);
            setHealthError(errorMessage(error));
          }
        })
        .finally(() => { if (active) setHealthLoading(false); });
    }
    return () => { active = false; };
  }, [activeTab, user?.role]);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError('');
    setCreateSuccess('');
    setCreating(true);
    try {
      const created = await api.post<ManagedUser>('/auth/users', {
        email: newEmail.trim(),
        password: newPassword,
        role: newRole,
      });
      setAccounts(current => [created, ...current]);
      setNewEmail('');
      setNewPassword('');
      setCreateSuccess(`Cuenta creada para ${created.email}.`);
    } catch (error) {
      setCreateError(errorMessage(error));
    } finally {
      setCreating(false);
    }
  }

  const tabs: { id: AdminTab; title: string; icon: typeof Users }[] = [
    { id: 'users', title: 'Usuarios', icon: Users },
    { id: 'audit', title: 'Auditoría', icon: ShieldAlert },
    { id: 'system', title: 'Sistema', icon: Activity },
  ];

  return (
    <div className="space-y-6">
      <header><h1 className="text-2xl font-semibold tracking-tight text-slate-900">Administración</h1><p className="mt-1 text-sm text-slate-500">Administra usuarios, revisa auditoría y consulta la salud de la API.</p></header>
      <nav className="flex gap-5 overflow-x-auto border-b border-slate-200" aria-label="Secciones de administración">
        {tabs.map(({ id, title, icon: Icon }) => <button key={id} onClick={() => setActiveTab(id)} aria-current={activeTab === id ? 'page' : undefined} className={`flex shrink-0 items-center gap-2 border-b-2 pb-3 text-sm font-medium ${activeTab === id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><Icon size={16} />{title}</button>)}
      </nav>

      {activeTab === 'users' && (
        <div className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <UserPlus size={18} className="text-indigo-600" />
              <h2 className="font-semibold text-slate-900">Añadir usuario</h2>
            </div>
            <form onSubmit={createUser} className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Correo electrónico
                <input type="email" required autoComplete="email" value={newEmail} onChange={event => setNewEmail(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Contraseña temporal
                <input type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                <span className="mt-1 block text-xs font-normal text-slate-500">Mínimo 12 caracteres.</span>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Rol
                <select value={newRole} onChange={event => setNewRole(event.target.value as ManagedUser['role'])} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
                  <option value="ADMIN">Administrador</option>
                  <option value="PROJECT_MANAGER">Jefe de proyecto</option>
                  <option value="AI_ENGINEER">Ingeniero de IA</option>
                  <option value="REVIEWER">Revisor</option>
                </select>
              </label>
              <div className="flex items-end">
                <button type="submit" disabled={creating} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto">
                  <UserPlus size={16} />{creating ? 'Creando…' : 'Crear usuario'}
                </button>
              </div>
              {createError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 md:col-span-2">{createError}</p>}
              {createSuccess && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 md:col-span-2">{createSuccess}</p>}
            </form>
          </section>

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5"><h2 className="font-semibold text-slate-900">Cuentas registradas</h2></div>
            {usersError ? <ErrorState message={usersError} /> : usersLoading ? <LoadingState label="Cargando usuarios…" /> : accounts.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Correo</th><th className="px-5 py-3">Rol</th><th className="px-5 py-3">Estado</th><th className="px-5 py-3">Creado</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">{accounts.map(account => <tr key={account.id}><td className="px-5 py-3 font-medium text-slate-800">{account.email}</td><td className="px-5 py-3 text-slate-600">{roleLabel(account.role)}</td><td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${account.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{account.isActive ? 'Activo' : 'Inactivo'}</span></td><td className="px-5 py-3 text-slate-500">{new Date(account.createdAt).toLocaleDateString()}</td></tr>)}</tbody>
                </table>
              </div>
            ) : <p className="p-8 text-center text-sm text-slate-500">No hay usuarios registrados.</p>}
          </section>
          <p className="text-xs text-slate-500">Las contraseñas se almacenan como hash y nunca se muestran en este módulo.</p>
        </div>
      )}

      {activeTab === 'audit' && (
        <section className="min-h-72 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 p-4"><h2 className="text-sm font-semibold text-slate-800">Registro de eventos</h2></div>
          {auditError ? <ErrorState message={auditError} /> : auditLoading ? <LoadingState /> : logs.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-[13px]">
                <thead className="border-b border-slate-200 text-slate-500"><tr><th className="px-5 py-3 font-medium">Acción</th><th className="px-5 py-3 font-medium">Actor</th><th className="px-5 py-3 font-medium">Recurso</th><th className="px-5 py-3 font-medium">Fecha</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{logs.map(log => <tr key={log.id}><td className="px-5 py-3 font-medium text-slate-800">{log.action}</td><td className="px-5 py-3 text-slate-600">{log.actor}</td><td className="px-5 py-3 font-mono text-xs text-slate-500">{log.target}</td><td className="px-5 py-3 text-xs text-slate-500">{new Date(log.timestamp).toLocaleString()}</td></tr>)}</tbody>
              </table>
            </div>
          ) : <div className="py-16 text-center text-sm text-slate-500">No hay eventos de auditoría.</div>}
        </section>
      )}

      {activeTab === 'system' && (
        <div className="space-y-4">
          {healthError && <ErrorState message={healthError} />}
          {healthLoading ? <LoadingState label="Comprobando API y base de datos…" /> : (
            <div className="grid gap-4 md:grid-cols-3">
              <StatusCard icon={Server} name="API Backend" detail="FastAPI" ok={health?.status === 'ready'} loading={false} />
              <StatusCard icon={Database} name="Base de datos" detail="PostgreSQL / Supabase" ok={health?.database === 'connected'} loading={false} />
              <StatusCard icon={Cpu} name="Workers ML" detail="No hay endpoint de estado configurado" ok={null} loading={false} />
            </div>
          )}
          <InlineNotice>La prueba de disponibilidad ejecuta una consulta simple a la base de datos. El estado de workers se indica como no configurado, no como disponible.</InlineNotice>
        </div>
      )}
    </div>
  );
}

function roleLabel(role: ManagedUser['role']): string {
  const labels: Record<ManagedUser['role'], string> = {
    ADMIN: 'Administrador',
    PROJECT_MANAGER: 'Jefe de proyecto',
    AI_ENGINEER: 'Ingeniero de IA',
    REVIEWER: 'Revisor',
  };
  return labels[role];
}

function StatusCard({ icon: Icon, name, detail, ok, loading }: {
  icon: typeof Server;
  name: string;
  detail: string;
  ok: boolean | null;
  loading: boolean;
}) {
  return (
    <section className="flex min-h-44 flex-col items-center justify-center rounded-lg border border-slate-200 bg-white p-5 text-center shadow-sm">
      <Icon size={30} className="mb-3 text-indigo-500" />
      <h2 className="text-sm font-semibold text-slate-900">{name}</h2>
      <p className="mb-3 mt-1 text-xs text-slate-500">{detail}</p>
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ok === null ? 'bg-slate-100 text-slate-600' : ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{loading ? 'Comprobando…' : ok === null ? 'No configurado' : ok ? 'Disponible' : 'No disponible'}</span>
    </section>
  );
}
