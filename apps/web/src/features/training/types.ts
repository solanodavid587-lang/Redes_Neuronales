export type JobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface TrainingJob {
  id: string;
  projectName: string;
  architecture: string;
  status: JobStatus;
  progress: number;
  epoch: number;
  totalEpochs: number;
  loss: string;
  accuracy: string;
  startedAt: string;
}
