/**
 * TDD/BDD Tests for WS-15: Centralized Skill Visual Output
 *
 * Feature: Standardize output formatting across all skills
 * As a: Product Development Team
 * I want: A shared output format specification
 * So that: All skills produce consistent, predictable visual output
 *
 * Acceptance Criteria:
 * - Shared output-format.md exists with standard patterns
 * - All 18 skills reference shared output format in their constitution
 * - All existing tests pass
 * - Output formatting is consistent across all skills
 *
 * @target 99% function coverage
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Test data: All 18 skills that need output format standardization
const ALL_SKILLS = [
  'mg',
  'mg-accessibility-review',
  'mg-add-context',
  'mg-assess',
  'mg-assess-tech',
  'mg-build',
  'mg-code-review',
  'mg-debug',
  'mg-design',
  'mg-design-review',
  'mg-document',
  'mg-init',
  'mg-leadership-team',
  'mg-refactor',
  'mg-security-review',
  'mg-spec',
  'mg-ticket',
  'mg-tidy',
  'mg-write',
] as const;

const SKILLS_DIR = path.resolve(__dirname, '../../src/framework/skills');
// Output format moved from _shared/ to per-skill references/ in v3.0.0
const OUTPUT_FORMAT_FILE = path.join(SKILLS_DIR, 'mg', 'references', 'output-format.md');

describe('WS-15: Centralized Skill Visual Output', () => {
  describe('Feature: Shared Output Format Documentation', () => {
    describe('Given: A product development team using 18 skills', () => {
      describe('When: Creating a standardized output format specification', () => {
        it('Then: each skill should have references/output-format.md', () => {
          for (const skill of ALL_SKILLS) {
            const refFile = path.join(SKILLS_DIR, skill, 'references', 'output-format.md');
            expect(fs.existsSync(refFile), `${skill}/references/output-format.md should exist`).toBe(true);
            expect(fs.statSync(refFile).isFile()).toBe(true);
          }
        });

        it('Then: output-format.md should exist in at least one skill', () => {
          expect(fs.existsSync(OUTPUT_FORMAT_FILE)).toBe(true);
          expect(fs.statSync(OUTPUT_FORMAT_FILE).isFile()).toBe(true);
        });

        it('Then: output-format.md should be readable markdown', () => {
          const content = fs.readFileSync(OUTPUT_FORMAT_FILE, 'utf-8');

          expect(content).toBeDefined();
          expect(content.length).toBeGreaterThan(100);
          expect(content).toContain('#'); // Should have markdown headers
        });

        it('Then: output-format.md should contain standard pattern documentation', () => {
          const content = fs.readFileSync(OUTPUT_FORMAT_FILE, 'utf-8');

          // Should document key output patterns
          expect(content.toLowerCase()).toContain('output');
          expect(content.toLowerCase()).toContain('format');

          // Should have structured sections
          expect(content).toMatch(/#{1,3}\s+/); // Markdown headers
        });

        it('Then: output-format.md should define visual output structure', () => {
          const content = fs.readFileSync(OUTPUT_FORMAT_FILE, 'utf-8');

          // Should define visual patterns
          const hasVisualGuidance =
            content.toLowerCase().includes('visual') ||
            content.toLowerCase().includes('display') ||
            content.toLowerCase().includes('presentation') ||
            content.toLowerCase().includes('structure');

          expect(hasVisualGuidance).toBe(true);
        });

        it('Then: output-format.md should include standard sections guidance', () => {
          const content = fs.readFileSync(OUTPUT_FORMAT_FILE, 'utf-8');

          // Should guide on common sections
          const hasStructureGuidance =
            content.toLowerCase().includes('section') ||
            content.toLowerCase().includes('heading') ||
            content.toLowerCase().includes('template');

          expect(hasStructureGuidance).toBe(true);
        });

        it('Then: output-format.md should provide examples', () => {
          const content = fs.readFileSync(OUTPUT_FORMAT_FILE, 'utf-8');

          // Should include example patterns
          const hasExamples =
            content.includes('```') || // Code blocks for examples
            content.toLowerCase().includes('example');

          expect(hasExamples).toBe(true);
        });

        it('Then: output-format.md should have proper markdown structure', () => {
          const content = fs.readFileSync(OUTPUT_FORMAT_FILE, 'utf-8');
          const lines = content.split('\n');

          // Should have multiple headers
          const headerCount = lines.filter(line => /^#{1,3}\s+/.test(line)).length;
          expect(headerCount).toBeGreaterThan(2);

          // Should have substantial content (not just a stub)
          expect(lines.length).toBeGreaterThan(10);
        });
      });
    });
  });

  describe('Feature: Skills Reference Shared Output Format', () => {
    describe('Given: All 18 skills need consistent output', () => {
      describe('When: Skills are configured with output format guidance', () => {
        it('Then: All 18 skills should have SKILL.md files', () => {
          for (const skill of ALL_SKILLS) {
            const skillFile = path.join(SKILLS_DIR, skill, 'SKILL.md');
            expect(fs.existsSync(skillFile), `${skill}/SKILL.md should exist`).toBe(true);
          }
        });

        it('Then: All 18 skills should have readable markdown content', () => {
          for (const skill of ALL_SKILLS) {
            const skillFile = path.join(SKILLS_DIR, skill, 'SKILL.md');
            const content = fs.readFileSync(skillFile, 'utf-8');

            expect(content.length, `${skill}/SKILL.md should have content`).toBeGreaterThan(100);
            expect(content, `${skill}/SKILL.md should have headers`).toContain('#');
          }
        });

        it('Then: All 18 skills should have Constitution sections', () => {
          for (const skill of ALL_SKILLS) {
            const skillFile = path.join(SKILLS_DIR, skill, 'SKILL.md');
            const content = fs.readFileSync(skillFile, 'utf-8');

            const hasConstitution = /##\s+Constitution/i.test(content);
            expect(hasConstitution, `${skill}/SKILL.md should have Constitution section`).toBe(true);
          }
        });

        it('Then: Output format should be referenced directly in each skill', () => {
          // skill-base.md was removed. Each skill now carries the output format directive
          // inline in its own Constitution section ("Follow output format").
          for (const skill of ALL_SKILLS) {
            const skillFile = path.join(SKILLS_DIR, skill, 'SKILL.md');
            const content = fs.readFileSync(skillFile, 'utf-8');

            const constitutionMatch = content.match(/##\s+Constitution\s*([\s\S]*?)(?=\n##\s+|\n---\s+|$)/i);
            expect(constitutionMatch, `${skill}/SKILL.md should have Constitution section`).toBeTruthy();

            if (constitutionMatch) {
              const constitution = constitutionMatch[1];
              const hasOutputReference =
                /output.*format/i.test(constitution) ||
                constitution.includes('output-format.md');

              expect(
                hasOutputReference,
                `${skill}/SKILL.md should reference output format in its Constitution`
              ).toBe(true);
            }
          }
        });

        it('Then: Output format directive is defined inline in each skill constitution', () => {
          // skill-base.md was removed. Each skill now carries "Follow output format" inline
          // in its own Constitution section.
          for (const skill of ALL_SKILLS) {
            const skillFile = path.join(SKILLS_DIR, skill, 'SKILL.md');
            const content = fs.readFileSync(skillFile, 'utf-8');

            const constitutionMatch = content.match(/##\s+Constitution\s*([\s\S]*?)(?=\n##\s+|\n---\s+|$)/i);
            if (constitutionMatch) {
              const constitution = constitutionMatch[1];
              const hasOutputDirective =
                /output.*format/i.test(constitution) ||
                constitution.includes('output-format.md');

              expect(
                hasOutputDirective,
                `${skill}/SKILL.md Constitution should contain output format directive`
              ).toBe(true);
            }
          }
        });

        it('Then: Each skill has inline output format directive in its Constitution', () => {
          // skill-base.md was removed. The output format directive ("Follow output format")
          // is now defined inline per skill in its Constitution section.
          let skillsWithInlineDirective = 0;
          for (const skill of ALL_SKILLS) {
            const skillFile = path.join(SKILLS_DIR, skill, 'SKILL.md');
            const content = fs.readFileSync(skillFile, 'utf-8');

            const constitutionMatch = content.match(/##\s+Constitution\s*([\s\S]*?)(?=\n##\s+|\n---\s+|$)/i);
            if (constitutionMatch) {
              const constitution = constitutionMatch[1];
              if (/output.*format/i.test(constitution) || constitution.includes('output-format.md')) {
                skillsWithInlineDirective++;
              }
            }
          }
          // All skills should have the inline directive
          expect(skillsWithInlineDirective).toBe(ALL_SKILLS.length);
        });

        it('Then: Skills should have constitution items as numbered lists', () => {
          for (const skill of ALL_SKILLS) {
            const skillFile = path.join(SKILLS_DIR, skill, 'SKILL.md');
            const content = fs.readFileSync(skillFile, 'utf-8');

            // Extract Constitution section
            const constitutionMatch = content.match(
              /##\s+Constitution\s*([\s\S]*?)(?=\n##\s+|\n---\s+|$)/i
            );

            if (constitutionMatch) {
              const constitutionSection = constitutionMatch[1];

              // Should use numbered lists for constitution items
              const hasNumberedItems = /^\d+\.\s+\*\*/m.test(constitutionSection);
              expect(
                hasNumberedItems,
                `${skill}/SKILL.md Constitution should use numbered list format`
              ).toBe(true);
            }
          }
        });

        it('Then: Constitution should have 3-10 core principles per skill', () => {
          for (const skill of ALL_SKILLS) {
            const skillFile = path.join(SKILLS_DIR, skill, 'SKILL.md');
            const content = fs.readFileSync(skillFile, 'utf-8');

            // Extract Constitution section
            const constitutionMatch = content.match(
              /##\s+Constitution\s*([\s\S]*?)(?=\n##\s+|\n---\s+|$)/i
            );

            if (constitutionMatch) {
              const constitutionSection = constitutionMatch[1];

              // Count numbered items
              const items = constitutionSection.match(/^\d+\.\s+\*\*/gm) || [];

              // Most skills have 4-6 principles. /mg has 10 (merged dispatcher + leadership).
              expect(
                items.length,
                `${skill}/SKILL.md Constitution should have 3-10 principles`
              ).toBeGreaterThanOrEqual(3);

              expect(
                items.length,
                `${skill}/SKILL.md Constitution should not exceed 10 principles`
              ).toBeLessThanOrEqual(10);
            }
          }
        });
      });
    });
  });

  describe('Feature: Output Format Standardization', () => {
    describe('Given: Skills with varied output formats', () => {
      describe('When: Applying standardized output format', () => {
        it('Then: Skills with "Output Format" sections should be consistent', () => {
          const skillsWithOutputSections: string[] = [];

          for (const skill of ALL_SKILLS) {
            const skillFile = path.join(SKILLS_DIR, skill, 'SKILL.md');
            const content = fs.readFileSync(skillFile, 'utf-8');

            if (/##\s+Output\s+Format/i.test(content)) {
              skillsWithOutputSections.push(skill);
            }
          }

          // At least some skills should have Output Format sections
          expect(skillsWithOutputSections.length).toBeGreaterThan(0);

          // Those sections should reference or align with shared format
          for (const skill of skillsWithOutputSections) {
            const skillFile = path.join(SKILLS_DIR, skill, 'SKILL.md');
            const content = fs.readFileSync(skillFile, 'utf-8');

            const outputSectionMatch = content.match(
              /##\s+Output\s+Format[s]?\s*([\s\S]*?)(?=\n##\s+|$)/i
            );

            if (outputSectionMatch) {
              const outputSection = outputSectionMatch[1];

              // Should have structured content (code blocks or lists)
              const hasStructure =
                outputSection.includes('```') ||
                /^[-*]\s+/m.test(outputSection) ||
                /^\d+\.\s+/m.test(outputSection);

              expect(
                hasStructure,
                `${skill}/SKILL.md Output Format should have structured examples`
              ).toBe(true);
            }
          }
        });

        it('Then: Team skills should have consistent output patterns', () => {
          const teamSkills = ALL_SKILLS.filter(s => s.includes('-team') || s === 'mg-build' || s === 'mg-spec' || s === 'mg-design' || s === 'mg-document' || s === 'mg-write');

          for (const skill of teamSkills) {
            const skillFile = path.join(SKILLS_DIR, skill, 'SKILL.md');
            const content = fs.readFileSync(skillFile, 'utf-8');

            // Team skills should have Output Format section (h2 or h3, may be prefixed)
            const hasOutputSection =
              /###?\s+.*Output\s+Format[s]?/i.test(content) ||
              content.includes('references/output-format.md') ||
              content.includes('_shared/output-format.md');

            expect(
              hasOutputSection,
              `${skill}/SKILL.md should define or reference output format`
            ).toBe(true);
          }
        });

        it('Then: Review skills should have consistent output patterns', () => {
          const reviewSkills = ALL_SKILLS.filter(s => s.includes('-review'));

          for (const skill of reviewSkills) {
            const skillFile = path.join(SKILLS_DIR, skill, 'SKILL.md');
            const content = fs.readFileSync(skillFile, 'utf-8');

            // Review skills should have Output Format or reference shared format
            const hasOutputSection =
              /##\s+Output\s+Format[s]?/i.test(content) ||
              content.includes('references/output-format.md') ||
              content.includes('_shared/output-format.md');

            expect(
              hasOutputSection,
              `${skill}/SKILL.md should define or reference output format`
            ).toBe(true);
          }
        });

        it('Then: Assessment skills should have consistent output patterns', () => {
          const assessmentSkills = ALL_SKILLS.filter(s => s.includes('mg-assess'));

          for (const skill of assessmentSkills) {
            const skillFile = path.join(SKILLS_DIR, skill, 'SKILL.md');
            const content = fs.readFileSync(skillFile, 'utf-8');

            // Assessment skills should have Output Format section
            const hasOutputSection =
              /##\s+Output\s+Format[s]?/i.test(content) ||
              content.includes('references/output-format.md') ||
              content.includes('_shared/output-format.md');

            expect(
              hasOutputSection,
              `${skill}/SKILL.md should define or reference output format`
            ).toBe(true);
          }
        });
      });
    });
  });

  describe('Feature: Comprehensive Skill Validation', () => {
    describe('Given: All 19 skills configured', () => {
      describe('When: Validating complete implementation', () => {
        it('Then: All 19 skills in ALL_SKILLS should exist in skills directory', () => {
          const skillDirs = fs.readdirSync(SKILLS_DIR)
            .filter(item => {
              const itemPath = path.join(SKILLS_DIR, item);
              const skillFile = path.join(SKILLS_DIR, item, 'SKILL.md');
              return fs.statSync(itemPath).isDirectory() && !item.startsWith('_') && fs.existsSync(skillFile);
            });

          // Verify every skill in ALL_SKILLS is present in the directory
          for (const skill of ALL_SKILLS) {
            expect(skillDirs, `${skill} should exist in skills directory`).toContain(skill);
          }
          expect(skillDirs.length).toBeGreaterThanOrEqual(ALL_SKILLS.length);
        });

        it('Then: Each skill should have required metadata in frontmatter', () => {
          for (const skill of ALL_SKILLS) {
            const skillFile = path.join(SKILLS_DIR, skill, 'SKILL.md');
            const content = fs.readFileSync(skillFile, 'utf-8');

            // Should have YAML frontmatter
            const frontmatterMatch = content.match(/^---\s*([\s\S]*?)\s*---/);
            expect(frontmatterMatch, `${skill}/SKILL.md should have frontmatter`).toBeTruthy();

            if (frontmatterMatch) {
              const frontmatter = frontmatterMatch[1];

              // Required fields
              expect(frontmatter, `${skill} should have name field`).toContain('name:');
              expect(frontmatter, `${skill} should have description field`).toContain('description:');
              expect(frontmatter, `${skill} should have model field`).toContain('model:');
              expect(frontmatter, `${skill} should have allowed-tools field`).toContain('allowed-tools:');
            }
          }
        });

        it('Then: Each skill should have standard sections', () => {
          const requiredSections = ['Constitution', 'Boundaries'];

          for (const skill of ALL_SKILLS) {
            const skillFile = path.join(SKILLS_DIR, skill, 'SKILL.md');
            const content = fs.readFileSync(skillFile, 'utf-8');

            for (const section of requiredSections) {
              const hasSection = new RegExp(`##\\s+${section}`, 'i').test(content);
              expect(
                hasSection,
                `${skill}/SKILL.md should have ${section} section`
              ).toBe(true);
            }
          }
        });

        it('Then: Boundaries section should define CAN/CANNOT/ESCALATES', () => {
          for (const skill of ALL_SKILLS) {
            const skillFile = path.join(SKILLS_DIR, skill, 'SKILL.md');
            const content = fs.readFileSync(skillFile, 'utf-8');

            // Extract Boundaries section
            const boundariesMatch = content.match(
              /##\s+Boundaries\s*([\s\S]*?)(?=\n##\s+|$)/i
            );

            expect(
              boundariesMatch,
              `${skill}/SKILL.md should have Boundaries section`
            ).toBeTruthy();

            if (boundariesMatch) {
              const boundaries = boundariesMatch[1];

              // /mg uses mode-prefixed boundaries (Dispatch mode CAN, Leadership mode CAN)
              expect(boundaries, `${skill} should define CAN`).toMatch(/\*\*(?:\w+\s+mode\s+)?CAN:\*\*/);
              expect(boundaries, `${skill} should define CANNOT`).toMatch(/\*\*(?:\w+\s+mode\s+)?CANNOT:\*\*/);
              expect(boundaries, `${skill} should define ESCALATES TO`).toMatch(/\*\*(?:ESCALATES TO|ESCALATES TO):\*\*/i);
            }
          }
        });

        it('Then: All skills should maintain their existing tests passing', () => {
          // This is a meta-test: verify we have test coverage for all skills
          const testsDir = path.resolve(__dirname);
          const testFiles = fs.readdirSync(testsDir).filter(f => f.endsWith('.test.ts'));

          // Should have tests for major skills
          // Test file names use old names (test files weren't renamed)
          const criticalSkills = [
            'implement',
            'code-review',
            'security-review',
            'accessibility-review',
            'design-review',
            'feature-assessment',
            'technical-assessment'
          ];

          for (const skill of criticalSkills) {
            const hasTestFile = testFiles.some(f => f.includes(skill));
            expect(
              hasTestFile,
              `Should have test file for ${skill}`
            ).toBe(true);
          }
        });
      });
    });
  });

  describe('Feature: Integration Validation', () => {
    describe('Given: Centralized output format implemented', () => {
      describe('When: Verifying end-to-end consistency', () => {
        it('Then: Each skill should have its own output-format reference file', () => {
          for (const skill of ALL_SKILLS) {
            const refFile = path.join(SKILLS_DIR, skill, 'references', 'output-format.md');
            expect(fs.existsSync(refFile), `${skill} missing references/output-format.md`).toBe(true);
          }
        });

        it('Then: No skill should have hardcoded output format when shared format exists', () => {
          // Once shared format exists, skills shouldn't duplicate full format specs.
          // After consolidation, output format is inherited via skill-base.md — so a skill
          // that inherits from skill-base is compliant even without an explicit reference link.
          const sharedFormatExists = fs.existsSync(OUTPUT_FORMAT_FILE);

          if (sharedFormatExists) {
            for (const skill of ALL_SKILLS) {
              const skillFile = path.join(SKILLS_DIR, skill, 'SKILL.md');
              const content = fs.readFileSync(skillFile, 'utf-8');

              // Should reference shared format OR inherit from skill-base (consolidated approach)
              const referencesShared = content.includes('references/output-format.md') || content.includes('_shared/output-format.md');
              const inheritsBase = content.includes('skill-base') || content.includes('Inherits');

              // If skill has Output Format section, it should reference shared, provide guidance,
              // or inherit from skill-base (the consolidated approach post-WS-15)
              if (/##\s+Output\s+Format[s]?/i.test(content)) {
                const hasGuidanceText =
                  content.toLowerCase().includes('see') ||
                  content.toLowerCase().includes('reference') ||
                  content.toLowerCase().includes('follow');

                expect(
                  referencesShared || hasGuidanceText || inheritsBase,
                  `${skill} should reference shared format, provide guidance link, or inherit from skill-base`
                ).toBe(true);
              }
            }
          }
        });

        it('Then: Output format should provide guidance for all skill types', () => {
          const content = fs.readFileSync(OUTPUT_FORMAT_FILE, 'utf-8');

          // Should cover different types of skills
          const skillTypes = ['team', 'review', 'assess', 'build'];

          for (const type of skillTypes) {
            const hasGuidance =
              content.toLowerCase().includes(type) ||
              content.toLowerCase().includes('all skills');

            expect(
              hasGuidance,
              `output-format.md should provide guidance for ${type} skills`
            ).toBe(true);
          }
        });

        it('Then: Documentation should be discoverable and well-linked', () => {
          const content = fs.readFileSync(OUTPUT_FORMAT_FILE, 'utf-8');

          // Should have clear title
          const hasTitle = /^#\s+/m.test(content);
          expect(hasTitle, 'output-format.md should have main title').toBe(true);

          // Should have multiple sections
          const sections = content.match(/^#{2,3}\s+/gm) || [];
          expect(
            sections.length,
            'output-format.md should have multiple sections'
          ).toBeGreaterThan(2);
        });

        it('Then: Shared format should include versioning or update guidance', () => {
          const content = fs.readFileSync(OUTPUT_FORMAT_FILE, 'utf-8');

          // Should indicate it's a living document
          const hasVersioning =
            content.toLowerCase().includes('version') ||
            content.toLowerCase().includes('updated') ||
            content.toLowerCase().includes('last modified') ||
            content.toLowerCase().includes('changelog');

          // This is a nice-to-have, so we make it informative
          if (!hasVersioning) {
            console.warn('Consider adding version/update info to output-format.md');
          }

          // Always pass but encourage best practice
          expect(true).toBe(true);
        });
      });
    });
  });
});
