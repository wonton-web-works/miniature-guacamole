/**
 * Unit tests for Architecture Decisions document
 * Tests AC-4: architecture-decisions.json exists with ARCH-001 (prefer zero-dependency) and ARCH-002 (validate before design)
 *
 * TDD Approach: These tests verify architectural principles are documented to guide technology decisions.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Architecture Decisions Document (AC-4)', () => {
  const archPath = path.join(process.cwd(), '.claude/memory/architecture-decisions.json');
  let archDoc: any;

  it('should have architecture-decisions.json file', () => {
    expect(fs.existsSync(archPath)).toBe(true);
  });

  it('should be valid JSON', () => {
    const content = fs.readFileSync(archPath, 'utf-8');
    expect(() => JSON.parse(content)).not.toThrow();
    archDoc = JSON.parse(content);
  });

  describe('Document Metadata', () => {
    it('should have version field', () => {
      expect(archDoc).toHaveProperty('version');
      expect(archDoc.version).toBe('1.0');
    });

    it('should have created_at field', () => {
      expect(archDoc).toHaveProperty('created_at');
      expect(archDoc.created_at).toBeTruthy();
    });

    it('should have description field', () => {
      expect(archDoc).toHaveProperty('description');
      expect(archDoc.description).toContain('Architectural principles');
    });

    it('should have last_updated field', () => {
      expect(archDoc).toHaveProperty('last_updated');
    });
  });

  describe('Principles Array', () => {
    it('should have principles array', () => {
      expect(archDoc).toHaveProperty('principles');
      expect(Array.isArray(archDoc.principles)).toBe(true);
    });

    it('should have at least 2 principles', () => {
      expect(archDoc.principles.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('ARCH-001: Prefer zero-dependency solutions', () => {
    let principle: any;

    it('should exist with ID ARCH-001', () => {
      principle = archDoc.principles.find((p: any) => p.principle_id === 'ARCH-001');
      expect(principle).toBeTruthy();
    });

    it('should have name "Prefer zero-dependency solutions"', () => {
      expect(principle.name).toBe('Prefer zero-dependency solutions');
    });

    it('should have status "active"', () => {
      expect(principle.status).toBe('active');
    });

    it('should have adopted_date', () => {
      expect(principle).toHaveProperty('adopted_date');
      expect(principle.adopted_date).toBeTruthy();
    });

    it('should have description about preferring code-based over external APIs', () => {
      expect(principle).toHaveProperty('description');
      expect(principle.description).toContain('code-based');
      expect(principle.description).toContain('external');
      expect(principle.description).toContain('minimize');
    });

    it('should have rationale explaining risks of external APIs', () => {
      expect(principle).toHaveProperty('rationale');
      expect(principle.rationale).toMatch(/availability|cost|rate limit|vendor lock-in/i);
    });

    it('should reference SPIKE-UXPILOT as source', () => {
      expect(principle).toHaveProperty('source');
      expect(principle.source).toContain('SPIKE-UXPILOT');
    });

    it('should have applies_to array', () => {
      expect(principle).toHaveProperty('applies_to');
      expect(Array.isArray(principle.applies_to)).toBe(true);
      expect(principle.applies_to.length).toBeGreaterThan(0);
    });

    it('should include feature design and technology selection in applies_to', () => {
      expect(principle.applies_to.join(' ')).toMatch(/feature design|technology selection/i);
    });

    describe('Exceptions', () => {
      it('should have exceptions array', () => {
        expect(principle).toHaveProperty('exceptions');
        expect(Array.isArray(principle.exceptions)).toBe(true);
      });

      it('should allow exceptions for significant value cases', () => {
        const exceptions = principle.exceptions;
        const valuableException = exceptions.find((e: any) =>
          e.scenario?.includes('significant value')
        );
        expect(valuableException).toBeTruthy();
      });

      it('should list payment processing as exception example', () => {
        const examplesText = JSON.stringify(principle.exceptions);
        expect(examplesText).toMatch(/payment processing|Stripe|PayPal/i);
      });

      it('should require approval for exceptions', () => {
        principle.exceptions.forEach((exception: any) => {
          expect(exception).toHaveProperty('approval_required');
        });
      });
    });

    it('should have related_standards array', () => {
      expect(principle).toHaveProperty('related_standards');
      expect(Array.isArray(principle.related_standards)).toBe(true);
    });

    it('should reference STD-002 (external dependency validation)', () => {
      expect(principle.related_standards).toContain('STD-002');
    });

    it('should have lessons_learned array', () => {
      expect(principle).toHaveProperty('lessons_learned');
      expect(Array.isArray(principle.lessons_learned)).toBe(true);
    });

    it('should document SPIKE-UXPILOT false negative incident', () => {
      const lessons = principle.lessons_learned;
      const uxpilotLesson = lessons.find((l: any) => l.incident?.includes('SPIKE-UXPILOT'));
      expect(uxpilotLesson).toBeTruthy();
      expect(uxpilotLesson.lesson).toContain('validate');
    });
  });

  describe('ARCH-002: Validate before design', () => {
    let principle: any;

    it('should exist with ID ARCH-002', () => {
      principle = archDoc.principles.find((p: any) => p.principle_id === 'ARCH-002');
      expect(principle).toBeTruthy();
    });

    it('should have name "Validate before design"', () => {
      expect(principle.name).toBe('Validate before design');
    });

    it('should have status "active"', () => {
      expect(principle.status).toBe('active');
    });

    it('should have adopted_date', () => {
      expect(principle).toHaveProperty('adopted_date');
      expect(principle.adopted_date).toBeTruthy();
    });

    it('should have description requiring spike validation BEFORE design', () => {
      expect(principle).toHaveProperty('description');
      expect(principle.description).toContain('BEFORE');
      expect(principle.description).toContain('spike');
      expect(principle.description).toContain('design');
    });

    it('should have rationale preventing design around non-existent tech', () => {
      expect(principle).toHaveProperty('rationale');
      expect(principle.rationale).toContain('non-existent');
      expect(principle.rationale).toMatch(/unsuitable|feasibility/i);
    });

    it('should reference SPIKE-UXPILOT process failure as source', () => {
      expect(principle).toHaveProperty('source');
      expect(principle.source).toContain('SPIKE-UXPILOT');
    });

    it('should have applies_to array', () => {
      expect(principle).toHaveProperty('applies_to');
      expect(Array.isArray(principle.applies_to)).toBe(true);
    });

    it('should apply to product specifications with external dependencies', () => {
      expect(principle.applies_to.join(' ')).toMatch(/product.*specification|external.*dependenc/i);
    });

    describe('Workflow Integration', () => {
      it('should have workflow_integration object', () => {
        expect(principle).toHaveProperty('workflow_integration');
        expect(principle.workflow_integration).toBeTypeOf('object');
      });

      it('should define product_team_gate', () => {
        expect(principle.workflow_integration).toHaveProperty('product_team_gate');
        expect(principle.workflow_integration.product_team_gate).toContain('external dependencies');
      });

      it('should define spike_requirement', () => {
        expect(principle.workflow_integration).toHaveProperty('spike_requirement');
        expect(principle.workflow_integration.spike_requirement).toContain('Tier 2');
      });

      it('should define handoff_criteria', () => {
        expect(principle.workflow_integration).toHaveProperty('handoff_criteria');
        expect(principle.workflow_integration.handoff_criteria).toContain('validated');
      });
    });

    describe('Exceptions', () => {
      it('should have exceptions array', () => {
        expect(principle).toHaveProperty('exceptions');
        expect(Array.isArray(principle.exceptions)).toBe(true);
      });

      it('should allow exception for previously validated dependencies within 6 months', () => {
        const recentException = principle.exceptions.find((e: any) =>
          e.scenario?.includes('6 months')
        );
        expect(recentException).toBeTruthy();
      });

      it('should allow exception for established vendor relationships', () => {
        const vendorException = principle.exceptions.find((e: any) =>
          e.scenario?.includes('vendor relationship')
        );
        expect(vendorException).toBeTruthy();
      });
    });

    describe('Quality Gates', () => {
      it('should have quality_gates array', () => {
        expect(principle).toHaveProperty('quality_gates');
        expect(Array.isArray(principle.quality_gates)).toBe(true);
      });

      it('should include Product-team identifies Tier 2 dependencies gate', () => {
        const gates = principle.quality_gates;
        expect(gates.some((g: string) => g.includes('Product-team') && g.includes('Tier 2'))).toBe(true);
      });

      it('should include Staff-engineer conducts spike with WebSearch gate', () => {
        const gates = principle.quality_gates;
        expect(gates.some((g: string) => g.includes('staff-engineer') && g.includes('WebSearch'))).toBe(true);
      });

      it('should include Spike results approved before design finalized gate', () => {
        const gates = principle.quality_gates;
        expect(gates.some((g: string) => g.includes('approved before') && g.includes('design'))).toBe(true);
      });

      it('should include Alternative solutions documented gate', () => {
        const gates = principle.quality_gates;
        expect(gates.some((g: string) => g.includes('Alternative solutions'))).toBe(true);
      });
    });

    it('should have related_standards array', () => {
      expect(principle).toHaveProperty('related_standards');
      expect(Array.isArray(principle.related_standards)).toBe(true);
    });

    it('should reference STD-002, STD-003, STD-004', () => {
      expect(principle.related_standards).toContain('STD-002');
      expect(principle.related_standards).toContain('STD-003');
      expect(principle.related_standards).toContain('STD-004');
    });

    it('should have related_decisions array', () => {
      expect(principle).toHaveProperty('related_decisions');
      expect(Array.isArray(principle.related_decisions)).toBe(true);
    });

    it('should reference ARCH-001', () => {
      expect(principle.related_decisions).toContain('ARCH-001');
    });
  });

  describe('Decision Log', () => {
    it('should have decision_log array', () => {
      expect(archDoc).toHaveProperty('decision_log');
      expect(Array.isArray(archDoc.decision_log)).toBe(true);
    });

    it('should document spike research quality improvement decision', () => {
      const spikeDecision = archDoc.decision_log.find((d: any) =>
        d.title?.includes('Spike Research Quality')
      );
      expect(spikeDecision).toBeTruthy();
    });

    describe('Spike Quality Decision (DEC-001)', () => {
      let decision: any;

      it('should exist with ID DEC-001', () => {
        decision = archDoc.decision_log.find((d: any) => d.decision_id === 'DEC-001');
        expect(decision).toBeTruthy();
      });

      it('should have date field', () => {
        expect(decision).toHaveProperty('date');
        expect(decision.date).toBeTruthy();
      });

      it('should have context referencing SPIKE-UXPILOT incident', () => {
        expect(decision).toHaveProperty('context');
        expect(decision.context).toContain('SPIKE-UXPILOT');
        expect(decision.context).toContain('WebSearch');
      });

      it('should document decision to adopt two-tier spike process', () => {
        expect(decision).toHaveProperty('decision');
        expect(decision.decision).toContain('two-tier');
        expect(decision.decision).toContain('WebSearch');
      });

      it('should list alternatives_considered', () => {
        expect(decision).toHaveProperty('alternatives_considered');
        expect(Array.isArray(decision.alternatives_considered)).toBe(true);
      });

      it('should have decision_maker field', () => {
        expect(decision).toHaveProperty('decision_maker');
      });

      it('should mark as implemented', () => {
        expect(decision).toHaveProperty('implemented');
        expect(decision.implemented).toBe(true);
      });

      it('should reference implementation workstream', () => {
        expect(decision).toHaveProperty('implementation_workstream');
      });

      it('should reference related principles ARCH-001 and ARCH-002', () => {
        expect(decision).toHaveProperty('related_principles');
        expect(decision.related_principles).toContain('ARCH-001');
        expect(decision.related_principles).toContain('ARCH-002');
      });
    });
  });

  describe('Usage Notes', () => {
    it('should have usage_notes object', () => {
      expect(archDoc).toHaveProperty('usage_notes');
    });

    it('should explain how to add new principles', () => {
      expect(archDoc.usage_notes).toHaveProperty('how_to_add_principle');
    });

    it('should explain how to log decisions', () => {
      expect(archDoc.usage_notes).toHaveProperty('how_to_log_decision');
    });

    it('should specify review frequency', () => {
      expect(archDoc.usage_notes).toHaveProperty('review_frequency');
      expect(archDoc.usage_notes.review_frequency).toMatch(/quarterly/i);
    });

    it('should specify ownership', () => {
      expect(archDoc.usage_notes).toHaveProperty('ownership');
      expect(archDoc.usage_notes.ownership).toContain('Staff-engineer');
      expect(archDoc.usage_notes.ownership).toContain('CTO');
    });
  });

  describe('Document Quality', () => {
    it('should have well-structured principles with all required fields', () => {
      archDoc.principles.forEach((principle: any) => {
        expect(principle).toHaveProperty('principle_id');
        expect(principle).toHaveProperty('name');
        expect(principle).toHaveProperty('status');
        expect(principle).toHaveProperty('adopted_date');
        expect(principle).toHaveProperty('description');
        expect(principle).toHaveProperty('rationale');
        expect(principle).toHaveProperty('source');
        expect(principle).toHaveProperty('applies_to');
        expect(principle).toHaveProperty('exceptions');
        expect(principle).toHaveProperty('related_standards');
      });
    });

    it('should use consistent principle ID format (ARCH-XXX)', () => {
      archDoc.principles.forEach((principle: any) => {
        expect(principle.principle_id).toMatch(/^ARCH-\d{3}$/);
      });
    });

    it('should use consistent decision ID format (DEC-XXX)', () => {
      archDoc.decision_log.forEach((decision: any) => {
        expect(decision.decision_id).toMatch(/^DEC-\d{3}$/);
      });
    });

    it('should have cross-references between principles and standards', () => {
      const arch001 = archDoc.principles.find((p: any) => p.principle_id === 'ARCH-001');
      const arch002 = archDoc.principles.find((p: any) => p.principle_id === 'ARCH-002');

      expect(arch001.related_standards.length).toBeGreaterThan(0);
      expect(arch002.related_standards.length).toBeGreaterThan(0);
    });
  });
});
