export type ProjectStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED';

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  owner: string;
  createdAt: string;
  modelsCount: number;
  datasetsCount: number;
  lastActivity: string;
}