import { useEffect, useState } from 'react';
import { Plus, Save, Play, Settings2, ArrowLeft, CheckCircle2, AlertCircle, Cpu, Sparkles, Trash2 } from 'lucide-react';
import LayerCard from '../components/LayerCard';
import { Layer, type ModelFamily } from '../types';
import { useNavigate } from 'react-router-dom';
import { api, Page } from '../../../lib/api';
import { Project } from '../../projects/types';
import { InlineNotice } from '../../../components/ui/Feedback';
import { useAuth } from '../../../auth/AuthProvider';
import { canDesignArchitectures } from '../../../auth/permissions';

function initialLayersFor(family: ModelFamily): Layer[] {
  if (family === 'CNN') {
    return [
      { id: 'input', type: 'Input', neurons: 784, activation: 'None' },
      { id: 'conv', type: 'Conv2D', neurons: 32, activation: 'relu', kernelSize: 3 },
      { id: 'pool', type: 'MaxPooling2D', neurons: 1, activation: 'None' },
      { id: 'flatten', type: 'Flatten', neurons: 1, activation: 'None' },
      { id: 'dense', type: 'Dense', neurons: 64, activation: 'relu' },
      { id: 'output', type: 'Output', neurons: 10, activation: 'softmax' },
    ];
  }
  return [
    { id: 'input', type: 'Input', neurons: 1, activation: 'None' },
    { id: 'lstm', type: 'LSTM', neurons: 64, activation: 'tanh' },
    { id: 'dense', type: 'Dense', neurons: 32, activation: 'relu' },
    { id: 'output', type: 'Output', neurons: 1, activation: 'linear' },
  ];
}

interface SavedArchitecture {
  id: string;
  projectId: string | null;
  name: string;
  family: ModelFamily;
  description: string;
  inputShape: number[];
  layers: Layer[];
}

export default function ArchitecturesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const mayDesign = canDesignArchitectures(user?.role);
  const [family, setFamily] = useState<ModelFamily>('CNN');
  const [layers, setLayers] = useState<Layer[]>(initialLayersFor('CNN'));
  const [architectureDescription, setArchitectureDescription] = useState('');
  const [inputShape, setInputShape] = useState('28, 28, 1');
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [architectures, setArchitectures] = useState<SavedArchitecture[]>([]);
  const [projectId, setProjectId] = useState('');
  const [architectureName, setArchitectureName] = useState('');
  const [architectureSearch, setArchitectureSearch] = useState('');
  const [architectureId, setArchitectureId] = useState('');
  const [loadError, setLoadError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get<Page<Project>>('/projects?limit=100'),
      api.get<Page<SavedArchitecture>>('/architectures?limit=100'),
    ])
      .then(([projectPage, architecturePage]) => {
        if (!active) return;
        setProjects(projectPage.items.filter(project => project.status !== 'ARCHIVED'));
        setArchitectures(architecturePage.items);
      })
      .catch(error => { if (active) setLoadError(error instanceof Error ? error.message : 'No se pudieron cargar los proyectos.'); });
    return () => { active = false; };
  }, []);

  const selectedLayer = layers.find(l => l.id === selectedLayerId);
  const availableProjects = projects.filter(project => project.modelFamily === family);
  const projectArchitectures = architectures.filter(item =>
    item.projectId === projectId
      && item.family === family
      && item.name.toLowerCase().includes(architectureSearch.trim().toLowerCase()),
  );

  function selectArchitecture(id: string) {
    const saved = architectures.find(item => item.id === id);
    setArchitectureId(saved?.id ?? '');
    if (saved) {
      setArchitectureName(saved.name);
      setFamily(saved.family);
      setArchitectureDescription(saved.description ?? '');
      setInputShape(saved.inputShape?.length ? saved.inputShape.join(', ') : saved.family === 'CNN' ? '28, 28, 1' : '10, 1');
      setLayers(saved.layers);
    } else {
      setArchitectureName('');
      setArchitectureDescription('');
      const nextFamily = family;
      setFamily(nextFamily);
      setInputShape(nextFamily === 'CNN' ? '28, 28, 1' : '10, 1');
      setLayers(initialLayersFor(nextFamily));
    }
    setSelectedLayerId(null);
  }

  const addLayer = () => {
    const newLayer: Layer = {
      id: `layer_${Date.now()}`,
      type: family === 'CNN' ? 'Conv2D' : 'LSTM',
      neurons: 128, // Unidades más realistas por defecto
      kernelSize: 3,
      dropoutRate: 0.2,
      returnSequences: false,
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

  const updateLayer = (id: string, field: keyof Layer, value: string | number | boolean) => {
    setLayers(layers.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const handleSave = async () => {
    if (!projectId || !architectureName.trim()) {
      setMessage({ type: 'error', text: 'Selecciona un proyecto, asigna un nombre y define la forma de entrada.' });
      return;
    }
    const parsedInputShape = inputShape.split(',').map(dimension => Number(dimension.trim()));
    if (
      parsedInputShape.length < 1
      || parsedInputShape.length > 4
      || parsedInputShape.some(dimension => !Number.isInteger(dimension) || dimension < 1)
    ) {
      setMessage({ type: 'error', text: 'La forma de entrada debe contener de 1 a 4 dimensiones enteras positivas, separadas por comas.' });
      return;
    }
    setIsSaving(true);
    setMessage(null);
    try {
      const payload = {
        projectId,
        name: architectureName.trim(),
        family,
        description: architectureDescription.trim(),
        inputShape: parsedInputShape,
        layers,
      };
      let saved: SavedArchitecture;
      if (architectureId) {
        saved = await api.patch<SavedArchitecture>(`/architectures/${architectureId}`, {
          name: architectureName.trim(),
          family,
          description: architectureDescription.trim(),
          inputShape: parsedInputShape,
          layers,
        });
      } else {
        saved = await api.post<SavedArchitecture>('/architectures', payload);
      }
      setArchitectureId(saved.id);
      setArchitectures(items => [
        saved,
        ...items.filter(item => item.id !== saved.id),
      ]);
      setMessage({ type: 'success', text: 'Arquitectura guardada en el proyecto.' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'No se pudo guardar la arquitectura.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompile = async () => {
    if (!architectureId) {
      setMessage({ type: 'error', text: 'Guarda la arquitectura antes de validar su estructura.' });
      return;
    }
    setIsCompiling(true);
    setMessage(null);
    try {
      const result = await api.post<{ valid: boolean; errors: string[] }>(`/architectures/${architectureId}/validate`, undefined);
      setMessage(result.valid
        ? { type: 'success', text: 'La estructura es válida para entrenarse con TensorFlow/Keras.' }
        : { type: 'error', text: result.errors.join(' ') });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'No se pudo validar la arquitectura.' });
    } finally {
      setIsCompiling(false);
    }
  };

  const handleDelete = async () => {
    if (!architectureId || !window.confirm(`¿Eliminar la arquitectura "${architectureName}"?`)) return;
    setMessage(null);
    try {
      await api.delete(`/architectures/${architectureId}`);
      setArchitectures(items => items.filter(item => item.id !== architectureId));
      setArchitectureId('');
      setArchitectureName('');
      setArchitectureDescription('');
      setLayers(initialLayersFor(family));
      setSelectedLayerId(null);
      setMessage({ type: 'success', text: 'Arquitectura eliminada.' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'No se pudo eliminar la arquitectura.' });
    }
  };

  function changeProject(nextProjectId: string) {
    setProjectId(nextProjectId);
    const selectedProject = projects.find(project => project.id === nextProjectId);
    const nextFamily = selectedProject?.modelFamily ?? family;
    setFamily(nextFamily);
    setArchitectureId('');
    setArchitectureName('');
    setArchitectureDescription('');
    setInputShape(nextFamily === 'CNN' ? '28, 28, 1' : '10, 1');
    setArchitectureSearch('');
    setLayers(initialLayersFor(nextFamily));
    setSelectedLayerId(null);
  }

  function changeFamily(nextFamily: ModelFamily) {
    setFamily(nextFamily);
    setProjectId('');
    setArchitectureId('');
    setArchitectureName('');
    setArchitectureSearch('');
    setArchitectureDescription('');
    setInputShape(nextFamily === 'CNN' ? '28, 28, 1' : '10, 1');
    setLayers(initialLayersFor(nextFamily));
    setSelectedLayerId(null);
  }

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col space-y-4 md:h-[calc(100vh-8rem)]">
      
      {/* HEADER MEJORADO */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/projects')} aria-label="Volver a proyectos" className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Diseñador Visual <Sparkles size={18} className="text-indigo-500" />
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Configura y valida una arquitectura CNN o RNN.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={family}
            onChange={event => changeFamily(event.target.value === 'RNN' ? 'RNN' : 'CNN')}
            aria-label="Filtrar por familia de arquitectura"
            className="min-w-0 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
          >
            <option value="CNN">CNN</option>
            <option value="RNN">RNN</option>
          </select>
          <input
            value={architectureName}
            onChange={event => setArchitectureName(event.target.value)}
            aria-label="Nombre de la arquitectura"
            placeholder="Nombre de arquitectura"
            required
            maxLength={120}
            disabled={!mayDesign}
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm sm:w-48"
          />
          <select
            value={projectId}
            required
            onChange={event => changeProject(event.target.value)}
            aria-label="Proyecto de la arquitectura"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm sm:w-48"
          >
            <option value="">Selecciona proyecto {family}…</option>
            {availableProjects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <input
              value={architectureSearch}
              onChange={event => setArchitectureSearch(event.target.value)}
              aria-label="Filtrar arquitecturas guardadas"
              placeholder="Filtrar arquitecturas…"
              disabled={!projectId}
              className="min-w-0 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm disabled:opacity-60"
            />
            <select
              value={architectureId}
              onChange={event => selectArchitecture(event.target.value)}
              aria-label="Arquitectura guardada"
              disabled={!projectId}
              className="min-w-0 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
            >
              <option value="">Nueva arquitectura…</option>
              {projectArchitectures.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>
          {mayDesign && <button
            onClick={handleSave}
            disabled={isSaving || !projectId || !architectureName.trim()}
            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-indigo-600 shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Save size={16} /> {isSaving ? 'Guardando...' : 'Guardar'}
          </button>}
          {mayDesign && architectureId && <button type="button" onClick={() => void handleDelete()} aria-label="Eliminar arquitectura" title="Eliminar arquitectura" className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>}
          <button 
            onClick={handleCompile}
            disabled={isCompiling}
            className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg hover:from-indigo-700 hover:to-purple-700 shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Play size={16} /> {isCompiling ? 'Validando…' : 'Validar estructura'}
          </button>
        </div>
      </div>

      {/* ALERTAS */}
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">Descripción
          <textarea rows={2} maxLength={4000} value={architectureDescription} disabled={!mayDesign} onChange={event => setArchitectureDescription(event.target.value)} className="mt-1 w-full resize-none rounded-md border border-slate-300 px-3 py-2 disabled:bg-slate-50" />
        </label>
        <label className="block text-sm font-medium text-slate-700">Forma de entrada
          <input required value={inputShape} disabled={!mayDesign} onChange={event => setInputShape(event.target.value)} placeholder={family === 'CNN' ? '28, 28, 1' : '10, 1'} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono disabled:bg-slate-50" />
          <span className="mt-1 block text-xs font-normal text-slate-500">{family === 'CNN' ? 'Alto, ancho, canales' : 'Pasos de tiempo, características'}</span>
        </label>
      </div>
      {message && (
        <div className={`p-4 rounded-lg text-sm font-medium flex items-center gap-3 border shadow-sm animate-in fade-in slide-in-from-top-2 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />} 
          {message.text}
        </div>
      )}
      {loadError && <InlineNotice tone="warning">{loadError}</InlineNotice>}
      {!mayDesign && <InlineNotice tone="info">Tu rol permite consultar arquitecturas, pero no modificarlas.</InlineNotice>}
      <InlineNotice>Elige CNN o RNN y un proyecto de la misma familia. Las arquitecturas pueden entrenarse con el worker TensorFlow/Keras usando datasets CSV numéricos.</InlineNotice>

      {/* ÁREA DE TRABAJO */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto md:flex-row md:overflow-hidden">
        
        {/* LIENZO CON FONDO DE PUNTOS MEJORADO */}
        <div className="relative min-h-[420px] flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 shadow-inner md:min-h-0">
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
          
          <div className="relative z-10 flex flex-col items-center py-10 px-4 min-h-full">
            {layers.map((layer) => (
              <LayerCard 
                key={layer.id} 
                layer={layer} 
                isSelected={selectedLayerId === layer.id}
                readOnly={!mayDesign}
                onSelect={() => setSelectedLayerId(layer.id)}
                onDelete={() => deleteLayer(layer.id)}
              />
            ))}
            
            {mayDesign && <button
              onClick={addLayer}
              className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-indigo-200 border-dashed rounded-full text-sm font-bold text-indigo-600 hover:text-white hover:border-indigo-600 hover:bg-indigo-600 transition-all shadow-sm hover:shadow-md"
            >
              <Plus size={18} /> Añadir Capa
            </button>}
          </div>
        </div>

        {/* PANEL DE PROPIEDADES OSCURO (Opcional, le da un toque pro) */}
        <div className="flex w-full shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:w-80">
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
                    disabled={!mayDesign || selectedLayer.type === 'Input' || selectedLayer.type === 'Output'}
                    onChange={(e) => updateLayer(selectedLayer.id, 'type', e.target.value)}
                    className="w-full text-sm font-medium border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    {family === 'CNN' ? (
                      <>
                        <option value="Conv2D">Conv2D (Convolucional)</option>
                        <option value="MaxPooling2D">MaxPooling2D</option>
                        <option value="Flatten">Flatten</option>
                      </>
                    ) : (
                      <>
                        <option value="LSTM">LSTM</option>
                        <option value="GRU">GRU</option>
                        <option value="SimpleRNN">SimpleRNN</option>
                      </>
                    )}
                    <option value="Dense">Dense</option>
                    <option value="Dropout">Dropout (Regularización)</option>
                  </select>
                </div>
                
                {selectedLayer.type !== 'Dropout' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{selectedLayer.type === 'Conv2D' ? 'Filtros' : 'Neuronas / Unidades'}</label>
                    <input 
                      type="number" 
                      min="1"
                      value={selectedLayer.neurons} 
                      disabled={!mayDesign}
                      onChange={(e) => updateLayer(selectedLayer.id, 'neurons', Math.max(Number(e.target.value) || 1, 1))}
                      className="w-full text-sm font-mono border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
                    />
                  </div>
                )}

                {selectedLayer.type === 'Conv2D' && (
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Tamaño del kernel
                    <input type="number" min={1} max={15} value={selectedLayer.kernelSize ?? 3} disabled={!mayDesign} onChange={event => updateLayer(selectedLayer.id, 'kernelSize', Math.max(Number(event.target.value) || 1, 1))} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono" />
                  </label>
                )}

                {selectedLayer.type === 'Dropout' && (
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Tasa de dropout
                    <input type="number" min={0} max={0.99} step={0.01} value={selectedLayer.dropoutRate ?? 0.2} disabled={!mayDesign} onChange={event => updateLayer(selectedLayer.id, 'dropoutRate', Math.min(0.99, Math.max(Number(event.target.value) || 0, 0)))} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono" />
                  </label>
                )}

                {['LSTM', 'GRU', 'SimpleRNN'].includes(selectedLayer.type) && (
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={selectedLayer.returnSequences ?? false} disabled={!mayDesign} onChange={event => updateLayer(selectedLayer.id, 'returnSequences', event.target.checked)} />
                    Devolver secuencias completas
                  </label>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Activación</label>
                  <select 
                    value={selectedLayer.activation}
                    disabled={!mayDesign || selectedLayer.type === 'Input'}
                    onChange={(e) => updateLayer(selectedLayer.id, 'activation', e.target.value)}
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