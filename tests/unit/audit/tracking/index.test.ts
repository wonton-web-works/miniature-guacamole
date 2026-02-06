/**
 * WS-TRACKING Phase 1: Public API Module Tests
 *
 * Tests the tracking module's public API surface.
 * Verifies all exports are available and correctly wired.
 *
 * Target: 100% coverage of tracking/index.ts
 */

import { describe, it, expect } from 'vitest';
import {
  loadTrackingConfig,
  detectAgentName,
  validateWorkstreamId,
  validateAgentName,
  validateFeatureName,
  addTrackingFields,
  createTrackingFields,
  SCHEMA_VERSION,
  TRACKING_CONFIG_DEFAULTS,
  WORKSTREAM_ID_PATTERN,
  AGENT_NAME_PATTERN,
} from '@/audit/tracking/index';

describe('audit/tracking/index - Public API exports', () => {
  describe('Given the tracking module public API', () => {
    it('When importing config functions, Then they are defined', () => {
      expect(loadTrackingConfig).toBeDefined();
      expect(typeof loadTrackingConfig).toBe('function');
    });

    it('When importing detectAgentName, Then it is defined', () => {
      expect(detectAgentName).toBeDefined();
      expect(typeof detectAgentName).toBe('function');
    });

    it('When importing validation functions, Then they are defined', () => {
      expect(validateWorkstreamId).toBeDefined();
      expect(validateAgentName).toBeDefined();
      expect(validateFeatureName).toBeDefined();
      expect(typeof validateWorkstreamId).toBe('function');
      expect(typeof validateAgentName).toBe('function');
      expect(typeof validateFeatureName).toBe('function');
    });

    it('When importing tagging functions, Then they are defined', () => {
      expect(addTrackingFields).toBeDefined();
      expect(createTrackingFields).toBeDefined();
      expect(typeof addTrackingFields).toBe('function');
      expect(typeof createTrackingFields).toBe('function');
    });

    it('When importing constants, Then they are defined', () => {
      expect(SCHEMA_VERSION).toBe('1.0');
      expect(TRACKING_CONFIG_DEFAULTS).toBeDefined();
      expect(WORKSTREAM_ID_PATTERN).toBeInstanceOf(RegExp);
      expect(AGENT_NAME_PATTERN).toBeInstanceOf(RegExp);
    });
  });
});
