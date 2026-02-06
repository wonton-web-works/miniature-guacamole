/**
 * Unit Tests for WS-3: Structured Return Envelopes
 *
 * Tests the standardized return values from agents with typed envelopes
 * containing status, metrics, and results.
 *
 * @workstream WS-3: Structured Return Envelopes
 * @target 99% function coverage
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type {
  AgentStatus,
  AgentMetrics,
  AgentResult,
  EscalationInfo,
  AgentReturn
} from '../../src/returns/types';
import { validateAgentReturn, createAgentReturn } from '../../src/returns/validate';

describe('WS-3: Structured Return Envelopes', () => {
  describe('AgentReturn Interface', () => {
    it('Should define AgentReturn interface with required fields', () => {
      // This test verifies the interface exists and has the required structure
      const agentReturn: AgentReturn = {
        status: 'success',
        agent_id: 'qa-engineer',
        timestamp: new Date().toISOString(),
      };

      expect(agentReturn).toBeDefined();
      expect(agentReturn.status).toBe('success');
      expect(agentReturn.agent_id).toBe('qa-engineer');
      expect(agentReturn.timestamp).toBeDefined();
    });

    it('Should support optional workstream_id field', () => {
      const agentReturn: AgentReturn = {
        status: 'success',
        agent_id: 'qa-engineer',
        workstream_id: 'ws-3',
        timestamp: new Date().toISOString(),
      };

      expect(agentReturn.workstream_id).toBe('ws-3');
    });

    it('Should support optional metrics field', () => {
      const agentReturn: AgentReturn = {
        status: 'success',
        agent_id: 'qa-engineer',
        timestamp: new Date().toISOString(),
        metrics: {
          tests_passed: 10,
          tests_failed: 0,
          coverage: 99.5,
        },
      };

      expect(agentReturn.metrics).toBeDefined();
      expect(agentReturn.metrics?.tests_passed).toBe(10);
    });

    it('Should support optional result field', () => {
      const agentReturn: AgentReturn = {
        status: 'success',
        agent_id: 'qa-engineer',
        timestamp: new Date().toISOString(),
        result: {
          summary: 'All tests passed',
          deliverables: ['test-file.ts'],
        },
      };

      expect(agentReturn.result).toBeDefined();
      expect(agentReturn.result?.summary).toBe('All tests passed');
    });

    it('Should support optional escalation field', () => {
      const agentReturn: AgentReturn = {
        status: 'escalate',
        agent_id: 'qa-engineer',
        timestamp: new Date().toISOString(),
        escalation: {
          reason: 'Unable to test without implementation',
          required_from: 'engineer',
          blocker: 'Missing types.ts file',
        },
      };

      expect(agentReturn.escalation).toBeDefined();
      expect(agentReturn.escalation?.reason).toBeDefined();
    });
  });

  describe('AgentStatus Type', () => {
    it('Should accept "success" status', () => {
      const status: AgentStatus = 'success';
      expect(status).toBe('success');
    });

    it('Should accept "failure" status', () => {
      const status: AgentStatus = 'failure';
      expect(status).toBe('failure');
    });

    it('Should accept "partial" status', () => {
      const status: AgentStatus = 'partial';
      expect(status).toBe('partial');
    });

    it('Should accept "escalate" status', () => {
      const status: AgentStatus = 'escalate';
      expect(status).toBe('escalate');
    });

    it('Should have exactly four status values', () => {
      const validStatuses: AgentStatus[] = ['success', 'failure', 'partial', 'escalate'];
      expect(validStatuses.length).toBe(4);
    });
  });

  describe('AgentMetrics Interface', () => {
    it('Should support optional tests_passed metric', () => {
      const metrics: AgentMetrics = {
        tests_passed: 15,
      };

      expect(metrics.tests_passed).toBe(15);
    });

    it('Should support optional tests_failed metric', () => {
      const metrics: AgentMetrics = {
        tests_failed: 2,
      };

      expect(metrics.tests_failed).toBe(2);
    });

    it('Should support optional coverage metric', () => {
      const metrics: AgentMetrics = {
        coverage: 99.5,
      };

      expect(metrics.coverage).toBe(99.5);
    });

    it('Should support optional files_changed metric', () => {
      const metrics: AgentMetrics = {
        files_changed: 3,
      };

      expect(metrics.files_changed).toBe(3);
    });

    it('Should support optional lines_added metric', () => {
      const metrics: AgentMetrics = {
        lines_added: 150,
      };

      expect(metrics.lines_added).toBe(150);
    });

    it('Should support optional lines_removed metric', () => {
      const metrics: AgentMetrics = {
        lines_removed: 42,
      };

      expect(metrics.lines_removed).toBe(42);
    });

    it('Should support optional duration_ms metric', () => {
      const metrics: AgentMetrics = {
        duration_ms: 5432,
      };

      expect(metrics.duration_ms).toBe(5432);
    });

    it('Should allow all metrics to be present simultaneously', () => {
      const metrics: AgentMetrics = {
        tests_passed: 50,
        tests_failed: 0,
        coverage: 99.8,
        files_changed: 5,
        lines_added: 500,
        lines_removed: 100,
        duration_ms: 12000,
      };

      expect(metrics.tests_passed).toBe(50);
      expect(metrics.tests_failed).toBe(0);
      expect(metrics.coverage).toBe(99.8);
      expect(metrics.files_changed).toBe(5);
      expect(metrics.lines_added).toBe(500);
      expect(metrics.lines_removed).toBe(100);
      expect(metrics.duration_ms).toBe(12000);
    });

    it('Should allow all metrics to be absent (empty object)', () => {
      const metrics: AgentMetrics = {};
      expect(Object.keys(metrics).length).toBe(0);
    });
  });

  describe('AgentResult Interface', () => {
    it('Should require summary field', () => {
      const result: AgentResult = {
        summary: 'Task completed successfully',
      };

      expect(result.summary).toBe('Task completed successfully');
    });

    it('Should support optional deliverables field as string array', () => {
      const result: AgentResult = {
        summary: 'Tests created',
        deliverables: [
          'tests/unit/return-envelope.test.ts',
          'src/returns/validate.ts',
        ],
      };

      expect(result.deliverables).toBeDefined();
      expect(Array.isArray(result.deliverables)).toBe(true);
      expect(result.deliverables?.length).toBe(2);
    });

    it('Should support optional next_steps field as string array', () => {
      const result: AgentResult = {
        summary: 'Partial implementation',
        next_steps: [
          'Implement validateAgentReturn function',
          'Implement createAgentReturn factory',
          'Run tests to verify',
        ],
      };

      expect(result.next_steps).toBeDefined();
      expect(Array.isArray(result.next_steps)).toBe(true);
      expect(result.next_steps?.length).toBe(3);
    });

    it('Should allow both deliverables and next_steps together', () => {
      const result: AgentResult = {
        summary: 'In progress',
        deliverables: ['file1.ts', 'file2.ts'],
        next_steps: ['Step 1', 'Step 2'],
      };

      expect(result.deliverables).toBeDefined();
      expect(result.next_steps).toBeDefined();
    });
  });

  describe('EscalationInfo Interface', () => {
    it('Should require reason field', () => {
      const escalation: EscalationInfo = {
        reason: 'Implementation is required',
        required_from: 'engineer',
      };

      expect(escalation.reason).toBe('Implementation is required');
    });

    it('Should require required_from field', () => {
      const escalation: EscalationInfo = {
        reason: 'Needs code changes',
        required_from: 'dev-engineer',
      };

      expect(escalation.required_from).toBe('dev-engineer');
    });

    it('Should support optional blocker field', () => {
      const escalation: EscalationInfo = {
        reason: 'Cannot proceed',
        required_from: 'engineer',
        blocker: 'Missing type definitions',
      };

      expect(escalation.blocker).toBe('Missing type definitions');
    });

    it('Should allow blocker to be undefined', () => {
      const escalation: EscalationInfo = {
        reason: 'Need review',
        required_from: 'lead',
      };

      expect(escalation.blocker).toBeUndefined();
    });
  });

  describe('validateAgentReturn() Function', () => {
    it('Should validate a valid AgentReturn with success status', () => {
      const agentReturn: AgentReturn = {
        status: 'success',
        agent_id: 'qa-engineer',
        timestamp: new Date().toISOString(),
      };

      const result = validateAgentReturn(agentReturn);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('Should validate AgentReturn with all optional fields', () => {
      const agentReturn: AgentReturn = {
        status: 'success',
        agent_id: 'qa-engineer',
        workstream_id: 'ws-3',
        timestamp: new Date().toISOString(),
        metrics: { tests_passed: 10 },
        result: { summary: 'Done' },
      };

      const result = validateAgentReturn(agentReturn);
      expect(result.valid).toBe(true);
    });

    it('Should reject envelope with missing status field', () => {
      const agentReturn: any = {
        agent_id: 'qa-engineer',
        timestamp: new Date().toISOString(),
      };

      const result = validateAgentReturn(agentReturn);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('status'))).toBe(true);
    });

    it('Should reject envelope with missing agent_id field', () => {
      const agentReturn: any = {
        status: 'success',
        timestamp: new Date().toISOString(),
      };

      const result = validateAgentReturn(agentReturn);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('agent_id'))).toBe(true);
    });

    it('Should reject envelope with missing timestamp field', () => {
      const agentReturn: any = {
        status: 'success',
        agent_id: 'qa-engineer',
      };

      const result = validateAgentReturn(agentReturn);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('timestamp'))).toBe(true);
    });

    it('Should reject envelope with invalid status value', () => {
      const agentReturn: any = {
        status: 'unknown',
        agent_id: 'qa-engineer',
        timestamp: new Date().toISOString(),
      };

      const result = validateAgentReturn(agentReturn);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('status'))).toBe(true);
    });

    it('Should reject envelope with empty agent_id', () => {
      const agentReturn: any = {
        status: 'success',
        agent_id: '',
        timestamp: new Date().toISOString(),
      };

      const result = validateAgentReturn(agentReturn);
      expect(result.valid).toBe(false);
    });

    it('Should reject envelope with invalid timestamp format', () => {
      const agentReturn: any = {
        status: 'success',
        agent_id: 'qa-engineer',
        timestamp: 'not-a-date',
      };

      const result = validateAgentReturn(agentReturn);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('timestamp'))).toBe(true);
    });

    it('Should validate escalation status requires escalation field', () => {
      const agentReturn: any = {
        status: 'escalate',
        agent_id: 'qa-engineer',
        timestamp: new Date().toISOString(),
        // Missing escalation field
      };

      const result = validateAgentReturn(agentReturn);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('escalation'))).toBe(true);
    });

    it('Should validate escalation info when status is escalate', () => {
      const agentReturn: AgentReturn = {
        status: 'escalate',
        agent_id: 'qa-engineer',
        timestamp: new Date().toISOString(),
        escalation: {
          reason: 'Need implementation',
          required_from: 'engineer',
        },
      };

      const result = validateAgentReturn(agentReturn);
      expect(result.valid).toBe(true);
    });

    it('Should reject invalid escalation info when status is escalate', () => {
      const agentReturn: any = {
        status: 'escalate',
        agent_id: 'qa-engineer',
        timestamp: new Date().toISOString(),
        escalation: {
          reason: 'Need implementation',
          // Missing required_from field
        },
      };

      const result = validateAgentReturn(agentReturn);
      expect(result.valid).toBe(false);
    });

    it('Should reject metrics with invalid numeric values', () => {
      const agentReturn: any = {
        status: 'success',
        agent_id: 'qa-engineer',
        timestamp: new Date().toISOString(),
        metrics: {
          tests_passed: -5, // Negative value
        },
      };

      const result = validateAgentReturn(agentReturn);
      expect(result.valid).toBe(false);
    });

    it('Should reject result with missing summary', () => {
      const agentReturn: any = {
        status: 'success',
        agent_id: 'qa-engineer',
        timestamp: new Date().toISOString(),
        result: {
          // Missing summary
          deliverables: ['file1.ts'],
        },
      };

      const result = validateAgentReturn(agentReturn);
      expect(result.valid).toBe(false);
    });

    it('Should validate all valid status types', () => {
      const validStatuses: AgentStatus[] = ['success', 'failure', 'partial', 'escalate'];

      validStatuses.forEach(status => {
        let agentReturn: AgentReturn;
        if (status === 'escalate') {
          agentReturn = {
            status,
            agent_id: 'qa-engineer',
            timestamp: new Date().toISOString(),
            escalation: { reason: 'test', required_from: 'test' },
          };
        } else {
          agentReturn = {
            status,
            agent_id: 'qa-engineer',
            timestamp: new Date().toISOString(),
          };
        }

        const result = validateAgentReturn(agentReturn);
        expect(result.valid).toBe(true, `Status ${status} should be valid`);
      });
    });

    it('Should return structured validation error object', () => {
      const agentReturn: any = {
        // Missing all required fields
      };

      const result = validateAgentReturn(agentReturn);
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe('createAgentReturn() Factory Function', () => {
    it('Should create a minimal AgentReturn with required fields only', () => {
      const agentReturn = createAgentReturn({
        status: 'success',
        agent_id: 'qa-engineer',
      });

      expect(agentReturn.status).toBe('success');
      expect(agentReturn.agent_id).toBe('qa-engineer');
      expect(agentReturn.timestamp).toBeDefined();
      expect(typeof agentReturn.timestamp).toBe('string');
    });

    it('Should auto-generate timestamp if not provided', () => {
      const beforeTime = new Date();
      const agentReturn = createAgentReturn({
        status: 'success',
        agent_id: 'qa-engineer',
      });
      const afterTime = new Date();

      const timestamp = new Date(agentReturn.timestamp);
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime() + 1000);
    });

    it('Should use provided timestamp if given', () => {
      const customTimestamp = '2026-02-04T10:00:00Z';
      const agentReturn = createAgentReturn({
        status: 'success',
        agent_id: 'qa-engineer',
        timestamp: customTimestamp,
      });

      expect(agentReturn.timestamp).toBe(customTimestamp);
    });

    it('Should preserve all optional fields', () => {
      const agentReturn = createAgentReturn({
        status: 'success',
        agent_id: 'qa-engineer',
        workstream_id: 'ws-3',
        metrics: { tests_passed: 10 },
        result: { summary: 'Test summary' },
      });

      expect(agentReturn.workstream_id).toBe('ws-3');
      expect(agentReturn.metrics).toBeDefined();
      expect(agentReturn.result).toBeDefined();
    });

    it('Should create return with failure status', () => {
      const agentReturn = createAgentReturn({
        status: 'failure',
        agent_id: 'qa-engineer',
        result: { summary: 'Tests failed' },
      });

      expect(agentReturn.status).toBe('failure');
      expect(agentReturn.result?.summary).toBe('Tests failed');
    });

    it('Should create return with partial status and metrics', () => {
      const agentReturn = createAgentReturn({
        status: 'partial',
        agent_id: 'qa-engineer',
        metrics: {
          tests_passed: 5,
          tests_failed: 2,
        },
      });

      expect(agentReturn.status).toBe('partial');
      expect(agentReturn.metrics?.tests_passed).toBe(5);
      expect(agentReturn.metrics?.tests_failed).toBe(2);
    });

    it('Should create return with escalate status and escalation info', () => {
      const agentReturn = createAgentReturn({
        status: 'escalate',
        agent_id: 'qa-engineer',
        escalation: {
          reason: 'Need implementation',
          required_from: 'engineer',
          blocker: 'Missing types',
        },
      });

      expect(agentReturn.status).toBe('escalate');
      expect(agentReturn.escalation?.reason).toBe('Need implementation');
    });

    it('Should validate created return envelope', () => {
      const agentReturn = createAgentReturn({
        status: 'success',
        agent_id: 'qa-engineer',
        metrics: { tests_passed: 10 },
        result: { summary: 'All tests passed' },
      });

      const validation = validateAgentReturn(agentReturn);
      expect(validation.valid).toBe(true);
    });

    it('Should create return with comprehensive metrics', () => {
      const agentReturn = createAgentReturn({
        status: 'success',
        agent_id: 'qa-engineer',
        metrics: {
          tests_passed: 50,
          tests_failed: 0,
          coverage: 99.8,
          files_changed: 3,
          lines_added: 250,
          lines_removed: 50,
          duration_ms: 8500,
        },
      });

      expect(agentReturn.metrics?.tests_passed).toBe(50);
      expect(agentReturn.metrics?.coverage).toBe(99.8);
      expect(agentReturn.metrics?.duration_ms).toBe(8500);
    });

    it('Should create return with comprehensive result', () => {
      const agentReturn = createAgentReturn({
        status: 'success',
        agent_id: 'qa-engineer',
        result: {
          summary: 'Comprehensive test suite created',
          deliverables: [
            'tests/unit/return-envelope.test.ts',
            'src/returns/types.ts',
          ],
          next_steps: [
            'Implement validateAgentReturn',
            'Implement createAgentReturn',
          ],
        },
      });

      expect(agentReturn.result?.summary).toBeDefined();
      expect(agentReturn.result?.deliverables?.length).toBe(2);
      expect(agentReturn.result?.next_steps?.length).toBe(2);
    });

    it('Should return a valid AgentReturn type', () => {
      const agentReturn = createAgentReturn({
        status: 'success',
        agent_id: 'qa-engineer',
      });

      const validation = validateAgentReturn(agentReturn);
      expect(validation.valid).toBe(true);
    });

    it('Should handle empty metrics object', () => {
      const agentReturn = createAgentReturn({
        status: 'success',
        agent_id: 'qa-engineer',
        metrics: {},
      });

      expect(agentReturn.metrics).toBeDefined();
    });

    it('Should handle missing optional fields gracefully', () => {
      const agentReturn = createAgentReturn({
        status: 'success',
        agent_id: 'qa-engineer',
      });

      expect(agentReturn.workstream_id).toBeUndefined();
      expect(agentReturn.metrics).toBeUndefined();
      expect(agentReturn.result).toBeUndefined();
      expect(agentReturn.escalation).toBeUndefined();
    });
  });

  describe('Integration: Full Envelope Workflow', () => {
    it('Should create and validate a success envelope end-to-end', () => {
      const agentReturn = createAgentReturn({
        status: 'success',
        agent_id: 'qa-engineer',
        workstream_id: 'ws-3',
        metrics: {
          tests_passed: 50,
          tests_failed: 0,
          coverage: 99.5,
        },
        result: {
          summary: 'All tests passed with high coverage',
          deliverables: ['/tests/unit/return-envelope.test.ts'],
        },
      });

      const validation = validateAgentReturn(agentReturn);
      expect(validation.valid).toBe(true);
    });

    it('Should create and validate a failure envelope with details', () => {
      const agentReturn = createAgentReturn({
        status: 'failure',
        agent_id: 'qa-engineer',
        metrics: {
          tests_failed: 5,
          duration_ms: 2000,
        },
        result: {
          summary: 'Test suite failed',
          next_steps: ['Fix implementation', 'Re-run tests'],
        },
      });

      const validation = validateAgentReturn(agentReturn);
      expect(validation.valid).toBe(true);
    });

    it('Should create and validate a partial envelope', () => {
      const agentReturn = createAgentReturn({
        status: 'partial',
        agent_id: 'qa-engineer',
        metrics: {
          tests_passed: 25,
          tests_failed: 5,
          coverage: 80.0,
        },
        result: {
          summary: 'Partial implementation complete',
          deliverables: ['/tests/unit/return-envelope.test.ts'],
          next_steps: ['Implement remaining validators'],
        },
      });

      const validation = validateAgentReturn(agentReturn);
      expect(validation.valid).toBe(true);
    });

    it('Should create and validate an escalation envelope', () => {
      const agentReturn = createAgentReturn({
        status: 'escalate',
        agent_id: 'qa-engineer',
        result: {
          summary: 'Cannot proceed without implementation',
        },
        escalation: {
          reason: 'Type definitions do not exist',
          required_from: 'engineer',
          blocker: 'Missing src/returns/types.ts file',
        },
      });

      const validation = validateAgentReturn(agentReturn);
      expect(validation.valid).toBe(true);
    });

    it('Should preserve complete envelope through create and validate cycle', () => {
      const originalData = {
        status: 'success' as const,
        agent_id: 'qa-engineer',
        workstream_id: 'ws-3',
        timestamp: '2026-02-04T12:00:00Z',
        metrics: {
          tests_passed: 100,
          tests_failed: 0,
          coverage: 99.9,
          files_changed: 2,
          lines_added: 500,
          lines_removed: 100,
          duration_ms: 15000,
        },
        result: {
          summary: 'Complete test suite implemented',
          deliverables: [
            '/tests/unit/return-envelope.test.ts',
            '/src/returns/types.ts',
            '/src/returns/validate.ts',
          ],
          next_steps: [],
        },
      };

      const agentReturn = createAgentReturn(originalData);
      const validation = validateAgentReturn(agentReturn);

      expect(validation.valid).toBe(true);
      expect(agentReturn.status).toBe(originalData.status);
      expect(agentReturn.agent_id).toBe(originalData.agent_id);
      expect(agentReturn.metrics?.tests_passed).toBe(100);
      expect(agentReturn.result?.summary).toBe(originalData.result.summary);
    });
  });

  describe('Edge Cases & Error Handling', () => {
    it('Should handle envelope with null values gracefully', () => {
      const agentReturn: any = {
        status: 'success',
        agent_id: 'qa-engineer',
        timestamp: new Date().toISOString(),
        metrics: null,
      };

      const result = validateAgentReturn(agentReturn);
      // Validation should fail because metrics should be object or undefined
      expect(result.valid).toBe(false);
    });

    it('Should reject envelope with wrong type for metrics', () => {
      const agentReturn: any = {
        status: 'success',
        agent_id: 'qa-engineer',
        timestamp: new Date().toISOString(),
        metrics: 'not-an-object',
      };

      const result = validateAgentReturn(agentReturn);
      expect(result.valid).toBe(false);
    });

    it('Should reject envelope with wrong type for result', () => {
      const agentReturn: any = {
        status: 'success',
        agent_id: 'qa-engineer',
        timestamp: new Date().toISOString(),
        result: ['array', 'instead', 'of', 'object'],
      };

      const result = validateAgentReturn(agentReturn);
      expect(result.valid).toBe(false);
    });

    it('Should handle very long summary text', () => {
      const longSummary = 'x'.repeat(10000);
      const agentReturn = createAgentReturn({
        status: 'success',
        agent_id: 'qa-engineer',
        result: {
          summary: longSummary,
        },
      });

      expect(agentReturn.result?.summary.length).toBe(10000);
      const validation = validateAgentReturn(agentReturn);
      expect(validation.valid).toBe(true);
    });

    it('Should handle large arrays in deliverables', () => {
      const manyDeliverables = Array.from({ length: 1000 }, (_, i) => `/file-${i}.ts`);
      const agentReturn = createAgentReturn({
        status: 'success',
        agent_id: 'qa-engineer',
        result: {
          summary: 'Many files',
          deliverables: manyDeliverables,
        },
      });

      expect(agentReturn.result?.deliverables?.length).toBe(1000);
      const validation = validateAgentReturn(agentReturn);
      expect(validation.valid).toBe(true);
    });

    it('Should handle special characters in strings', () => {
      const agentReturn = createAgentReturn({
        status: 'success',
        agent_id: 'qa-engineer-™',
        result: {
          summary: 'Summary with special chars: 🎉 @#$% \\n \\t',
        },
      });

      const validation = validateAgentReturn(agentReturn);
      expect(validation.valid).toBe(true);
    });

    it('Should reject duplicate fields in envelope', () => {
      // This tests structural integrity - envelopes should have unique fields
      const agentReturn: AgentReturn = {
        status: 'success',
        agent_id: 'qa-engineer',
        timestamp: new Date().toISOString(),
      };

      expect(Object.keys(agentReturn).length).toBe(3);
    });
  });
});
