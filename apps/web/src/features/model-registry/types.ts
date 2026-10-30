export type ModelStatus = 'DRAFT' | 'REVIEW' | 'APPROVED' | 'RETIRED';

export interface ModelVersion {
  id: string;
  name: string;
  version: string; // ej. "v1.0.0"
  projectName: string;
  architecture: string;
  status: ModelStatus;
  accuracy: string;
  size: string;
  format: 'SavedModel' | 'H5' | 'ONNX';
  createdAt: string;
  createdBy: string;
  checksum: string;
}
