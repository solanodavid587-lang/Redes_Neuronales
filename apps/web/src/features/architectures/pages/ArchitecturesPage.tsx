import React, { useState } from 'react';
import { Plus, Save, Play, Settings2, ArrowLeft, Info } from 'lucide-react';
import LayerCard from '../components/LayerCard';
import { Layer, LayerType, NetworkFamily } from '../types';

// Capas iniciales por defecto
const initialLayers: Layer[] = [
  { id: '1', type: 'Input', neurons: 784, activation: 'None' },
  { id: '2', type: 'Dense', neurons: 128, activation: 'relu' },
  { id: '3', type: 'Dropout', neurons: 0, activation: 'None' },
  { id: '4', type: 'Output', neurons: 10, activation: 'softmax' },
];

export default function ArchitecturesPage() {
  const [family, setFamily] = useState<NetworkFamily>('Feedforward');
  const [layers, setLayers] = useState<Layer[]>(initialLayers);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>('2');

  const selectedLayer = layers.find(l => l.id === selectedLayerId);

  // Agregar una nueva capa antes de la capa de salida
  const addLayer = () => {
    const newLayer: Layer = {
      id: Date.now().toString(),
      type: 'Dense',
      neurons: 64,
      activation: 'relu'
    };
    const outputIndex = layers.findIndex(l => l.type === 'Output');
    const newLayers = [...layers];
    newLayers.splice(outputIndex, 0, newLayer);
    setLayers(newLayers);
    setSelectedLayerId(newLayer.id);
  };

  // Eliminar capa
  const deleteLayer = (id: string) => {
    setLayers(layers.filter(l => l.id !== id));
    if (selectedLayerId === id) setSelectedLayerId(null);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
      
      {/* HEADER */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-slate-100 rounded-md text-slate-500 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Diseñador de Arquitecturas</h1>
            <p className="text-xs text-slate-500">Configura las capas de tu red neuronal</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={family}
            onChange={(e) => setFamily(e.target.value as NetworkFamily)}
            className="text-sm border border-slate-300 rounded-md py-1.5 px-3 bg-white focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="Feedforward">Feedforward (MLP)</option>
            <option value="RNN">Recurrente (RNN)</option>
            <option value="CNN">Convolucional (CNN)</option>
            <option value="GAN">Generativa (GAN)</option>
          </select>
          <button className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 shadow-sm flex items-center gap-2">
            <Save size={16} /> Guardar
          </button>
          <button className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 shadow-sm flex items-center gap-2">
            <Play size={16} /> Compilar
          </button>
        </div>
      </div>

      {/* ÁREA DE TRABAJO (Split Screen) */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        
        {/* LIENZO (Izquierda) */}
        <div className="flex-1 bg-slate-100 rounded-lg border border-slate-200 overflow-y-auto p-8 relative">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
          
          <div className="relative z-10 flex flex-col items-center pb-20">
            {layers.map((layer) => (
              <LayerCard 
                key={layer.id} 
                layer={layer} 
                isSelected={selectedLayerId === layer.id}
                onSelect={() => setSelectedLayerId(layer.id)}
                onDelete={() => deleteLayer(layer.id)}
              />
            ))}
            
            <button 
              onClick={addLayer}
              className="mt-2 flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 border-dashed rounded-full text-sm font-medium text-slate-600 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 transition-all shadow-sm"
            >
              <Plus size={16} /> Añadir Capa
            </button>
          </div>
        </div>

        {/* PANEL DE PROPIEDADES (Derecha) */}
        <div className="w-80 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 rounded-t-lg flex items-center gap-2">
            <Settings2 size={16} className="text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-800">Propiedades</h2>
          </div>
          
          <div className="p-5 flex-1 overflow-y-auto">
            {selectedLayer ? (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">ID de Capa</label>
                  <input type="text" disabled value={selectedLayer.id} className="w-full text-sm bg-slate-100 border border-slate-200 rounded px-2 py-1.5 text-slate-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Tipo de Capa</label>
                  <select 
                    value={selectedLayer.type} 
                    disabled={selectedLayer.type === 'Input' || selectedLayer.type === 'Output'}
                    className="w-full text-sm border border-slate-300 rounded px-2 py-1.5 disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    <option value="Dense">Dense (Linear)</option>
                    <option value="Conv2D">Conv2D</option>
                    <option value="LSTM">LSTM</option>
                    <option value="Dropout">Dropout</option>
                  </select>
                </div>
                
                {selectedLayer.type !== 'Dropout' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Unidades / Neuronas</label>
                    <input 
                      type="number" 
                      value={selectedLayer.neurons} 
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setLayers(layers.map(l => l.id === selectedLayerId ? { ...l, neurons: val } : l));
                      }}
                      className="w-full text-sm border border-slate-300 rounded px-2 py-1.5 focus:ring-indigo-500 focus:border-indigo-500" 
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Función de Activación</label>
                  <select 
                    value={selectedLayer.activation}
                    onChange={(e) => {
                      setLayers(layers.map(l => l.id === selectedLayerId ? { ...l, activation: e.target.value } : l));
                    }}
                    disabled={selectedLayer.type === 'Input'}
                    className="w-full text-sm border border-slate-300 rounded px-2 py-1.5 disabled:bg-slate-100"
                  >
                    <option value="None">None</option>
                    <option value="relu">ReLU</option>
                    <option value="sigmoid">Sigmoid</option>
                    <option value="softmax">Softmax</option>
                    <option value="tanh">Tanh</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400">
                <Settings2 size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Selecciona una capa en el lienzo para editar sus propiedades.</p>
              </div>
            )}
          </div>

          {/* RESUMEN DEL MODELO */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-lg">
            <h3 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
              <Info size={14} /> Resumen de TensorFlow
            </h3>
            <div className="font-mono text-[11px] text-slate-600 space-y-1">
              <p>Total params: <span className="text-indigo-600 font-bold">101,770</span></p>
              <p>Trainable params: <span className="text-emerald-600 font-bold">101,770</span></p>
              <p>Non-trainable: <span className="text-slate-400">0</span></p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}