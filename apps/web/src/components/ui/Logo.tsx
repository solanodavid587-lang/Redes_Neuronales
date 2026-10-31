import { useId } from 'react';

export default function Logo({ className = "" }: { className?: string }) {
  // useId genera un identificador único para evitar conflictos de gradientes
  const gradientId = useId();

  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818cf8" /> {/* indigo-400 */}
          <stop offset="100%" stopColor="#c084fc" /> {/* purple-400 */}
        </linearGradient>
      </defs>
      
      {/* Líneas de conexión (red neuronal) */}
      <path 
        d="M12 2L3 7V17L12 22L21 17V7L12 2Z" 
        stroke={`url(#${gradientId})`} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      
      {/* Nodo central */}
      <circle cx="12" cy="12" r="3" fill={`url(#${gradientId})`} />
      
      {/* Nodos satélites */}
      <circle cx="12" cy="2" r="1.5" fill={`url(#${gradientId})`} />
      <circle cx="3" cy="7" r="1.5" fill={`url(#${gradientId})`} />
      <circle cx="21" cy="7" r="1.5" fill={`url(#${gradientId})`} />
      <circle cx="3" cy="17" r="1.5" fill={`url(#${gradientId})`} />
      <circle cx="21" cy="17" r="1.5" fill={`url(#${gradientId})`} />
      <circle cx="12" cy="22" r="1.5" fill={`url(#${gradientId})`} />
    </svg>
  );
}