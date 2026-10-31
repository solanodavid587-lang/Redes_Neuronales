import { ArrowDown, Box, Grid, Layers, ShieldAlert, Target, Trash2 } from 'lucide-react';
import type { Layer } from '../types';

interface Props {
  layer: Layer;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function layerStyles(type: string) {
  switch (type) {
    case 'Input':
      return { icon: <Target size={20} />, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', ring: 'ring-blue-500/20' };
    case 'Conv2D':
      return { icon: <Grid size={20} />, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', ring: 'ring-rose-500/20' };
    case 'LSTM':
      return { icon: <Box size={20} />, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', ring: 'ring-purple-500/20' };
    case 'Dropout':
      return { icon: <ShieldAlert size={20} />, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', ring: 'ring-amber-500/20' };
    case 'Output':
      return { icon: <Layers size={20} />, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', ring: 'ring-emerald-500/20' };
    default:
      return { icon: <Layers size={20} />, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', ring: 'ring-indigo-500/20' };
  }
}

export default function LayerCard({ layer, isSelected, onSelect, onDelete }: Props) {
  const styles = layerStyles(layer.type);
  return (
    <div className="relative mx-auto flex w-full max-w-sm flex-col items-center">
      <div className={`flex w-full items-center gap-2 rounded-xl border-2 bg-white p-3 shadow-sm transition ${
        isSelected ? `border-transparent ring-2 ring-offset-1 ${styles.ring} ${styles.border} shadow-md` : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
      }`}>
        <button type="button" onClick={onSelect} aria-pressed={isSelected} className="flex min-w-0 flex-1 items-center gap-4 text-left">
          <span className={`rounded-lg p-2.5 shadow-inner ${styles.bg} ${styles.color}`}>{styles.icon}</span>
          <span className="min-w-0">
            <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
              {layer.type}
              {layer.type === 'Input' && <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-blue-700">Entrada</span>}
              {layer.type === 'Output' && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">Salida</span>}
            </span>
            <span className="mt-0.5 block text-xs font-medium text-slate-500">
              {layer.type === 'Dropout' ? 'Regularización' : `${layer.neurons} unidades`}
              {layer.type !== 'Input' && <span className="ml-2 rounded bg-slate-100 px-1 font-mono text-slate-600">{layer.activation}</span>}
            </span>
          </span>
        </button>
        {layer.type !== 'Input' && layer.type !== 'Output' && (
          <button type="button" onClick={onDelete} aria-label={`Eliminar capa ${layer.type}`} title="Eliminar capa" className="rounded-md p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-500">
            <Trash2 size={16} />
          </button>
        )}
      </div>
      <div className="flex h-8 flex-col items-center justify-center gap-1 text-slate-300"><div className="h-4 w-0.5 bg-slate-300" /><ArrowDown size={14} className="text-slate-400" /></div>
    </div>
  );
}
