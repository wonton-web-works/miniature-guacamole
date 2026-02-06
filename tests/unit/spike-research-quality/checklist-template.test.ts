/**
 * Unit tests for Spike Research Checklist Template
 * Tests AC-3: spike-research-checklist-template.json exists with complete structure
 *
 * TDD Approach: These tests verify the checklist template has all required sections and fields
 * to ensure comprehensive spike research validation.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Spike Research Checklist Template (AC-3)', () => {
  const templatePath = path.join(process.cwd(), '.claude/memory/spike-research-checklist-template.json');
  let template: any;

  it('should have spike-research-checklist-template.json file', () => {
    expect(fs.existsSync(templatePath)).toBe(true);
  });

  it('should be valid JSON', () => {
    const content = fs.readFileSync(templatePath, 'utf-8');
    expect(() => JSON.parse(content)).not.toThrow();
    template = JSON.parse(content);
  });

  describe('Template Metadata', () => {
    it('should have template_version field', () => {
      expect(template).toHaveProperty('template_version');
      expect(template.template_version).toBe('1.0');
    });

    it('should have spike_id placeholder', () => {
      expect(template).toHaveProperty('spike_id');
      expect(template.spike_id).toContain('SPIKE-');
    });

    it('should have created_at field', () => {
      expect(template).toHaveProperty('created_at');
    });

    it('should have description field', () => {
      expect(template).toHaveProperty('description');
      expect(template.description).toContain('Standardized checklist');
    });
  });

  describe('Tier Classification', () => {
    it('should have tier_classification object', () => {
      expect(template).toHaveProperty('tier_classification');
      expect(template.tier_classification).toBeTypeOf('object');
    });

    it('should have tier_1_internal array', () => {
      expect(template.tier_classification).toHaveProperty('tier_1_internal');
      expect(Array.isArray(template.tier_classification.tier_1_internal)).toBe(true);
    });

    it('should have tier_2_external array', () => {
      expect(template.tier_classification).toHaveProperty('tier_2_external');
      expect(Array.isArray(template.tier_classification.tier_2_external)).toBe(true);
    });
  });

  describe('Checklist Sections', () => {
    it('should have checklist_sections array', () => {
      expect(template).toHaveProperty('checklist_sections');
      expect(Array.isArray(template.checklist_sections)).toBe(true);
    });

    it('should have exactly 6 sections', () => {
      expect(template.checklist_sections).toHaveLength(6);
    });

    const expectedSections = [
      'Pre-Spike Planning',
      'Tier 1 Research (Internal)',
      'Tier 2 Research (External) - MANDATORY FOR EXTERNAL DEPENDENCIES',
      'Negative Result Verification',
      'Alternative Solutions',
      'Deliverables'
    ];

    expectedSections.forEach((sectionName, index) => {
      it(`should have "${sectionName}" section`, () => {
        const section = template.checklist_sections.find((s: any) => s.section === sectionName);
        expect(section).toBeTruthy();
      });
    });

    describe('Pre-Spike Planning Section', () => {
      let section: any;

      it('should exist and be required', () => {
        section = template.checklist_sections.find((s: any) => s.section === 'Pre-Spike Planning');
        expect(section).toBeTruthy();
        expect(section.required).toBe(true);
      });

      it('should have items array', () => {
        expect(section.items).toBeTruthy();
        expect(Array.isArray(section.items)).toBe(true);
      });

      it('should have P1: Spike objective clearly defined', () => {
        const item = section.items.find((i: any) => i.id === 'P1');
        expect(item).toBeTruthy();
        expect(item.requirement).toContain('Spike objective');
      });

      it('should have P2: Research questions enumerated (minimum 5)', () => {
        const item = section.items.find((i: any) => i.id === 'P2');
        expect(item).toBeTruthy();
        expect(item.requirement).toContain('Research questions');
        expect(item.requirement).toContain('5');
      });

      it('should have P3: Timebox established', () => {
        const item = section.items.find((i: any) => i.id === 'P3');
        expect(item).toBeTruthy();
        expect(item.requirement).toContain('Timebox');
      });

      it('should have P4: Dependencies classified as Tier 1 or Tier 2', () => {
        const item = section.items.find((i: any) => i.id === 'P4');
        expect(item).toBeTruthy();
        expect(item.requirement).toContain('Tier 1');
        expect(item.requirement).toContain('Tier 2');
      });

      it('should have completed and evidence fields for each item', () => {
        section.items.forEach((item: any) => {
          expect(item).toHaveProperty('completed');
          expect(item).toHaveProperty('evidence');
          expect(item.completed).toBe(false);
        });
      });
    });

    describe('Tier 1 Research Section', () => {
      let section: any;

      it('should exist and be required', () => {
        section = template.checklist_sections.find((s: any) => s.section === 'Tier 1 Research (Internal)');
        expect(section).toBeTruthy();
        expect(section.required).toBe(true);
      });

      it('should have T1-1: Codebase searched via Grep/Glob', () => {
        const item = section.items.find((i: any) => i.id === 'T1-1');
        expect(item).toBeTruthy();
        expect(item.requirement).toContain('Grep/Glob');
      });

      it('should have T1-2: Local tools/CLI tested via Bash', () => {
        const item = section.items.find((i: any) => i.id === 'T1-2');
        expect(item).toBeTruthy();
        expect(item.requirement).toContain('Bash');
      });

      it('should have T1-3: Configuration files examined via Read', () => {
        const item = section.items.find((i: any) => i.id === 'T1-3');
        expect(item).toBeTruthy();
        expect(item.requirement).toContain('Read');
      });
    });

    describe('Tier 2 Research Section (CRITICAL)', () => {
      let section: any;

      it('should exist and be required', () => {
        section = template.checklist_sections.find((s: any) =>
          s.section.includes('Tier 2 Research') && s.section.includes('MANDATORY')
        );
        expect(section).toBeTruthy();
        expect(section.required).toBe(true);
      });

      it('should have T2-1: WebSearch for official website/docs (CRITICAL)', () => {
        const item = section.items.find((i: any) => i.id === 'T2-1');
        expect(item).toBeTruthy();
        expect(item.requirement).toContain('WebSearch');
        expect(item.requirement).toContain('official website');
        expect(item.critical).toBe(true);
      });

      it('should have T2-2: WebSearch for API documentation (CRITICAL)', () => {
        const item = section.items.find((i: any) => i.id === 'T2-2');
        expect(item).toBeTruthy();
        expect(item.requirement).toContain('WebSearch');
        expect(item.requirement).toContain('API');
        expect(item.critical).toBe(true);
      });

      it('should have T2-3: WebSearch for package registry (CRITICAL)', () => {
        const item = section.items.find((i: any) => i.id === 'T2-3');
        expect(item).toBeTruthy();
        expect(item.requirement).toContain('WebSearch');
        expect(item.requirement).toContain('NPM/PyPI');
        expect(item.critical).toBe(true);
      });

      it('should have T2-4: Alternative name variations searched (CRITICAL)', () => {
        const item = section.items.find((i: any) => i.id === 'T2-4');
        expect(item).toBeTruthy();
        expect(item.requirement).toContain('variation');
        expect(item.requirement).toContain('3');
        expect(item.critical).toBe(true);
      });

      it('should have T2-5: Community/forum search (OPTIONAL)', () => {
        const item = section.items.find((i: any) => i.id === 'T2-5');
        expect(item).toBeTruthy();
        expect(item.requirement).toContain('Community');
        expect(item.critical).toBe(false);
      });

      it('should have websearch_details structure for critical items', () => {
        const criticalItems = section.items.filter((i: any) => i.critical === true);
        criticalItems.forEach((item: any) => {
          if (item.id !== 'T2-4') { // T2-4 has name_variations instead
            expect(item).toHaveProperty('websearch_details');
            expect(item.websearch_details).toHaveProperty('query');
            expect(item.websearch_details).toHaveProperty('results_summary');
            expect(item.websearch_details).toHaveProperty('urls_found');
          }
        });
      });

      it('should have name_variations array for T2-4', () => {
        const item = section.items.find((i: any) => i.id === 'T2-4');
        expect(item).toHaveProperty('name_variations');
        expect(Array.isArray(item.name_variations)).toBe(true);
      });
    });

    describe('Negative Result Verification Section', () => {
      let section: any;

      it('should exist and be required', () => {
        section = template.checklist_sections.find((s: any) => s.section === 'Negative Result Verification');
        expect(section).toBeTruthy();
        expect(section.required).toBe(true);
      });

      it('should have condition for when it applies', () => {
        expect(section).toHaveProperty('condition');
        expect(section.condition).toContain('does not exist');
        expect(section.condition).toContain('NO-GO');
      });

      it('should have N1: Minimum 3 WebSearch queries with no results (CRITICAL)', () => {
        const item = section.items.find((i: any) => i.id === 'N1');
        expect(item).toBeTruthy();
        expect(item.requirement).toContain('3');
        expect(item.requirement).toContain('WebSearch');
        expect(item.requirement).toContain('no results');
        expect(item.critical).toBe(true);
      });

      it('should have N2: Official vendor website checked (CRITICAL)', () => {
        const item = section.items.find((i: any) => i.id === 'N2');
        expect(item).toBeTruthy();
        expect(item.requirement).toContain('vendor');
        expect(item.critical).toBe(true);
      });

      it('should have N3: Deprecation/sunset checked (OPTIONAL)', () => {
        const item = section.items.find((i: any) => i.id === 'N3');
        expect(item).toBeTruthy();
        expect(item.requirement).toContain('Deprecation');
        expect(item.critical).toBe(false);
      });

      it('should have queries_performed array for N1', () => {
        const item = section.items.find((i: any) => i.id === 'N1');
        expect(item).toHaveProperty('queries_performed');
        expect(Array.isArray(item.queries_performed)).toBe(true);
      });
    });

    describe('Alternative Solutions Section', () => {
      let section: any;

      it('should exist and be required', () => {
        section = template.checklist_sections.find((s: any) => s.section === 'Alternative Solutions');
        expect(section).toBeTruthy();
        expect(section.required).toBe(true);
      });

      it('should have A1: Minimum 3 alternatives researched', () => {
        const item = section.items.find((i: any) => i.id === 'A1');
        expect(item).toBeTruthy();
        expect(item.requirement).toContain('3');
        expect(item.requirement).toContain('alternative');
      });

      it('should have A2: Each alternative has pros/cons/cost/timeline', () => {
        const item = section.items.find((i: any) => i.id === 'A2');
        expect(item).toBeTruthy();
        expect(item.requirement).toContain('pros/cons/cost/timeline');
      });

      it('should have A3: Recommended alternative selected with rationale', () => {
        const item = section.items.find((i: any) => i.id === 'A3');
        expect(item).toBeTruthy();
        expect(item.requirement).toContain('Recommended');
        expect(item.requirement).toContain('rationale');
      });
    });

    describe('Deliverables Section', () => {
      let section: any;

      it('should exist and be required', () => {
        section = template.checklist_sections.find((s: any) => s.section === 'Deliverables');
        expect(section).toBeTruthy();
        expect(section.required).toBe(true);
      });

      it('should have D1: spike-[name]-results.json created', () => {
        const item = section.items.find((i: any) => i.id === 'D1');
        expect(item).toBeTruthy();
        expect(item.requirement).toContain('spike-[name]-results.json');
      });

      it('should have D2: Executive summary provided', () => {
        const item = section.items.find((i: any) => i.id === 'D2');
        expect(item).toBeTruthy();
        expect(item.requirement).toContain('Executive summary');
      });

      it('should have D3: Clear GO/NO-GO/CONDITIONAL recommendation', () => {
        const item = section.items.find((i: any) => i.id === 'D3');
        expect(item).toBeTruthy();
        expect(item.requirement).toContain('GO/NO-GO/CONDITIONAL');
      });

      it('should have D4: Next steps enumerated with owners', () => {
        const item = section.items.find((i: any) => i.id === 'D4');
        expect(item).toBeTruthy();
        expect(item.requirement).toContain('Next steps');
        expect(item.requirement).toContain('owners');
      });
    });
  });

  describe('Completion Criteria', () => {
    it('should have completion_criteria object', () => {
      expect(template).toHaveProperty('completion_criteria');
    });

    it('should specify minimum_required_steps', () => {
      expect(template.completion_criteria).toHaveProperty('minimum_required_steps');
      expect(template.completion_criteria.minimum_required_steps).toBeGreaterThanOrEqual(7);
    });

    it('should list mandatory_steps array', () => {
      expect(template.completion_criteria).toHaveProperty('mandatory_steps');
      expect(Array.isArray(template.completion_criteria.mandatory_steps)).toBe(true);
    });

    it('should include critical Tier 2 items in mandatory_steps', () => {
      const mandatorySteps = template.completion_criteria.mandatory_steps;
      expect(mandatorySteps).toContain('T2-1'); // WebSearch for official docs
      expect(mandatorySteps).toContain('T2-2'); // WebSearch for API docs
      expect(mandatorySteps).toContain('T2-3'); // WebSearch for package registry
      expect(mandatorySteps).toContain('T2-4'); // Alternative name variations
    });

    it('should include alternative research items in mandatory_steps', () => {
      const mandatorySteps = template.completion_criteria.mandatory_steps;
      expect(mandatorySteps).toContain('A1'); // 3 alternatives
      expect(mandatorySteps).toContain('A2'); // pros/cons/cost/timeline
      expect(mandatorySteps).toContain('A3'); // recommended alternative
    });

    it('should list optional_steps', () => {
      expect(template.completion_criteria).toHaveProperty('optional_steps');
      expect(Array.isArray(template.completion_criteria.optional_steps)).toBe(true);
    });

    it('should define negative_finding_requirement', () => {
      expect(template.completion_criteria).toHaveProperty('negative_finding_requirement');
      expect(template.completion_criteria.negative_finding_requirement).toContain('zero relevant results');
    });

    it('should define positive_finding_requirement', () => {
      expect(template.completion_criteria).toHaveProperty('positive_finding_requirement');
      expect(template.completion_criteria.positive_finding_requirement).toContain('sufficient');
    });
  });

  describe('Usage Instructions', () => {
    it('should have usage_instructions object', () => {
      expect(template).toHaveProperty('usage_instructions');
    });

    it('should specify when_to_use', () => {
      expect(template.usage_instructions).toHaveProperty('when_to_use');
      expect(template.usage_instructions.when_to_use).toContain('external dependencies');
    });

    it('should provide how_to_use steps', () => {
      expect(template.usage_instructions).toHaveProperty('how_to_use');
      expect(Array.isArray(template.usage_instructions.how_to_use)).toBe(true);
      expect(template.usage_instructions.how_to_use.length).toBeGreaterThanOrEqual(5);
    });

    it('should specify critical_items requirement', () => {
      expect(template.usage_instructions).toHaveProperty('critical_items');
      expect(template.usage_instructions.critical_items).toContain('critical: true');
    });
  });

  describe('Review Status', () => {
    it('should have review_status object', () => {
      expect(template).toHaveProperty('review_status');
    });

    it('should have all_critical_items_complete field (default false)', () => {
      expect(template.review_status).toHaveProperty('all_critical_items_complete');
      expect(template.review_status.all_critical_items_complete).toBe(false);
    });

    it('should have staff_engineer_approved field (default false)', () => {
      expect(template.review_status).toHaveProperty('staff_engineer_approved');
      expect(template.review_status.staff_engineer_approved).toBe(false);
    });

    it('should have ready_for_leadership field (default false)', () => {
      expect(template.review_status).toHaveProperty('ready_for_leadership');
      expect(template.review_status.ready_for_leadership).toBe(false);
    });

    it('should have completion_percentage field (default 0)', () => {
      expect(template.review_status).toHaveProperty('completion_percentage');
      expect(template.review_status.completion_percentage).toBe(0);
    });
  });

  describe('Template Integrity', () => {
    it('should have consistent item IDs across all sections', () => {
      const allItemIds = template.checklist_sections.flatMap((s: any) =>
        s.items.map((i: any) => i.id)
      );
      const uniqueIds = new Set(allItemIds);
      expect(allItemIds.length).toBe(uniqueIds.size); // No duplicate IDs
    });

    it('should have verification field for all items', () => {
      template.checklist_sections.forEach((section: any) => {
        section.items.forEach((item: any) => {
          expect(item).toHaveProperty('verification');
          expect(item.verification).toBeTruthy();
        });
      });
    });

    it('should have requirement field for all items', () => {
      template.checklist_sections.forEach((section: any) => {
        section.items.forEach((item: any) => {
          expect(item).toHaveProperty('requirement');
          expect(item.requirement).toBeTruthy();
        });
      });
    });

    it('should mark exactly 4 Tier 2 items as critical', () => {
      const tier2Section = template.checklist_sections.find((s: any) =>
        s.section.includes('Tier 2 Research')
      );
      const criticalItems = tier2Section.items.filter((i: any) => i.critical === true);
      expect(criticalItems.length).toBe(4); // T2-1, T2-2, T2-3, T2-4
    });

    it('should have total of 20+ checklist items', () => {
      const totalItems = template.checklist_sections.reduce(
        (sum: number, section: any) => sum + section.items.length,
        0
      );
      expect(totalItems).toBeGreaterThanOrEqual(20);
    });
  });
});
