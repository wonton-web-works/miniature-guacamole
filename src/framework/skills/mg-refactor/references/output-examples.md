## Output Examples

**Pipeline diagram** (always show at the start):

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ CHARACTERIZE│───▶│  REFACTOR   │───▶│   VERIFY    │───▶│   REVIEW    │
│     {s1}    │    │     {s2}    │    │     {s3}    │    │     {s4}    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘

Legend: ✓ = done, ● = active, ○ = pending, × = failed
```

**Status box:**

```
┌─────────────────────────────────────────┐
│ REFACTOR-{id}: {summary}                │
├─────────────────────────────────────────┤
│ Phase:    {phase}                       │
│ Tests:    {passing}/{total} (baseline: {baseline}) │
│ Coverage: {percent}% (baseline: {baseline}%) │
│ Status:   {green_bar or red_bar}       │
│ Blocker:  {blocker or "none"}           │
└─────────────────────────────────────────┘
```

**Detailed progress:**

```
## Refactor {id}: {summary}

### Scope
{Description of code being refactored}

### Refactor Goals
- {Goal 1: e.g., extract duplicated logic}
- {Goal 2: e.g., improve naming clarity}
- {Goal 3: e.g., simplify complex conditional}

### Baseline Metrics
- Tests: {count}
- Coverage: {percent}%
- Complexity: {cyclomatic complexity if measured}

### Progress
- [x] Step 1: Characterization tests written (qa)
- [x] Step 2: Refactoring executed (dev)
- [ ] Step 3: Verification complete (qa)
- [ ] Step 4: Code review (staff-engineer)

### Current Metrics
- Tests: {count} ({delta} change)
- Coverage: {percent}% ({delta} change)
- Green bar: {yes/no}

### Next Action
{What happens next or who to invoke}
```
