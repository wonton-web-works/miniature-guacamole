# Dashboard Technical Debt

## TD-1: Dual SSE + Hook Polling Pattern

**Status**: RESOLVED (WS-DASH-3+4, 2026-02-07)

**Resolution**:
Implemented hybrid approach where hooks maintain polling as fallback but components can trigger immediate refresh via SSE events:
- Created `useEventSource` hook for SSE connection management with reconnection logic
- Created `EventSourceProvider` context for sharing SSE connection across components
- Hooks expose `refresh()` function that parent components call when SSE events arrive
- Polling remains as reliable fallback for degraded/disconnected scenarios

**Architecture**:
1. **Server-side**: SSE endpoint at `/api/events/route.ts` emits events when filesystem changes detected
2. **Client-side**: Components use `useEventSourceContext()` to listen for events
3. **Data hooks**: Maintain polling + expose refresh() for manual/event-driven refetch
4. **Best of both**: Event-driven updates when connected, polling when disconnected

**Files Modified**:
- `src/hooks/use-event-source.ts` (SSE hook with reconnection, exponential backoff)
- `src/components/providers/event-source-provider.tsx` (SSE context provider)
- `src/hooks/use-workstreams.ts` (already has polling + refresh)
- `src/hooks/use-activities.ts` (already has polling + refresh)
- `src/hooks/use-questions.ts` (already has polling + refresh)

**Completed By**: dev agent, 2026-02-07
**Verification**: Unit tests for useEventSource (18 tests), integration deferred to E2E


## TD-2: WebSocket Upgrade Path

**Status**: Deferred (post-MVP)

**Description**:
Current SSE implementation is unidirectional (server-to-client). For features requiring bidirectional communication (real-time collaboration, live cursor positions, etc.), WebSocket would be more appropriate.

**Rationale for Deferral**:
- Current use case (dashboard updates) is read-only and works well with SSE
- SSE has better built-in reconnection and is simpler to implement/debug
- HTTP/2 multiplexing makes SSE nearly as efficient as WebSocket for our scale
- Can migrate incrementally if bidirectional needs arise

**Migration Path** (if needed):
1. Implement WebSocket server endpoint alongside SSE
2. Create `useWebSocket` hook with same interface as `useEventSource`
3. Feature-flag rollout to migrate clients gradually
4. Deprecate SSE endpoint once migration complete

**Estimated Effort**: 8-12 hours (if required)

**Priority**: P3 (only if bidirectional communication needed)
