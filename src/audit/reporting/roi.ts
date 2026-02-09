/**
 * WS-AUDIT-2: ROI Reporting & Cross-Project Aggregation - ROI Calculations
 *
 * Purpose: Calculate ROI metrics, human time savings estimates, and summary dashboards
 * AC-2: Human time savings estimate with configurable hourly_rate
 * AC-3: ROI comparison output (agent_cost vs human_cost_estimate, savings_percentage)
 * AC-5: Summary dashboard output
 */

import * as fs from 'fs';
import * as path from 'path';
import type { WorkstreamSummary } from './aggregation';

/**
 * ROI configuration
 */
export interface ROIConfig {
  hourly_rate_usd: number;
  token_to_hour_heuristic: 'linear' | 'logarithmic' | 'custom';
  custom_heuristic_params?: Record<string, number>;
}

/**
 * ROI calculation result
 */
export interface ROIResult {
  agent_cost_usd: number;
  human_cost_estimate_usd: number;
  savings_usd: number;
  savings_percentage: number;
  estimated_human_hours: number;
}

/**
 * Extended workstream summary with ROI data
 */
export interface WorkstreamSummaryWithROI extends WorkstreamSummary {
  roi: ROIResult;
}

/**
 * Summary dashboard data
 */
export interface SummaryDashboard {
  total_agent_cost_usd: number;
  total_human_cost_estimate_usd: number;
  total_savings_usd: number;
  total_savings_percentage: number;
  workstream_count: number;
  average_cost_per_workstream_usd: number;
  total_estimated_human_hours: number;
  date_range?: {
    from: string;
    to: string;
  };
}

/**
 * Default ROI configuration.
 * Assumes a developer hourly rate of $100 USD and linear token-to-hour mapping.
 */
export const DEFAULT_ROI_CONFIG: ROIConfig = {
  hourly_rate_usd: 100,
  token_to_hour_heuristic: 'linear',
};

/**
 * Validates ROI config structure.
 */
function validateROIConfig(config: any): asserts config is ROIConfig {
  if (!config || typeof config !== 'object') {
    throw new Error('Invalid ROI config: config must be an object');
  }

  if (typeof config.hourly_rate_usd !== 'number') {
    throw new Error('Invalid ROI config: hourly_rate_usd must be a number');
  }

  if (config.hourly_rate_usd < 0) {
    throw new Error('Negative hourly rate: hourly_rate_usd cannot be negative');
  }

  if (!isFinite(config.hourly_rate_usd)) {
    throw new Error('Invalid hourly rate: hourly_rate_usd must be a finite number');
  }

  if (!config.token_to_hour_heuristic || typeof config.token_to_hour_heuristic !== 'string') {
    throw new Error('Invalid ROI config: token_to_hour_heuristic must be a string');
  }

  const validHeuristics = ['linear', 'logarithmic', 'custom'];
  if (!validHeuristics.includes(config.token_to_hour_heuristic)) {
    throw new Error(`Invalid heuristic: ${config.token_to_hour_heuristic}. Must be one of: linear, logarithmic, custom`);
  }
}

/**
 * Validates that a file path is safe to read.
 * Defense-in-depth: check extension first, check traversal in original and normalized paths,
 * then verify resolved absolute path stays within allowed directories.
 *
 * Only allows files within the current working directory or system temp directory.
 * Does NOT allow arbitrary home directory access to prevent reading sensitive files
 * like ~/.ssh/config.json or ~/.aws/credentials.json.
 */
function isValidFilePath(filePath: string): boolean {
  // 1. Check extension BEFORE normalization to reject non-JSON files early
  const ext = path.extname(filePath).toLowerCase();
  if (ext !== '.json') {
    return false;
  }

  // 2. Check for path traversal in original path
  if (filePath.includes('..')) {
    return false;
  }

  // 3. Check for encoded traversal patterns
  if (filePath.includes('%2e%2e') || filePath.includes('..%2F') || filePath.includes('%2F..')) {
    return false;
  }

  // 4. Normalize and check again (defense-in-depth)
  const normalized = path.normalize(filePath);
  if (normalized.includes('..')) {
    return false;
  }

  // 5. Resolve to absolute path and verify it stays within allowed directories
  // Only allow cwd and system temp dir — NOT the home directory broadly
  const absolutePath = path.resolve(filePath);
  const cwd = process.cwd();
  const tmpDir = process.env.TMPDIR || process.env.TEMP || process.env.TMP || '/tmp';

  const withinCwd = absolutePath.startsWith(cwd + path.sep) || absolutePath === cwd;
  const withinTmp = absolutePath.startsWith(tmpDir + path.sep) || absolutePath.startsWith(tmpDir);

  if (!withinCwd && !withinTmp) {
    return false;
  }

  return true;
}

/**
 * Loads ROI config from a file.
 * Falls back to DEFAULT_ROI_CONFIG if file not found or invalid.
 */
export function loadROIConfig(configPath?: string): ROIConfig {
  if (!configPath || configPath.trim() === '') {
    return DEFAULT_ROI_CONFIG;
  }

  try {
    if (!isValidFilePath(configPath)) {
      return DEFAULT_ROI_CONFIG;
    }

    if (!fs.existsSync(configPath)) {
      return DEFAULT_ROI_CONFIG;
    }

    const content = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(content);

    validateROIConfig(parsed);

    return parsed;
  } catch (error) {
    return DEFAULT_ROI_CONFIG;
  }
}

/**
 * Estimates human hours required for a given token count.
 * Uses configured heuristic to map tokens to time.
 *
 * Linear heuristic: Assumes ~1000 tokens = ~1 minute of human work
 * (This is a rough estimate based on average typing speed and thinking time)
 */
export function estimateHumanHours(
  totalTokens: number,
  config: ROIConfig
): number {
  if (totalTokens < 0) {
    throw new Error('Negative token count: totalTokens cannot be negative');
  }

  if (!isFinite(totalTokens)) {
    throw new Error('Invalid token count: totalTokens must be a finite number');
  }

  validateROIConfig(config);

  switch (config.token_to_hour_heuristic) {
    case 'linear': {
      // Linear mapping: 1000 tokens ≈ 1 minute ≈ 1/60 hour
      // So total_hours = (tokens / 1000) / 60 = tokens / 60000
      const minutes = totalTokens / 1000;
      const hours = minutes / 60;
      return hours;
    }

    case 'logarithmic': {
      // Logarithmic mapping: diminishing returns for larger token counts
      // Base formula: hours = log10(tokens + 1) / 2
      // This gives ~0.15 hours for 1000 tokens, ~0.3 hours for 10k tokens
      if (totalTokens === 0) {
        return 0;
      }
      return Math.log10(totalTokens + 1) / 2;
    }

    case 'custom': {
      // Custom heuristic using params from config
      const scaleFactor = config.custom_heuristic_params?.scale_factor ?? 0.0001;
      const baseHours = config.custom_heuristic_params?.base_hours ?? 0;
      return baseHours + (totalTokens * scaleFactor);
    }

    default:
      throw new Error(`Invalid heuristic: ${config.token_to_hour_heuristic}`);
  }
}

/**
 * Calculates ROI for a given cost and time estimate.
 */
export function calculateROI(
  agentCostUsd: number,
  estimatedHumanHours: number,
  config: ROIConfig
): ROIResult {
  if (agentCostUsd < 0) {
    throw new Error('Negative cost: agent_cost_usd cannot be negative');
  }

  if (!isFinite(agentCostUsd)) {
    throw new Error('Invalid cost: agent_cost_usd must be a finite number');
  }

  if (estimatedHumanHours < 0) {
    throw new Error('Negative hours: estimated_human_hours cannot be negative');
  }

  if (!isFinite(estimatedHumanHours)) {
    throw new Error('Invalid hours: estimated_human_hours must be a finite number');
  }

  validateROIConfig(config);

  const humanCostEstimateUsd = estimatedHumanHours * config.hourly_rate_usd;
  const savingsUsd = humanCostEstimateUsd - agentCostUsd;

  let savingsPercentage: number;
  if (humanCostEstimateUsd === 0) {
    // If human cost is zero, savings are either 0% (if agent cost also zero) or -Infinity
    savingsPercentage = agentCostUsd === 0 ? 0 : -Infinity;
  } else {
    savingsPercentage = (savingsUsd / humanCostEstimateUsd) * 100;
  }

  return {
    agent_cost_usd: agentCostUsd,
    human_cost_estimate_usd: humanCostEstimateUsd,
    savings_usd: savingsUsd,
    savings_percentage: savingsPercentage,
    estimated_human_hours: estimatedHumanHours,
  };
}

/**
 * Enhances workstream summaries with ROI data.
 */
export function enhanceSummaryWithROI(
  summaries: WorkstreamSummary[],
  config: ROIConfig
): WorkstreamSummaryWithROI[] {
  if (!Array.isArray(summaries)) {
    throw new Error('Invalid summaries: must be an array');
  }

  validateROIConfig(config);

  return summaries.map(summary => {
    // Validate summary data
    if (summary.total_cost_usd < 0) {
      throw new Error(`Negative cost in summary for workstream ${summary.workstream_id}`);
    }

    if (summary.total_input_tokens < 0 || summary.total_output_tokens < 0) {
      throw new Error(`Negative token count in summary for workstream ${summary.workstream_id}`);
    }

    const totalTokens = summary.total_input_tokens + summary.total_output_tokens;
    const estimatedHumanHours = estimateHumanHours(totalTokens, config);
    const roi = calculateROI(summary.total_cost_usd, estimatedHumanHours, config);

    return {
      ...summary,
      roi,
    };
  });
}

/**
 * Generates a summary dashboard from workstream summaries with ROI.
 */
export function generateSummaryDashboard(
  summariesWithROI: WorkstreamSummaryWithROI[],
  dateRange?: { from: string; to: string }
): SummaryDashboard {
  if (!Array.isArray(summariesWithROI)) {
    throw new Error('Invalid summaries: must be an array');
  }

  if (summariesWithROI.length === 0) {
    return {
      total_agent_cost_usd: 0,
      total_human_cost_estimate_usd: 0,
      total_savings_usd: 0,
      total_savings_percentage: 0,
      workstream_count: 0,
      average_cost_per_workstream_usd: 0,
      total_estimated_human_hours: 0,
      date_range: dateRange,
    };
  }

  const totalAgentCost = summariesWithROI.reduce(
    (sum, s) => sum + s.roi.agent_cost_usd,
    0
  );

  const totalHumanCostEstimate = summariesWithROI.reduce(
    (sum, s) => sum + s.roi.human_cost_estimate_usd,
    0
  );

  const totalSavings = summariesWithROI.reduce(
    (sum, s) => sum + s.roi.savings_usd,
    0
  );

  const totalEstimatedHours = summariesWithROI.reduce(
    (sum, s) => sum + s.roi.estimated_human_hours,
    0
  );

  const workstreamCount = summariesWithROI.length;
  const averageCostPerWorkstream = totalAgentCost / workstreamCount;

  let totalSavingsPercentage: number;
  if (totalHumanCostEstimate === 0) {
    totalSavingsPercentage = 0;
  } else {
    totalSavingsPercentage = (totalSavings / totalHumanCostEstimate) * 100;
  }

  return {
    total_agent_cost_usd: totalAgentCost,
    total_human_cost_estimate_usd: totalHumanCostEstimate,
    total_savings_usd: totalSavings,
    total_savings_percentage: totalSavingsPercentage,
    workstream_count: workstreamCount,
    average_cost_per_workstream_usd: averageCostPerWorkstream,
    total_estimated_human_hours: totalEstimatedHours,
    date_range: dateRange,
  };
}
