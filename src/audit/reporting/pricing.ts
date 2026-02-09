/**
 * WS-AUDIT-1: Cost Estimation & Enhanced Reporting - Pricing Module
 *
 * Purpose: Cost estimation using configurable pricing tables.
 * Default: Anthropic API pricing (February 2026)
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Pricing table interface for model costs.
 * Uses MTok (Million Tokens) as the pricing unit.
 */
export interface PricingTable {
  [modelId: string]: {
    input_per_mtok: number;
    output_per_mtok: number;
    cache_write_per_mtok?: number;
    cache_read_per_mtok?: number;
  };
}

/**
 * Token counts for a single request.
 */
export interface TokenCounts {
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens?: number;
  cache_read_tokens?: number;
}

/**
 * Default Anthropic API pricing table (February 2026).
 * Source: https://www.anthropic.com/api
 */
export const DEFAULT_PRICING_TABLE: PricingTable = {
  'claude-opus-4-6': {
    input_per_mtok: 15.0,
    output_per_mtok: 75.0,
    cache_write_per_mtok: 18.75,
    cache_read_per_mtok: 1.50,
  },
  'claude-opus-4-5-20251101': {
    input_per_mtok: 15.0,
    output_per_mtok: 75.0,
    cache_write_per_mtok: 18.75,
    cache_read_per_mtok: 1.50,
  },
  'claude-sonnet-4-5-20250929': {
    input_per_mtok: 3.0,
    output_per_mtok: 15.0,
    cache_write_per_mtok: 3.75,
    cache_read_per_mtok: 0.30,
  },
};

/**
 * Validates pricing table structure and values.
 * Returns false for invalid tables (does not throw).
 */
export function validatePricingTable(table: any): table is PricingTable {
  // Check basic type
  if (!table || typeof table !== 'object' || Array.isArray(table)) {
    return false;
  }

  // Check each model entry
  for (const [modelId, pricing] of Object.entries(table)) {
    // Model ID must not be empty
    if (!modelId || modelId.trim() === '') {
      return false;
    }

    // Pricing must be an object
    if (!pricing || typeof pricing !== 'object') {
      return false;
    }

    const p = pricing as any;

    // Required fields must be numbers
    if (typeof p.input_per_mtok !== 'number' || typeof p.output_per_mtok !== 'number') {
      return false;
    }

    // Optional fields must be numbers if present
    if (p.cache_write_per_mtok !== undefined && typeof p.cache_write_per_mtok !== 'number') {
      return false;
    }
    if (p.cache_read_per_mtok !== undefined && typeof p.cache_read_per_mtok !== 'number') {
      return false;
    }

    // Check for negative values
    if (p.input_per_mtok < 0 || p.output_per_mtok < 0) {
      return false;
    }
    if (p.cache_write_per_mtok !== undefined && p.cache_write_per_mtok < 0) {
      return false;
    }
    if (p.cache_read_per_mtok !== undefined && p.cache_read_per_mtok < 0) {
      return false;
    }

    // Check for NaN/Infinity
    if (!isFinite(p.input_per_mtok) || !isFinite(p.output_per_mtok)) {
      return false;
    }
    if (p.cache_write_per_mtok !== undefined && !isFinite(p.cache_write_per_mtok)) {
      return false;
    }
    if (p.cache_read_per_mtok !== undefined && !isFinite(p.cache_read_per_mtok)) {
      return false;
    }
  }

  return true;
}

/**
 * Validates token counts for cost estimation.
 * Throws error if invalid.
 */
function validateTokenCounts(tokens: TokenCounts): void {
  // Check for negative values
  if (tokens.input_tokens < 0) {
    throw new Error('Negative token count: input_tokens cannot be negative');
  }
  if (tokens.output_tokens < 0) {
    throw new Error('Negative token count: output_tokens cannot be negative');
  }
  if (tokens.cache_creation_tokens !== undefined && tokens.cache_creation_tokens < 0) {
    throw new Error('Negative token count: cache_creation_tokens cannot be negative');
  }
  if (tokens.cache_read_tokens !== undefined && tokens.cache_read_tokens < 0) {
    throw new Error('Negative token count: cache_read_tokens cannot be negative');
  }

  // Check for NaN/Infinity
  if (!isFinite(tokens.input_tokens)) {
    throw new Error('Invalid token value: input_tokens must be a finite number');
  }
  if (!isFinite(tokens.output_tokens)) {
    throw new Error('Invalid token value: output_tokens must be a finite number');
  }
  if (tokens.cache_creation_tokens !== undefined && !isFinite(tokens.cache_creation_tokens)) {
    throw new Error('Invalid token value: cache_creation_tokens must be a finite number');
  }
  if (tokens.cache_read_tokens !== undefined && !isFinite(tokens.cache_read_tokens)) {
    throw new Error('Invalid token value: cache_read_tokens must be a finite number');
  }
}

/**
 * Validates pricing for a specific model.
 * Throws error if invalid.
 */
function validateModelPricing(modelId: string, pricing: any): void {
  // Check for negative values
  if (pricing.input_per_mtok < 0 || pricing.output_per_mtok < 0) {
    throw new Error(`Negative pricing values for model ${modelId}`);
  }
  if (pricing.cache_write_per_mtok !== undefined && pricing.cache_write_per_mtok < 0) {
    throw new Error(`Negative pricing values for model ${modelId}`);
  }
  if (pricing.cache_read_per_mtok !== undefined && pricing.cache_read_per_mtok < 0) {
    throw new Error(`Negative pricing values for model ${modelId}`);
  }

  // Check for NaN/Infinity
  if (!isFinite(pricing.input_per_mtok) || !isFinite(pricing.output_per_mtok)) {
    throw new Error(`Invalid pricing values for model ${modelId}`);
  }
  if (pricing.cache_write_per_mtok !== undefined && !isFinite(pricing.cache_write_per_mtok)) {
    throw new Error(`Invalid pricing values for model ${modelId}`);
  }
  if (pricing.cache_read_per_mtok !== undefined && !isFinite(pricing.cache_read_per_mtok)) {
    throw new Error(`Invalid pricing values for model ${modelId}`);
  }
}

/**
 * Estimates cost in USD for a single request.
 * Uses the specified pricing table, or DEFAULT_PRICING_TABLE if not provided.
 *
 * @param modelId - Model identifier (e.g., 'claude-opus-4-6')
 * @param tokens - Token counts for the request
 * @param pricingTable - Optional custom pricing table
 * @returns Estimated cost in USD
 * @throws Error if model not found in pricing table or if values are invalid
 */
export function estimateCost(
  modelId: string,
  tokens: TokenCounts,
  pricingTable: PricingTable = DEFAULT_PRICING_TABLE
): number {
  // Validate token counts
  validateTokenCounts(tokens);

  // Check if model exists in pricing table
  if (!(modelId in pricingTable)) {
    throw new Error(`Pricing not found for model: ${modelId}`);
  }

  const pricing = pricingTable[modelId];

  // Validate pricing values
  validateModelPricing(modelId, pricing);

  // Calculate cost per token type
  // 1 MTok = 1,000,000 tokens
  const inputCost = (tokens.input_tokens / 1_000_000) * pricing.input_per_mtok;
  const outputCost = (tokens.output_tokens / 1_000_000) * pricing.output_per_mtok;

  let cacheWriteCost = 0;
  if (tokens.cache_creation_tokens && pricing.cache_write_per_mtok !== undefined) {
    cacheWriteCost = (tokens.cache_creation_tokens / 1_000_000) * pricing.cache_write_per_mtok;
  }

  let cacheReadCost = 0;
  if (tokens.cache_read_tokens && pricing.cache_read_per_mtok !== undefined) {
    cacheReadCost = (tokens.cache_read_tokens / 1_000_000) * pricing.cache_read_per_mtok;
  }

  return inputCost + outputCost + cacheWriteCost + cacheReadCost;
}

/**
 * Validates that a file path is safe to read.
 * Rejects paths with:
 * - Path traversal attempts (..)
 * - Wrong file extension (must be .json)
 *
 * @param filePath - Path to validate
 * @returns true if safe, false otherwise
 */
function isValidFilePath(filePath: string): boolean {
  // Reject paths with .. (path traversal)
  const normalized = path.normalize(filePath);
  if (normalized.includes('..')) {
    return false;
  }

  // Only allow .json files
  const ext = path.extname(filePath).toLowerCase();
  if (ext !== '.json') {
    return false;
  }

  return true;
}

/**
 * Loads pricing table from a config file.
 * Falls back to DEFAULT_PRICING_TABLE if file not found or invalid.
 *
 * @param configPath - Path to pricing config JSON file (optional)
 * @returns Pricing table
 */
export function loadPricingTable(configPath?: string): PricingTable {
  // If no path provided, use default
  if (!configPath || configPath.trim() === '') {
    return DEFAULT_PRICING_TABLE;
  }

  // Try to load and parse config file
  try {
    // Validate path for security
    if (!isValidFilePath(configPath)) {
      return DEFAULT_PRICING_TABLE;
    }

    if (!fs.existsSync(configPath)) {
      return DEFAULT_PRICING_TABLE;
    }

    const content = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(content);

    // Validate structure
    if (!validatePricingTable(parsed)) {
      return DEFAULT_PRICING_TABLE;
    }

    return parsed;
  } catch (error) {
    // Fall back to default on any error (file not found, parse error, etc.)
    return DEFAULT_PRICING_TABLE;
  }
}
