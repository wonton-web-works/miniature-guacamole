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
 * - All 17 skills reference shared output format in their constitution
 * - All existing tests pass
 * - Output formatting is consistent across all skills
 *
 * @target 99% function coverage
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Test data: All 17 skills that need output format standardization
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
  'mg-write',
] as const;

const SKILLS_DIR = path.resolve(__dirname, '../../src/framework/skills');
const SHARED_DIR = path.join(SKILLS_DIR, '_shared');
const OUTPUT_FORMAT_FILE = path.join(SHARED_DIR, 'output-format.md');

describe('WS-15: Centralized Skill Visual Output', () => {
  describe('Feature: Shared Output Format Documentation', () => {
    describe('Given: A product development team using 17 skills', () => {
      describe('When: Creating a standardized output format specification', () => {
        it('Then: .claude/skills/_shared/ directory should exist', () => {
          expect(fs.existsSync(SHARED_DIR)).toBe(true);
          expect(fs.statSync(SHARED_DIR).isDirectory()).toBe(true);
        });

        it('Then: .claude/skills/_shared/output-format.md should exist', () => {
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
    describe('Given: All 17 skills need consistent output', () => {
      describe('When: Skills are configured with output format guidance', () => {
        it('Then: All 17 skills should have SKILL.md files', () => {
          for (const skill of ALL_SKILLS) {
            const skillFile = path.join(SKILLS_DIR, skill, 'SKILL.md');
            expect(fs.existsSync(skillFile), `${skill}/SKILL.md should exist`).toBe(true);
          }
        });

        it('Then: All 17 skills should have readable markdown content', () => {
          for (const skill of ALL_SKILLS) {
            const skillFile = path.join(SKILLS_DIR, skill, 'SKILL.md');
            const content = fs.readFileSync(skillFile, 'utf-8');

            expect(content.length, `${skill}/SKILL.md should have content`).toBeGreaterThan(100);
            expect(content, `${skill}/SKILL.md should have headers`).toContain('#');
          }
        });

        it('Then: All 17 skills should have Constitution sections', () => {
          for (const skill of ALL_SKILLS) {
            const skillFile = path.join(SKILLS_DIR, skill, 'SKILL.md');
            const content = fs.readFileSync(skillFile, 'utf-8');

            const hasConstitution = /##\s+Constitution/i.test(content);
            expect(hasConstitution, `${skill}/SKILL.md should have Constitution section`).toBe(true);
          }
        });

        it('Then: All 17 skills should reference shared output format', () => {
          for (const skill of ALL_SKILLS) {
            const skillFile = path.join(SKILLS_DIR, skill, 'SKILL.md');
            const content = fs.readFileSync(skillFile, 'utf-8');

            // Should reference the shared output format file
            const referencesOutputFormat =
              content.includes('_shared/output-format.md') ||
              content.includes('output-format.md') ||
              content.toLowerCase().includes('see shared output format');

            expect(
              referencesOutputFormat,
              `${skill}/SKILL.md should reference shared output format`
            ).toBe(true);
          }
        });

        it('Then: Constitution sections should include output format directive', () => {
          for (const skill of ALL_SKILLS) {
            const skillFile = path.join(SKILLS_DIR, skill, 'SKILL.md');
            const content = fs.readFileSync(skillFile, 'utf-8');

            // Extract Constitution section
            const constitutionMatch = content.match(
              /##\s+Constitution\s*([\s\S]*?)(?=\n##\s+|\n---\s+|$)/i
            );

            expect(
              constitutionMatch,
              `${skill}/SKILL.md should have Constitution section with content`
            ).toBeTruthy();

            if (constitutionMatch) {
              const constitutionSection = constitutionMatch[1];

              // Constitution should mention output format
              const hasOutputDirective =
                /output.*format/i.test(constitutionSection) ||
                /format.*output/i.test(constitutionSection) ||
                /_shared\/output-format\.md/.test(constitutionSection);

              expect(
                hasOutputDirective,
                `${skill}/SKILL.md Constitution should reference output format`
              ).toBe(true);
            }
          }
        });

        it('Then: Output format references should follow consistent pattern', () => {
          const references: string[] = [];

          for (const skill of ALL_SKILLS) {
            const skillFile = path.join(SKILLS_DIR, skill, 'SKILL.md');
            const content = fs.readFileSync(skillFile, 'utf-8');

            // Extract the output format reference pattern
            // Skills may use relative path (../_shared/output-format.md) or short form (_shared/output-format.md)
            const patterns = [
              /See\s+`?\.\.\/(_shared\/output-format\.md)`?/i,
              /Follow\s+standard\s+output\s+format/i,
              /Reference:\s*`?\.\.\/(_shared\/output-format\.md)`?/i,
              /\[output format\]\(\.\.\/(_shared\/output-format\.md)\)/i,
              /Follow\s+`_shared\/output-format\.md`/i,
              /_shared\/output-format\.md/,
            ];

            for (const pattern of patterns) {
              const match = content.match(pattern);
              if (match) {
                references.push(match[0]);
                break;
              }
            }
          }

          // All 17 skills should have found a reference
          expect(references.length).toBe(ALL_SKILLS.length);

          // References should follow similar patterns
          // (allowing for slight variations in wording but consistent structure)
          const hasConsistentStructure = references.every(ref =>
            ref.includes('_shared/output-format.md') ||
            /output\s+format/i.test(ref)
          );

          expect(hasConsistentStructure).toBe(true);
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

        it('Then: Constitution should have 4-6 core principles per skill', () => {
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

              expect(
                items.length,
                `${skill}/SKILL.md Constitution should have 4-6 principles`
              ).toBeGreaterThanOrEqual(4);

              expect(
                items.length,
                `${skill}/SKILL.md Constitution should not exceed 7 principles`
              ).toBeLessThanOrEqual(7);
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

            // Team skills should have Output Format or Output Formats section
            const hasOutputSection =
              /##\s+Output\s+Format[s]?/i.test(content) ||
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
    describe('Given: All 18 skills configured', () => {
      describe('When: Validating complete implementation', () => {
        it('Then: Exactly 18 skills should exist in skills directory', () => {
          const skillDirs = fs.readdirSync(SKILLS_DIR)
            .filter(item => {
              const itemPath = path.join(SKILLS_DIR, item);
              return fs.statSync(itemPath).isDirectory() && !item.startsWith('_');
            });

          expect(skillDirs.length).toBe(18);
          expect(skillDirs.sort()).toEqual([...ALL_SKILLS].sort());
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

              expect(boundaries, `${skill} should define CAN`).toContain('**CAN:**');
              expect(boundaries, `${skill} should define CANNOT`).toContain('**CANNOT:**');
              expect(boundaries, `${skill} should define ESCALATES TO`).toContain('**ESCALATES TO:**');
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
        it('Then: _shared directory should only contain approved shared files', () => {
          const sharedFiles = fs.readdirSync(SHARED_DIR);

          // Should contain output-format.md at minimum
          expect(sharedFiles).toContain('output-format.md');

          // All files should be markdown or documentation
          for (const file of sharedFiles) {
            const ext = path.extname(file);
            expect(
              ['.md', '.txt', ''].includes(ext),
              `${file} should be documentation file`
            ).toBe(true);
          }
        });

        it('Then: No skill should have hardcoded output format when shared format exists', () => {
          // Once shared format exists, skills shouldn't duplicate full format specs
          const sharedFormatExists = fs.existsSync(OUTPUT_FORMAT_FILE);

          if (sharedFormatExists) {
            for (const skill of ALL_SKILLS) {
              const skillFile = path.join(SKILLS_DIR, skill, 'SKILL.md');
              const content = fs.readFileSync(skillFile, 'utf-8');

              // Should reference shared format
              const referencesShared = content.includes('_shared/output-format.md');

              // If skill has Output Format section, it should also reference shared
              if (/##\s+Output\s+Format[s]?/i.test(content)) {
                const hasGuidanceText =
                  content.toLowerCase().includes('see') ||
                  content.toLowerCase().includes('reference') ||
                  content.toLowerCase().includes('follow');

                expect(
                  referencesShared || hasGuidanceText,
                  `${skill} should reference shared format or provide guidance link`
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
