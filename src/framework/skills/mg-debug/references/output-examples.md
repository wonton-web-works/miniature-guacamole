## Output Examples

**Pipeline diagram** (always show at the start):

```
┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐
│ REPRODUCE │───▶│ INVESTIGATE│───▶│   FIX    │───▶│  VERIFY   │
│    {s1}   │    │    {s2}   │    │   {s3}   │    │   {s4}    │
└───────────┘    └───────────┘    └───────────┘    └───────────┘

Legend: ✓ = done, ● = active, ○ = pending, × = failed
```

**Status box:**

```
┌─────────────────────────────────────────┐
│ BUG-{id}: {summary}                     │
├─────────────────────────────────────────┤
│ Phase:      {phase}                     │
│ Root Cause: {cause or "investigating"}  │
│ Fix Status: {status}                    │
│ Tests:      {passing}/{total}           │
│ Blocker:    {blocker or "none"}         │
└─────────────────────────────────────────┘
```

**Detailed progress:**

```
## Bug {id}: {summary}

### Symptoms
{Description of observed behavior}

### Reproduction Steps
1. {Step 1}
2. {Step 2}
...

### Root Cause
{Detailed analysis of what went wrong and why}

### Fix Applied
{Description of fix and how it addresses root cause}

### Verification
- [x] Bug reproduction no longer occurs
- [x] Tests pass
- [x] No regressions detected
- [ ] Code review pending

### Next Action
{What happens next or who to invoke}
```
