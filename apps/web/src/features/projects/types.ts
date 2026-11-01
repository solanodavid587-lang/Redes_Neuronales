export type ProjectStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
export type ModelFamily = 'CNN' | 'RNN';

export interface Project {
  id: string;
  name: string;
  description: string;
  objective: string;
  modelFamily: ModelFamily;
  status: ProjectStatus;
  owner: string;
  createdAt: string;
  modelsCount: number;
  datasetsCount: number;
  datasetId?: string | null;
  lastActivity: string;
}