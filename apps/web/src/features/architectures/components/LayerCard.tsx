import React from 'react';
import { Layers, Trash2, ArrowDown, Box, Grid, ShieldAlert, Target } from 'lucide-react';
import { Layer } from '../types';

interface Props {
  layer: Layer;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export default function LayerCard({ layer, isSelected, onSelect, onDelete }: Props) {
  // Función para obtener estilos según el tipo de capa
  const getLayerStyles = (type: string) => {
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
      default: // Dense
        return { icon: <Layers size={20} />, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', ring: 'ring-indigo-500/20' };
    }
  };

  const styles = getLayerStyles(layer.type);

  return (
    <div className="flex flex-col items-center w-full max-w-sm mx-auto relative group">
      {/* Tarjeta de la Capa */}
      <div 
        onClick={onSelect}
        className={`w-full cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 relative bg-white shadow-sm
          ${isSelected 
            ? `border-transparent ring-2 ring-offset-1 ${styles.ring} ${styles.border} shadow-md` 
            : `border-slate-200 hover:border-slate-300 hover:shadow-md`
          }
        `}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Icono con color dinámico */}
            <div className={`p-2.5 rounded-lg ${styles.bg} ${styles.color} shadow-inner`}>
              {styles.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-800">{layer.type}</h4>
                {layer.type === 'Input' && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold uppercase">Entrada</span>}
                {layer.type === 'Output' && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-semibold uppercase">Salida</span>}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                {layer.type === 'Dropout' ? 'Regularización (Dropout)' : `${layer.neurons} neuronas`}
                {layer.type !== 'Input' && <span className="mx-1">•</span>}
                {layer.type !== 'Input' && <span className="font-mono text-slate-600 bg-slate-100 px-1 rounded">{layer.activation}</span>}
              </p>
            </div>
          </div>
          
          {/* Botón de Eliminar */}
          {layer.type !== 'Input' && layer.type !== 'Output' && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-all"
              title="Eliminar capa"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Línea conectora inferior (más elegante) */}
      <div className="h-8 flex flex-col items-center justify-center gap-1 text-slate-300">
        <div className="w-0.5 h-4 bg-slate-300"></div>
        <ArrowDown size={14} className="text-slate-400" />
      </div>
    </div>
  );
}