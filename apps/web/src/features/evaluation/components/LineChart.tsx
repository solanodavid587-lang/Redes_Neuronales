import { LineChart as ChartIcon } from 'lucide-react';

interface Props {
  data: { epoch: number; train: number; val: number }[];
  colorTrain?: string;
  colorVal?: string;
  title: string;
  yLabel: string;
  minDomain?: number;
  maxDomain?: number;
}

export default function LineChart({
  data,
  colorTrain = '#6366f1',
  colorVal = '#10b981',
  title,
  yLabel,
  minDomain,
  maxDomain,
}: Props) {
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

  const width = 560;
  const height = 240;
  const padding = { top: 16, right: 18, bottom: 38, left: 54 };
  const allValues = data.flatMap(d => [d.train, d.val]);
  const rawMin = minDomain ?? Math.min(...allValues);
  const rawMax = maxDomain ?? Math.max(...allValues);
  const range = rawMax - rawMin || Math.max(Math.abs(rawMax) * 0.1, 1);
  const minVal = minDomain ?? rawMin - range * 0.08;
  const maxVal = maxDomain ?? rawMax + range * 0.08;
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const getX = (index: number) => padding.left + (data.length === 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth);
  const getY = (value: number) => padding.top + ((maxVal - value) / (maxVal - minVal)) * plotHeight;

  const trainPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.train)}`).join(' ');
  const valPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.val)}`).join(' ');
  const epochTickIndexes = [...new Set(
    Array.from({ length: Math.min(5, data.length) }, (_, index) =>
      Math.round(index * (data.length - 1) / Math.max(Math.min(5, data.length) - 1, 1)),
    ),
  )];
  const formatTick = (value: number) => Math.abs(value) >= 100 ? value.toFixed(0) : Math.abs(value) >= 10 ? value.toFixed(1) : value.toFixed(3);

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
        <svg role="img" aria-label={`${title}: curvas de entrenamiento y validación`} viewBox={`0 0 ${width} ${height}`} className="h-auto w-full overflow-visible">
          {[0, 1, 2, 3, 4].map((i) => {
            const y = padding.top + (i / 4) * plotHeight;
            const value = maxVal - (i / 4) * (maxVal - minVal);
            return (
              <g key={i}>
                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 4" />
                <text x={padding.left - 8} y={y} textAnchor="end" fontSize="10" fill="#94a3b8" dominantBaseline="middle">{formatTick(value)}</text>
              </g>
            );
          })}
          <path d={trainPath} fill="none" stroke={colorTrain} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d={valPath} fill="none" stroke={colorVal} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {data.map((point, index) => (
            <g key={point.epoch}>
              <circle cx={getX(index)} cy={getY(point.train)} r="3.5" fill={colorTrain} stroke="#ffffff" strokeWidth="1.5">
                <title>Época {point.epoch} · Train: {point.train.toFixed(4)}</title>
              </circle>
              <circle cx={getX(index)} cy={getY(point.val)} r="3.5" fill={colorVal} stroke="#ffffff" strokeWidth="1.5">
                <title>Época {point.epoch} · Validación: {point.val.toFixed(4)}</title>
              </circle>
            </g>
          ))}
          {epochTickIndexes.map(index => (
            <text key={data[index].epoch} x={getX(index)} y={height - 8} textAnchor="middle" fontSize="10" fill="#94a3b8">
              {data[index].epoch}
            </text>
          ))}
        </svg>
      </div>
      <p className="mt-1 text-center text-[11px] text-slate-400">{yLabel}</p>
    </div>
  );
}