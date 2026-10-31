export type LayerType = 'Input' | 'Dense' | 'Conv2D' | 'LSTM' | 'Dropout' | 'Output';

export interface Layer {
  id: string;
  type: LayerType;
  neurons: number;
  activation: string;
}

export interface ArchitectureConfig {
  family: string;
  layers: Layer[];
}