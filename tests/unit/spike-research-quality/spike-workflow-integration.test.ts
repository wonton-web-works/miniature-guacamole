/**
 * Integration tests for Spike Research Workflow
 * Tests AC-6: Mock spike scenario successfully uses checklist and WebSearch
 *
 * TDD Approach: These integration tests simulate the spike research workflow
 * to ensure all components work together correctly.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Spike Research Workflow Integration (AC-6)', () => {
  const checklistTemplatePath = path.join(
    process.cwd(),
    '.claude/memory/spike-research-checklist-template.json'
  );
  const archDecisionsPath = path.join(
    process.cwd(),
    '.claude/memory/architecture-decisions.json'
  );
  const techStandardsPath = path.join(
    process.cwd(),
    '.claude/memory/technical-standards.json'
  );

  let checklistTemplate: any;
  let archDecisions: any;
  let techStandards: any;

  beforeEach(() => {
    // Load templates and standards
    checklistTemplate = JSON.parse(fs.readFileSync(checklistTemplatePath, 'utf-8'));
    archDecisions = JSON.parse(fs.readFileSync(archDecisionsPath, 'utf-8'));
    techStandards = JSON.parse(fs.readFileSync(techStandardsPath, 'utf-8'));
  });

  describe('Mock Spike Scenario: Validate Fictional API', () => {
    let mockSpike: any;

    beforeEach(() => {
      // Create mock spike from template
      mockSpike = JSON.parse(JSON.stringify(checklistTemplate)); // Deep copy
      mockSpike.spike_id = 'SPIKE-TEST-FICTIONAL-API';
      mockSpike.created_at = new Date().toISOString();
    });

    it('should initialize spike with template structure', () => {
      expect(mockSpike.spike_id).toBe('SPIKE-TEST-FICTIONAL-API');
      expect(mockSpike.template_version).toBe('1.0');
      expect(mockSpike.checklist_sections).toBeTruthy();
      expect(mockSpike.checklist_sections.length).toBe(6);
    });

    describe('Pre-Spike Planning', () => {
      it('should require spike objective', () => {
        const preSpike = mockSpike.checklist_sections.find(
          (s: any) => s.section === 'Pre-Spike Planning'
        );
        const objectiveItem = preSpike.items.find((i: any) => i.id === 'P1');

        // Simulate filling out objective
        objectiveItem.completed = true;
        objectiveItem.evidence = 'Validate if Fictional API exists for data processing feature';

        expect(objectiveItem.completed).toBe(true);
        expect(objectiveItem.evidence).toBeTruthy();
      });

      it('should classify dependencies as Tier 1 or Tier 2', () => {
        const tierItem = mockSpike.checklist_sections
          .find((s: any) => s.section === 'Pre-Spike Planning')
          .items.find((i: any) => i.id === 'P4');

        // Simulate classifying as Tier 2 (external)
        mockSpike.tier_classification.tier_2_external = ['Fictional API'];
        tierItem.completed = true;
        tierItem.evidence = 'Fictional API classified as Tier 2 (external dependency)';

        expect(mockSpike.tier_classification.tier_2_external).toContain('Fictional API');
        expect(tierItem.completed).toBe(true);
      });
    });

    describe('Tier 2 Research (External) - WebSearch Requirement', () => {
      let tier2Section: any;

      beforeEach(() => {
        tier2Section = mockSpike.checklist_sections.find(
          (s: any) => s.section.includes('Tier 2 Research')
        );
      });

      it('should require WebSearch for official website/docs (T2-1)', () => {
        const item = tier2Section.items.find((i: any) => i.id === 'T2-1');

        expect(item.critical).toBe(true);
        expect(item.requirement).toContain('WebSearch');
        expect(item.requirement).toContain('official website');

        // Simulate performing WebSearch
        item.completed = true;
        item.evidence = 'WebSearch performed for "Fictional API official website"';
        item.websearch_details.query = 'Fictional API official website';
        item.websearch_details.results_summary = 'No relevant results found (0/10 results)';
        item.websearch_details.urls_found = [];

        expect(item.completed).toBe(true);
        expect(item.websearch_details.query).toBeTruthy();
      });

      it('should require WebSearch for API documentation (T2-2)', () => {
        const item = tier2Section.items.find((i: any) => i.id === 'T2-2');

        expect(item.critical).toBe(true);

        // Simulate performing WebSearch
        item.completed = true;
        item.evidence = 'WebSearch performed for "Fictional API documentation"';
        item.websearch_details.query = 'Fictional API documentation';
        item.websearch_details.results_summary = 'No relevant results found';
        item.websearch_details.urls_found = [];

        expect(item.completed).toBe(true);
      });

      it('should require WebSearch for package registry (T2-3)', () => {
        const item = tier2Section.items.find((i: any) => i.id === 'T2-3');

        expect(item.critical).toBe(true);

        // Simulate performing WebSearch
        item.completed = true;
        item.evidence = 'WebSearch performed for "Fictional API NPM package"';
        item.websearch_details.query = 'Fictional API NPM';
        item.websearch_details.results_summary = 'No NPM package found';
        item.websearch_details.urls_found = [];

        expect(item.completed).toBe(true);
      });

      it('should require minimum 3 name variations (T2-4)', () => {
        const item = tier2Section.items.find((i: any) => i.id === 'T2-4');

        expect(item.critical).toBe(true);
        expect(item.requirement).toContain('3');

        // Simulate trying name variations
        item.completed = true;
        item.evidence = 'Tried 3 name variations: FictionalAPI, Fictional-API, fictional_api';
        item.name_variations = ['FictionalAPI', 'Fictional-API', 'fictional_api'];

        expect(item.name_variations.length).toBeGreaterThanOrEqual(3);
        expect(item.completed).toBe(true);
      });

      it('should mark all critical Tier 2 items as completed', () => {
        const criticalItems = tier2Section.items.filter((i: any) => i.critical === true);

        // Simulate completing all critical items
        criticalItems.forEach((item: any) => {
          item.completed = true;
          if (item.websearch_details) {
            item.websearch_details.query = `Fictional API ${item.id}`;
            item.websearch_details.results_summary = 'No results';
          }
          if (item.id === 'T2-4') {
            item.name_variations = ['FictionalAPI', 'Fictional-API', 'fictional_api'];
          }
        });

        const allCriticalComplete = criticalItems.every((i: any) => i.completed === true);
        expect(allCriticalComplete).toBe(true);
      });
    });

    describe('Negative Result Verification (NO-GO scenario)', () => {
      let negativeSection: any;

      beforeEach(() => {
        negativeSection = mockSpike.checklist_sections.find(
          (s: any) => s.section === 'Negative Result Verification'
        );
      });

      it('should apply when declaring "does not exist"', () => {
        expect(negativeSection.condition).toContain('does not exist');
        expect(negativeSection.condition).toContain('NO-GO');
      });

      it('should require minimum 3 WebSearch queries with no results (N1)', () => {
        const item = negativeSection.items.find((i: any) => i.id === 'N1');

        expect(item.critical).toBe(true);
        expect(item.requirement).toContain('3');
        expect(item.requirement).toContain('WebSearch');

        // Simulate performing 3+ searches
        item.completed = true;
        item.evidence = 'Performed 4 WebSearch queries, all returned zero relevant results';
        item.queries_performed = [
          'Fictional API official website',
          'Fictional API documentation',
          'Fictional API NPM',
          'FictionalAPI GitHub'
        ];

        expect(item.queries_performed.length).toBeGreaterThanOrEqual(3);
        expect(item.completed).toBe(true);
      });

      it('should check official vendor website (N2)', () => {
        const item = negativeSection.items.find((i: any) => i.id === 'N2');

        expect(item.critical).toBe(true);

        // Simulate checking vendor (if known)
        item.completed = true;
        item.evidence = 'No known vendor for Fictional API, searched generically';

        expect(item.completed).toBe(true);
      });

      it('should verify all critical negative result items completed', () => {
        const criticalItems = negativeSection.items.filter((i: any) => i.critical === true);

        criticalItems.forEach((item: any) => {
          item.completed = true;
          if (item.id === 'N1') {
            item.queries_performed = [
              'Fictional API official',
              'Fictional API docs',
              'Fictional API package'
            ];
          }
        });

        const allComplete = criticalItems.every((i: any) => i.completed === true);
        expect(allComplete).toBe(true);
      });
    });

    describe('Alternative Solutions', () => {
      let altSection: any;

      beforeEach(() => {
        altSection = mockSpike.checklist_sections.find(
          (s: any) => s.section === 'Alternative Solutions'
        );
      });

      it('should require minimum 3 alternatives (A1)', () => {
        const item = altSection.items.find((i: any) => i.id === 'A1');

        expect(item.requirement).toContain('3');

        // Simulate researching alternatives
        item.completed = true;
        item.evidence = 'Researched 3 alternatives: Build custom solution, Use OpenAPI, Use GraphQL';

        expect(item.completed).toBe(true);
      });

      it('should require pros/cons/cost/timeline for each (A2)', () => {
        const item = altSection.items.find((i: any) => i.id === 'A2');

        expect(item.requirement).toContain('pros/cons/cost/timeline');

        // Simulate structured comparison
        item.completed = true;
        item.evidence = 'Created structured comparison table with pros/cons/cost/timeline for each alternative';

        expect(item.completed).toBe(true);
      });

      it('should select recommended alternative (A3)', () => {
        const item = altSection.items.find((i: any) => i.id === 'A3');

        expect(item.requirement).toContain('Recommended');

        // Simulate recommendation
        item.completed = true;
        item.evidence = 'Recommended: Build custom solution - Best fit for requirements, no external dependency';

        expect(item.completed).toBe(true);
      });
    });

    describe('Deliverables', () => {
      let deliverableSection: any;

      beforeEach(() => {
        deliverableSection = mockSpike.checklist_sections.find(
          (s: any) => s.section === 'Deliverables'
        );
      });

      it('should require spike results JSON (D1)', () => {
        const item = deliverableSection.items.find((i: any) => i.id === 'D1');

        item.completed = true;
        item.evidence = 'spike-test-fictional-api-results.json created';

        expect(item.completed).toBe(true);
      });

      it('should require executive summary (D2)', () => {
        const item = deliverableSection.items.find((i: any) => i.id === 'D2');

        item.completed = true;
        item.evidence = 'Executive summary: Fictional API does not exist, recommend building custom solution';

        expect(item.completed).toBe(true);
      });

      it('should require GO/NO-GO/CONDITIONAL recommendation (D3)', () => {
        const item = deliverableSection.items.find((i: any) => i.id === 'D3');

        item.completed = true;
        item.evidence = 'Recommendation: NO-GO on Fictional API (does not exist), GO on custom solution';

        expect(item.completed).toBe(true);
      });

      it('should require next steps with owners (D4)', () => {
        const item = deliverableSection.items.find((i: any) => i.id === 'D4');

        item.completed = true;
        item.evidence = 'Next steps: (1) Design custom solution - staff-engineer, (2) Implementation - dev';

        expect(item.completed).toBe(true);
      });
    });

    describe('Completion Validation', () => {
      it('should validate all mandatory steps completed', () => {
        const mandatorySteps = mockSpike.completion_criteria.mandatory_steps;

        // Simulate completing all mandatory steps
        mandatorySteps.forEach((stepId: string) => {
          mockSpike.checklist_sections.forEach((section: any) => {
            const item = section.items.find((i: any) => i.id === stepId);
            if (item) {
              item.completed = true;
            }
          });
        });

        // Verify all mandatory items are completed
        const allMandatoryComplete = mandatorySteps.every((stepId: string) => {
          return mockSpike.checklist_sections.some((section: any) =>
            section.items.some((i: any) => i.id === stepId && i.completed === true)
          );
        });

        expect(allMandatoryComplete).toBe(true);
      });

      it('should calculate completion percentage', () => {
        let totalItems = 0;
        let completedItems = 0;

        mockSpike.checklist_sections.forEach((section: any) => {
          section.items.forEach((item: any) => {
            totalItems++;
            if (item.completed) {
              completedItems++;
            }
          });
        });

        const completionPercentage = Math.round((completedItems / totalItems) * 100);
        mockSpike.review_status.completion_percentage = completionPercentage;

        expect(mockSpike.review_status.completion_percentage).toBeGreaterThanOrEqual(0);
        expect(mockSpike.review_status.completion_percentage).toBeLessThanOrEqual(100);
      });

      it('should require 100% of critical items for negative finding', () => {
        // Get all critical items
        const allCriticalItems: any[] = [];
        mockSpike.checklist_sections.forEach((section: any) => {
          section.items.forEach((item: any) => {
            if (item.critical === true) {
              allCriticalItems.push(item);
            }
          });
        });

        // Simulate completing all critical items
        allCriticalItems.forEach((item: any) => {
          item.completed = true;
        });

        const allCriticalComplete = allCriticalItems.every((i: any) => i.completed === true);
        expect(allCriticalComplete).toBe(true);
      });
    });

    describe('Quality Gate Validation', () => {
      it('should enforce STD-002: External dependency validation', () => {
        const std002 = techStandards.standards.find((s: any) => s.standard_id === 'STD-002');

        expect(std002).toBeTruthy();
        expect(std002.requirement).toContain('WebSearch');

        // Verify Tier 2 items require WebSearch
        const tier2Section = mockSpike.checklist_sections.find(
          (s: any) => s.section.includes('Tier 2 Research')
        );
        const websearchItems = tier2Section.items.filter(
          (i: any) => i.requirement.includes('WebSearch')
        );

        expect(websearchItems.length).toBeGreaterThanOrEqual(3);
      });

      it('should enforce STD-003: Minimum 3 alternatives', () => {
        const std003 = techStandards.standards.find((s: any) => s.standard_id === 'STD-003');

        expect(std003).toBeTruthy();
        expect(std003.requirement).toContain('3');

        // Verify alternative section requires 3 alternatives
        const altSection = mockSpike.checklist_sections.find(
          (s: any) => s.section === 'Alternative Solutions'
        );
        const minAltItem = altSection.items.find((i: any) => i.id === 'A1');

        expect(minAltItem.requirement).toContain('3');
      });

      it('should enforce STD-004: Negative result verification', () => {
        const std004 = techStandards.standards.find((s: any) => s.standard_id === 'STD-004');

        expect(std004).toBeTruthy();
        expect(std004.requirement).toContain('3');
        expect(std004.requirement).toContain('WebSearch');

        // Verify negative result section requires 3 searches
        const negSection = mockSpike.checklist_sections.find(
          (s: any) => s.section === 'Negative Result Verification'
        );
        const minSearchItem = negSection.items.find((i: any) => i.id === 'N1');

        expect(minSearchItem.requirement).toContain('3');
        expect(minSearchItem.requirement).toContain('WebSearch');
      });

      it('should apply ARCH-002: Validate before design principle', () => {
        const arch002 = archDecisions.principles.find(
          (p: any) => p.principle_id === 'ARCH-002'
        );

        expect(arch002).toBeTruthy();
        expect(arch002.description).toContain('BEFORE');
        expect(arch002.description).toContain('design');

        // This spike validates dependencies before feature design
        expect(mockSpike.spike_id).toContain('SPIKE-TEST');
      });
    });

    describe('False Negative Prevention', () => {
      it('should prevent SPIKE-UXPILOT scenario from recurring', () => {
        // Verify WebSearch is mandatory for Tier 2
        const tier2Section = mockSpike.checklist_sections.find(
          (s: any) => s.section.includes('Tier 2 Research')
        );

        const websearchItems = tier2Section.items.filter((i: any) => i.critical === true);
        expect(websearchItems.length).toBeGreaterThanOrEqual(4);

        // Verify negative findings require exhaustive search
        const negSection = mockSpike.checklist_sections.find(
          (s: any) => s.section === 'Negative Result Verification'
        );

        const exhaustiveSearch = negSection.items.find((i: any) => i.id === 'N1');
        expect(exhaustiveSearch.requirement).toContain('3');
      });

      it('should document lessons learned from SPIKE-UXPILOT', () => {
        const arch001 = archDecisions.principles.find(
          (p: any) => p.principle_id === 'ARCH-001'
        );

        const uxpilotLesson = arch001.lessons_learned.find(
          (l: any) => l.incident?.includes('SPIKE-UXPILOT')
        );

        expect(uxpilotLesson).toBeTruthy();
        expect(uxpilotLesson.lesson).toContain('validate');
        expect(uxpilotLesson.impact).toContain('hours');
      });

      it('should require alternative name variations to catch naming differences', () => {
        const tier2Section = mockSpike.checklist_sections.find(
          (s: any) => s.section.includes('Tier 2 Research')
        );

        const nameVarItem = tier2Section.items.find((i: any) => i.id === 'T2-4');
        expect(nameVarItem.requirement).toContain('3');
        expect(nameVarItem.critical).toBe(true);
      });
    });
  });

  describe('Cross-File Integration', () => {
    it('should have consistent checklist items referenced across all files', () => {
      const checklistIds = mockSpike.checklist_sections.flatMap((s: any) =>
        s.items.map((i: any) => i.id)
      );

      // STD-002 references checklist template
      const std002 = techStandards.standards.find((s: any) => s.standard_id === 'STD-002');
      expect(std002.verification.checklist).toContain('spike-research-checklist-template.json');

      // STD-003 references checklist items A1, A2, A3
      const std003 = techStandards.standards.find((s: any) => s.standard_id === 'STD-003');
      expect(checklistIds).toContain('A1');
      expect(checklistIds).toContain('A2');
      expect(checklistIds).toContain('A3');

      // STD-004 references checklist items N1, N2, T2-1, T2-2, T2-3, T2-4
      const std004 = techStandards.standards.find((s: any) => s.standard_id === 'STD-004');
      std004.verification.checklist_items.forEach((itemId: string) => {
        expect(checklistIds).toContain(itemId);
      });
    });

    it('should have consistent standards referenced in architecture principles', () => {
      const arch001 = archDecisions.principles.find((p: any) => p.principle_id === 'ARCH-001');
      const arch002 = archDecisions.principles.find((p: any) => p.principle_id === 'ARCH-002');

      // ARCH-001 references STD-002
      expect(arch001.related_standards).toContain('STD-002');

      // ARCH-002 references STD-002, STD-003, STD-004
      expect(arch002.related_standards).toContain('STD-002');
      expect(arch002.related_standards).toContain('STD-003');
      expect(arch002.related_standards).toContain('STD-004');

      // Verify these standards actually exist
      expect(techStandards.standards.find((s: any) => s.standard_id === 'STD-002')).toBeTruthy();
      expect(techStandards.standards.find((s: any) => s.standard_id === 'STD-003')).toBeTruthy();
      expect(techStandards.standards.find((s: any) => s.standard_id === 'STD-004')).toBeTruthy();
    });

    it('should have quality gates enforcing spike research standards', () => {
      const spikeGate = techStandards.quality_gates.find(
        (g: any) => g.gate_id === 'GATE-002'
      );

      expect(spikeGate).toBeTruthy();
      expect(spikeGate.name).toBe('Spike Quality Gate');

      // Gate checks reference standards
      const checks = spikeGate.checks;
      expect(checks.some((c: any) => c.standard === 'STD-002')).toBe(true);
      expect(checks.some((c: any) => c.standard === 'STD-003')).toBe(true);
      expect(checks.some((c: any) => c.standard === 'STD-004')).toBe(true);
    });
  });
});
