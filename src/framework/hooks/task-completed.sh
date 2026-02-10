#!/usr/bin/env bash
# ============================================================================
# TaskCompleted Quality Gate Hook
# ============================================================================
# Runs when a task is being marked as completed.
# Exit 0 = allow completion, Exit 2 = block completion with feedback via stderr
# ============================================================================

INPUT=$(cat)

TASK_SUBJECT=$(echo "$INPUT" | jq -r '.task_subject // "unknown"')

# Gate 1: Run tests if vitest is available (scoped to changed files only)
if command -v npx &> /dev/null; then
  if [ -f "vitest.config.ts" ] || [ -f "vitest.config.js" ]; then
    CHANGED_FILES=$(git diff --name-only --cached --diff-filter=ACMR 2>/dev/null | grep -E '\.(ts|tsx|js|jsx)$' || true)
    if [ -n "$CHANGED_FILES" ]; then
      TEST_OUTPUT=$(npx vitest run --reporter=verbose --changed 2>&1)
      if [ $? -ne 0 ]; then
        echo "Tests failing. Cannot mark task '$TASK_SUBJECT' as complete:" >&2
        echo "$TEST_OUTPUT" | tail -30 >&2
        exit 2
      fi
    fi
  fi
fi

# Gate 2: Check for untracked source files (ts/tsx/js/jsx across all directories)
UNTRACKED_SRC=$(git ls-files --others --exclude-standard '*.ts' '*.tsx' '*.js' '*.jsx' 2>/dev/null | grep -v node_modules || true)
if [ -n "$UNTRACKED_SRC" ]; then
  echo "Untracked source files detected. Please stage before completing task:" >&2
  echo "$UNTRACKED_SRC" >&2
  exit 2
fi

# All gates passed
exit 0
