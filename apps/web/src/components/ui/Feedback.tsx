import { AlertCircle, LoaderCircle } from 'lucide-react';
import type { ReactNode } from 'react';

export function LoadingState({ label = 'Cargando información…' }: { label?: string }) {
  return (
    <div role="status" className="flex min-h-40 flex-col items-center justify-center gap-3 text-sm text-slate-500">
      <LoaderCircle size={24} className="animate-spin text-indigo-600" />
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <AlertCircle size={18} className="mt-0.5 shrink-0" />
      <div className="flex-1">
        <p>{message}</p>
        {onRetry && <button onClick={onRetry} className="mt-2 font-semibold underline">Reintentar</button>}
      </div>
    </div>
  );
}

export function InlineNotice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warning' }) {
  return (
    <div role="status" className={`rounded-lg border p-3 text-sm ${
      tone === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-900'
        : 'border-indigo-100 bg-indigo-50 text-indigo-800'
    }`}>
      {children}
    </div>
  );
}
