export type NetworkFamily = 'Feedforward' | 'RNN' | 'CNN' | 'GAN';
export type LayerType = 'Input' | 'Dense' | 'Conv2D' | 'LSTM' | 'Dropout' | 'Output';

export interface Layer {
  id: string;
  type: LayerType;
  neurons: number;
  activation: string;
}

export interface Architecture {
  name: string;
  family: NetworkFamily;
  layers: Layer[];
}
