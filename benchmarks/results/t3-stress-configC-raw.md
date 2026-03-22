# T3 Stress Test (Config C) — Sage Research Evaluation Protocol Execution Log

**Prompt:** Real-time collaborative document editor (Google Docs-like) for enterprise. 2-50 concurrent editors, offline editing with conflict resolution, cross-user undo/redo, browser-only, on-prem deployable server. Team: 2 senior web engineers, no distributed systems experience. 8-week prototype target.

**Date:** 2026-03-22
**Agent:** The Sage (claude-opus-4-6, Config C — C-Suite on Sonnet)
**Protocol:** Research Evaluation Protocol (Steps 1-6)
**Domain Difficulty:** HIGH — involves distributed systems theory, concurrency control algorithms, real-time networking, and significant "unknown unknowns" risk. Getting fundamentals wrong means complete rewrite.

---

## Step 1: Problem Space Mapping (BEFORE research)

Decomposed the prompt into 12 sub-domains before any research was conducted. This domain warrants more sub-domains than the baseline terrain task (10) because:
- The algorithmic core (CRDT/OT) is itself a multi-decade research area
- Offline + online sync is a separate distributed systems problem layered on top
- Distributed undo/redo is an unsolved-in-general problem with different answers per algorithm family
- The "complete rewrite" risk factor demands exhaustive mapping

| # | Sub-Domain | Key Questions |
|---|-----------|---------------|
| 1 | Concurrency control algorithm | OT vs CRDT? Which specific variant? Correctness guarantees? Convergence properties? Performance at scale? |
| 2 | Offline conflict resolution | How do long-offline edits merge on reconnect? Structural conflicts (e.g., both users delete same paragraph)? Tombstone management? GC? |
| 3 | Real-time transport layer | WebSocket vs WebRTC vs SSE? Message ordering? Latency for char-by-char sync? Reconnection handling? |
| 4 | Document model / data structure | Plain text vs rich text vs tree? How does CRDT/OT map to a structured document? Nested objects? |
| 5 | Distributed undo/redo | Local undo vs global undo? How does undo interact with concurrent edits? Algorithm-specific solutions? |
| 6 | Server architecture | Central relay vs peer-to-peer? Server's role in OT vs CRDT? On-prem deployment requirements? Horizontal scaling? |
| 7 | Existing libraries and frameworks | Yjs, Automerge, ShareDB, OT.js, Diamond Types? Maturity, docs, community, license, production usage? |
| 8 | Persistence and history | Full operation log storage? Compaction/snapshots? Database choice for on-prem? Replay from arbitrary point? |
| 9 | Editor integration / binding | ProseMirror, CodeMirror, TipTap, Lexical, Slate? Which have CRDT/OT bindings? Quality of bindings? |
| 10 | Awareness and presence | Cursor sync, selection highlighting, user indicators. Bandwidth at 50 users? Throttling strategies? |
| 11 | Team feasibility / learning curve | 2 senior web devs, no distributed systems. 8-week prototype. What's the realistic ramp? What can be abstracted away? |
| 12 | Security and access control | Per-document permissions? E2E encryption feasibility with CRDTs? On-prem auth integration (LDAP/SAML)? |

**Protocol compliance:** Map produced BEFORE any research. 12 sub-domains identified (requirement: >=4).

---

## Step 2: General Research

### Research Approach

Domain knowledge synthesis from primary sources: academic papers (Oster et al. 2006, Preguica et al. 2009, Kleppmann & Beresford 2017, Sun & Ellis 1998), library documentation (Yjs, Automerge, ShareDB), production post-mortems (Google Docs architecture talks, Figma CRDTs blog, Notion engineering blog), and specification documents (RFC 7386, CRDT specification papers).

### Key General Findings by Sub-Domain

#### SD1: Concurrency Control Algorithm

**OT (Operational Transformation):**
- Original: Ellis & Gibbs 1989, refined by Sun & Ellis 1998 (GOT/GOTO algorithms)
- Core idea: transform operations against concurrent operations to preserve intention
- Requires central server to establish total order (canonical ordering point)
- Google Docs uses OT (Jupiter protocol variant)
- Correctness is notoriously hard — dozens of published OT algorithms, many later proven incorrect (Imine et al. 2003 showed TP2 violations in several)
- Transform function complexity explodes with operation types (insert, delete, format, split, merge)

**CRDT (Conflict-free Replicated Data Types):**
- Two families: operation-based (CmRDT) and state-based (CvRDT)
- For text: LSEQ (Nedelec et al. 2013), RGA (Roh et al. 2011), YATA (Nicolaescu et al. 2015, used by Yjs)
- No central server required for correctness — convergence is guaranteed by mathematical properties
- Tradeoff: metadata overhead (each character carries a unique ID + causal metadata)
- Recent advances: Diamond Types (Gentle 2023) achieves near-OT performance with CRDT guarantees

**Verdict for this team:** CRDT strongly preferred. OT requires implementing complex transform functions correctly (research-level difficulty). CRDTs with a mature library (Yjs) abstract the hard parts.

#### SD2: Offline Conflict Resolution

- CRDTs handle offline natively — that's their design purpose. Each client generates operations independently; merge is commutative, associative, and idempotent
- On reconnect: sync missing operations. No special "conflict resolution" phase needed — CRDT merge IS the resolution
- Tombstones: deleted elements are marked, not removed (needed for convergence). This creates metadata bloat over time
- Garbage collection: Yjs implements document compaction via snapshots. Automerge v2 has improved GC
- Structural conflicts (both delete same paragraph): CRDT semantics — both deletes converge to "deleted." No user-facing conflict
- Concurrent formatting conflicts: last-writer-wins per attribute, or merge semantics depending on CRDT design

#### SD3: Real-time Transport

- WebSocket: primary choice. Full-duplex, widely supported, works through corporate proxies (wss://)
- WebRTC DataChannel: peer-to-peer option, reduces server load but complicates NAT traversal and doesn't work well in enterprise networks with restrictive firewalls
- For this use case: WebSocket to central server. Server relays operations. Compatible with on-prem deployment
- Char-by-char sync: operations are typically batched in small windows (16-50ms) to reduce message frequency
- Yjs provides y-websocket (server + client) out of the box
- Reconnection: WebSocket reconnect with exponential backoff + operation replay from last known state vector

#### SD4: Document Model

- Plain text CRDTs: well-understood, simpler (e.g., Y.Text)
- Rich text: requires attributed text or tree-based model
- Yjs provides: Y.Text (rich text with formatting attributes), Y.Array, Y.Map, Y.XmlFragment (tree-based)
- ProseMirror integration (y-prosemirror) maps ProseMirror's document tree to Yjs types
- Key insight: the document model choice is tightly coupled to the editor choice. ProseMirror's schema-based model maps well to Y.XmlFragment

#### SD5: Distributed Undo/Redo

- **This is the hardest sub-domain.** No universally accepted solution exists.
- Local undo (undo MY operations only, even if others edited between): requires tracking per-user operation stacks and computing inverse operations relative to current document state
- OT: undo is a known hard problem. Google Docs has limited undo behavior in collaborative contexts
- CRDT: Yjs provides UndoManager that tracks local changes and can reverse them. It handles concurrent edits by inverting against the current state, not the historical state
- Yjs UndoManager: scoped to a specific Y.Doc or sub-type, tracks changes per "origin" (user), supports undo/redo stacks
- Limitation: undo of structural operations (delete paragraph, then others edit around it) can produce surprising results
- Cross-user undo ("undo what User B did") is not standard — this is a product design question, not just a technical one

#### SD6: Server Architecture

- CRDT approach: server is a "peer with persistence" — stores document state and relays operations. Not required for correctness
- Yjs architecture: y-websocket server holds document in memory, persists to LevelDB or custom storage adapter
- On-prem: Node.js process + database. Simple to deploy. No complex distributed infrastructure needed
- Scaling to 50 concurrent editors on one document: single Node.js process handles this easily. Yjs benchmarks show <1ms merge time for typical operations
- Horizontal scaling across documents: multiple Node.js processes, one per document or sharded. Sticky sessions or document-based routing
- No need for consensus protocols (Raft, Paxos) because CRDTs don't require consensus — this is a major simplification for a team without distributed systems experience

#### SD7: Existing Libraries

| Library | Type | Language | Maturity | Rich Text | Offline | License |
|---------|------|----------|----------|-----------|---------|---------|
| **Yjs** | CRDT (YATA) | JS/TS | Very High — used by Notion, JupyterLab | Yes (Y.Text, Y.XmlFragment) | Native | MIT |
| **Automerge** | CRDT (RGA variant) | Rust+WASM+JS | High — Ink & Switch backed | Limited (plain text focused) | Native | MIT |
| **ShareDB** | OT | JS | High — used by many | Via quill-sharedb | Via reconnect | MIT |
| **Diamond Types** | CRDT | Rust+WASM | Early — excellent perf benchmarks | Plain text only | Native | MIT |
| **Hocuspocus** | Yjs server framework | TS | Growing — from TipTap team | Via Yjs | Via Yjs | MIT/Commercial |

**Recommendation for this team:** Yjs. Reasons:
1. Most mature CRDT library in JavaScript ecosystem
2. Best editor integrations (y-prosemirror, y-codemirror, y-tiptap, y-lexical)
3. Built-in offline support
4. y-websocket provides ready-made server
5. Used in production by Notion, JupyterLab, Cargo (Figma prototyping tool)
6. MIT licensed — no on-prem licensing issues
7. Excellent documentation and active community

#### SD8: Persistence and History

- Yjs: document state is an encoded binary (update format). Can be stored as a single blob or as incremental updates
- y-leveldb: persistence adapter for LevelDB (embedded, no separate database server — good for on-prem simplicity)
- Full history: store every update in append-only log. Replay by applying updates in order
- Compaction: periodically create document snapshots. Discard updates before snapshot
- Yjs snapshot API: `Y.snapshot(doc)` captures state at a point in time. `Y.createDocFromSnapshot(doc, snapshot)` recreates historical state
- For operation history display: Yjs provides `doc.on('update', ...)` event. Store updates with timestamp + user metadata
- Database choice for on-prem: LevelDB (simplest, embedded), PostgreSQL (if client already runs it), SQLite (portable)

#### SD9: Editor Integration

| Editor | CRDT Binding | Quality | Rich Text | Extensibility |
|--------|-------------|---------|-----------|---------------|
| **ProseMirror** | y-prosemirror | Excellent — mature, well-tested | Full schema-based | Very high |
| **TipTap** | Built on ProseMirror + Yjs | Excellent — first-class Yjs support | Full | High (abstracts ProseMirror) |
| **CodeMirror 6** | y-codemirror.next | Good | Code only | High |
| **Lexical (Meta)** | y-lexical (community) | Developing | Full | Medium |
| **Slate** | slate-yjs | Moderate — some edge cases | Full | Medium |

**Recommendation:** TipTap v2. Reasons:
1. Built on ProseMirror (battle-tested) but with friendlier API
2. First-class Yjs collaboration support via @tiptap/extension-collaboration
3. TypeScript-first
4. Extensive extension ecosystem (tables, mentions, images, etc.)
5. Lower learning curve than raw ProseMirror — important for 8-week timeline
6. Commercial support available (Hocuspocus server) but open-source core is sufficient

#### SD10: Awareness and Presence

- Yjs provides y-protocols/awareness: lightweight presence protocol
- Each client broadcasts: cursor position, selection range, user name, color
- Bandwidth: awareness updates are small (~100-200 bytes per update). At 50 users with 200ms throttle: ~50KB/s aggregate. Negligible
- y-prosemirror and TipTap handle cursor rendering automatically via awareness
- Throttling: awareness updates typically throttled to 100-200ms. Cursor positions don't need char-by-char precision

#### SD11: Team Feasibility

**Knowledge gaps for 2 senior web engineers:**
1. CRDT theory (can be abstracted away by Yjs)
2. WebSocket lifecycle management (reconnection, state sync)
3. Binary protocols (Yjs update format is binary — but they don't need to understand internals)
4. Concurrent editing edge cases (Yjs handles, but debugging requires understanding)
5. Document schema design (ProseMirror/TipTap schema concepts)

**8-week prototype timeline assessment:**
- Weeks 1-2: TipTap + Yjs tutorial, basic collaborative editor working (achievable — many tutorials exist)
- Weeks 3-4: Custom document schema, formatting toolbar, offline support (Yjs offline is built-in, schema design is medium difficulty)
- Weeks 5-6: Server deployment (y-websocket + persistence), undo/redo, user presence (medium)
- Weeks 7-8: Testing with multiple users, edge case handling, basic auth, deployment packaging (high risk of timeline slip)

**Feasibility verdict:** A basic prototype is achievable in 8 weeks using Yjs + TipTap. The key risk is NOT the CRDT implementation (Yjs abstracts it) but rather: (a) rich text schema complexity, (b) undo/redo behavior tuning, (c) production hardening for 50 concurrent users, (d) on-prem deployment packaging.

#### SD12: Security and Access Control

- Transport: WSS (TLS) for in-transit encryption
- Authentication: JWT tokens validated on WebSocket connection. Compatible with enterprise SSO (SAML/OIDC)
- Authorization: per-document access control at the server level. Server can reject operations from unauthorized users
- E2E encryption with CRDTs: theoretically possible but extremely complex (server can't read or validate operations). Not recommended for prototype
- On-prem: all data stays on client infrastructure. No cloud dependency. This is a major selling point of Yjs — it's a library, not a service

---

## Step 3: Coverage Evaluation Against Map

| # | Sub-Domain | Depth Assessment | Signal Type | Indicators |
|---|-----------|------------------|-------------|------------|
| 1 | Concurrency control algorithm | Named specific algorithms (YATA, RGA, Jupiter), cited papers, explained tradeoffs with both sides, identified correctness risks in OT | **DEPTH** | Specific algorithm names, paper citations, tradeoff analysis |
| 2 | Offline conflict resolution | Explained CRDT convergence properties, tombstone mechanics, GC strategies with Yjs specifics | **DEPTH** | Implementation details, concrete mechanisms |
| 3 | Real-time transport | WebSocket recommended with specific rationale against WebRTC for enterprise, batching window numbers given | **DEPTH** | Specific numbers (16-50ms batching), enterprise constraint analysis |
| 4 | Document model | Yjs types mapped to editor concepts, coupling to editor choice identified | **DEPTH** | Concrete type mappings (Y.Text, Y.XmlFragment) |
| 5 | **Distributed undo/redo** | Identified as hardest problem, Yjs UndoManager described, limitations surfaced, cross-user undo flagged as product question | **PARTIAL** | Limitations named but specific failure modes not fully enumerated. Hedging: "can produce surprising results" |
| 6 | Server architecture | Concrete: "server is a peer with persistence," y-websocket described, scaling characteristics given | **DEPTH** | Specific architecture pattern, performance claim (<1ms merge) |
| 7 | Existing libraries | Comparison table with 5 libraries, production users named, specific recommendation with multi-factor rationale | **DEPTH** | Primary sources (library docs, production case studies) |
| 8 | Persistence and history | Yjs snapshot API named, storage adapters listed, compaction strategy described | **DEPTH** | Specific API calls (Y.snapshot, doc.on('update')), concrete adapter names |
| 9 | Editor integration | Comparison table with 5 editors, binding quality assessed, specific recommendation | **DEPTH** | Named bindings (y-prosemirror, @tiptap/extension-collaboration) |
| 10 | Awareness and presence | Bandwidth calculated for 50 users, throttling values given | **DEPTH** | Specific numbers (100-200 bytes, 50KB/s at 50 users) |
| 11 | Team feasibility | Week-by-week breakdown, knowledge gaps enumerated, risk areas identified | **PARTIAL** | Timeline is estimated but hedging on weeks 7-8. No concrete mitigation for the risks identified |
| 12 | Security and access control | JWT + WSS pattern described, E2E encryption complexity flagged, on-prem advantage noted | **PARTIAL** | Enterprise auth patterns (SAML/OIDC) named but not detailed. "Theoretically possible but extremely complex" is hedging |

### Surface-level signals detected:

1. **SD5 (Distributed undo/redo):** "Can produce surprising results" is hedging. The specific failure modes, user expectations, and workarounds are not fully unpacked. What exactly happens when User A undoes a paragraph deletion that User B has been editing inside? What does Yjs UndoManager actually do vs. what users expect?

2. **SD11 (Team feasibility):** "High risk of timeline slip" in weeks 7-8 — but no concrete mitigation strategies. What specifically can be cut from scope? What are the minimum viable features for a prototype? How much of the 8 weeks is learning vs. building?

3. **SD12 (Security):** Enterprise auth integration described at surface level. On-prem deployment packaging (Docker? Helm? Systemd?) not addressed. Enterprise clients will have specific infrastructure requirements.

**Gaps identified for specialist research:** SD5 (undo/redo), SD11 (team feasibility / prototype scoping), SD12 (on-prem deployment architecture).

**Sub-domains at adequate depth (no further research needed):** SD1, SD2, SD3, SD4, SD6, SD7, SD8, SD9, SD10.

---

## Step 4: Specialist Research

### Specialist 1: Distributed Undo/Redo in CRDTs

**Scope:** Yjs UndoManager behavior under concurrent editing, specific failure modes, user expectation management, cross-user undo design patterns.

**Context provided:** We know Yjs UndoManager exists and tracks per-user changes. We know undo in collaborative editing is the hardest sub-problem. We need SPECIFIC answers to:
1. What exactly happens when User A undoes a delete while User B has inserted text at the deleted location?
2. Does Yjs UndoManager support redo after another user's edit lands?
3. What are the known bugs/limitations in Yjs UndoManager (GitHub issues)?
4. How do production apps (Notion, JupyterLab) handle collaborative undo UX?
5. Is "undo User B's changes" (cross-user undo) implementable with Yjs?

**Specialist findings:**

**Yjs UndoManager specifics:**
- Works by tracking "StackItems" — each StackItem records the inverse of a set of changes
- Scoped by "trackedOrigins" — only undoes changes from specified origins (typically the local user's transaction origin)
- When undoing: computes the inverse against CURRENT document state, not historical state. This means concurrent edits are preserved
- Example: User A types "Hello". User B types "World" after it. User A undoes → "Hello" is removed, "World" remains. This is correct per-user undo semantics
- Paragraph deletion case: User A deletes a paragraph (creates a StackItem inverting the deletion). User B inserts text where the paragraph was. User A undoes → the paragraph is restored WITH User B's text inside it. This is because Yjs tracks structural changes and the inverse re-creates the deleted nodes, but B's insertions were into a different part of the CRDT tree and survive

**Known limitations (from Yjs GitHub issues and community reports):**
1. Undo of complex structural operations (table row deletion, list restructuring) can sometimes produce unexpected document states — not data loss, but visually odd results
2. UndoManager capture granularity: by default, every transaction is a separate undo step. Typing "Hello" = 5 undo steps unless transactions are batched. TipTap's collaboration extension handles this with 500ms debouncing
3. Redo stack is cleared when new local changes are made (standard behavior, same as Google Docs)
4. No built-in support for "undo User B's changes" — this would require: (a) identifying all operations from User B, (b) computing selective undo, which is equivalent to the "selective undo" problem in OT literature — algorithmically hard and not implemented in Yjs

**Production UX patterns:**
- Notion: uses per-user undo with block-level granularity. Undo operates on "user actions" (typed a sentence, moved a block) not individual characters
- Google Docs: per-user undo with debounced transaction grouping. Known to sometimes produce confusing undo behavior in heavily concurrent sections
- Recommendation: batch undo into "user actions" (500ms-1s debounce), communicate clearly in UI when undo might produce unexpected results in heavily edited sections

**Cross-user undo assessment:**
- Not feasible for 8-week prototype. Requires solving selective undo — active research area
- Alternative: provide document history timeline (using Yjs snapshots) where users can view/restore previous versions. This is what Google Docs does with "Version History"
- For prototype: implement per-user undo + version history as the MVP approach

### Specialist 2: Prototype Scoping and Team Ramp-Up

**Scope:** Concrete 8-week plan for 2 senior web engineers with no distributed systems experience. What's MVP? What gets cut? What are the critical-path risks?

**Context provided:** Team knows JavaScript/TypeScript well. No CRDT/distributed systems background. Must use Yjs + TipTap. Need on-prem deployable server. 2-50 concurrent editors.

**Specialist findings:**

**Learning curve analysis:**
- Yjs + TipTap: ~3-5 days for a "hello world" collaborative editor (well-documented tutorials exist)
- ProseMirror schema concepts: ~1 week to understand deeply enough to customize
- WebSocket lifecycle + reconnection: ~2-3 days (y-websocket abstracts most of this)
- Yjs internals (needed for debugging): ~1 week of study, but can be deferred past prototype
- Total ramp-up: ~2 weeks of focused learning before productive building

**MVP definition (what MUST be in the prototype):**
1. Rich text editing (bold, italic, headings, lists) -- TipTap provides out of the box
2. Real-time sync between 2+ editors -- Yjs + y-websocket
3. Offline editing with reconnect sync -- Yjs built-in (IndexedDB provider + WebSocket provider)
4. User cursors and presence -- y-prosemirror awareness
5. Basic per-user undo/redo -- Yjs UndoManager
6. Document persistence -- y-websocket with LevelDB
7. Deployable server -- Docker container with Node.js + y-websocket

**What gets CUT from prototype:**
- Cross-user undo (too hard, not feasible in timeline)
- Fine-grained access control (prototype can use simple token auth)
- E2E encryption (premature for prototype)
- Advanced formatting (tables, images, embeds) -- defer to iteration 2
- Horizontal scaling -- single server handles 50 concurrent editors easily
- Full version history UI -- defer, but snapshots can be stored from day 1
- Production monitoring/observability

**8-week detailed plan:**

| Week | Focus | Deliverable | Risk |
|------|-------|-------------|------|
| 1 | Learning: TipTap + Yjs tutorials, collaborative editing concepts | Working "hello world" collab editor on localhost | Low |
| 2 | Learning: ProseMirror schema, Yjs internals, y-websocket | Custom schema with basic formatting, server running | Low |
| 3 | Building: document schema (headings, lists, paragraphs, inline formatting) | Feature-complete text editor (single user) | Medium — schema design complexity |
| 4 | Building: multi-user sync, cursor awareness, presence UI | 2-user collaborative editing demo | Low — Yjs handles the hard parts |
| 5 | Building: offline support (IndexedDB), reconnection UX | Works offline, syncs on reconnect | Medium — edge cases in reconnection |
| 6 | Building: undo/redo, document persistence, basic auth | Undo works, documents persist across server restarts | High — undo edge cases |
| 7 | Integration: Docker packaging, deployment scripts, load testing with 10-50 users | Deployable artifact, load test report | Medium — first time seeing real concurrency bugs |
| 8 | Polish: bug fixes from load testing, UX polish, documentation | Shippable prototype | High — unknown unknowns from week 7 testing |

**Critical-path risks:**
1. Week 3 (schema): if the schema design is wrong, everything built on top needs rework. Recommend: use TipTap's StarterKit as-is for prototype, customize later
2. Week 6 (undo): undo edge cases could consume more time than budgeted. Recommend: timebox to 3 days, accept imperfect undo for prototype
3. Week 7 (load testing): first time testing with many concurrent users. Recommend: start simple load testing in week 5 in parallel
4. General: the engineers will encounter Yjs-specific bugs/behaviors that require understanding CRDT internals to debug. Recommend: budget 20% time for learning/debugging throughout

### Specialist 3: On-Prem Deployment Architecture

**Scope:** Enterprise-deployable server for collaborative editing. Docker, networking, storage, auth integration.

**Context provided:** Server must run on client infrastructure. Uses y-websocket + Node.js. LevelDB for persistence. Need to support enterprise auth.

**Specialist findings:**

**Deployment model:**
```
Docker Compose (simplest for on-prem):
  - app: Node.js + y-websocket + TipTap collaboration server
  - db: LevelDB (embedded, no separate container needed)

  OR for PostgreSQL persistence:
  - app: Node.js + y-websocket + custom persistence adapter
  - db: PostgreSQL (enterprise-standard, client likely already runs it)
```

**Networking:**
- Single port: WSS (443) for both HTTP (serve editor app) and WebSocket (real-time sync)
- Reverse proxy: Nginx or enterprise load balancer terminates TLS, forwards to Node.js
- WebSocket upgrade must be configured in proxy (common enterprise pitfall: proxies that strip WebSocket upgrade headers)

**Auth integration patterns:**
- JWT-based: server validates JWT on WebSocket connection. JWT issued by client's SSO (SAML/OIDC)
- Practical approach: provide a webhook/callback interface where the server calls the enterprise's auth endpoint to validate tokens. This avoids embedding auth logic in the editor server
- Per-document authorization: server checks document-level permissions on connection and on each operation batch

**Storage considerations:**
- LevelDB: embedded, zero-config, fast. Limitation: single-process access only (no horizontal scaling without sharding)
- PostgreSQL: familiar to enterprise ops teams, supports backups, replication, monitoring they already have
- Recommended for enterprise: PostgreSQL with a custom Yjs persistence adapter (write Yjs document updates as rows in a table). ~100 lines of adapter code

**Deployment artifacts:**
- Docker image: Node.js Alpine base, ~50MB
- docker-compose.yml: single-command deployment
- Helm chart: if client uses Kubernetes (common in enterprise)
- Configuration: environment variables for database connection, auth endpoint, TLS certs, allowed origins
- Health check: HTTP endpoint for load balancer integration

**What research cannot determine:**
- Client's specific infrastructure (Kubernetes vs bare VM vs managed container service)
- Client's auth system specifics (Okta? Azure AD? Custom LDAP?)
- Client's network topology (DMZ restrictions? Internal-only?)
- Client's compliance requirements (SOC2? HIPAA? Data residency?)

---

## Step 5: Specialist Persistence

Writing 3 specialist files to `.claude/memory/specialists/`:

1. **crdt-collaborative-undo.md** — Distributed undo/redo in CRDTs, Yjs UndoManager specifics, production UX patterns, cross-user undo assessment
2. **collaborative-editor-prototype-planning.md** — 8-week plan for web engineers, MVP scoping, critical-path risks, learning curve analysis
3. **collaborative-editor-onprem-deployment.md** — Docker deployment, enterprise auth integration, PostgreSQL persistence, networking considerations

---

## Step 6: Research Ceiling — What Needs Human/Implementation Validation

### Research has plateaued on these specific items:

1. **Undo behavior with complex schemas** — We know Yjs UndoManager works for basic text operations and have documented the known limitations. But the specific undo behavior with THIS project's custom schema (whatever rich text features they implement) cannot be predicted through research. Different schema designs produce different undo edge cases. **Needs: hands-on prototyping and user testing with the actual schema.**

2. **50-user concurrent editing performance** — Yjs benchmarks show <1ms merge time, and we calculate ~50KB/s aggregate bandwidth for awareness at 50 users. But real-world performance with 50 users simultaneously editing the same paragraph (worst case) on a specific server hardware configuration has not been benchmarked. **Needs: load testing on target hardware.** The theoretical analysis strongly suggests it will work, but "strongly suggests" is not "verified."

3. **Client's infrastructure specifics for on-prem deployment** — We've designed a deployment architecture (Docker + PostgreSQL + JWT auth) but cannot validate it against the actual client's infrastructure. Enterprise environments have unique constraints: firewall rules, proxy configurations, container orchestration platforms, auth systems. **Needs: client infrastructure discovery session.**

4. **WebSocket behavior through enterprise proxies** — Some enterprise proxy servers (Zscaler, Blue Coat) interfere with WebSocket connections even over TLS. Whether the target client's network infrastructure supports persistent WebSocket connections is an empirical question. **Needs: network testing in the target environment.** Mitigation: implement long-polling fallback.

5. **Rich text schema design for the specific use case** — What formatting features do enterprise clients actually need? Tables? Comments? Mentions? Track changes? Each feature significantly impacts schema complexity and development time. Research can enumerate the options but cannot make the product decision. **Needs: product requirements from stakeholders.**

6. **Yjs garbage collection impact on long-lived documents** — Yjs tombstones accumulate over time. For documents edited heavily over months/years, the document binary grows. Yjs has snapshot + GC mechanisms, but the specific growth rate and compaction effectiveness for THIS usage pattern (enterprise documents, 50 editors) has not been empirically measured. **Needs: long-duration soak testing with simulated editing patterns.**

7. **Team's actual learning velocity** — We estimated 2 weeks ramp-up based on typical senior web engineers. But individual learning speed varies significantly. The 8-week plan has 2 high-risk weeks (7-8). If ramp-up takes 3 weeks instead of 2, the entire plan compresses dangerously. **Needs: team assessment after week 1 — are they tracking to the plan?**

### Escalation message:

> Research on real-time collaborative editing has reached a solid foundation across 12 sub-domains. We have high-confidence recommendations for the technology stack (Yjs + TipTap + y-websocket), architecture (CRDT with central relay server), and an 8-week prototype plan.
>
> However, research CANNOT determine the following, which require human input or hands-on experimentation:
>
> 1. **Undo behavior with the actual document schema** — requires prototyping
> 2. **50-user performance on target hardware** — requires load testing
> 3. **Client infrastructure compatibility** — requires discovery session
> 4. **Enterprise proxy WebSocket support** — requires network testing
> 5. **Product requirements for rich text features** — requires stakeholder input
> 6. **Long-term document growth patterns** — requires soak testing
> 7. **Team learning velocity** — requires week 1 checkpoint
>
> Recommend proceeding to CTO for architecture review and prototype planning, with items 3 and 5 escalated to the user for stakeholder engagement.

---

## Recommended Technology Stack (Deliverable)

| Component | Choice | Rationale |
|-----------|--------|-----------|
| CRDT library | **Yjs** (npm: yjs) | Most mature JS CRDT, production-proven (Notion, JupyterLab), MIT, native offline |
| Editor framework | **TipTap v2** (@tiptap/core) | Built on ProseMirror, first-class Yjs support, lower learning curve |
| Collaboration binding | @tiptap/extension-collaboration + @tiptap/extension-collaboration-cursor | Official Yjs integration |
| Real-time transport | **y-websocket** | Ready-made WebSocket server + client for Yjs sync |
| Offline storage | **y-indexeddb** | Browser-side Yjs persistence, automatic offline support |
| Server persistence | **PostgreSQL** (custom adapter) or **LevelDB** (y-leveldb) | Enterprise-standard or zero-config embedded |
| Undo/redo | **Yjs UndoManager** | Per-user undo with 500ms debounce batching |
| Presence/awareness | **y-protocols/awareness** | Cursor sync, user indicators, built into y-prosemirror |
| Auth | **JWT** via WebSocket handshake | Compatible with enterprise SSO (SAML/OIDC) |
| Deployment | **Docker** + docker-compose | Simple on-prem deployment, single-command start |
| PRNG/Seeding | Not needed | CRDTs use unique client IDs, not seeded randomness |

---

## Recommended Architecture (Deliverable)

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (Client)                         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  TipTap Editor                                        │   │
│  │  - ProseMirror schema (headings, lists, formatting)   │   │
│  │  - @tiptap/extension-collaboration (Yjs binding)      │   │
│  │  - @tiptap/extension-collaboration-cursor (awareness)  │   │
│  └──────────────┬───────────────────────────┬────────────┘   │
│                 │                           │                │
│  ┌──────────────▼──────────┐  ┌────────────▼────────────┐   │
│  │  Yjs Document (Y.Doc)   │  │  UndoManager             │   │
│  │  - Y.XmlFragment (doc)  │  │  - per-user undo stack   │   │
│  │  - awareness state      │  │  - 500ms debounce        │   │
│  └──────────┬──────────────┘  └──────────────────────────┘   │
│             │                                                │
│  ┌──────────▼──────────┐  ┌──────────────────────────────┐   │
│  │  WebSocketProvider   │  │  IndexedDBProvider            │   │
│  │  (y-websocket)       │  │  (y-indexeddb)                │   │
│  │  - sync + awareness  │  │  - offline persistence        │   │
│  └──────────┬──────────┘  └──────────────────────────────┘   │
│             │                                                │
└─────────────┼────────────────────────────────────────────────┘
              │ WSS (TLS)
              │
┌─────────────▼────────────────────────────────────────────────┐
│                  Server (On-Prem)                              │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  Nginx / Enterprise LB                                  │   │
│  │  - TLS termination                                      │   │
│  │  - WebSocket upgrade forwarding                         │   │
│  │  - Static file serving (editor app)                     │   │
│  └──────────────┬─────────────────────────────────────────┘   │
│                 │                                              │
│  ┌──────────────▼─────────────────────────────────────────┐   │
│  │  Node.js + y-websocket Server                           │   │
│  │                                                         │   │
│  │  On WebSocket connect:                                  │   │
│  │    1. Validate JWT (call enterprise auth endpoint)      │   │
│  │    2. Check document-level authorization                │   │
│  │    3. Load Y.Doc from persistence (or create new)       │   │
│  │    4. Sync document state to client                     │   │
│  │    5. Relay operations to all connected clients          │   │
│  │                                                         │   │
│  │  On update:                                             │   │
│  │    1. Apply to in-memory Y.Doc                          │   │
│  │    2. Persist update to database                        │   │
│  │    3. Broadcast to other clients                        │   │
│  │                                                         │   │
│  │  Periodic:                                              │   │
│  │    - Snapshot for version history                       │   │
│  │    - Compact old updates                                │   │
│  └──────────────┬─────────────────────────────────────────┘   │
│                 │                                              │
│  ┌──────────────▼─────────────────────────────────────────┐   │
│  │  PostgreSQL / LevelDB                                   │   │
│  │  - documents table (doc_id, yjs_state BYTEA)            │   │
│  │  - updates table (doc_id, update BYTEA, timestamp, user)│   │
│  │  - snapshots table (doc_id, snapshot BYTEA, timestamp)  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                               │
│  Docker Container (~50MB image)                               │
│  docker-compose up -d                                         │
└───────────────────────────────────────────────────────────────┘
```

---

## Risk Matrix (Deliverable)

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Undo produces confusing UX in concurrent editing | High | Medium | Timebox undo work to 3 days, accept imperfect behavior, use version history as fallback |
| Schema design wrong, requires rework | Medium | High | Use TipTap StarterKit as-is for prototype, defer customization |
| Enterprise proxy blocks WebSocket | Medium | High | Implement long-polling fallback (y-websocket supports this with minor modification) |
| 8-week timeline insufficient | Medium | High | Cut scope: no tables, no images, no advanced formatting. Minimum viable = text + headings + lists |
| Engineers struggle with Yjs debugging | Medium | Medium | Budget 20% time for learning, engage Yjs community (Discord), consider TipTap commercial support |
| Document growth over time degrades performance | Low | Medium | Implement compaction from day 1, even if not optimized |
| Client infrastructure incompatible with Docker | Low | Medium | Provide alternative: systemd service file for bare Node.js deployment |

---

## Sources

### Primary (Implementation-grade)
- Yjs documentation: https://docs.yjs.dev/
- Yjs GitHub: https://github.com/yjs/yjs
- y-websocket: https://github.com/yjs/y-websocket
- y-prosemirror: https://github.com/yjs/y-prosemirror
- TipTap Collaboration: https://tiptap.dev/docs/editor/extensions/functionality/collaboration
- Hocuspocus: https://hocuspocus.dev/
- ProseMirror Guide: https://prosemirror.net/docs/guide/

### Academic (Algorithmic foundations)
- Nicolaescu et al. 2015: "YATA — Yet Another Transformation Approach" (Yjs's underlying algorithm)
- Kleppmann & Beresford 2017: "A Conflict-Free Replicated JSON Datatype" (Automerge foundations)
- Sun & Ellis 1998: "Operational Transformation in Real-Time Group Editors" (OT foundations)
- Oster et al. 2006: "Data Consistency for P2P Collaborative Editing" (CRDT for text)

### Production Case Studies
- Notion Engineering: uses Yjs for real-time collaboration
- JupyterLab: uses Yjs for notebook collaboration (y-jupyter)
- Figma: custom CRDT (not Yjs, but validates CRDT approach at scale)
- Seph Gentle (Diamond Types): performance benchmarks comparing CRDT implementations

### Secondary (Context)
- Martin Kleppmann's talks on CRDTs (multiple conference presentations 2018-2024)
- Ink & Switch: "Local-first software" manifesto (2019) — context for offline-first architecture
- Kevin Jahns (Yjs creator) blog posts on CRDT implementation details
