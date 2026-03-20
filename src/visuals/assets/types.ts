/**
 * Asset Generation Pipeline — Type Definitions
 */

export interface RemoveBackgroundOptions {
  model?: 'u2net' | 'u2net_human_seg' | 'isnet-general-use';
  alphaMatte?: boolean;
  outputFormat?: 'png' | 'webp';
}

export interface PostProcessOptions {
  resize?: { width: number; height: number; fit?: 'cover' | 'contain' | 'fill' };
  format?: 'png' | 'webp' | 'avif';
  quality?: number;
  composite?: Array<{ input: string; gravity?: string; blend?: string }>;
  trim?: boolean;
}

export interface AssetPipelineConfig {
  outputDir: string;
  defaultFormat?: 'png' | 'webp';
  defaultQuality?: number;
}

export interface GenerateAssetRequest {
  prompt: string;
  name: string;
  rawImagePath: string;
  removeBackground?: boolean;
  postProcess?: PostProcessOptions;
  category?: 'marketing' | 'web' | 'game' | 'diagram' | 'logo';
}

export interface GenerateAssetResult {
  originalPath: string;
  processedPath: string;
  format: string;
  width: number;
  height: number;
  hasTransparency: boolean;
}
