export type DatasetFormat = 'CSV' | 'JSON' | 'IMAGES' | 'TEXT';
export type DatasetStatus = 'READY' | 'PROCESSING' | 'ERROR';

export interface Dataset {
  id: string;
  projectId?: string | null;
  storagePath?: string | null;
  name: string;
  format: DatasetFormat;
  size: string;
  sizeBytes?: number;
  rows: number;
  status: DatasetStatus;
  trainSplit: number;
  valSplit: number;
  uploadedAt: string;
}