#!/usr/bin/env bash
# ============================================================================
# TeammateIdle Quality Gate Hook
# ============================================================================
# Runs when an agent team teammate is about to go idle.
# Exit 0 = allow idle, Exit 2 = block idle with feedback via stderr
# ============================================================================

INPUT=$(cat)

TEAMMATE_NAME=$(echo "$INPUT" | jq -r '.teammate_name // "unknown"')

# Gate 1: Check for TypeScript compilation errors
if command -v npx &> /dev/null && [ -f "tsconfig.json" ]; then
  TSC_OUTPUT=$(npx tsc --noEmit 2>&1)
  if [ $? -ne 0 ]; then
    echo "[$TEAMMATE_NAME] TypeScript compilation errors found. Please fix before going idle:" >&2
    echo "$TSC_OUTPUT" | head -20 >&2
    exit 2
  fi
fi

# Gate 2: Check for untracked test files (tests should be committed)
UNTRACKED_TESTS=$(git ls-files --others --exclude-standard '*.test.ts' '*.test.tsx' '*.spec.ts' '*.spec.tsx' 2>/dev/null)
if [ -n "$UNTRACKED_TESTS" ]; then
  echo "[$TEAMMATE_NAME] Untracked test files detected. Please stage them before going idle:" >&2
  echo "$UNTRACKED_TESTS" >&2
  exit 2
fi

# All gates passed
exit 0
