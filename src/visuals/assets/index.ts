/**
 * Asset Generation Pipeline — Public API
 */

export type {
  RemoveBackgroundOptions,
  PostProcessOptions,
  AssetPipelineConfig,
  GenerateAssetRequest,
  GenerateAssetResult,
} from './types';

export { removeBackground, removeBackgroundFromBuffer } from './background-remover';
export { postProcess } from './post-processor';
export { runAssetPipeline } from './pipeline';
export { chromaKey } from './chroma-key';
export type { ChromaKeyOptions } from './chroma-key';
