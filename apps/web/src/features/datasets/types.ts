export type DatasetFormat = 'CSV' | 'JSON' | 'IMAGES' | 'TEXT';
export type DatasetStatus = 'READY' | 'PROCESSING' | 'ERROR';

export interface Dataset {
  id: string;
  projectId?: string | null;
  storagePath?: string | null;
  name: string;
  description: string;
  format: DatasetFormat;
  size: string;
  sizeBytes?: number;
  rows: number;
  status: DatasetStatus;
  trainSplit: number;
  valSplit: number;
  targetColumn?: string | null;
  featureColumns: string[];
  sequenceLength?: number | null;
  uploadedAt: string;
}

export interface DatasetPreview {
  columns: string[];
  records: Record<string, string | string[] | null>[];
  rowsReturned: number;
  hasMore: boolean;
}