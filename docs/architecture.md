# Architecture

## Overview

miniature-guacamole simulates a complete product development organization within Claude Code. It provides 20 specialized agents organized in a realistic corporate hierarchy, enabling structured delegation and disciplined development workflows.

## Agent Hierarchy

```
                    ┌─────────┐
                    │   CEO   │
                    └────┬────┘
         ┌───────────┬───┴───┬───────────┐
         │           │       │           │
    ┌────▼───┐  ┌────▼───┐ ┌─▼──┐  ┌─────▼─────┐
    │  CTO   │  │Eng Dir │ │ PO │  │Art Director│
    └───┬────┘  └───┬────┘ └─┬──┘  └─────┬─────┘
        │           │        │           │
   ┌────▼────┐ ┌────▼───┐ ┌──▼──┐   ┌────▼────┐
   │Staff Eng│ │Eng Mgr │ │ PM  │   │ Design  │
   └────┬────┘ └───┬────┘ └──┬──┘   └─────────┘
        │      ┌───┴───┐     │
        │      │       │     │
    ┌───▼──┐ ┌─▼──┐ ┌──▼─┐ ┌─▼─┐
    │ Dev  │ │Dev │ │ QA │ │All│
    └──────┘ └────┘ └────┘ └───┘
```

### Organizational Levels

The hierarchy is organized into four levels:

1. **Executive Level** - Strategic vision and high-level decisions (opus model)
2. **Leadership Level** - Tactical planning and team coordination (sonnet model)
3. **Individual Contributor Level** - Hands-on implementation (sonnet/haiku models)
4. **Operations Level** - Deployment and infrastructure (sonnet model)

## Delegation Model

### Delegation Authority Matrix

| Agent | Can Delegate To (Leadership) | Can Delegate To (IC via Task) |
|-------|------------------------------|-------------------------------|
| CEO | CTO, Engineering Director, Product Owner, Art Director | - |
| CTO | Engineering Director, Staff Engineer | dev |
| Engineering Director | Engineering Manager, Staff Engineer | dev, qa |
| Product Owner | Product Manager | - |
| Product Manager | - | dev, qa, design |
| Engineering Manager | - | dev, qa |
| Staff Engineer | - | dev |
| Art Director | - | design |
| Dev (IC) | - | qa*, design* |
| QA (IC) | - | dev* |
| Design (IC) | - | dev*, qa* |

*Peer consultation only (does not count toward delegation depth)

### Delegation vs Consultation

| Aspect | Delegation | Consultation |
|--------|------------|--------------|
| **Purpose** | Transfer task ownership | Request information/opinion |
| **Depth Impact** | Increments depth counter | Does NOT increment depth |
| **Re-delegation** | Delegate may re-delegate | Consultant CANNOT re-delegate |
| **Ownership** | Transfers to delegate | Remains with requester |

### Depth Limits

- **Maximum depth: 3 levels**
- Depth 1: Primary agent delegates to first delegate
- Depth 2: First delegate re-delegates to second delegate
- Depth 3: Second delegate re-delegates to third delegate (TERMINAL - cannot delegate further)

The supervisor system monitors depth limits and prevents infinite delegation chains.

### Loop Prevention

The system prevents circular delegation:
- Agents cannot delegate back to any agent already in the chain
- Agents cannot delegate to themselves
- Consultation bypasses loop checks (fire-and-forget model)

## Component Architecture

### Directory Structure

```
.claude/
├── skills/                      # Workflow and team slash commands
│   ├── feature-assessment/
│   ├── technical-assessment/
│   ├── security-review/
│   ├── accessibility-review/
│   ├── design-review/
│   ├── code-review/
│   ├── implement/
│   ├── leadership-team/
│   ├── product-team/
│   ├── engineering-team/
│   ├── design-team/
│   └── docs-team/
│
├── agents/                      # Subagent definitions (for Task tool)
│   ├── ceo/
│   ├── cto/
│   ├── dev/
│   ├── qa/
│   ├── design/
│   ├── security-engineer/
│   ├── technical-writer/
│   └── supervisor/
│
├── shared/                      # Shared protocols
│   ├── handoff-protocol.md     # Delegation specification
│   ├── development-workflow.md # TDD/BDD workflow
│   └── engineering-principles.md
│
└── memory/                      # Shared state (created at runtime)
    ├── shared.json
    ├── ws-1.json
    └── backups/

src/
├── memory/                      # Shared memory TypeScript layer
│   ├── config.ts               # Configuration
│   ├── types.ts                # TypeScript interfaces
│   ├── write.ts                # Write operations
│   ├── read.ts                 # Read operations
│   ├── query.ts                # Query operations
│   ├── validate.ts             # Format validation
│   ├── locking.ts              # File locking
│   ├── backup.ts               # Backup/recovery
│   └── errors.ts               # Error handling
│
├── returns/                     # Structured return envelopes
│   ├── types.ts
│   └── validate.ts
│
└── supervisor/                  # Depth/loop monitoring
    ├── depth.ts
    ├── loops.ts
    ├── escalation.ts
    └── control.ts
```

## Component Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     User Invocation                          │
│                    (slash commands)                          │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   skills/<skill>/SKILL.md                    │
│                                                              │
│  - Loaded when user types /<skill-name>                     │
│  - Defines persona, tools, and behavior                     │
│  - Can spawn agents via Task tool                           │
└─────────────────────────┬───────────────────────────────────┘
                          │
              (Task tool delegation)
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  agents/<agent>/agent.md                     │
│                                                              │
│  - Loaded when Task tool invokes subagent                   │
│  - Handles delegated work                                   │
│  - Can re-delegate (if depth < 3)                           │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Shared Memory Layer                        │
│                                                              │
│  - TypeScript modules in src/memory/                        │
│  - Atomic writes with backups                               │
│  - Query by agent_id, workstream_id, timestamp              │
└─────────────────────────────────────────────────────────────┘
```

## Model Selection Strategy

| Tier | Model | Agents | Rationale |
|------|-------|--------|-----------|
| Executive | opus | CEO, CTO, Leadership Team | Complex strategic decisions require highest capability |
| Leadership | sonnet | ED, PO, PM, EM, SE, AD | Balanced capability for coordination and planning |
| IC | sonnet/haiku | Dev, QA, Design, etc. | Fast/efficient for task execution in delegation chains |

### Model Escalation Protocol

The system uses an intelligent model escalation strategy:
1. Start with Sonnet for most tasks
2. If Sonnet cannot complete the task, escalate to Opus
3. Supervisor monitors escalation patterns and optimizes model selection

This approach balances cost efficiency with quality, using Opus only when necessary.

## Shared Memory System

### Overview

The shared memory layer provides unified state management for all agents with:
- **99% test coverage** (49/49 tests passing)
- **Atomic writes** with automatic backups
- **File locking** for concurrent safety
- **Query capabilities** by agent, workstream, or time
- **Graceful error handling** - Never throws exceptions

### API Reference

```typescript
import { writeMemory, readMemory, queryMemory } from './src/memory';

// Write state
const result = await writeMemory({
  agent_id: 'dev',
  workstream_id: 'ws-1-auth',
  data: {
    feature: 'user-login',
    status: 'in-progress',
    coverage: 85
  }
});

// Read state
const memory = await readMemory();
console.log(memory.data);

// Query state
const entries = await queryMemory({
  agent_id: 'dev',
  workstream_id: 'ws-1-auth'
});
```

### File Structure

```
.claude/memory/
├── shared.json              # Primary shared state
├── ws-1.json               # Workstream-specific state
├── ws-2.json
└── backups/                # Automatic backups
    ├── shared.json.2026-02-04T10:00:00Z.bak
    └── shared.json.2026-02-04T11:00:00Z.bak
```

### Features

- Automatic timestamp generation
- Circular reference detection
- File locking for concurrent safety
- Automatic backup before writes
- Backup retention policy (7 days)
- Path sanitization
- UTF-8 encoding support
- Large file handling (up to 10MB)

## Handoff Protocol

The handoff protocol defines how context is passed between agents during delegation. All agents follow a structured envelope format for delegation requests and responses.

### Delegation Request Envelope

```yaml
handoff:
  id: "<uuid>"
  type: "delegation" | "consultation"
  chain:
    depth: <1-3>
    max_depth: 3
    path: [<agents in chain>]
  task:
    objective: "<goal>"
    success_criteria: [<criteria>]
    deliverable: "<expected output>"
  context:
    essential: [<key facts>]
    references: [<file paths, decisions>]
```

### Delegation Response Envelope

```yaml
handoff_response:
  request_id: "<uuid>"
  status: "completed" | "partial" | "failed" | "escalated"
  result:
    summary: "<executive summary>"
    deliverable: <output>
    confidence: "high" | "medium" | "low"
```

See [Handoff Protocol Documentation](https://github.com/YOUR_ORG/miniature-guacamole/blob/main/.claude/shared/handoff-protocol.md) for complete specification.

## Git Workstream Strategy

Each feature is implemented in its own branch with a structured naming convention:

```
main (protected)
├── feature/ws-1-delegation-logging
├── feature/ws-2-shared-memory
└── feature/ws-3-cost-tracking
```

### Branch Naming

- Pattern: `feature/ws-{number}-{short-name}`
- Example: `feature/ws-1-delegation-logging`

### Quality Gates

1. **Tests Exist** - Test files created and failing
2. **Tests Pass** - All tests passing, no regressions
3. **QA Sign-off** - Coverage adequate, edge cases handled
4. **Internal Review** - Code quality, standards, security
5. **Leadership Approval** - Business requirements, technical quality, operational readiness
6. **Merge Ready** - Leadership approved, no conflicts, branch up to date

## Testing Architecture

### Test Coverage

- **Unit Tests** (18 tests) - Memory layer functions
- **Integration Tests** (31 tests) - Cross-agent communication
- **E2E Tests** (Playwright) - Workflow automation
- **Total Coverage** - 99%+

### Test Execution

```bash
npm test              # Run all tests
npm run test:unit     # Unit tests only
npm run test:integration  # Integration tests
npm test:watch        # Watch mode
npm run test:coverage # Coverage report
```

## Security Considerations

### Agent Permissions

Not all agents have file system access. Tool access is restricted by role:

| Agent | Read | Glob | Grep | Edit | Write |
|-------|------|------|------|------|-------|
| CEO | - | - | - | - | - |
| CTO | ✅ | ✅ | ✅ | ✅ | ✅ |
| Engineering Director | - | - | - | - | - |
| Product Owner | - | - | - | - | - |
| Product Manager | ✅ | ✅ | ✅ | - | - |
| Engineering Manager | ✅ | ✅ | ✅ | ✅ | ✅ |
| Staff Engineer | ✅ | ✅ | ✅ | ✅ | ✅ |
| Art Director | - | - | - | - | - |
| Dev | ✅ | ✅ | ✅ | ✅ | ✅ |
| QA | ✅ | ✅ | ✅ | ✅ | ✅ |
| Design | ✅ | ✅ | ✅ | - | - |

### Data Protection

- Memory files stored in `.claude/memory/` (add to `.gitignore`)
- Automatic backups prevent data loss
- File locking prevents concurrent write conflicts
- No sensitive data logged (audit logging is metadata-only)

## Extension Points

The system is designed to be extended:

### Adding a New Agent

1. Create `SKILL.md` in `.claude/skills/<agent-name>/`
2. If IC agent, also create `agent.md` in `.claude/agents/<agent-name>/`
3. Update hierarchy documentation
4. Add tests for delegation patterns

### Adding a New Workflow

1. Create `.claude/skills/<workflow-name>/SKILL.md`
2. Define workflow steps and agent spawning logic
3. Document memory protocol (read/write paths)
4. Add examples to documentation

### Modifying Hierarchy

1. Update `.claude/shared/handoff-protocol.md`
2. Update relevant SKILL.md files
3. Test delegation chains work correctly
4. Update architecture diagrams

See [Contributing Guide](/contributing) for detailed instructions.
