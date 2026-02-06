/**
 * Unit tests for Technical Standards document
 * Tests AC-5: technical-standards.json exists with STD-002 (external dependency validation),
 * STD-003 (minimum 3 alternatives), and STD-004 (negative result verification)
 *
 * TDD Approach: These tests verify technical standards are documented and enforced.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Technical Standards Document (AC-5)', () => {
  const standardsPath = path.join(process.cwd(), '.claude/memory/technical-standards.json');
  let standards: any;

  it('should have technical-standards.json file', () => {
    expect(fs.existsSync(standardsPath)).toBe(true);
  });

  it('should be valid JSON', () => {
    const content = fs.readFileSync(standardsPath, 'utf-8');
    expect(() => JSON.parse(content)).not.toThrow();
    standards = JSON.parse(content);
  });

  describe('Document Metadata', () => {
    it('should have version field', () => {
      expect(standards).toHaveProperty('version');
      expect(standards.version).toBe('1.0');
    });

    it('should have created_at field', () => {
      expect(standards).toHaveProperty('created_at');
      expect(standards.created_at).toBeTruthy();
    });

    it('should have description field', () => {
      expect(standards).toHaveProperty('description');
      expect(standards.description).toContain('Technical standards');
    });

    it('should have last_updated field', () => {
      expect(standards).toHaveProperty('last_updated');
    });
  });

  describe('Standards Array', () => {
    it('should have standards array', () => {
      expect(standards).toHaveProperty('standards');
      expect(Array.isArray(standards.standards)).toBe(true);
    });

    it('should have at least 4 standards', () => {
      expect(standards.standards.length).toBeGreaterThanOrEqual(4);
    });

    it('should have spike_research category standards', () => {
      const spikeStandards = standards.standards.filter(
        (s: any) => s.category === 'spike_research'
      );
      expect(spikeStandards.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('STD-002: External dependency validation', () => {
    let standard: any;

    it('should exist with ID STD-002', () => {
      standard = standards.standards.find((s: any) => s.standard_id === 'STD-002');
      expect(standard).toBeTruthy();
    });

    it('should be in spike_research category', () => {
      expect(standard.category).toBe('spike_research');
    });

    it('should have name "External dependency validation"', () => {
      expect(standard.name).toBe('External dependency validation');
    });

    it('should have status "active"', () => {
      expect(standard.status).toBe('active');
    });

    it('should have adopted_date', () => {
      expect(standard).toHaveProperty('adopted_date');
      expect(standard.adopted_date).toBeTruthy();
    });

    it('should require WebSearch validation for Tier 2 dependencies', () => {
      expect(standard).toHaveProperty('requirement');
      expect(standard.requirement).toContain('WebSearch');
      expect(standard.requirement).toContain('Tier 2');
    });

    it('should have rationale preventing false negatives', () => {
      expect(standard).toHaveProperty('rationale');
      expect(standard.rationale).toContain('false negative');
    });

    it('should have applies_to array', () => {
      expect(standard).toHaveProperty('applies_to');
      expect(Array.isArray(standard.applies_to)).toBe(true);
    });

    it('should apply to external APIs and third-party services', () => {
      const appliesText = standard.applies_to.join(' ');
      expect(appliesText).toMatch(/external.*API|third-party/i);
    });

    describe('Enforcement', () => {
      it('should have enforcement object', () => {
        expect(standard).toHaveProperty('enforcement');
        expect(standard.enforcement).toBeTypeOf('object');
      });

      it('should have automated enforcement mechanisms', () => {
        expect(standard.enforcement).toHaveProperty('automated');
        expect(Array.isArray(standard.enforcement.automated)).toBe(true);
      });

      it('should include Product-team skill checks in automated enforcement', () => {
        const automated = standard.enforcement.automated.join(' ');
        expect(automated).toContain('Product-team');
      });

      it('should have manual enforcement mechanisms', () => {
        expect(standard.enforcement).toHaveProperty('manual');
        expect(Array.isArray(standard.enforcement.manual)).toBe(true);
      });

      it('should include Staff-engineer review in manual enforcement', () => {
        const manual = standard.enforcement.manual.join(' ');
        expect(manual).toContain('Staff-engineer');
        expect(manual).toContain('WebSearch');
      });
    });

    describe('Process Definition', () => {
      it('should have process object', () => {
        expect(standard).toHaveProperty('process');
        expect(standard.process).toBeTypeOf('object');
      });

      it('should define tier_1_internal process', () => {
        expect(standard.process).toHaveProperty('tier_1_internal');
        expect(standard.process.tier_1_internal).toHaveProperty('definition');
        expect(standard.process.tier_1_internal).toHaveProperty('tools_required');
        expect(standard.process.tier_1_internal.websearch_required).toBe(false);
      });

      it('should define tier_2_external process', () => {
        expect(standard.process).toHaveProperty('tier_2_external');
        expect(standard.process.tier_2_external).toHaveProperty('definition');
        expect(standard.process.tier_2_external).toHaveProperty('tools_required');
        expect(standard.process.tier_2_external.websearch_required).toBe(true);
      });

      it('should require minimum 3 searches for Tier 2', () => {
        expect(standard.process.tier_2_external).toHaveProperty('minimum_searches');
        expect(standard.process.tier_2_external.minimum_searches).toBe(3);
      });

      it('should list critical items for Tier 2', () => {
        expect(standard.process.tier_2_external).toHaveProperty('critical_items');
        expect(Array.isArray(standard.process.tier_2_external.critical_items)).toBe(true);
        expect(standard.process.tier_2_external.critical_items.length).toBeGreaterThanOrEqual(4);
      });

      it('should include official website/docs in critical items', () => {
        const items = standard.process.tier_2_external.critical_items.join(' ');
        expect(items).toMatch(/official.*website|docs/i);
      });

      it('should include API documentation in critical items', () => {
        const items = standard.process.tier_2_external.critical_items.join(' ');
        expect(items).toContain('API');
      });

      it('should include package registry in critical items', () => {
        const items = standard.process.tier_2_external.critical_items.join(' ');
        expect(items).toMatch(/NPM|PyPI|GitHub/i);
      });

      it('should include alternative name variations in critical items', () => {
        const items = standard.process.tier_2_external.critical_items.join(' ');
        expect(items).toMatch(/variation|alternative name/i);
      });
    });

    it('should have no exceptions (critical standard)', () => {
      expect(standard).toHaveProperty('exceptions');
      expect(Array.isArray(standard.exceptions)).toBe(true);
      const noExceptionEntry = standard.exceptions.find(
        (e: any) => e.scenario === 'None'
      );
      expect(noExceptionEntry).toBeTruthy();
    });

    it('should reference related principles', () => {
      expect(standard).toHaveProperty('related_principles');
      expect(standard.related_principles).toContain('ARCH-001');
      expect(standard.related_principles).toContain('ARCH-002');
    });

    it('should reference related standards', () => {
      expect(standard).toHaveProperty('related_standards');
      expect(standard.related_standards).toContain('STD-003');
      expect(standard.related_standards).toContain('STD-004');
    });

    it('should have verification requirements', () => {
      expect(standard).toHaveProperty('verification');
      expect(standard.verification).toHaveProperty('checklist');
      expect(standard.verification.checklist).toContain('spike-research-checklist-template.json');
    });

    it('should document SPIKE-UXPILOT lesson learned', () => {
      expect(standard).toHaveProperty('lessons_learned');
      const uxpilotLesson = standard.lessons_learned.find(
        (l: any) => l.incident?.includes('SPIKE-UXPILOT')
      );
      expect(uxpilotLesson).toBeTruthy();
    });
  });

  describe('STD-003: Minimum 3 alternatives', () => {
    let standard: any;

    it('should exist with ID STD-003', () => {
      standard = standards.standards.find((s: any) => s.standard_id === 'STD-003');
      expect(standard).toBeTruthy();
    });

    it('should be in spike_research category', () => {
      expect(standard.category).toBe('spike_research');
    });

    it('should have name "Minimum 3 alternatives"', () => {
      expect(standard.name).toBe('Minimum 3 alternatives');
    });

    it('should have status "active"', () => {
      expect(standard.status).toBe('active');
    });

    it('should require minimum 3 alternatives with structured analysis', () => {
      expect(standard).toHaveProperty('requirement');
      expect(standard.requirement).toContain('3');
      expect(standard.requirement).toContain('alternative');
      expect(standard.requirement).toMatch(/pros.*cons.*cost.*timeline/i);
    });

    it('should have rationale about comprehensive evaluation', () => {
      expect(standard).toHaveProperty('rationale');
      expect(standard.rationale).toMatch(/comprehensive|prevent.*anchoring|fallback/i);
    });

    it('should have applies_to array', () => {
      expect(standard).toHaveProperty('applies_to');
      expect(Array.isArray(standard.applies_to)).toBe(true);
    });

    describe('Alternative Structure', () => {
      it('should define alternative_structure', () => {
        expect(standard).toHaveProperty('alternative_structure');
        expect(standard.alternative_structure).toBeTypeOf('object');
      });

      it('should list required_fields', () => {
        expect(standard.alternative_structure).toHaveProperty('required_fields');
        expect(Array.isArray(standard.alternative_structure.required_fields)).toBe(true);
      });

      it('should require solution_name field', () => {
        expect(standard.alternative_structure.required_fields).toContain('solution_name');
      });

      it('should require pros and cons fields', () => {
        expect(standard.alternative_structure.required_fields).toContain('pros');
        expect(standard.alternative_structure.required_fields).toContain('cons');
      });

      it('should require cost (financial and time) field', () => {
        const costField = standard.alternative_structure.required_fields.find(
          (f: string) => f.includes('cost')
        );
        expect(costField).toBeTruthy();
      });

      it('should require timeline field', () => {
        expect(standard.alternative_structure.required_fields).toContain('timeline');
      });

      it('should require confidence_level field', () => {
        expect(standard.alternative_structure.required_fields).toContain('confidence_level');
      });

      it('should define comparison_criteria', () => {
        expect(standard.alternative_structure).toHaveProperty('comparison_criteria');
        expect(Array.isArray(standard.alternative_structure.comparison_criteria)).toBe(true);
      });

      it('should include complexity, maintenance, performance in comparison criteria', () => {
        const criteria = standard.alternative_structure.comparison_criteria.join(' ');
        expect(criteria).toMatch(/complexity|maintenance|performance/i);
      });
    });

    describe('Enforcement', () => {
      it('should have enforcement object', () => {
        expect(standard).toHaveProperty('enforcement');
      });

      it('should have manual enforcement by staff-engineer', () => {
        expect(standard.enforcement).toHaveProperty('manual');
        const manual = standard.enforcement.manual.join(' ');
        expect(manual).toContain('Staff-engineer');
        expect(manual).toContain('3');
      });
    });

    describe('Exceptions', () => {
      it('should have exceptions array', () => {
        expect(standard).toHaveProperty('exceptions');
        expect(Array.isArray(standard.exceptions)).toBe(true);
      });

      it('should allow exception for single-option validation spikes', () => {
        const singleOptionException = standard.exceptions.find(
          (e: any) => e.scenario?.includes('single option')
        );
        expect(singleOptionException).toBeTruthy();
      });

      it('should require leadership approval for exceptions', () => {
        standard.exceptions.forEach((exception: any) => {
          if (exception.scenario !== 'None') {
            expect(exception).toHaveProperty('approval_required');
          }
        });
      });
    });

    it('should reference related principles', () => {
      expect(standard).toHaveProperty('related_principles');
      expect(standard.related_principles).toContain('ARCH-001');
    });

    it('should reference related standards', () => {
      expect(standard).toHaveProperty('related_standards');
      expect(standard.related_standards).toContain('STD-002');
    });

    it('should specify verification checklist items', () => {
      expect(standard).toHaveProperty('verification');
      expect(standard.verification).toHaveProperty('checklist_items');
      expect(standard.verification.checklist_items).toContain('A1');
      expect(standard.verification.checklist_items).toContain('A2');
      expect(standard.verification.checklist_items).toContain('A3');
    });

    it('should specify minimum_alternatives = 3', () => {
      expect(standard.verification).toHaveProperty('minimum_alternatives');
      expect(standard.verification.minimum_alternatives).toBe(3);
    });
  });

  describe('STD-004: Negative result verification', () => {
    let standard: any;

    it('should exist with ID STD-004', () => {
      standard = standards.standards.find((s: any) => s.standard_id === 'STD-004');
      expect(standard).toBeTruthy();
    });

    it('should be in spike_research category', () => {
      expect(standard.category).toBe('spike_research');
    });

    it('should have name "Negative result verification"', () => {
      expect(standard.name).toBe('Negative result verification');
    });

    it('should have status "active"', () => {
      expect(standard.status).toBe('active');
    });

    it('should require minimum 3 WebSearch queries before declaring non-existence', () => {
      expect(standard).toHaveProperty('requirement');
      expect(standard.requirement).toContain('3');
      expect(standard.requirement).toContain('WebSearch');
      expect(standard.requirement).toContain('does not exist');
    });

    it('should have rationale about preventing false negatives', () => {
      expect(standard).toHaveProperty('rationale');
      expect(standard.rationale).toContain('false negative');
      expect(standard.rationale).toContain('SPIKE-UXPILOT');
    });

    it('should have applies_to array', () => {
      expect(standard).toHaveProperty('applies_to');
      expect(Array.isArray(standard.applies_to)).toBe(true);
    });

    it('should apply to negative findings and NO-GO recommendations', () => {
      const appliesText = standard.applies_to.join(' ');
      expect(appliesText).toMatch(/does not exist|NO-GO/i);
    });

    describe('Verification Requirements', () => {
      it('should have verification_requirements object', () => {
        expect(standard).toHaveProperty('verification_requirements');
        expect(standard.verification_requirements).toBeTypeOf('object');
      });

      it('should specify minimum_searches = 3', () => {
        expect(standard.verification_requirements).toHaveProperty('minimum_searches');
        expect(standard.verification_requirements.minimum_searches).toBe(3);
      });

      it('should list required_search_types', () => {
        expect(standard.verification_requirements).toHaveProperty('required_search_types');
        expect(Array.isArray(standard.verification_requirements.required_search_types)).toBe(true);
      });

      it('should require official website/docs search', () => {
        const searchTypes = standard.verification_requirements.required_search_types;
        expect(searchTypes.some((t: string) => t.includes('Official website'))).toBe(true);
      });

      it('should require API documentation search', () => {
        const searchTypes = standard.verification_requirements.required_search_types;
        expect(searchTypes.some((t: string) => t.includes('API'))).toBe(true);
      });

      it('should require package registry search', () => {
        const searchTypes = standard.verification_requirements.required_search_types;
        expect(searchTypes.some((t: string) => t.match(/NPM|PyPI|GitHub/))).toBe(true);
      });

      describe('Name Variations', () => {
        it('should define name_variations requirements', () => {
          expect(standard.verification_requirements).toHaveProperty('name_variations');
        });

        it('should require minimum 3 name variations', () => {
          expect(standard.verification_requirements.name_variations).toHaveProperty('minimum_required');
          expect(standard.verification_requirements.name_variations.minimum_required).toBe(3);
        });

        it('should provide variation examples', () => {
          expect(standard.verification_requirements.name_variations).toHaveProperty('examples');
          const examples = standard.verification_requirements.name_variations.examples;
          expect(examples.some((e: string) => e.includes('spaces'))).toBe(true);
        });
      });

      describe('Evidence Documentation', () => {
        it('should define evidence_documentation requirements', () => {
          expect(standard.verification_requirements).toHaveProperty('evidence_documentation');
          expect(Array.isArray(standard.verification_requirements.evidence_documentation)).toBe(true);
        });

        it('should require search query documentation', () => {
          const evidence = standard.verification_requirements.evidence_documentation;
          expect(evidence.some((e: string) => e.includes('query'))).toBe(true);
        });

        it('should require search engine/source documentation', () => {
          const evidence = standard.verification_requirements.evidence_documentation;
          expect(evidence.some((e: string) => e.match(/engine|source/))).toBe(true);
        });

        it('should require results count documentation', () => {
          const evidence = standard.verification_requirements.evidence_documentation;
          expect(evidence.some((e: string) => e.includes('results'))).toBe(true);
        });

        it('should require timestamp documentation', () => {
          const evidence = standard.verification_requirements.evidence_documentation;
          expect(evidence.some((e: string) => e.includes('Timestamp'))).toBe(true);
        });
      });
    });

    describe('Negative Result Checklist', () => {
      it('should have negative_result_checklist array', () => {
        expect(standard).toHaveProperty('negative_result_checklist');
        expect(Array.isArray(standard.negative_result_checklist)).toBe(true);
      });

      it('should include minimum 3 WebSearch queries requirement', () => {
        const checklist = standard.negative_result_checklist;
        expect(checklist.some((item: string) => item.includes('3') && item.includes('WebSearch'))).toBe(true);
      });

      it('should include name variations requirement', () => {
        const checklist = standard.negative_result_checklist;
        expect(checklist.some((item: string) => item.includes('3') && item.includes('variation'))).toBe(true);
      });

      it('should include vendor website check', () => {
        const checklist = standard.negative_result_checklist;
        expect(checklist.some((item: string) => item.includes('vendor'))).toBe(true);
      });

      it('should include package registry check', () => {
        const checklist = standard.negative_result_checklist;
        expect(checklist.some((item: string) => item.match(/NPM|PyPI|GitHub/))).toBe(true);
      });
    });

    describe('Enforcement', () => {
      it('should have enforcement object', () => {
        expect(standard).toHaveProperty('enforcement');
      });

      it('should have manual enforcement by staff-engineer', () => {
        expect(standard.enforcement).toHaveProperty('manual');
        const manual = standard.enforcement.manual.join(' ');
        expect(manual).toContain('Staff-engineer');
        expect(manual).toContain('3');
        expect(manual).toContain('WebSearch');
      });
    });

    it('should have no exceptions (critical standard)', () => {
      expect(standard).toHaveProperty('exceptions');
      const noExceptionEntry = standard.exceptions.find(
        (e: any) => e.scenario === 'None'
      );
      expect(noExceptionEntry).toBeTruthy();
    });

    it('should reference related principles', () => {
      expect(standard).toHaveProperty('related_principles');
      expect(standard.related_principles).toContain('ARCH-002');
    });

    it('should reference related standards', () => {
      expect(standard).toHaveProperty('related_standards');
      expect(standard.related_standards).toContain('STD-002');
    });

    it('should specify verification checklist items', () => {
      expect(standard).toHaveProperty('verification');
      expect(standard.verification).toHaveProperty('checklist_items');
      expect(standard.verification.checklist_items).toContain('N1');
      expect(standard.verification.checklist_items).toContain('N2');
      expect(standard.verification.checklist_items).toContain('T2-1');
      expect(standard.verification.checklist_items).toContain('T2-2');
      expect(standard.verification.checklist_items).toContain('T2-3');
      expect(standard.verification.checklist_items).toContain('T2-4');
    });
  });

  describe('Quality Gates', () => {
    it('should have quality_gates array', () => {
      expect(standards).toHaveProperty('quality_gates');
      expect(Array.isArray(standards.quality_gates)).toBe(true);
    });

    it('should have Spike Quality Gate (GATE-002)', () => {
      const spikeGate = standards.quality_gates.find(
        (g: any) => g.gate_id === 'GATE-002'
      );
      expect(spikeGate).toBeTruthy();
      expect(spikeGate.name).toBe('Spike Quality Gate');
    });

    describe('Spike Quality Gate Checks', () => {
      let spikeGate: any;

      beforeEach(() => {
        spikeGate = standards.quality_gates.find(
          (g: any) => g.gate_id === 'GATE-002'
        );
      });

      it('should check external dependency checklist completion', () => {
        const check = spikeGate.checks.find(
          (c: any) => c.check?.includes('checklist') && c.check?.includes('100%')
        );
        expect(check).toBeTruthy();
        expect(check.blocking).toBe(true);
      });

      it('should check minimum 3 WebSearch queries for Tier 2', () => {
        const check = spikeGate.checks.find(
          (c: any) => c.check?.includes('3') && c.check?.includes('WebSearch')
        );
        expect(check).toBeTruthy();
        expect(check.blocking).toBe(true);
      });

      it('should check minimum 3 alternatives', () => {
        const check = spikeGate.checks.find(
          (c: any) => c.check?.includes('3') && c.check?.includes('alternative')
        );
        expect(check).toBeTruthy();
        expect(check.blocking).toBe(true);
      });

      it('should check executive summary', () => {
        const check = spikeGate.checks.find(
          (c: any) => c.check?.includes('Executive summary')
        );
        expect(check).toBeTruthy();
        expect(check.blocking).toBe(true);
      });

      it('should check GO/NO-GO recommendation', () => {
        const check = spikeGate.checks.find(
          (c: any) => c.check?.includes('GO/NO-GO')
        );
        expect(check).toBeTruthy();
        expect(check.blocking).toBe(true);
      });
    });

    it('should have Product Spec Readiness Gate (GATE-003)', () => {
      const productGate = standards.quality_gates.find(
        (g: any) => g.gate_id === 'GATE-003'
      );
      expect(productGate).toBeTruthy();
      expect(productGate.name).toContain('Product Spec');
    });

    describe('Product Spec Readiness Gate', () => {
      let productGate: any;

      beforeEach(() => {
        productGate = standards.quality_gates.find(
          (g: any) => g.gate_id === 'GATE-003'
        );
      });

      it('should check external dependencies identified', () => {
        const check = productGate.checks.find(
          (c: any) => c.check?.includes('External dependencies identified')
        );
        expect(check).toBeTruthy();
        expect(check.blocking).toBe(true);
      });

      it('should check Tier 2 dependencies validated via spike', () => {
        const check = productGate.checks.find(
          (c: any) => c.check?.includes('Tier 2') && c.check?.includes('spike')
        );
        expect(check).toBeTruthy();
        expect(check.blocking).toBe(true);
      });

      it('should check spike results approved', () => {
        const check = productGate.checks.find(
          (c: any) => c.check?.includes('approved')
        );
        expect(check).toBeTruthy();
        expect(check.blocking).toBe(true);
      });
    });
  });

  describe('Compliance Tracking', () => {
    it('should have compliance_tracking object', () => {
      expect(standards).toHaveProperty('compliance_tracking');
    });

    it('should specify review frequency', () => {
      expect(standards.compliance_tracking).toHaveProperty('review_frequency');
    });

    it('should define metrics', () => {
      expect(standards.compliance_tracking).toHaveProperty('metrics');
      expect(Array.isArray(standards.compliance_tracking.metrics)).toBe(true);
    });

    it('should track false negative rate metric', () => {
      const metric = standards.compliance_tracking.metrics.find(
        (m: any) => m.metric?.includes('false negative')
      );
      expect(metric).toBeTruthy();
      expect(metric.target).toBe('0%');
    });

    it('should track spike checklist completion rate', () => {
      const metric = standards.compliance_tracking.metrics.find(
        (m: any) => m.metric?.includes('checklist completion')
      );
      expect(metric).toBeTruthy();
      expect(metric.target).toBe('100%');
    });

    it('should specify ownership', () => {
      expect(standards.compliance_tracking).toHaveProperty('ownership');
      expect(standards.compliance_tracking.ownership).toContain('Staff-engineer');
    });
  });

  describe('Document Quality', () => {
    it('should have well-structured standards with all required fields', () => {
      standards.standards.forEach((standard: any) => {
        expect(standard).toHaveProperty('standard_id');
        expect(standard).toHaveProperty('category');
        expect(standard).toHaveProperty('name');
        expect(standard).toHaveProperty('status');
        expect(standard).toHaveProperty('requirement');
        expect(standard).toHaveProperty('rationale');
        expect(standard).toHaveProperty('enforcement');
      });
    });

    it('should use consistent standard ID format (STD-XXX)', () => {
      standards.standards.forEach((standard: any) => {
        expect(standard.standard_id).toMatch(/^STD-\d{3}$/);
      });
    });

    it('should have cross-references between standards and principles', () => {
      const std002 = standards.standards.find((s: any) => s.standard_id === 'STD-002');
      const std003 = standards.standards.find((s: any) => s.standard_id === 'STD-003');
      const std004 = standards.standards.find((s: any) => s.standard_id === 'STD-004');

      expect(std002.related_principles.length).toBeGreaterThan(0);
      expect(std003.related_principles.length).toBeGreaterThan(0);
      expect(std004.related_principles.length).toBeGreaterThan(0);
    });

    it('should reference spike-research-checklist-template.json', () => {
      const std002 = standards.standards.find((s: any) => s.standard_id === 'STD-002');
      expect(std002.verification.checklist).toContain('spike-research-checklist-template.json');
    });
  });
});
