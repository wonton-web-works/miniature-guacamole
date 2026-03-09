# WS-ENT-1: Enterprise Directory Scaffold + Dual Build
## Test Specifications (Red Phase)

**Workstream**: WS-ENT-1
**Status**: RED (Tests written, implementation pending)
**QA Agent**: qa
**Date**: 2026-02-15
**Test Approach**: BATS tests for build scripts + verification script for infrastructure

---

## Test Strategy

This is an infrastructure/scaffold workstream creating the enterprise directory structure and dual build system. We're testing build outcomes and configuration validity rather than runtime behavior.

### Test Tools
- **BATS** for build script testing (build-enterprise.sh, modified build.sh)
- **Verification script** for infrastructure validation (verify-ws-ent-1.sh)
- **Vitest** for TypeScript configuration and import tests

### Test Distribution (CAD Ordering)
- **Misuse cases**: 18 tests (27%) - Build failures, invalid configs, circular imports
- **Boundary cases**: 16 tests (24%) - Empty directories, minimal configs, edge cases
- **Golden path**: 33 tests (49%) - Normal operations, successful builds

**Total**: 67 tests across 4 test files

---

## Acceptance Criteria Mapping

| AC | Description | Test Coverage |
|----|-------------|---------------|
| AC-ENT-1.1 | enterprise/ directory created with proper structure | 12 tests (verify script) |
| AC-ENT-1.2 | build-enterprise.sh produces distribution including enterprise/ | 18 tests (BATS) |
| AC-ENT-1.3 | build.sh (OSS) excludes enterprise/ completely | 10 tests (BATS) |
| AC-ENT-1.4 | Enterprise package.json has separate dependencies | 8 tests (vitest + verify) |
| AC-ENT-1.5 | Enterprise tsconfig extends root, compiles successfully | 11 tests (vitest + verify) |
| AC-ENT-1.6 | Enterprise index.ts can import from root src/memory/adapters/ | 8 tests (vitest) |

---

## Test File 1: build-enterprise.bats

**File**: `tests/scripts/build-enterprise.bats`
**Purpose**: Test build-enterprise.sh script behavior
**Tests**: 28 total (9 misuse, 8 boundary, 11 golden)

### MISUSE CASES (9 tests)

1. **build-enterprise.sh: enterprise/ directory doesn't exist**
   - Given: No enterprise/ directory
   - When: build-enterprise.sh is executed
   - Then: Exit 1, error message "enterprise/ not found"

2. **build-enterprise.sh: enterprise/package.json is missing**
   - Given: enterprise/ exists but package.json missing
   - When: Script runs
   - Then: Exit 1, error about missing package.json

3. **build-enterprise.sh: enterprise/package.json has invalid JSON**
   - Given: package.json with syntax errors
   - When: Script runs
   - Then: Exit 1, JSON parse error

4. **build-enterprise.sh: enterprise/tsconfig.json is missing**
   - Given: No tsconfig.json in enterprise/
   - When: Script runs
   - Then: Exit 1, error about missing tsconfig

5. **build-enterprise.sh: enterprise/tsconfig.json has invalid extends path**
   - Given: tsconfig.json with "extends": "./nonexistent.json"
   - When: Script runs
   - Then: Exit 1, TypeScript config error

6. **build-enterprise.sh: enterprise/src/ directory doesn't exist**
   - Given: No src/ subdirectory
   - When: Script runs
   - Then: Exit 1, error about missing src/

7. **build-enterprise.sh: TypeScript compilation fails**
   - Given: enterprise/src/index.ts with syntax errors
   - When: Script runs
   - Then: Exit 1, TypeScript compilation error

8. **build-enterprise.sh: dist/ directory is read-only**
   - Given: dist/ with chmod 444
   - When: Script runs
   - Then: Exit 1, permission denied error

9. **build-enterprise.sh: executed from wrong directory**
   - Given: Script run from subdirectory
   - When: Script runs without proper $ROOT_DIR
   - Then: Exit 1, directory navigation error

### BOUNDARY TESTS (8 tests)

10. **build-enterprise.sh: enterprise/src/ is empty**
    - Given: enterprise/src/ with no .ts files
    - When: Script runs
    - Then: Exit 0, builds successfully (valid case)

11. **build-enterprise.sh: enterprise/package.json with minimal fields**
    - Given: package.json with only {name, version}
    - When: Script runs
    - Then: Exit 0, builds successfully

12. **build-enterprise.sh: enterprise has no subdirectories yet**
    - Given: No storage/, isolation/, connectors/ subdirectories
    - When: Script runs
    - Then: Exit 0, builds successfully

13. **build-enterprise.sh: dist/ directory already exists**
    - Given: Previous build artifacts in dist/
    - When: Script runs
    - Then: Exit 0, cleans and rebuilds successfully

14. **build-enterprise.sh: enterprise/src/index.ts is empty file**
    - Given: index.ts with 0 bytes
    - When: Script runs
    - Then: Exit 0, compiles successfully

15. **build-enterprise.sh: very large enterprise/ directory (1000+ files)**
    - Given: Large number of .ts files
    - When: Script runs
    - Then: Exit 0, completes within reasonable time (<60s)

16. **build-enterprise.sh: enterprise/ has node_modules/ subdirectory**
    - Given: enterprise/node_modules/ exists
    - When: Script runs
    - Then: Exit 0, excludes node_modules from build

17. **build-enterprise.sh: parallel build.sh execution**
    - Given: build.sh and build-enterprise.sh run simultaneously
    - When: Both scripts execute
    - Then: Both complete without conflicts (separate dist paths)

### GOLDEN PATH (11 tests)

18. **build-enterprise.sh: successful build with complete structure**
    - Given: Full enterprise/ directory structure
    - When: Script runs
    - Then: Exit 0, creates dist/miniature-guacamole-enterprise/

19. **build-enterprise.sh: dist output includes all enterprise files**
    - Given: Complete enterprise/ structure
    - When: Script runs
    - Then: dist/ contains enterprise/src/, enterprise/package.json, enterprise/tsconfig.json

20. **build-enterprise.sh: dist output includes OSS framework files**
    - Given: Normal project structure
    - When: Script runs
    - Then: dist/ contains .claude/ with agents, skills, etc.

21. **build-enterprise.sh: creates tarball archive**
    - Given: Successful build
    - When: Script completes
    - Then: dist/miniature-guacamole-enterprise.tar.gz exists

22. **build-enterprise.sh: creates zip archive**
    - Given: Successful build
    - When: Script completes
    - Then: dist/miniature-guacamole-enterprise.zip exists

23. **build-enterprise.sh: VERSION.json includes enterprise flag**
    - Given: Successful build
    - When: Script completes
    - Then: dist/VERSION.json has "enterprise": true

24. **build-enterprise.sh: preserves executable permissions**
    - Given: Scripts in enterprise/
    - When: Script runs
    - Then: dist/ scripts maintain +x permissions

25. **build-enterprise.sh: TypeScript compilation produces .d.ts files**
    - Given: enterprise/src/ with TypeScript files
    - When: Script runs
    - Then: dist/ contains .d.ts declaration files

26. **build-enterprise.sh: output size is reasonable**
    - Given: Standard enterprise/ structure
    - When: Script runs
    - Then: Archive size < 10MB (sanity check)

27. **build-enterprise.sh: script displays progress output**
    - Given: Script execution
    - When: Running
    - Then: Output shows "Building enterprise edition..."

28. **build-enterprise.sh: script reports build statistics**
    - Given: Successful build
    - When: Script completes
    - Then: Output shows file counts, archive sizes

---

## Test File 2: build-oss-isolation.bats

**File**: `tests/scripts/build-oss-isolation.bats`
**Purpose**: Test build.sh EXCLUDES enterprise/ completely
**Tests**: 10 total (4 misuse, 2 boundary, 4 golden)

### MISUSE CASES (4 tests)

29. **build.sh: accidentally includes enterprise/ files in output**
    - Given: enterprise/ exists in src/
    - When: build.sh runs
    - Then: dist/miniature-guacamole/ MUST NOT contain enterprise/ or any .ts from it

30. **build.sh: accidentally references enterprise/ in archives**
    - Given: enterprise/ exists
    - When: build.sh creates archives
    - Then: Archive contents MUST NOT include enterprise/

31. **build.sh: includes enterprise imports in bundled code**
    - Given: enterprise/ exists
    - When: build.sh runs
    - Then: No references to "enterprise/" in dist/ .js files

32. **build.sh: fails if enterprise/ directory causes conflicts**
    - Given: enterprise/ with conflicting file names
    - When: build.sh runs
    - Then: Exit 0, no errors (enterprise is ignored)

### BOUNDARY TESTS (2 tests)

33. **build.sh: enterprise/ directory exists but is empty**
    - Given: empty enterprise/ directory
    - When: build.sh runs
    - Then: Exit 0, builds successfully, no enterprise/ in dist/

34. **build.sh: enterprise/ has large files**
    - Given: enterprise/ with 100MB+ of test data
    - When: build.sh runs
    - Then: Exit 0, archive size unaffected (OSS only)

### GOLDEN PATH (4 tests)

35. **build.sh: OSS build succeeds when enterprise/ exists**
    - Given: Full enterprise/ directory structure
    - When: build.sh runs
    - Then: Exit 0, creates dist/miniature-guacamole/ (OSS only)

36. **build.sh: OSS dist does not contain enterprise/**
    - Given: enterprise/ exists
    - When: build.sh completes
    - Then: `find dist/miniature-guacamole -name enterprise` returns empty

37. **build.sh: OSS archives do not contain enterprise/**
    - Given: build.sh completes
    - When: Extract archives
    - Then: No enterprise/ directory in extracted contents

38. **build.sh: VERSION.json does not have enterprise flag**
    - Given: build.sh completes
    - When: Check dist/VERSION.json
    - Then: No "enterprise": true field (only in enterprise build)

---

## Test File 3: enterprise-config.test.ts

**File**: `tests/unit/enterprise/config.test.ts`
**Purpose**: Test enterprise configuration validity
**Tests**: 19 total (3 misuse, 4 boundary, 12 golden)

### MISUSE CASES (3 tests)

39. **enterprise/package.json: invalid JSON syntax**
    - Given: package.json with trailing commas, missing quotes
    - When: JSON.parse(packageJson)
    - Then: Throws SyntaxError

40. **enterprise/package.json: missing required fields**
    - Given: package.json without "name" or "version"
    - When: Validation runs
    - Then: Throws validation error

41. **enterprise/tsconfig.json: circular extends**
    - Given: tsconfig extends itself or creates loop
    - When: TypeScript compiler loads config
    - Then: Throws error about circular reference

### BOUNDARY TESTS (4 tests)

42. **enterprise/package.json: empty dependencies object**
    - Given: "dependencies": {}
    - When: npm install runs
    - Then: Succeeds (valid)

43. **enterprise/package.json: no devDependencies field**
    - Given: package.json without devDependencies
    - When: Parsed
    - Then: Valid (field is optional)

44. **enterprise/tsconfig.json: minimal configuration**
    - Given: Only {"extends": "../tsconfig.json"}
    - When: TypeScript compiler loads
    - Then: Successfully inherits root config

45. **enterprise/tsconfig.json: override rootDir**
    - Given: tsconfig with "rootDir": "./src"
    - When: Compiled
    - Then: Correctly uses enterprise/src/ as root

### GOLDEN PATH (12 tests)

46. **enterprise/package.json: well-formed JSON**
    - Given: Valid package.json
    - When: Parsed
    - Then: All fields accessible

47. **enterprise/package.json: has unique name**
    - Given: "name": "@mg/enterprise"
    - When: Read
    - Then: Name differs from root package name

48. **enterprise/package.json: version matches root**
    - Given: Both packages at same version
    - When: Compared
    - Then: Versions are consistent

49. **enterprise/tsconfig.json: extends root tsconfig**
    - Given: "extends": "../tsconfig.json"
    - When: Loaded by TypeScript
    - Then: Inherits all root settings

50. **enterprise/tsconfig.json: sets correct outDir**
    - Given: "outDir": "./dist"
    - When: Compiled
    - Then: Output goes to enterprise/dist/

51. **enterprise/tsconfig.json: includes enterprise/src/**

    - Given: "include": ["src/**/*"]
    - When: Compiled
    - Then: All .ts files in src/ are compiled

52. **enterprise/tsconfig.json: excludes node_modules**
    - Given: "exclude": ["node_modules"]
    - When: Compiled
    - Then: Dependencies not type-checked

53. **enterprise/package.json: separate node_modules after install**
    - Given: npm install in enterprise/
    - When: Install completes
    - Then: enterprise/node_modules/ exists separately

54. **enterprise directory structure: all subdirectories exist**
    - Given: Full scaffold
    - When: Checked
    - Then: src/storage/, src/isolation/, src/connectors/ all present

55. **enterprise/tests/unit: directory exists**
    - Given: Full scaffold
    - When: Checked
    - Then: tests/unit/ directory present

56. **enterprise/.gitignore: excludes node_modules and dist**
    - Given: .gitignore in enterprise/
    - When: Checked
    - Then: Contains node_modules, dist, coverage

57. **enterprise/README.md: exists with description**
    - Given: Full scaffold
    - When: Read
    - Then: Contains description of enterprise features

---

## Test File 4: enterprise-imports.test.ts

**File**: `tests/integration/enterprise/imports.test.ts`
**Purpose**: Test enterprise can import from root src/
**Tests**: 10 total (2 misuse, 2 boundary, 6 golden)

### MISUSE CASES (2 tests)

58. **enterprise imports: circular import with root**
    - Given: enterprise imports root, root imports enterprise
    - When: Compilation runs
    - Then: Error about circular dependency

59. **enterprise imports: nonexistent root module**
    - Given: import from '@/memory/nonexistent'
    - When: Compilation runs
    - Then: Module not found error

### BOUNDARY TESTS (2 tests)

60. **enterprise imports: deep nested root path**
    - Given: import from '@/memory/adapters/storage/types'
    - When: Import resolves
    - Then: Successful (TypeScript paths work)

61. **enterprise imports: relative import from enterprise/src/**
    - Given: import from '../storage/adapter'
    - When: Resolve
    - Then: Stays within enterprise/ (correct)

### GOLDEN PATH (6 tests)

62. **enterprise imports: StorageAdapter from root**
    - Given: import { StorageAdapter } from '@/memory/adapters/storage'
    - When: Compiled and run
    - Then: Type available and importable

63. **enterprise imports: root memory types**
    - Given: import { ProjectMemory } from '@/memory/types'
    - When: Compiled
    - Then: Types available

64. **enterprise exports: can be imported by root (if enabled)**
    - Given: Root imports enterprise feature (future)
    - When: Import resolves
    - Then: Module available (validates bidirectional capability)

65. **enterprise src/index.ts: compiles successfully**
    - Given: index.ts with StorageAdapter import
    - When: tsc runs
    - Then: No compilation errors

66. **enterprise src/storage: can extend root StorageAdapter**
    - Given: class EnterpriseStorage extends StorageAdapter
    - When: Compiled
    - Then: Type checking passes

67. **enterprise TypeScript: rootDir resolution works**
    - Given: enterprise/tsconfig.json baseUrl and paths
    - When: Compiler resolves imports
    - Then: @ alias maps to root src/

---

## Verification Script: verify-ws-ent-1.sh

**File**: `tests/verify-ws-ent-1.sh`
**Purpose**: End-to-end infrastructure validation
**Tests**: 35+ checks across all acceptance criteria

### Structure Checks (12 checks)
1. enterprise/ directory exists
2. enterprise/src/ directory exists
3. enterprise/src/index.ts file exists
4. enterprise/src/storage/ directory exists (empty OK)
5. enterprise/src/isolation/ directory exists (empty OK)
6. enterprise/src/connectors/ directory exists (empty OK)
7. enterprise/tests/unit/ directory exists
8. enterprise/package.json file exists
9. enterprise/tsconfig.json file exists
10. enterprise/README.md file exists
11. enterprise/.gitignore file exists
12. All directories have correct permissions (755)

### Configuration Validation (11 checks)
13. enterprise/package.json is valid JSON
14. enterprise/package.json has "name" field
15. enterprise/package.json has "version" field
16. enterprise/package.json "name" differs from root
17. enterprise/tsconfig.json is valid JSON
18. enterprise/tsconfig.json has "extends" field
19. enterprise/tsconfig.json extends "../tsconfig.json"
20. enterprise/tsconfig.json has "compilerOptions.outDir"
21. enterprise/tsconfig.json has "include" array
22. enterprise/.gitignore contains "node_modules"
23. enterprise/.gitignore contains "dist"

### Build Script Validation (6 checks)
24. build-enterprise.sh file exists
25. build-enterprise.sh is executable
26. build-enterprise.sh runs successfully
27. build-enterprise.sh creates dist/miniature-guacamole-enterprise/
28. build-enterprise.sh output includes enterprise/ directory
29. build-enterprise.sh creates VERSION.json with "enterprise": true

### OSS Build Isolation (4 checks)
30. build.sh runs successfully when enterprise/ exists
31. build.sh output does NOT contain enterprise/ directory
32. grep dist/miniature-guacamole for "enterprise" returns no matches
33. OSS VERSION.json does NOT have "enterprise" field

### Regression Tests (2 checks)
34. Run tests/verify-ws-init-3.sh (infrastructure framework tests)
35. All existing build tests pass

---

## Expected Test Results (Red Phase)

All 67 tests should FAIL initially because:

1. **enterprise/ directory doesn't exist** → 12 structure tests fail
2. **build-enterprise.sh doesn't exist** → 28 build tests fail
3. **enterprise configs don't exist** → 19 config tests fail
4. **enterprise imports don't work** → 10 import tests fail
5. **build.sh not modified** → Tests pass (OSS build unaware of enterprise)

### Files to Create (Test Suite)

1. `tests/scripts/build-enterprise.bats` - 28 tests
2. `tests/scripts/build-oss-isolation.bats` - 10 tests
3. `tests/unit/enterprise/config.test.ts` - 19 tests
4. `tests/integration/enterprise/imports.test.ts` - 10 tests
5. `tests/verify-ws-ent-1.sh` - 35+ checks
6. `tests/WS-ENT-1-TEST-SPECS.md` - This document

### Documentation

- Test specs include Given/When/Then for all tests
- CAD ordering enforced (misuse → boundary → golden)
- Coverage target: 99%+ of scaffold/config validation
- All acceptance criteria mapped to specific tests

---

## Running Tests (After Implementation)

```bash
# Run BATS tests
bats tests/scripts/build-enterprise.bats
bats tests/scripts/build-oss-isolation.bats

# Run TypeScript tests
npm test tests/unit/enterprise/
npm test tests/integration/enterprise/

# Run verification script
./tests/verify-ws-ent-1.sh

# Coverage check
npm run test:coverage -- tests/unit/enterprise/ tests/integration/enterprise/
```

---

## Success Criteria

**QA PASS** when:
1. All 67 tests pass (100%)
2. Verification script passes all 35+ checks
3. Coverage >= 99% on configuration validation code
4. No regressions (WS-INIT-3 tests still pass)
5. Both builds (OSS and Enterprise) succeed independently
6. OSS build correctly excludes enterprise/ content

**Gate Classification**: ARCHITECTURAL (R5 - new subdirectory)
**Required Approval**: Gate 4B (staff-engineer)

---

**QA Agent**: qa
**Status**: Test specs complete, ready for dev implementation
**Next**: Dev agent implements infrastructure to pass tests
