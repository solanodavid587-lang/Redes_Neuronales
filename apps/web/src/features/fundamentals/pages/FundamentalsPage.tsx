import { useMemo, useState } from 'react';
import { BookOpen, Search } from 'lucide-react';

const topics = [
  { title: 'Neurona artificial', category: 'Fundamentos', text: 'Unidad de cómputo que combina entradas con pesos, aplica una función de activación y produce una salida.' },
  { title: 'Función de activación', category: 'Fundamentos', text: 'Transformación aplicada a la salida de una capa. ReLU, sigmoid, tanh y softmax cubren usos frecuentes.' },
  { title: 'Convolución (CNN)', category: 'Arquitecturas', text: 'Operación que aprende filtros locales para detectar patrones espaciales, como bordes y texturas en imágenes.' },
  { title: 'Red recurrente (RNN)', category: 'Arquitecturas', text: 'Arquitectura que procesa secuencias conservando información del contexto anterior; LSTM es una variante común.' },
  { title: 'Época y batch size', category: 'Entrenamiento', text: 'Una época recorre el conjunto de entrenamiento. Batch size determina cuántos ejemplos procesa cada actualización.' },
  { title: 'Pérdida y exactitud', category: 'Evaluación', text: 'La pérdida cuantifica el error optimizado durante el entrenamiento; la exactitud mide la proporción de predicciones correctas.' },
  { title: 'Sobreajuste', category: 'Evaluación', text: 'Ocurre cuando el modelo aprende demasiado los ejemplos de entrenamiento y generaliza peor en datos no vistos.' },
  { title: 'Train / validación', category: 'Datasets', text: 'Train ajusta los parámetros. Validación ayuda a comparar configuraciones sin reutilizar los datos de entrenamiento como medida final.' },
];

export default function FundamentalsPage() {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => topics.filter(topic =>
    `${topic.title} ${topic.category} ${topic.text}`.toLowerCase().includes(search.toLowerCase()),
  ), [search]);

  return (
    <div className="space-y-6">
      <header><h1 className="text-2xl font-semibold tracking-tight text-slate-900">Fundamentos neuronales</h1><p className="mt-1 text-sm text-slate-500">Conceptos rápidos para diseñar, entrenar y evaluar modelos.</p></header>
      <label className="relative block"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} aria-label="Buscar conceptos" placeholder="Buscar conceptos…" className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-4 text-sm outline-none focus:ring-1 focus:ring-indigo-500" /></label>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map(topic => <article key={topic.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md"><div className="mb-3 flex items-center justify-between"><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700">{topic.category}</span><BookOpen size={16} className="text-slate-400" /></div><h2 className="font-semibold text-slate-900">{topic.title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{topic.text}</p></article>)}
      </div>
      {!filtered.length && <p className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No se encontraron conceptos.</p>}
    </div>
  );
}
