import React from 'react';
import { Layers, Trash2, ArrowDown } from 'lucide-react';
import { Layer } from '../types';

interface Props {
  layer: Layer;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export default function LayerCard({ layer, isSelected, onSelect, onDelete }: Props) {
  return (
    <div className="flex flex-col items-center w-full max-w-sm mx-auto">
      {/* Tarjeta de la Capa */}
      <div 
        onClick={onSelect}
        className={`w-full cursor-pointer rounded-lg border-2 p-4 transition-all relative group
          ${isSelected 
            ? 'border-indigo-500 bg-indigo-50/50 shadow-md ring-2 ring-indigo-500/20' 
            : 'border-slate-200 bg-white hover:border-indigo-300 shadow-sm'
          }
        `}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-md ${isSelected ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
              <Layers size={18} />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900">{layer.type} Layer</h4>
              <p className="text-xs text-slate-500">{layer.neurons} unidades • {layer.activation}</p>
            </div>
          </div>
          
          {/* Botón de eliminar (solo si no es Input/Output) */}
          {layer.type !== 'Input' && layer.type !== 'Output' && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
      
      {/* Flecha conectora hacia la siguiente capa */}
      <div className="py-2 text-slate-300">
        <ArrowDown size={20} />
      </div>
    </div>
  );
}