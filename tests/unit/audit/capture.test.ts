/**
 * WS-16: Token Usage Audit Log - Capture Module Tests
 *
 * BDD Scenarios:
 * - Execute Claude CLI with JSON output
 * - Parse API response
 * - Handle CLI errors
 *
 * Target: 99% coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock child_process module at the top level
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

import { captureAuditLog, parseClaudeResponse } from '@/audit/capture';
import * as child_process from 'child_process';

describe('audit/capture - parseClaudeResponse()', () => {
  describe('Given valid JSON response', () => {
    it('When parsing, Then returns response object', () => {
      const jsonOutput = JSON.stringify({
        model: 'claude-opus-4-5-20251101',
        usage: {
          input_tokens: 1234,
          output_tokens: 567
        },
        session_id: '550e8400-e29b-41d4-a716-446655440000'
      });

      const response = parseClaudeResponse(jsonOutput);

      expect(response).toHaveProperty('model');
      expect(response).toHaveProperty('usage');
      expect(response).toHaveProperty('session_id');
    });

    it('When parsing, Then preserves all fields', () => {
      const expectedResponse = {
        model: 'claude-opus-4-5-20251101',
        usage: {
          input_tokens: 1234,
          output_tokens: 567,
          cache_creation_input_tokens: 1688,
          cache_read_input_tokens: 19666
        },
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        total_cost_usd: 0.02124,
        duration_ms: 2231
      };

      const jsonOutput = JSON.stringify(expectedResponse);
      const response = parseClaudeResponse(jsonOutput);

      expect(response).toEqual(expectedResponse);
    });
  });

  describe('Given invalid JSON response', () => {
    it('When parsing malformed JSON, Then throws error', () => {
      const invalidJson = '{ invalid json }';

      expect(() => parseClaudeResponse(invalidJson)).toThrow();
    });

    it('When parsing non-JSON output, Then throws error', () => {
      const nonJson = 'This is not JSON output';

      expect(() => parseClaudeResponse(nonJson)).toThrow();
    });

    it('When parsing empty string, Then throws error', () => {
      expect(() => parseClaudeResponse('')).toThrow();
    });
  });

  describe('Given JSON response with unexpected structure', () => {
    it('When response missing usage field, Then returns response with null usage', () => {
      const jsonOutput = JSON.stringify({
        model: 'claude-opus-4-5-20251101',
        session_id: '550e8400-e29b-41d4-a716-446655440000'
      });

      const response = parseClaudeResponse(jsonOutput);

      expect(response.model).toBe('claude-opus-4-5-20251101');
      expect(response.usage).toBeUndefined();
    });
  });
});

describe('audit/capture - captureAuditLog()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given valid prompt and options', () => {
    it('When executing, Then calls claude CLI with --output-format=json', async () => {
      const prompt = 'Test prompt';
      const options = {};

      const mockResponse = {
        model: 'claude-opus-4-5-20251101',
        usage: { input_tokens: 100, output_tokens: 50 },
        session_id: '550e8400-e29b-41d4-a716-446655440000'
      };

      vi.mocked(child_process.execSync).mockReturnValue(
        JSON.stringify(mockResponse) as any
      );

      await captureAuditLog(prompt, options);

      expect(child_process.execSync).toHaveBeenCalledWith(
        expect.stringContaining('--output-format=json'),
        expect.any(Object)
      );
    });

    it('When executing, Then passes prompt to CLI', async () => {
      const prompt = 'What is the weather?';
      const options = {};

      const mockResponse = {
        model: 'claude-opus-4-5-20251101',
        usage: { input_tokens: 100, output_tokens: 50 },
        session_id: '550e8400-e29b-41d4-a716-446655440000'
      };

      vi.mocked(child_process.execSync).mockReturnValue(
        JSON.stringify(mockResponse) as any
      );

      await captureAuditLog(prompt, options);

      expect(child_process.execSync).toHaveBeenCalledWith(
        expect.stringContaining(prompt),
        expect.any(Object)
      );
    });

    it('When executing, Then returns parsed response object', async () => {
      const prompt = 'Test prompt';
      const options = {};

      const mockResponse = {
        model: 'claude-opus-4-5-20251101',
        usage: {
          input_tokens: 1234,
          output_tokens: 567
        },
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        total_cost_usd: 0.02124,
        duration_ms: 2231
      };

      vi.mocked(child_process.execSync).mockReturnValue(
        JSON.stringify(mockResponse) as any
      );

      const response = await captureAuditLog(prompt, options);

      expect(response).toEqual(mockResponse);
    });
  });

  describe('Given options with model specification', () => {
    it('When model specified, Then passes model to CLI', async () => {
      const prompt = 'Test prompt';
      const options = {
        model: 'claude-haiku-4-5-20251001'
      };

      const mockResponse = {
        model: 'claude-haiku-4-5-20251001',
        usage: { input_tokens: 100, output_tokens: 50 },
        session_id: '550e8400-e29b-41d4-a716-446655440000'
      };

      vi.mocked(child_process.execSync).mockReturnValue(
        JSON.stringify(mockResponse) as any
      );

      await captureAuditLog(prompt, options);

      expect(child_process.execSync).toHaveBeenCalledWith(
        expect.stringContaining('claude-haiku-4-5-20251001'),
        expect.any(Object)
      );
    });
  });

  describe('Given CLI execution errors', () => {
    it('When CLI returns non-zero exit code, Then throws error', async () => {
      const prompt = 'Test prompt';
      const options = {};

      vi.mocked(child_process.execSync).mockImplementation(() => {
        throw new Error('Command failed');
      });

      await expect(captureAuditLog(prompt, options)).rejects.toThrow();
    });

    it('When CLI times out, Then throws timeout error', async () => {
      const prompt = 'Test prompt';
      const options = {};

      vi.mocked(child_process.execSync).mockImplementation(() => {
        const error: any = new Error('Timeout');
        error.code = 'ETIMEDOUT';
        throw error;
      });

      await expect(captureAuditLog(prompt, options)).rejects.toThrow();
    });

    it('When CLI not found, Then throws error with clear message', async () => {
      const prompt = 'Test prompt';
      const options = {};

      vi.mocked(child_process.execSync).mockImplementation(() => {
        const error: any = new Error('ENOENT');
        error.code = 'ENOENT';
        throw error;
      });

      await expect(captureAuditLog(prompt, options)).rejects.toThrow();
    });
  });

  describe('Given CLI returns invalid JSON', () => {
    it('When JSON parse fails, Then throws error', async () => {
      const prompt = 'Test prompt';
      const options = {};

      vi.mocked(child_process.execSync).mockReturnValue(
        'Invalid JSON output' as any
      );

      await expect(captureAuditLog(prompt, options)).rejects.toThrow();
    });

    it('When response is empty, Then throws error', async () => {
      const prompt = 'Test prompt';
      const options = {};

      vi.mocked(child_process.execSync).mockReturnValue('' as any);

      await expect(captureAuditLog(prompt, options)).rejects.toThrow();
    });
  });

  describe('Given execution with multiple models', () => {
    it('When response contains models_used, Then preserves array', async () => {
      const prompt = 'Test prompt';
      const options = {};

      const mockResponse = {
        model: 'claude-opus-4-5-20251101',
        usage: {
          input_tokens: 1234,
          output_tokens: 567
        },
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        models_used: ['claude-haiku-4-5-20251001', 'claude-opus-4-5-20251101']
      };

      vi.mocked(child_process.execSync).mockReturnValue(
        JSON.stringify(mockResponse) as any
      );

      const response = await captureAuditLog(prompt, options);

      expect(response.models_used).toEqual([
        'claude-haiku-4-5-20251001',
        'claude-opus-4-5-20251101'
      ]);
    });
  });

  describe('Given execution timing', () => {
    it('When execution completes, Then tracks duration_ms', async () => {
      const prompt = 'Test prompt';
      const options = {};

      const mockResponse = {
        model: 'claude-opus-4-5-20251101',
        usage: { input_tokens: 100, output_tokens: 50 },
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        duration_ms: 2500
      };

      vi.mocked(child_process.execSync).mockReturnValue(
        JSON.stringify(mockResponse) as any
      );

      const response = await captureAuditLog(prompt, options);

      expect(response.duration_ms).toBe(2500);
    });
  });
});
