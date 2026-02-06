/**
 * WS-18: Puppeteer Generation Engine - Main Module
 *
 * Public API and orchestration for visual generation.
 * Implements end-to-end component generation workflow.
 *
 * WS-MEM-1: Lifecycle integration
 * - Delegates browser management to renderer.ts (STD-006: no duplication)
 * - Registers shutdownGenerator with lifecycle manager (STD-005)
 */

import type { DesignSpec } from '../types';
import { getAvailableTemplates } from './templates';
import {
  initializeBrowser,
  closeBrowser,
  generateComponentVisual,
  cleanupBrowserResources,
} from './renderer';
import { registerCleanup } from '../../lifecycle/index';
import type { Browser } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

interface GeneratorStatus {
  initialized: boolean;
  browserReady: boolean;
  timestamp: number;
  generatedCount: number;
}

interface GenerationResult {
  component: string;
  filePath: string;
  success: boolean;
  timestamp: number;
  duration: number;
  error?: string;
}

// Use renderer.ts singleton (no duplicate browser reference)
let generatorInitialized = false;
let generatorBrowserRef: Browser | null = null;
let generatedCount = 0;

export async function initializeGenerator(): Promise<GeneratorStatus> {
  // Create output directories
  const pendingDir = path.join(process.cwd(), '.claude', 'visuals', 'pending');

  if (!fs.existsSync(pendingDir)) {
    await fs.promises.mkdir(pendingDir, { recursive: true });
  }

  // Initialize browser via renderer singleton (STD-006: delegate to renderer)
  if (!generatorBrowserRef) {
    generatorBrowserRef = await initializeBrowser();

    // Register shutdown with lifecycle manager (STD-005)
    registerCleanup('generator-browser', async () => {
      await shutdownGenerator();
    });
  }

  generatorInitialized = true;

  return {
    initialized: true,
    browserReady: true,
    timestamp: Date.now(),
    generatedCount,
  };
}

export async function shutdownGenerator(): Promise<void> {
  if (generatorBrowserRef) {
    await cleanupBrowserResources(generatorBrowserRef);
    generatorBrowserRef = null;
  }
  generatorInitialized = false;
}

export function getGeneratorStatus(): GeneratorStatus {
  return {
    initialized: generatorInitialized && generatorBrowserRef !== null,
    browserReady: generatorBrowserRef !== null,
    timestamp: Date.now(),
    generatedCount,
  };
}

export async function generateVisual(
  componentName: string,
  designSpec: DesignSpec
): Promise<GenerationResult> {
  const startTime = Date.now();

  try {
    // Auto-initialize if not initialized
    if (!generatorBrowserRef) {
      await initializeGenerator();
    }

    // Validate component exists
    const availableTemplates = getAvailableTemplates();
    if (!availableTemplates.includes(componentName)) {
      return {
        component: componentName,
        filePath: '',
        success: false,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        error: `Unknown template: ${componentName}`,
      };
    }

    // Validate design spec
    if (!designSpec.colors) {
      return {
        component: componentName,
        filePath: '',
        success: false,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        error: 'Design spec missing colors',
      };
    }

    // Generate the visual
    const filePath = await generateComponentVisual(
      componentName,
      designSpec,
      generatorBrowserRef
    );

    generatedCount++;

    return {
      component: componentName,
      filePath,
      success: true,
      timestamp: Date.now(),
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      component: componentName,
      filePath: '',
      success: false,
      timestamp: Date.now(),
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function generateAllComponents(
  designSpec: DesignSpec
): Promise<GenerationResult[]> {
  // Auto-initialize if not initialized
  if (!generatorBrowserRef) {
    await initializeGenerator();
  }

  const templates = getAvailableTemplates();
  const results: GenerationResult[] = [];

  for (const template of templates) {
    const result = await generateVisual(template, designSpec);
    results.push(result);
  }

  return results;
}
