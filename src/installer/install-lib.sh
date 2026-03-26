#!/usr/bin/env bash
# ============================================================================
# miniature-guacamole install library (install-lib.sh)
# ============================================================================
# Sourceable library — no exit statements, no file-scope set -e, no top-level
# output. Source this file, then call mg_install_framework with flags.
#
# Public API:
#   mg_install_framework [OPTIONS]
#
# Options:
#   --target <dir>          Required. Project directory (.claude/ appended by function)
#   --source <path>         Optional. MG dist path. Defaults to dir of install-lib.sh
#   --force                 Re-install over existing
#   --standalone            Copy even with global install
#   --quiet                 Suppress banner and summary output
#   --skip-settings-merge   Skip settings.json creation/merge entirely
#   --skip-claude-md        Skip CLAUDE.md creation/update entirely
#
# Return codes:
#   0  success
#   1  bad args / target does not exist
#   2  missing source dir
#   3  already installed (without --force)
# ============================================================================

mg_install_framework() {
    # ── Parse arguments ────────────────────────────────────────────────────
    local TARGET_DIR=""
    local SOURCE_DIR=""
    local FORCE=false
    local STANDALONE=false
    local QUIET=false
    local SKIP_SETTINGS_MERGE=false
    local SKIP_CLAUDE_MD=false

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --target)
                TARGET_DIR="$2"
                shift 2
                ;;
            --source)
                SOURCE_DIR="$2"
                shift 2
                ;;
            --force)
                FORCE=true
                shift
                ;;
            --standalone)
                STANDALONE=true
                shift
                ;;
            --quiet)
                QUIET=true
                shift
                ;;
            --skip-settings-merge)
                SKIP_SETTINGS_MERGE=true
                shift
                ;;
            --skip-claude-md)
                SKIP_CLAUDE_MD=true
                shift
                ;;
            *)
                _mg_log_error "Unknown option: $1"
                return 1
                ;;
        esac
    done

    # ── Validate --target ──────────────────────────────────────────────────
    if [[ -z "$TARGET_DIR" ]]; then
        _mg_log_error "--target is required"
        return 1
    fi

    if [[ ! -d "$TARGET_DIR" ]]; then
        _mg_log_error "Project directory does not exist: $TARGET_DIR"
        return 1
    fi

    TARGET_DIR="$(cd "$TARGET_DIR" && pwd)"

    # ── Resolve --source default ───────────────────────────────────────────
    # BASH_SOURCE[0] is the file where this function is defined (install-lib.sh),
    # regardless of what script sourced it.
    if [[ -z "$SOURCE_DIR" ]]; then
        SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    fi

    local CLAUDE_SOURCE_DIR="$SOURCE_DIR/.claude"

    if [[ ! -d "$CLAUDE_SOURCE_DIR" ]]; then
        _mg_log_error "Source .claude directory not found at: $CLAUDE_SOURCE_DIR"
        return 2
    fi

    # ── Derived paths ──────────────────────────────────────────────────────
    local CLAUDE_TARGET_DIR="$TARGET_DIR/.claude"
    local MG_INSTALL_JSON="$CLAUDE_TARGET_DIR/MG_INSTALL.json"
    local MG_PROJECT_MARKER="$CLAUDE_TARGET_DIR/MG_PROJECT"

    # ── Detect global install ──────────────────────────────────────────────
    local GLOBAL_INSTALL=false
    if [[ -d "$HOME/.claude/agents" ]] && [[ -d "$HOME/.claude/skills" ]] && [[ -d "$HOME/.claude/shared" ]]; then
        GLOBAL_INSTALL=true
    fi

    # ── Already installed check ────────────────────────────────────────────
    if [[ -f "$MG_INSTALL_JSON" ]] && [[ "$FORCE" != "true" ]]; then
        _mg_log_warning "Project already has miniature-guacamole installed (MG_INSTALL.json exists)"
        [[ "$QUIET" != "true" ]] && echo "Use --force to re-install"
        return 3
    fi

    # ── Banner ─────────────────────────────────────────────────────────────
    if [[ "$QUIET" != "true" ]]; then
        local RED='\033[0;31m'
        local GREEN='\033[0;32m'
        local BLUE='\033[0;34m'
        local NC='\033[0m'
        echo ""
        echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${BLUE}║${NC}  ${GREEN}miniature-guacamole${NC} - Project-Local Installer            ${BLUE}║${NC}"
        echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        _mg_log_info "Installation target: $TARGET_DIR"
    fi

    # ── Clean existing MG-managed directories ─────────────────────────────
    if [[ "$FORCE" == "true" ]] || [[ ! -f "$MG_INSTALL_JSON" ]]; then
        if [[ -d "$CLAUDE_TARGET_DIR" ]]; then
            [[ "$QUIET" != "true" ]] && echo "" && _mg_log_info "Cleaning existing framework directories..."

            local DEPRECATED_SKILLS=(
                "implement" "engineering-team" "code-review" "init-project"
                "launch-metrics" "incident-response" "deployment" "documentation"
                "marketing-content" "user-research" "design" "leadership-team"
                "help" "version"
            )

            shopt -s dotglob

            local DIRS_TO_CLEAN
            if [[ "$GLOBAL_INSTALL" == "true" ]] && [[ "$STANDALONE" != "true" ]]; then
                DIRS_TO_CLEAN="scripts hooks schemas"
            else
                DIRS_TO_CLEAN="agents skills shared scripts hooks schemas"
            fi

            local dir
            for dir in $DIRS_TO_CLEAN; do
                if [[ -d "$CLAUDE_TARGET_DIR/$dir" ]]; then
                    local known_items=""
                    if [[ -d "$CLAUDE_SOURCE_DIR/$dir" ]]; then
                        local item
                        for item in "$CLAUDE_SOURCE_DIR/$dir"/*; do
                            if [[ -e "$item" ]]; then
                                local item_name
                                item_name=$(basename "$item")
                                known_items="$known_items|$item_name|"
                            fi
                        done
                    fi

                    local target_item
                    for target_item in "$CLAUDE_TARGET_DIR/$dir"/*; do
                        if [[ -e "$target_item" ]]; then
                            local item_name
                            item_name=$(basename "$target_item")

                            if [[ -d "$target_item" && "$item_name" == .* ]]; then
                                continue
                            fi

                            if [[ "$known_items" == *"|$item_name|"* ]]; then
                                if rm -rf "$target_item" 2>/dev/null; then
                                    _mg_log_success "Cleaned $dir/$item_name"
                                else
                                    _mg_log_error "Failed to clean $dir/$item_name (permission denied)"
                                    shopt -u dotglob
                                    return 1
                                fi
                                continue
                            fi

                            if [[ "$dir" == "skills" ]]; then
                                local is_deprecated=0
                                local deprecated_skill
                                for deprecated_skill in "${DEPRECATED_SKILLS[@]}"; do
                                    if [[ "$item_name" == "$deprecated_skill" ]]; then
                                        is_deprecated=1
                                        break
                                    fi
                                done
                                if [[ $is_deprecated -eq 1 ]]; then
                                    if rm -rf "$target_item" 2>/dev/null; then
                                        _mg_log_success "Cleaned skills/$item_name (deprecated)"
                                    else
                                        _mg_log_error "Failed to clean skills/$item_name (permission denied)"
                                        shopt -u dotglob
                                        return 1
                                    fi
                                    continue
                                fi
                            fi

                            if rm -rf "$target_item" 2>/dev/null; then
                                _mg_log_success "Cleaned $dir/$item_name (stale)"
                            else
                                _mg_log_error "Failed to clean $dir/$item_name (permission denied)"
                                shopt -u dotglob
                                return 1
                            fi
                        fi
                    done

                    unset known_items
                fi
            done

            shopt -u dotglob
        fi
    fi

    # ── Create directory structure ─────────────────────────────────────────
    [[ "$QUIET" != "true" ]] && echo "" && _mg_log_info "Creating .claude directory structure..."

    mkdir -p "$CLAUDE_TARGET_DIR"/{agents,skills,shared,hooks,memory,scripts,schemas}

    _mg_log_success "Directory structure created"

    # ── Copy components ────────────────────────────────────────────────────
    [[ "$QUIET" != "true" ]] && echo "" && _mg_log_info "Copying framework components..."

    local AGENT_COUNT=0
    local SKILL_COUNT=0
    local SCRIPT_COUNT=0
    local SHARED_COUNT=0

    if [[ "$GLOBAL_INSTALL" == "true" ]] && [[ "$STANDALONE" != "true" ]]; then
        _mg_log_warning "Global install detected at ~/.claude/ — skipping framework copy. Use --standalone to override."
    else
        # Copy agents
        if [[ -d "$CLAUDE_SOURCE_DIR/agents" ]]; then
            local agent_dir
            for agent_dir in "$CLAUDE_SOURCE_DIR/agents"/*; do
                if [[ -d "$agent_dir" ]]; then
                    cp -r "$agent_dir" "$CLAUDE_TARGET_DIR/agents/"
                    AGENT_COUNT=$((AGENT_COUNT + 1))
                fi
            done
            _mg_log_success "Copied $AGENT_COUNT agents"
        fi

        # Copy skills
        if [[ -d "$CLAUDE_SOURCE_DIR/skills" ]]; then
            local skill_dir
            for skill_dir in "$CLAUDE_SOURCE_DIR/skills"/*; do
                if [[ -d "$skill_dir" ]]; then
                    cp -r "$skill_dir" "$CLAUDE_TARGET_DIR/skills/"
                    SKILL_COUNT=$((SKILL_COUNT + 1))
                fi
            done
            _mg_log_success "Copied $SKILL_COUNT skills"
        fi

        # Copy shared protocols
        if [[ -d "$CLAUDE_SOURCE_DIR/shared" ]]; then
            cp -r "$CLAUDE_SOURCE_DIR/shared"/* "$CLAUDE_TARGET_DIR/shared/"
            SHARED_COUNT=$(find "$CLAUDE_SOURCE_DIR/shared" -maxdepth 1 -type f -name "*.md" | wc -l | tr -d ' ')
            _mg_log_success "Copied $SHARED_COUNT shared protocols"
        fi
    fi

    # Copy scripts
    if [[ -d "$CLAUDE_SOURCE_DIR/scripts" ]]; then
        local script_file
        for script_file in "$CLAUDE_SOURCE_DIR/scripts"/mg-*; do
            if [[ -f "$script_file" ]]; then
                cp "$script_file" "$CLAUDE_TARGET_DIR/scripts/"
                chmod +x "$CLAUDE_TARGET_DIR/scripts/$(basename "$script_file")"
                SCRIPT_COUNT=$((SCRIPT_COUNT + 1))
            fi
        done
        _mg_log_success "Copied $SCRIPT_COUNT scripts"
    fi

    # Copy hooks
    if [[ -d "$CLAUDE_SOURCE_DIR/hooks" ]]; then
        cp -r "$CLAUDE_SOURCE_DIR/hooks"/* "$CLAUDE_TARGET_DIR/hooks/"
        chmod +x "$CLAUDE_TARGET_DIR/hooks"/*.sh 2>/dev/null || true
        _mg_log_success "Copied hooks"
    fi

    # Copy schemas
    if [[ -d "$CLAUDE_SOURCE_DIR/schemas" ]]; then
        cp -r "$CLAUDE_SOURCE_DIR/schemas"/* "$CLAUDE_TARGET_DIR/schemas/" 2>/dev/null || true
        _mg_log_success "Copied schemas"
    fi

    # Copy team-config files
    if [[ -f "$CLAUDE_SOURCE_DIR/team-config.yaml" ]]; then
        cp "$CLAUDE_SOURCE_DIR/team-config.yaml" "$CLAUDE_TARGET_DIR/"
        _mg_log_success "Copied team-config.yaml"
    fi

    if [[ -f "$CLAUDE_SOURCE_DIR/team-config.json" ]]; then
        cp "$CLAUDE_SOURCE_DIR/team-config.json" "$CLAUDE_TARGET_DIR/"
        _mg_log_success "Copied team-config.json"
    fi

    # ── Configure settings.json ────────────────────────────────────────────
    if [[ "$SKIP_SETTINGS_MERGE" != "true" ]]; then
        [[ "$QUIET" != "true" ]] && echo "" && _mg_log_info "Configuring settings.json..."

        local SETTINGS_FILE="$CLAUDE_TARGET_DIR/settings.json"
        local SOURCE_SETTINGS="$CLAUDE_SOURCE_DIR/settings.json"

        if [[ -f "$SETTINGS_FILE" ]]; then
            _mg_backup_file "$SETTINGS_FILE"

            SETTINGS_FILE="$SETTINGS_FILE" SOURCE_SETTINGS="$SOURCE_SETTINGS" python3 <<'MERGE_SETTINGS_SCRIPT'
import json
import os
import sys

def merge_settings(user_file, source_file, output_file):
    with open(user_file, 'r') as f:
        user = json.load(f)
    with open(source_file, 'r') as f:
        source = json.load(f)

    if 'permissions' not in user:
        user['permissions'] = {'allow': [], 'deny': []}
    if 'allow' not in user['permissions']:
        user['permissions']['allow'] = []

    source_allows = source.get('permissions', {}).get('allow', [])
    for allow in source_allows:
        if allow not in user['permissions']['allow']:
            user['permissions']['allow'].append(allow)

    if 'deny' not in user['permissions'] or not user['permissions']['deny']:
        user['permissions']['deny'] = source.get('permissions', {}).get('deny', [])

    if 'env' not in user:
        user['env'] = {}
    source_env = source.get('env', {})
    for key, value in source_env.items():
        if key not in user['env']:
            user['env'][key] = value

    if 'teammateMode' not in user:
        user['teammateMode'] = source.get('teammateMode', 'auto')

    with open(output_file, 'w') as f:
        json.dump(user, f, indent=2)
    return True

user_file = os.environ.get('SETTINGS_FILE')
source_file = os.environ.get('SOURCE_SETTINGS')

try:
    merge_settings(user_file, source_file, user_file)
    print("  Merged settings successfully")
except Exception as e:
    print(f"  Error merging settings: {e}", file=sys.stderr)
    raise SystemExit(1)
MERGE_SETTINGS_SCRIPT

            if [[ $? -eq 0 ]]; then
                _mg_log_success "settings.json merged with existing settings"
            else
                _mg_log_error "Failed to merge settings.json"
            fi
        else
            cp "$SOURCE_SETTINGS" "$SETTINGS_FILE"
            _mg_log_success "settings.json created from template"
        fi
    fi

    # ── Configure CLAUDE.md ────────────────────────────────────────────────
    if [[ "$SKIP_CLAUDE_MD" != "true" ]]; then
        [[ "$QUIET" != "true" ]] && echo "" && _mg_log_info "Configuring CLAUDE.md..."

        local CLAUDE_MD="$CLAUDE_TARGET_DIR/CLAUDE.md"
        local SOURCE_CLAUDE_MD="$CLAUDE_SOURCE_DIR/CLAUDE.md"

        if [[ -f "$CLAUDE_MD" ]]; then
            if grep -q "<!-- BEGIN MINIATURE-GUACAMOLE -->" "$CLAUDE_MD" 2>/dev/null; then
                # CLAUDE.md already contains the MG marker — leave it unchanged.
                _mg_log_success "CLAUDE.md preserved (marker already present)"
            else
                local TEMP_FILE="$CLAUDE_MD.tmp"
                cat "$SOURCE_CLAUDE_MD" > "$TEMP_FILE"
                echo "" >> "$TEMP_FILE"
                echo "---" >> "$TEMP_FILE"
                echo "" >> "$TEMP_FILE"
                echo "# Existing Project Context" >> "$TEMP_FILE"
                echo "" >> "$TEMP_FILE"
                cat "$CLAUDE_MD" >> "$TEMP_FILE"
                mv "$TEMP_FILE" "$CLAUDE_MD"
                _mg_log_success "CLAUDE.md updated (prepended framework docs)"
            fi
        else
            cp "$SOURCE_CLAUDE_MD" "$CLAUDE_MD"
            _mg_log_success "CLAUDE.md created from template"
        fi
    fi

    # ── Create memory directory structure ──────────────────────────────────
    [[ "$QUIET" != "true" ]] && echo "" && _mg_log_info "Creating memory directory structure..."

    mkdir -p "$CLAUDE_TARGET_DIR/memory"

    local MEMORY_GITIGNORE="$CLAUDE_TARGET_DIR/memory/.gitignore"
    cat > "$MEMORY_GITIGNORE" <<'GITIGNORE'
# Memory files are project-local and should not be committed
*.json
!.gitignore

# Exception: Some template files may be committed
# Uncomment if needed:
# !decisions.json
# !workstream-*.json
GITIGNORE

    _mg_log_success "Memory directory created with .gitignore"

    # ── Create MG_INSTALL.json metadata ───────────────────────────────────
    [[ "$QUIET" != "true" ]] && echo "" && _mg_log_info "Creating installation metadata..."

    local VERSION="1.0.0"
    if [[ -f "$SOURCE_DIR/VERSION.json" ]]; then
        VERSION=$(python3 -c "import json, sys; print(json.load(open('$SOURCE_DIR/VERSION.json')).get('version', '1.0.0'))" 2>/dev/null || echo "1.0.0")
    fi

    local TIMESTAMP
    TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    printf '{\n  "framework": "miniature-guacamole",\n  "version": "%s",\n  "installed_at": "%s",\n  "updated_at": "%s",\n  "source": "local-build",\n  "source_path": "%s",\n  "install_method": "install.sh",\n  "components": {\n    "agents": %s,\n    "skills": %s,\n    "scripts": %s,\n    "shared": %s,\n    "hooks": 1\n  }\n}\n' \
        "$VERSION" "$TIMESTAMP" "$TIMESTAMP" "$SOURCE_DIR" \
        "$AGENT_COUNT" "$SKILL_COUNT" "$SCRIPT_COUNT" "$SHARED_COUNT" \
        > "$MG_INSTALL_JSON"

    _mg_log_success "Created MG_INSTALL.json"

    # ── Create MG_PROJECT marker ───────────────────────────────────────────
    cat > "$MG_PROJECT_MARKER" <<MARKER
This directory contains miniature-guacamole framework files.

Version: $VERSION
Installed: $TIMESTAMP
Source: $SOURCE_DIR
MARKER

    _mg_log_success "Created MG_PROJECT marker"

    # ── Summary ────────────────────────────────────────────────────────────
    if [[ "$QUIET" != "true" ]]; then
        local GREEN='\033[0;32m'
        local BLUE='\033[0;34m'
        local NC='\033[0m'
        echo ""
        echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║${NC}  Installation Complete!                                      ${GREEN}║${NC}"
        echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        _mg_log_info "Installation Summary:"
        echo "  Project directory: $TARGET_DIR"
        echo "  Framework version: $VERSION"
        echo ""
        echo "  Components installed:"
        echo "    - $AGENT_COUNT agents"
        echo "    - $SKILL_COUNT skills"
        echo "    - $SHARED_COUNT shared protocols"
        echo "    - $SCRIPT_COUNT scripts"
        echo "    - 1 hook"
        echo ""
        _mg_log_info "What was installed:"
        echo "  ✓ .claude/agents/        - Specialized agent roles"
        echo "  ✓ .claude/skills/        - Team collaboration skills"
        echo "  ✓ .claude/shared/        - Development protocols"
        echo "  ✓ .claude/scripts/       - mg-* utility commands"
        echo "  ✓ .claude/hooks/         - Project initialization hook"
        echo "  ✓ .claude/memory/        - Agent memory directory"
        echo "  ✓ .claude/settings.json  - Project-level permissions"
        echo "  ✓ .claude/CLAUDE.md      - Framework documentation"
        echo ""
        _mg_log_warning "Note: Claude Code will ask you to trust this project directory"
        echo "  on your next session start. This is expected — the installer created"
        echo "  .claude/settings.json with project-level permissions."
        echo ""
        _mg_log_info "Next steps:"
        echo "  1. Review settings: $CLAUDE_TARGET_DIR/settings.json"
        echo "  2. Review context: $CLAUDE_TARGET_DIR/CLAUDE.md"
        echo "  3. Add scripts to PATH: export PATH=\"\$PATH:$CLAUDE_TARGET_DIR/scripts\""
        echo "  4. Run mg-help for available commands"
        echo ""
        _mg_log_info "Data Isolation (NDA-safe):"
        echo "  ✓ All framework files are project-local"
        echo "  ✓ Memory stays in .claude/memory/"
        echo "  ✓ No data crosses between projects"
        echo "  ✓ ~/.claude/ is never modified"
        echo ""
    fi

    return 0
}

# ============================================================================
# Private helper functions (prefixed _mg_ to avoid polluting the sourcing env)
# ============================================================================

_mg_log_info() {
    local BLUE='\033[0;34m'
    local NC='\033[0m'
    echo -e "${BLUE}$1${NC}"
}

_mg_log_success() {
    local GREEN='\033[0;32m'
    local NC='\033[0m'
    echo -e "${GREEN}✓ $1${NC}"
}

_mg_log_warning() {
    local YELLOW='\033[1;33m'
    local NC='\033[0m'
    echo -e "${YELLOW}⚠ $1${NC}"
}

_mg_log_error() {
    local RED='\033[0;31m'
    local NC='\033[0m'
    echo -e "${RED}✗ $1${NC}" >&2
}

_mg_backup_file() {
    local file="$1"
    if [[ -f "$file" ]]; then
        local backup="${file}.backup.$(date +%Y%m%d-%H%M%S)"
        cp "$file" "$backup"
        echo "  Backed up to: $(basename "$backup")"
    fi
}
