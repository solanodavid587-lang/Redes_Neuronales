export type DatasetFormat = 'CSV' | 'JSON' | 'IMAGES' | 'TEXT';
export type DatasetStatus = 'READY' | 'PROCESSING' | 'ERROR';

export interface Dataset {
  id: string;
  name: string;
  format: DatasetFormat;
  size: string;
  rows: number;
  status: DatasetStatus;
  trainSplit: number;
  valSplit: number;
  uploadedAt: string;
}