import { LineChart as ChartIcon } from 'lucide-react';

interface Props {
  data: { epoch: number; train: number; val: number }[];
  colorTrain?: string;
  colorVal?: string;
  title: string;
  yLabel: string;
}

export default function LineChart({ data, colorTrain = '#6366f1', colorVal = '#10b981', title, yLabel }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col h-[300px]">
        <h3 className="text-sm font-semibold text-slate-800 mb-6">{title}</h3>
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
          <ChartIcon size={32} className="opacity-20 mb-3" />
          <p className="text-sm font-medium text-slate-500">Sin datos disponibles</p>
        </div>
      </div>
    );
  }

  const width = 500;
  const height = 200;
  const padding = 30;

  const allValues = data.flatMap(d => [d.train, d.val]);
  const maxVal = Math.max(...allValues);
  const minVal = Math.min(...allValues);
  
  const getX = (index: number) => padding + (index / Math.max(data.length - 1, 1)) * (width - padding * 2);
  const getY = (value: number) => height - padding - ((value - minVal) / (maxVal - minVal || 1)) * (height - padding * 2);

  const trainPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.train)}`).join(' ');
  const valPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.val)}`).join(' ');

  return (
    <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: colorTrain }}></div><span className="text-slate-600">Train</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: colorVal }}></div><span className="text-slate-600">Validation</span></div>
        </div>
      </div>
      
      <div className="relative">
        <svg role="img" aria-label={`${title}: curvas de entrenamiento y validación`} viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          {[0, 1, 2, 3, 4].map((i) => {
            const y = padding + (i / 4) * (height - padding * 2);
            return <line key={i} x1={padding} y1={y} x2={width - padding} y2={y} stroke="#f1f5f9" strokeWidth="1" />;
          })}
          <text x={0} y={padding} fontSize="10" fill="#94a3b8" dominantBaseline="middle">{maxVal.toFixed(2)}</text>
          <text x={0} y={height - padding} fontSize="10" fill="#94a3b8" dominantBaseline="middle">{minVal.toFixed(2)}</text>
          <path d={trainPath} fill="none" stroke={colorTrain} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d={valPath} fill="none" stroke={colorVal} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {data.length === 1 && <text x={width / 2} y={height - 5} textAnchor="middle" fontSize="10" fill="#94a3b8">{`Época ${data[0].epoch}`}</text>}
        </svg>
      </div>
      <p className="text-center text-[11px] text-slate-400 mt-2">{yLabel}</p>
    </div>
  );
}