# Dashboard Technical Debt

## TD-1: Dual SSE + Hook Polling Pattern

**Status**: Accepted for MVP, fix in WS-DASH-4

**Description**:
The dashboard currently has two independent polling mechanisms running concurrently:

1. **Server-side**: SSE endpoint at `/api/events/route.ts` polls the filesystem via `detectChanges()` every 5000ms (line 6)
2. **Client-side**: Each data hook (`use-workstreams.ts`, `use-activities.ts`, `use-questions.ts`) independently polls their respective API endpoints every 5000ms

**Problem**:
- For N concurrent users, server performs N+1 filesystem scans every 5 seconds
- SSE events and polling fetches can arrive simultaneously, causing double renders
- Inefficient resource usage as scale increases

**Impact**:
- Low for single-user/small-team scenarios (MVP acceptable)
- Medium for 10+ concurrent users
- High for production multi-tenant deployment

**Root Cause**:
SSE implementation was added for real-time updates but hooks retained their original polling logic. The two mechanisms were never integrated.

**Solution** (planned for WS-DASH-4):
1. Remove polling intervals from all data hooks
2. Add SSE event listeners in hooks via `useEventSource` context
3. Hooks refetch only when receiving relevant SSE events (event-driven vs time-driven)
4. Reduce server-side SSE poll frequency or implement fs.watch for truly event-driven detection

**Files Affected**:
- `src/app/api/events/route.ts` (SSE polling)
- `src/hooks/use-workstreams.ts` (client polling)
- `src/hooks/use-activities.ts` (client polling)
- `src/hooks/use-questions.ts` (client polling)
- `src/components/providers/event-source-provider.tsx` (SSE context)

**Estimated Effort**: 4-6 hours (WS-DASH-4)

**Identified By**: CTO Technical Review, 2026-02-06
**Priority**: P2 (before production scale-out)
