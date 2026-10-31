import React, { useState } from 'react';
import { Plus, Save, Play, Settings2, ArrowLeft, Info, CheckCircle2, AlertCircle, Cpu, Sparkles } from 'lucide-react';
import LayerCard from '../components/LayerCard';
import { Layer } from '../types';

const initialLayers: Layer[] = [
  { id: 'input', type: 'Input', neurons: 784, activation: 'None' },
  { id: 'output', type: 'Output', neurons: 10, activation: 'softmax' },
];

export default function ArchitecturesPage() {
  const [family, setFamily] = useState('Feedforward');
  const [layers, setLayers] = useState<Layer[]>(initialLayers);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const selectedLayer = layers.find(l => l.id === selectedLayerId);

  const addLayer = () => {
    const newLayer: Layer = {
      id: `layer_${Date.now()}`,
      type: family === 'CNN' ? 'Conv2D' : family === 'RNN' ? 'LSTM' : 'Dense',
      neurons: 128, // Unidades más realistas por defecto
      activation: 'relu'
    };
    const outputIndex = layers.findIndex(l => l.type === 'Output');
    const newLayers = [...layers];
    newLayers.splice(outputIndex, 0, newLayer);
    setLayers(newLayers);
    setSelectedLayerId(newLayer.id);
  };

  const deleteLayer = (id: string) => {
    setLayers(layers.filter(l => l.id !== id));
    if (selectedLayerId === id) setSelectedLayerId(null);
  };

  const updateLayer = (id: string, field: keyof Layer, value: string | number) => {
    setLayers(layers.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const handleSave = () => {
    setIsSaving(true);
    setMessage(null);
    setTimeout(() => {
      setIsSaving(false);
      setMessage({ type: 'success', text: 'Arquitectura guardada en el proyecto exitosamente.' });
      setTimeout(() => setMessage(null), 3000);
    }, 1000);
  };

  const handleCompile = () => {
    setIsCompiling(true);
    setMessage(null);
    setTimeout(() => {
      setIsCompiling(false);
      if (layers.length < 3) {
        setMessage({ type: 'error', text: 'Error de compilación: Añade al menos una capa oculta antes de la salida.' });
      } else {
        setMessage({ type: 'success', text: '¡Compilación exitosa! El grafo de TensorFlow está listo.' });
      }
      setTimeout(() => setMessage(null), 4000);
    }, 1500);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
      
      {/* HEADER MEJORADO */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Diseñador Visual <Sparkles size={18} className="text-indigo-500" />
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Arrastra, configura y compila tu red neuronal.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select 
            value={family}
            onChange={(e) => setFamily(e.target.value)}
            className="text-sm font-medium border border-slate-300 rounded-lg py-2 px-3 bg-slate-50 text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
          >
            <option value="Feedforward">Feedforward (MLP)</option>
            <option value="RNN">Recurrente (RNN)</option>
            <option value="CNN">Convolucional (CNN)</option>
            <option value="GAN">Generativa (GAN)</option>
          </select>
          <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-indigo-600 shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Save size={16} /> {isSaving ? 'Guardando...' : 'Guardar'}
          </button>
          <button 
            onClick={handleCompile}
            disabled={isCompiling}
            className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg hover:from-indigo-700 hover:to-purple-700 shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Play size={16} /> {isCompiling ? 'Compilando...' : 'Compilar Modelo'}
          </button>
        </div>
      </div>

      {/* ALERTAS */}
      {message && (
        <div className={`p-4 rounded-lg text-sm font-medium flex items-center gap-3 border shadow-sm animate-in fade-in slide-in-from-top-2 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />} 
          {message.text}
        </div>
      )}

      {/* ÁREA DE TRABAJO */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        
        {/* LIENZO CON FONDO DE PUNTOS MEJORADO */}
        <div className="flex-1 bg-slate-50/50 rounded-xl border border-slate-200 shadow-inner overflow-y-auto relative">
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
          
          <div className="relative z-10 flex flex-col items-center py-10 px-4 min-h-full">
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
              className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-indigo-200 border-dashed rounded-full text-sm font-bold text-indigo-600 hover:text-white hover:border-indigo-600 hover:bg-indigo-600 transition-all shadow-sm hover:shadow-md"
            >
              <Plus size={18} /> Añadir Capa
            </button>
          </div>
        </div>

        {/* PANEL DE PROPIEDADES OSCURO (Opcional, le da un toque pro) */}
        <div className="w-80 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings2 size={16} className="text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-800">Configuración</h2>
            </div>
            {selectedLayer && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-mono uppercase">{selectedLayer.type}</span>}
          </div>
          
          <div className="p-5 flex-1 overflow-y-auto">
            {selectedLayer ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tipo de Capa</label>
                  <select 
                    value={selectedLayer.type} 
                    disabled={selectedLayer.type === 'Input' || selectedLayer.type === 'Output'}
                    onChange={(e) => updateLayer(selectedLayer.id, 'type', e.target.value)}
                    className="w-full text-sm font-medium border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    <option value="Dense">Dense (Linear)</option>
                    <option value="Conv2D">Conv2D (Convolucional)</option>
                    <option value="LSTM">LSTM (Recurrente)</option>
                    <option value="Dropout">Dropout (Regularización)</option>
                  </select>
                </div>
                
                {selectedLayer.type !== 'Dropout' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Neuronas / Unidades</label>
                    <input 
                      type="number" 
                      min="1"
                      value={selectedLayer.neurons} 
                      onChange={(e) => updateLayer(selectedLayer.id, 'neurons', parseInt(e.target.value) || 0)}
                      className="w-full text-sm font-mono border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Activación</label>
                  <select 
                    value={selectedLayer.activation}
                    onChange={(e) => updateLayer(selectedLayer.id, 'activation', e.target.value)}
                    disabled={selectedLayer.type === 'Input'}
                    className="w-full text-sm font-medium border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-100"
                  >
                    <option value="None">None</option>
                    <option value="relu">ReLU</option>
                    <option value="sigmoid">Sigmoid</option>
                    <option value="softmax">Softmax</option>
                    <option value="tanh">Tanh</option>
                    <option value="leaky_relu">Leaky ReLU</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-10">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <Settings2 size={24} className="opacity-50" />
                </div>
                <p className="text-sm font-medium text-slate-600">Ninguna capa seleccionada</p>
                <p className="text-xs mt-1 max-w-[200px]">Haz clic en cualquier bloque del lienzo para editar sus hiperparámetros.</p>
              </div>
            )}
          </div>

          {/* RESUMEN DE TENSORFLOW MEJORADO */}
          <div className="p-4 border-t border-slate-200 bg-[#0f172a] text-slate-300 rounded-b-xl">
            <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
              <Cpu size={14} className="text-indigo-400" /> Resumen del Grafo
            </h3>
            <div className="font-mono text-[11px] space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Capas:</span>
                <span className="text-white font-bold">{layers.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Familia:</span>
                <span className="text-indigo-400 font-bold">{family}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Estado:</span>
                <span className="text-amber-400 font-bold bg-amber-400/10 px-1.5 rounded">Borrador</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}