export interface MetricPoint {
  epoch: number;
  trainLoss: number;
  valLoss: number;
  trainAcc: number;
  valAcc: number;
}

export interface EvaluationRun {
  id: string;
  jobId: string;
  projectName: string;
  architecture: string;
  status: 'EVALUATING' | 'COMPLETED';
  metrics: MetricPoint[];
  confusionMatrix: {
    truePositive: number;
    falsePositive: number;
    trueNegative: number;
    falseNegative: number;
  } | null;
}