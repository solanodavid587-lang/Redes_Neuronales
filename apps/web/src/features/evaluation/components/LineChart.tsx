import React from 'react';

interface Props {
  data: { epoch: number; train: number; val: number }[];
  colorTrain?: string;
  colorVal?: string;
  title: string;
  yLabel: string;
}

export default function LineChart({ data, colorTrain = '#6366f1', colorVal = '#10b981', title, yLabel }: Props) {
  if (!data || data.length === 0) return null;

  const width = 500;
  const height = 200;
  const padding = 30;

  // Encontrar los valores máximos y mínimos para escalar el gráfico
  const allValues = data.flatMap(d => [d.train, d.val]);
  const maxVal = Math.max(...allValues);
  const minVal = Math.min(...allValues);
  
  // Funciones para calcular coordenadas
  const getX = (index: number) => padding + (index / (data.length - 1)) * (width - padding * 2);
  const getY = (value: number) => height - padding - ((value - minVal) / (maxVal - minVal || 1)) * (height - padding * 2);

  // Generar el string del path SVG (M = Move, L = Line)
  const trainPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.train)}`).join(' ');
  const valPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.val)}`).join(' ');

  return (
    <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colorTrain }}></div>
            <span className="text-slate-600">Train</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colorVal }}></div>
            <span className="text-slate-600">Validation</span>
          </div>
        </div>
      </div>
      
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          {/* Cuadrícula de fondo */}
          {[0, 1, 2, 3, 4].map((i) => {
            const y = padding + (i / 4) * (height - padding * 2);
            return <line key={i} x1={padding} y1={y} x2={width - padding} y2={y} stroke="#f1f5f9" strokeWidth="1" />;
          })}

          {/* Eje Y (Texto) */}
          <text x={0} y={padding} fontSize="10" fill="#94a3b8" dominantBaseline="middle">{maxVal.toFixed(2)}</text>
          <text x={0} y={height - padding} fontSize="10" fill="#94a3b8" dominantBaseline="middle">{minVal.toFixed(2)}</text>

          {/* Líneas de datos */}
          <path d={trainPath} fill="none" stroke={colorTrain} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d={valPath} fill="none" stroke={colorVal} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="text-center text-[11px] text-slate-400 mt-2">{yLabel}</p>
    </div>
  );
}