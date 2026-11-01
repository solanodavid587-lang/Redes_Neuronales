export type ModelFamily = 'CNN' | 'RNN';
export type LayerType =
  | 'Input'
  | 'Conv2D'
  | 'MaxPooling2D'
  | 'Flatten'
  | 'LSTM'
  | 'GRU'
  | 'SimpleRNN'
  | 'Dense'
  | 'Dropout'
  | 'Output';

export interface Layer {
  id: string;
  type: LayerType;
  neurons: number;
  activation: string;
  kernelSize?: number;
  dropoutRate?: number;
  returnSequences?: boolean;
}

export interface ArchitectureConfig {
  family: ModelFamily;
  description: string;
  inputShape: number[];
  layers: Layer[];
}