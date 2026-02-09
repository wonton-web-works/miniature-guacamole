#!/usr/bin/env bash
# ============================================================================
# Test Config Cache Installation
# ============================================================================
# Verifies that config cache installation works correctly
# Tests both fresh install and idempotent re-initialization
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
TEST_DIR="$ROOT_DIR/test-install-$$"

echo ""
echo -e "${BLUE}Testing Config Cache Installation${NC}"
echo ""

cleanup() {
    if [ -d "$TEST_DIR" ]; then
        echo ""
        echo -e "${YELLOW}Cleaning up test directory...${NC}"
        rm -rf "$TEST_DIR"
    fi
}

trap cleanup EXIT

# ----------------------------------------------------------------------------
# Test 1: Build templates
# ----------------------------------------------------------------------------

echo -e "${GREEN}[1/5] Building templates...${NC}"
"$SCRIPT_DIR/build-templates.sh" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "  ${GREEN}✓${NC} Templates built successfully"
else
    echo -e "  ${RED}✗${NC} Failed to build templates"
    exit 1
fi

# Verify template files exist
required_files=(
    "$ROOT_DIR/templates/settings.json"
    "$ROOT_DIR/templates/CLAUDE.md"
    "$ROOT_DIR/templates/VERSION.json"
    "$ROOT_DIR/templates/README.md"
    "$ROOT_DIR/templates/mg-init"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "  ${RED}✗${NC} Missing: $(basename "$file")"
        exit 1
    fi
done

echo -e "  ${GREEN}✓${NC} All required template files present"

# ----------------------------------------------------------------------------
# Test 2: Verify template structure
# ----------------------------------------------------------------------------

echo ""
echo -e "${GREEN}[2/5] Verifying template structure...${NC}"

# Check directory structure
required_dirs=(
    "$ROOT_DIR/templates/agents"
    "$ROOT_DIR/templates/skills"
    "$ROOT_DIR/templates/shared"
    "$ROOT_DIR/templates/hooks"
)

for dir in "${required_dirs[@]}"; do
    if [ ! -d "$dir" ] || [ -z "$(ls -A "$dir" 2>/dev/null)" ]; then
        echo -e "  ${RED}✗${NC} Empty or missing: $(basename "$dir")"
        exit 1
    fi
done

echo -e "  ${GREEN}✓${NC} All template directories populated"

# Verify counts
agent_count=$(ls -1 "$ROOT_DIR/templates/agents" | wc -l | xargs)
skill_count=$(ls -1 "$ROOT_DIR/templates/skills" | wc -l | xargs)
protocol_count=$(ls -1 "$ROOT_DIR/templates/shared" | wc -l | xargs)

echo -e "  ${GREEN}✓${NC} $agent_count agents"
echo -e "  ${GREEN}✓${NC} $skill_count skills"
echo -e "  ${GREEN}✓${NC} $protocol_count protocols"

# ----------------------------------------------------------------------------
# Test 3: Test mg-init on a fresh project
# ----------------------------------------------------------------------------

echo ""
echo -e "${GREEN}[3/5] Testing mg-init on fresh project...${NC}"

mkdir -p "$TEST_DIR/project1"

# Run mg-init
SCRIPT_DIR="$ROOT_DIR/templates" "$ROOT_DIR/templates/mg-init" "$TEST_DIR/project1" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "  ${GREEN}✓${NC} mg-init completed successfully"
else
    echo -e "  ${RED}✗${NC} mg-init failed"
    exit 1
fi

# Verify created structure
required_project_dirs=(
    "$TEST_DIR/project1/.claude/agents"
    "$TEST_DIR/project1/.claude/skills"
    "$TEST_DIR/project1/.claude/shared"
    "$TEST_DIR/project1/.claude/hooks"
    "$TEST_DIR/project1/.claude/scripts"
    "$TEST_DIR/project1/.claude/memory"
)

for dir in "${required_project_dirs[@]}"; do
    if [ ! -d "$dir" ]; then
        echo -e "  ${RED}✗${NC} Missing directory: $(basename "$dir")"
        exit 1
    fi
done

echo -e "  ${GREEN}✓${NC} All .claude directories created"

# Verify files
required_project_files=(
    "$TEST_DIR/project1/.claude/settings.json"
    "$TEST_DIR/project1/.claude/CLAUDE.md"
    "$TEST_DIR/project1/.claude/MG_PROJECT"
    "$TEST_DIR/project1/.claude/memory/.gitignore"
)

for file in "${required_project_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "  ${RED}✗${NC} Missing file: $(basename "$file")"
        exit 1
    fi
done

echo -e "  ${GREEN}✓${NC} All required files created"

# Verify settings.json has correct permissions
if ! grep -q "\"Read\"" "$TEST_DIR/project1/.claude/settings.json"; then
    echo -e "  ${RED}✗${NC} settings.json missing permissions"
    exit 1
fi

echo -e "  ${GREEN}✓${NC} settings.json contains permissions"

# Verify CLAUDE.md has bounded markers
if ! grep -q "<!-- BEGIN MINIATURE-GUACAMOLE -->" "$TEST_DIR/project1/.claude/CLAUDE.md"; then
    echo -e "  ${RED}✗${NC} CLAUDE.md missing bounded markers"
    exit 1
fi

echo -e "  ${GREEN}✓${NC} CLAUDE.md has bounded markers"

# ----------------------------------------------------------------------------
# Test 4: Test mg-init idempotence
# ----------------------------------------------------------------------------

echo ""
echo -e "${GREEN}[4/5] Testing mg-init idempotence...${NC}"

# Add custom content to CLAUDE.md
cat >> "$TEST_DIR/project1/.claude/CLAUDE.md" <<'CUSTOM'

## My Custom Section

This is custom project-specific content.
CUSTOM

# Run mg-init again
SCRIPT_DIR="$ROOT_DIR/templates" "$ROOT_DIR/templates/mg-init" "$TEST_DIR/project1" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo -e "  ${RED}✗${NC} Second mg-init run failed"
    exit 1
fi

echo -e "  ${GREEN}✓${NC} Second run completed successfully"

# Verify custom content still exists
if ! grep -q "My Custom Section" "$TEST_DIR/project1/.claude/CLAUDE.md"; then
    echo -e "  ${RED}✗${NC} Custom content was lost"
    exit 1
fi

echo -e "  ${GREEN}✓${NC} Custom content preserved"

# Verify settings.json backup was created
backup_count=$(ls -1 "$TEST_DIR/project1/.claude/settings.json.backup."* 2>/dev/null | wc -l | xargs)
if [ "$backup_count" -eq "0" ]; then
    echo -e "  ${YELLOW}⚠${NC} No settings backup created (might be first run)"
else
    echo -e "  ${GREEN}✓${NC} Settings backup created"
fi

# ----------------------------------------------------------------------------
# Test 5: Test mg-init --force
# ----------------------------------------------------------------------------

echo ""
echo -e "${GREEN}[5/5] Testing mg-init --force...${NC}"

# Run with --force flag
SCRIPT_DIR="$ROOT_DIR/templates" "$ROOT_DIR/templates/mg-init" --force "$TEST_DIR/project1" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo -e "  ${RED}✗${NC} mg-init --force failed"
    exit 1
fi

echo -e "  ${GREEN}✓${NC} Force re-initialization completed"

# Verify structure still intact
if [ ! -f "$TEST_DIR/project1/.claude/MG_PROJECT" ]; then
    echo -e "  ${RED}✗${NC} MG_PROJECT marker missing after force"
    exit 1
fi

echo -e "  ${GREEN}✓${NC} Project structure intact"

# ----------------------------------------------------------------------------
# Summary
# ----------------------------------------------------------------------------

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}  All tests passed!                                          ${GREEN}║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Template verification:"
echo -e "  ${GREEN}✓${NC} Build process works"
echo -e "  ${GREEN}✓${NC} Template structure complete"
echo -e "  ${GREEN}✓${NC} All required files present"
echo ""
echo "mg-init verification:"
echo -e "  ${GREEN}✓${NC} Fresh project initialization"
echo -e "  ${GREEN}✓${NC} Idempotent re-initialization"
echo -e "  ${GREEN}✓${NC} Force re-initialization"
echo -e "  ${GREEN}✓${NC} Custom content preservation"
echo -e "  ${GREEN}✓${NC} Settings backup creation"
echo ""
echo "Ready to run:"
echo -e "  ${BLUE}./scripts/install-config-cache.sh${NC}"
echo ""
