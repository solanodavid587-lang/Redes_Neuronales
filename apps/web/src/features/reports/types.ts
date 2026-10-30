export type ReportFormat = 'PDF' | 'CSV';
export type ReportStatus = 'READY' | 'GENERATING' | 'FAILED';

export interface ReportTemplate {
  id: string;
  title: string;
  description: string;
  icon: 'project' | 'architecture' | 'training' | 'model';
}

export interface GeneratedReport {
  id: string;
  name: string;
  format: ReportFormat;
  status: ReportStatus;
  size: string;
  requestedBy: string;
  date: string;
}
