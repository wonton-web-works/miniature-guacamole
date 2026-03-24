## Output Examples

**Compact mode output** (default, ≤10 lines per build cycle):

```
progress: Step 1/4 active
>> qa: Write test specs for WS-{id}
✓ qa: tests written (31s)
progress: Step 2/4 active
>> dev: Implement WS-{id}
✓ dev: implementation complete (120s)
progress: Step 3/4 active
>> qa: Verify WS-{id}
✓ qa: all tests pass (45s)
gate:tests_pass PASS tests:[47/47] coverage:[99%]
```

**Verbose mode** (pass `output_mode: verbose` or "verbose"): shows CAD pipeline diagram and status box:

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  TEST   │───▶│  IMPL   │───▶│ VERIFY  │───▶│ REVIEW  │
│   {s1}  │    │   {s2}  │    │   {s3}  │    │   {s4}  │
└─────────┘    └─────────┘    └─────────┘    └─────────┘

Legend: ✓ = done, ● = active, ○ = pending, × = failed
```

Full mode status box:

```
┌─────────────────────────────────────────┐
│ WS-{id}: {name}                         │
├─────────────────────────────────────────┤
│ Phase:    {phase}                       │
│ Tests:    {passing}/{total}             │
│ Coverage: {percent}%                    │
│ Gate:     {gate_status}                 │
│ Blocker:  {blocker or "none"}           │
└─────────────────────────────────────────┘
```

**Followed by detailed progress** (both modes):

```
## Workstream {id}: {name}

### Progress
- [x] Step 1: Tests written (qa)
- [x] Step 2: Implementation (dev)
- [ ] Step 3: Verification (qa)
- [ ] Step 4: Code review (staff-engineer)

### Next Action
{What happens next or who to invoke}
```
