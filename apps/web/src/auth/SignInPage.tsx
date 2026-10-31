import { useState, type FormEvent } from 'react';
import { Activity, LockKeyhole, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export default function SignInPage() {
  const { configured, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : 'No se pudo iniciar sesión.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-white p-8 shadow-2xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-xl bg-indigo-600 p-3 text-white"><Activity size={22} /></div>
          <div>
            <p className="text-lg font-bold text-slate-900">NeuroLab Enterprise</p>
            <p className="text-sm text-slate-500">Plataforma de operaciones de IA</p>
          </div>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">Iniciar sesión</h1>
        <p className="mt-1 text-sm text-slate-500">Ingresa con tu cuenta de NeuroLab para continuar.</p>
        <Link to="/" className="mt-3 inline-flex text-sm font-medium text-indigo-600 hover:text-indigo-700">← Volver a información del sistema</Link>

        {!configured ? (
          <div role="alert" className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            No se pudo configurar el acceso al backend.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Correo electrónico
              <span className="relative mt-1 block">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </span>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Contraseña
              <span className="relative mt-1 block">
                <LockKeyhole size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </span>
            </label>
            {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Verificando…' : 'Entrar'}
            </button>
            <p className="text-center text-xs text-slate-500">Acceso restringido a cuentas autorizadas. No hay registro público ni acceso con redes sociales.</p>
          </form>
        )}
      </section>
    </main>
  );
}
