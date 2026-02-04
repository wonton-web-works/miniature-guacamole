#!/usr/bin/env bash
# ============================================================================
# Safety Check Hook
# ============================================================================
# Blocks dangerous commands before execution. Called by Claude Code hooks.
# Exit 0 = allow, Exit 1 = block
# ============================================================================

COMMAND="$1"

# Dangerous patterns that should NEVER execute
DANGEROUS_PATTERNS=(
    # Recursive delete of system/home directories
    'rm -rf /'
    'rm -rf ~'
    'rm -rf $HOME'
    'rm -rf /home'
    'rm -rf /Users'
    'rm -Rf /'
    'rm -Rf ~'

    # Delete without path (could be anywhere)
    'rm -rf \.'
    'rm -rf \.\.'

    # Disk/device operations
    '> /dev/'
    'dd if='
    'mkfs'

    # Permission bombs
    'chmod -R 777 /'
    'chmod -R 777 ~'
    'chown -R'

    # Fork bombs and system abuse
    ':(){ :|:& };:'
    'fork bomb'

    # Credential/config destruction
    'rm -rf ~/.ssh'
    'rm -rf ~/.aws'
    'rm -rf ~/.claude'
    'rm -rf ~/.config'

    # Git config destruction
    'git clean -fdx /'
    'git reset --hard' # Allow with confirmation, but flag it
)

# Check each dangerous pattern
for pattern in "${DANGEROUS_PATTERNS[@]}"; do
    if [[ "$COMMAND" == *"$pattern"* ]]; then
        echo "BLOCKED: Command matches dangerous pattern: $pattern" >&2
        echo "Command was: $COMMAND" >&2
        exit 1
    fi
done

# Block any rm -rf that targets parent directories or absolute paths outside project
if [[ "$COMMAND" =~ rm[[:space:]]+-[rRf]*[[:space:]]+[/~] ]]; then
    # Allow rm -rf within obvious project paths
    if [[ "$COMMAND" =~ rm[[:space:]]+-[rRf]*[[:space:]]+(\.\/|node_modules|dist|build|coverage|\.next) ]]; then
        exit 0
    fi
    echo "BLOCKED: rm -rf with absolute or home path" >&2
    echo "Command was: $COMMAND" >&2
    exit 1
fi

# All checks passed
exit 0
