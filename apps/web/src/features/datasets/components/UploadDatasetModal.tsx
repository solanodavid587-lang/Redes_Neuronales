import { useRef, useState, type DragEvent } from 'react';
import { CheckCircle2, File, UploadCloud, X } from 'lucide-react';
import { api } from '../../../lib/api';
import type { DatasetFormat } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: () => void;
}

function getFormat(file: File): DatasetFormat | null {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'csv') return 'CSV';
  if (extension === 'json') return 'JSON';
  if (['zip', 'png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'tif', 'tiff'].includes(extension ?? '')) return 'IMAGES';
  if (extension === 'txt') return 'TEXT';
  return null;
}

export default function UploadDatasetModal({ isOpen, onClose, onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [trainSplit, setTrainSplit] = useState(80);
  const [description, setDescription] = useState('');
  const [targetColumn, setTargetColumn] = useState('');
  const [featureColumns, setFeatureColumns] = useState('');
  const [sequenceLength, setSequenceLength] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  function chooseFile(nextFile?: File) {
    if (!nextFile) return;
    if (!getFormat(nextFile)) {
      setError('Formato no admitido. Selecciona CSV, JSON, ZIP, TXT o una imagen PNG, JPG, JPEG, WEBP, BMP, GIF, TIF o TIFF.');
      return;
    }
    setError('');
    setFile(nextFile);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    chooseFile(event.dataTransfer.files[0]);
  }

  async function handleUpload() {
    if (!file) return;
    const format = getFormat(file);
    if (!format) return;
    setIsUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('trainSplit', String(trainSplit / 100));
      formData.append('valSplit', String((100 - trainSplit) / 100));
      formData.append('description', description);
      formData.append('targetColumn', targetColumn);
      formData.append('featureColumns', featureColumns);
      if (sequenceLength) formData.append('sequenceLength', sequenceLength);
      await api.post('/datasets/upload', formData);
      onUploaded();
      onClose();
      setFile(null);
      setDescription('');
      setTargetColumn('');
      setFeatureColumns('');
      setSequenceLength('');
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : 'No se pudo subir el dataset.';
      setError(message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button aria-label="Cerrar modal" disabled={isUploading} onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm disabled:cursor-wait" />
      <section role="dialog" aria-modal="true" aria-labelledby="upload-dataset-title" className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 p-5">
          <h2 id="upload-dataset-title" className="text-lg font-semibold">Subir dataset</h2>
          <button onClick={onClose} disabled={isUploading} aria-label="Cerrar" className="rounded p-1 text-slate-500 hover:bg-slate-100"><X size={20} /></button>
        </header>
        <div className="space-y-5 p-6">
          <div
            role="button"
            tabIndex={0}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragOver={event => { event.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center outline-none transition-colors focus:ring-2 focus:ring-indigo-500 ${
              isDragging ? 'border-indigo-500 bg-indigo-50' : file ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
            }`}
          >
            <input ref={fileInputRef} type="file" accept=".csv,.json,.zip,.txt,.png,.jpg,.jpeg,.webp,.bmp,.gif,.tif,.tiff" className="sr-only" onClick={event => event.stopPropagation()} onChange={event => chooseFile(event.target.files?.[0])} />
            {file ? <File size={28} className="mb-3 text-emerald-600" /> : <UploadCloud size={28} className="mb-3 text-indigo-600" />}
            <span className="text-sm font-medium text-slate-800">{file?.name ?? 'Haz clic o arrastra un archivo aquí'}</span>
            <span className="mt-1 text-xs text-slate-500">{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'CSV, JSON, ZIP, TXT e imágenes · sin límite de tamaño en la aplicación'}</span>
          </div>
          {file && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-700">Descripción
                <textarea rows={2} maxLength={4000} value={description} onChange={event => setDescription(event.target.value)} className="mt-1 w-full resize-none rounded-md border border-slate-300 px-3 py-2" />
              </label>
              <label className="block text-sm font-medium text-slate-700">Columna objetivo
                <input maxLength={255} value={targetColumn} onChange={event => setTargetColumn(event.target.value)} placeholder="Ej. etiqueta" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
              </label>
              <label className="block text-sm font-medium text-slate-700">Columnas de entrada
                <input value={featureColumns} onChange={event => setFeatureColumns(event.target.value)} placeholder="temperatura, humedad, presión" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
                <span className="mt-1 block text-xs font-normal text-slate-500">Separa los nombres de columnas por comas.</span>
              </label>
              <label className="block text-sm font-medium text-slate-700">Longitud de secuencia (RNN)
                <input type="number" min={1} max={1000000} value={sequenceLength} onChange={event => setSequenceLength(event.target.value)} placeholder="Opcional" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
              </label>
              <label className="block text-sm font-medium text-slate-700">
              División para entrenamiento: {trainSplit}%
              <input type="range" min={1} max={99} value={trainSplit} onChange={event => setTrainSplit(Number(event.target.value))} className="mt-2 w-full accent-indigo-600" />
              <span className="flex justify-between text-xs font-normal text-slate-500"><span>Train {trainSplit}%</span><span>Validación {100 - trainSplit}%</span></span>
              </label>
            </div>
          )}
          {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {file && getFormat(file) === 'IMAGES' && <p className="rounded-md bg-amber-50 p-3 text-xs text-amber-800">Las imágenes se almacenan como datasets, pero el worker de entrenamiento actual procesa CSV numéricos.</p>}
          <p className="text-xs text-slate-500">El archivo se envía de forma privada a la API. El límite de tamaño depende del almacenamiento y del servicio de despliegue.</p>
        </div>
        <footer className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 p-4">
          <button onClick={onClose} disabled={isUploading} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50">Cancelar</button>
          <button onClick={handleUpload} disabled={!file || isUploading} className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
            {isUploading ? 'Subiendo…' : <><CheckCircle2 size={16} /> Subir dataset</>}
          </button>
        </footer>
      </section>
    </div>
  );
}
