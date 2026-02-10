# WS-INSTALL-1 Test Specifications

## Overview

Test specifications for `mg-util update` and `mg-util configure` commands following CAD protocol (Constraint-Driven Agentic Development).

**Test Ordering:** MISUSE → BOUNDARY → GOLDEN PATH

**Coverage Target:** 99% of functionality

## Acceptance Criteria Coverage

| AC | Description | Test File | Test Count |
|----|-------------|-----------|------------|
| AC-1 | `mg-util update` fetches latest, rebuilds, re-symlinks | mg-util-update.bats | 20 tests |
| AC-2 | `mg-util update --version X.Y.Z` installs specific version | mg-util-update.bats | 8 tests |
| AC-3 | `mg-util configure` interactive configuration | mg-util-configure.bats | 25 tests |
| AC-4 | `mg-util configure` writes to `~/.miniature-guacamole/config/mg.yaml` | mg-util-configure.bats | 18 tests |
| AC-5 | Migration tool converts `dist/` to `~/.miniature-guacamole/` | (separate workstream) | N/A |
| AC-6 | Update preserves project `.claude/memory/` | mg-util-update.bats | 5 tests |
| AC-7 | Update handles version conflicts gracefully | mg-util-update.bats | 3 tests |

## Test Files

### 1. mg-util-update.bats

**Total Tests:** 56 (16 misuse, 17 boundary, 23 golden path)

**Coverage Areas:**
- Version fetching (latest and specific versions)
- Download and rebuild process
- Symlink management
- Project memory preservation
- Version conflict handling
- Error conditions and edge cases

#### Misuse Cases (16 tests)

1. **Missing Dependencies**
   - Missing git dependency
   - Missing curl dependency
   - No internet connection

2. **Invalid Inputs**
   - Invalid version format
   - Nonexistent version specified
   - Too many arguments
   - Invalid source argument
   - Conflicting flags (--version with --source)

3. **System Errors**
   - Corrupted installation directory
   - Permission denied on installation directory
   - Disk full during download
   - Interrupted download (Ctrl+C simulation)
   - No existing installation

4. **Network/API Errors**
   - GitHub API rate limit exceeded
   - Repository moved or deleted

5. **Distribution Errors**
   - Build script missing from fetched version

#### Boundary Tests (17 tests)

1. **Version Edge Cases**
   - Update to same version (no-op)
   - Downgrade to older version
   - Version string with 'v' prefix
   - Version string without 'v' prefix
   - Pre-release versions (alpha/beta/rc)
   - Very long version strings

2. **Project States**
   - Empty project directory during update
   - Single project with memory preserved
   - Multiple projects tracked
   - Custom settings.json preservation

3. **Update Options**
   - --force flag bypasses version check
   - Local source path (--source)
   - Symbolic link handling
   - --dry-run shows what would change
   - --quiet suppresses output

#### Golden Path (23 tests)

1. **Core Functionality**
   - Fetch latest version
   - Install specific version
   - Rebuild distribution after fetch
   - Re-symlink after rebuild
   - Preserve project memory directory

2. **User Experience**
   - Success message shows version
   - --help shows usage
   - Exit code 0 on success
   - Progress indicator during download

3. **Safety & Reliability**
   - Creates backup before update
   - Rollback on failed update
   - Update MG_INSTALL.json in all projects
   - Handles version conflicts gracefully
   - Verify checksum after download
   - Atomic operation (no partial state on failure)

4. **Additional Features**
   - List available versions (informational)

### 2. mg-util-configure.bats

**Total Tests:** 59 (15 misuse, 17 boundary, 27 golden path)

**Coverage Areas:**
- Interactive configuration
- Non-interactive configuration (--set)
- YAML file management
- Configuration validation
- Backup and safety

#### Misuse Cases (15 tests)

1. **File System Errors**
   - No write permissions to config directory
   - Config directory is a file (not directory)
   - Disk full during write

2. **Invalid YAML**
   - Invalid YAML syntax in existing config
   - Corrupted config file (binary data)
   - Invalid YAML characters in value

3. **Invalid Inputs**
   - Invalid --set value (malformed key=value)
   - Invalid --set value (empty key)
   - Invalid --set value (empty value)
   - Unknown configuration key
   - Invalid model name
   - Invalid permission value (not allow/deny)
   - Too many arguments
   - Conflicting flags (--interactive with --set)
   - Nested key with invalid path

4. **Environment Errors**
   - stdin not available for interactive mode

#### Boundary Tests (17 tests)

1. **File Management**
   - Create config directory if missing
   - Empty config file (first time setup)
   - Preserve existing config values when setting new ones
   - Overwrite existing value
   - Backup created before modification
   - YAML formatting preserved (comments, whitespace)

2. **Value Edge Cases**
   - Very long configuration value
   - Configuration value with special characters
   - Handles Unicode in configuration values
   - Case-sensitive keys

3. **Advanced Features**
   - Nested configuration keys (3+ levels deep)
   - Multiple --set flags in single command
   - --reset restores defaults
   - --reset with --force skips confirmation

#### Golden Path (27 tests)

1. **Interactive Mode**
   - Interactive mode prompts for configuration
   - Interactive mode shows current values
   - Interactive mode validates input

2. **Configuration Management**
   - Set model preference (default)
   - Set model.fast preference
   - Set permission defaults (bash, write, read)
   - Creates valid YAML structure
   - Validate model names against known models

3. **Query Operations**
   - --list shows current configuration
   - --list with empty config shows defaults
   - --get retrieves specific value
   - --get nonexistent key shows error
   - --unset removes configuration key

4. **User Experience**
   - Config file location shown on success
   - --help shows usage and available keys
   - Success message confirms changes
   - Exit code 0 on success

5. **Safety & Quality**
   - Atomic write (no partial file on failure)
   - File permissions set correctly (0644)
   - Idempotent (setting same value twice)
   - Supports all documented config keys

## Configuration Schema

### mg.yaml Structure

```yaml
# Model preferences
model:
  default: claude-opus-4        # Primary model for standard tasks
  fast: claude-sonnet-3.5       # Fast model for quick operations

# Default permissions for new projects
permissions:
  bash: allow | deny            # Execute bash commands
  write: allow | deny           # Write files
  read: allow | deny            # Read files
  edit: allow | deny            # Edit files
  glob: allow | deny            # Search for files

# Advanced settings (optional)
advanced:
  nested:
    deep:
      value: string             # Support for nested configuration
```

### Supported Configuration Keys

| Key | Type | Values | Description |
|-----|------|--------|-------------|
| `model.default` | string | Model ID | Primary model for tasks |
| `model.fast` | string | Model ID | Fast model for quick ops |
| `permissions.bash` | enum | allow, deny | Bash execution default |
| `permissions.write` | enum | allow, deny | File write default |
| `permissions.read` | enum | allow, deny | File read default |
| `permissions.edit` | enum | allow, deny | File edit default |
| `permissions.glob` | enum | allow, deny | File search default |

### Valid Model IDs

- `claude-opus-4`
- `claude-opus-4-6`
- `claude-sonnet-4`
- `claude-sonnet-4-5`
- `claude-sonnet-3.5`
- `claude-haiku-3.5`

## Command Interface Specifications

### mg-util update

```bash
mg-util update [OPTIONS] [--version VERSION] [--source SOURCE]

Options:
  --version VERSION    Install specific version (e.g., v3.0.0, 3.0.0)
  --source SOURCE      Update from local path or URL (instead of GitHub)
  --force              Force update even if same version
  --dry-run            Show what would change without updating
  --quiet              Suppress output (exit code only)
  --help               Show help message

Examples:
  mg-util update                          # Fetch and install latest
  mg-util update --version v3.0.0         # Install specific version
  mg-util update --source /path/to/dist   # Update from local directory
  mg-util update --force                  # Force reinstall current version
  mg-util update --dry-run                # Preview changes
```

### mg-util configure

```bash
mg-util configure [OPTIONS] [--set KEY=VALUE] [--get KEY] [--unset KEY]

Options:
  --interactive        Interactive configuration wizard
  --set KEY=VALUE      Set configuration value
  --get KEY            Get configuration value
  --unset KEY          Remove configuration key
  --list               Show all configuration
  --reset              Reset to default configuration
  --force              Skip confirmation prompts
  --help               Show help message

Examples:
  mg-util configure --interactive                 # Interactive wizard
  mg-util configure --set model.default=claude-opus-4
  mg-util configure --set permissions.bash=allow
  mg-util configure --get model.default
  mg-util configure --list
  mg-util configure --unset model.fast
  mg-util configure --reset --force               # Reset without prompt
```

## Test Execution

### Prerequisites

```bash
brew install bats-core
```

### Run All Tests

```bash
cd /Users/brodieyazaki/work/agent-tools/miniature-guacamole/tests/scripts
bats mg-util-update.bats mg-util-configure.bats
```

### Run Individual Test Files

```bash
bats mg-util-update.bats
bats mg-util-configure.bats
```

### Run Specific Test

```bash
bats mg-util-update.bats --filter "fetch latest version"
bats mg-util-configure.bats --filter "set model preference"
```

### Verbose Output

```bash
bats -t mg-util-update.bats
```

## Expected Results

### Before Implementation

Most tests will be skipped with messages like:
- "TODO: Requires mock GitHub API"
- "TODO: Mock PATH to hide git binary"
- "TODO: Requires interactive input simulation"

### After Implementation

```
mg-util-update.bats
  MISUSE CASES:    16/16 passing (0 skipped)
  BOUNDARY TESTS:  17/17 passing (0 skipped)
  GOLDEN PATH:     23/23 passing (0 skipped)
  Total:           56/56 passing (100%)

mg-util-configure.bats
  MISUSE CASES:    15/15 passing (0 skipped)
  BOUNDARY TESTS:  17/17 passing (0 skipped)
  GOLDEN PATH:     27/27 passing (0 skipped)
  Total:           59/59 passing (100%)

Combined Total: 115/115 tests passing
Coverage:       99%+ of functionality
```

## Test Distribution Analysis

### mg-util-update.bats

- **Misuse:** 16 tests (29%) - Error handling, invalid inputs
- **Boundary:** 17 tests (30%) - Edge cases, unusual inputs
- **Golden:** 23 tests (41%) - Normal operations

**Ratio:** 29:30:41 ✓ CAD compliant (no single category >50%)

### mg-util-configure.bats

- **Misuse:** 15 tests (25%) - Error handling, invalid inputs
- **Boundary:** 17 tests (29%) - Edge cases, unusual inputs
- **Golden:** 27 tests (46%) - Normal operations

**Ratio:** 25:29:46 ✓ CAD compliant (no single category >50%)

## Implementation Dependencies

### Required Tools

- `bash` (4.0+)
- `git` (for fetching versions)
- `curl` (for downloading releases)
- `jq` (for JSON parsing)
- `python3` (optional, for YAML validation)
- `yq` (optional, for YAML manipulation)

### Required Directories

- `~/.miniature-guacamole/` - Installation home
- `~/.miniature-guacamole/install/` - Downloaded distributions
- `~/.miniature-guacamole/config/` - Configuration files
- `~/.miniature-guacamole/backups/` - Backup storage

### Required Files

- `~/.miniature-guacamole/install/VERSION.json` - Installed version metadata
- `~/.miniature-guacamole/config/mg.yaml` - User configuration

## Safety Requirements

### Backup Strategy

1. **Before Update:**
   - Backup current installation to `~/.miniature-guacamole/backups/YYYYMMDD-HHMMSS/`
   - Include VERSION.json, config files, and distribution

2. **Before Configure:**
   - Backup mg.yaml to `mg.yaml.backup.YYYYMMDD-HHMMSS`
   - Or use `.backups/` directory

### Rollback Capability

- Failed updates must restore from backup
- Atomic operations prevent partial state
- Clear error messages guide recovery

### Data Preservation

- Never modify `.claude/memory/` directories
- Preserve user customizations in settings.json
- Preserve user sections of CLAUDE.md

## Quality Gates

Before merging WS-INSTALL-1:

- [ ] All 115 unit tests passing (0 skipped)
- [ ] Coverage >= 99% (measured by test count across misuse/boundary/golden)
- [ ] All acceptance criteria covered
- [ ] --help output matches specification
- [ ] Error messages are clear and actionable
- [ ] Exit codes correct (0=success, 1=error)
- [ ] Backup/rollback tested manually
- [ ] Integration with existing install.sh verified
- [ ] Documentation updated (README, INSTALL-README.md)

## Integration Notes

### Relationship to Existing Commands

- `mg-util update` replaces manual download + install.sh workflow
- `mg-util configure` sets defaults used by `mg-init` and project creation
- Both commands work with `~/.miniature-guacamole/` not `~/.claude/`

### Project-Local vs Global

- **Global:** `~/.miniature-guacamole/` - Framework installation cache
- **Project-Local:** `.claude/` - Per-project framework files
- `mg-util update` updates global cache
- Projects re-symlink to updated global cache

### Migration Workflow (AC-5, separate workstream)

1. Run migration tool to convert `dist/` layout
2. Use `mg-util update` to manage versions going forward
3. Use `mg-util configure` to set preferences
4. Projects continue using `.claude/` locally

## Next Steps

1. **Dev Team:** Implement `mg-util` script with `update` and `configure` subcommands
2. **QA:** Run BATS tests to verify implementation
3. **Iteration:** Fix failing tests, improve error handling
4. **Integration:** Test with existing install.sh and mg-init
5. **Documentation:** Update user-facing docs with new commands
6. **Migration:** Create separate workstream for AC-5 (migration tool)

## Files Created

- `/tests/scripts/mg-util-update.bats` - 56 tests (340 lines)
- `/tests/scripts/mg-util-configure.bats` - 59 tests (420 lines)
- `/tests/WS-INSTALL-1-TEST-SPECS.md` - This specification document

**Total:** 115 tests, 760+ lines of test code
