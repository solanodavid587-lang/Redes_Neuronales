export type JobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface TrainingConfiguration {
  batchSize: number;
  learningRate: number;
  optimizer: 'adam' | 'sgd' | 'rmsprop';
  loss: string;
  earlyStopping: boolean;
  patience: number;
  seed: number;
}

export interface TrainingJob {
  id: string;
  projectName: string;
  architecture: string;
  modelFamily: 'CNN' | 'RNN';
  configuration: TrainingConfiguration;
  status: JobStatus;
  progress: number;
  epoch: number;
  totalEpochs: number;
  loss: string;
  accuracy: string;
  precision?: number | null;
  recall?: number | null;
  f1Score?: number | null;
  confusionMatrix?: number[][] | null;
  errorMessage?: string | null;
  startedAt: string;
}