export type DatasetFormat = 'CSV' | 'JSON' | 'IMAGES' | 'TEXT';
export type DatasetStatus = 'READY' | 'PROCESSING' | 'ERROR';

export interface Dataset {
  id: string;
  name: string;
  format: DatasetFormat;
  size: string; // ej. "45.2 MB"
  rows: number;
  status: DatasetStatus;
  trainSplit: number; // ej. 80
  valSplit: number;   // ej. 20
  uploadedAt: string;
}
