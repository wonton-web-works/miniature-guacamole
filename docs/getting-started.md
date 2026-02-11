# Getting Started

## Prerequisites

Before installing miniature-guacamole, ensure you have:

- [Claude Code CLI](https://claude.ai/code) installed and authenticated
- Git (for cloning the repository)
- Node.js 20+ and npm (for the shared memory layer)

## Installation

miniature-guacamole uses project-local installation. Each project gets its own `.claude/` directory with the framework files.

### Method 1: Install from Source

```bash
# Clone the repository
git clone https://github.com/rivermark-research/miniature-guacamole.git
cd miniature-guacamole

# Build the distribution
./build.sh

# Install to your project
dist/miniature-guacamole/install.sh /path/to/your-project
```

### Method 2: Install from GitHub Release

```bash
# Download and extract
curl -fsSL https://github.com/rivermark-research/miniature-guacamole/releases/latest/download/miniature-guacamole.tar.gz | tar -xz
cd miniature-guacamole

# Install to your project
./install.sh /path/to/your-project
```

### Method 3: Web Install (One-liner)

```bash
cd /path/to/your-project
curl -fsSL https://raw.githubusercontent.com/rivermark-research/miniature-guacamole/main/src/installer/web-install.sh | bash
```

### What Gets Installed

Installation creates `.claude/` in your project:

```
your-project/
└── .claude/
    ├── agents/           # 19 specialized roles
    ├── skills/           # 16 collaboration workflows
    ├── shared/           # Protocol documents
    ├── scripts/          # mg-* utilities
    ├── hooks/            # Safety and initialization
    ├── memory/           # Agent state (gitignored)
    ├── settings.json     # Project permissions
    └── CLAUDE.md         # Framework docs
```

## Verifying Installation

```bash
# Check installed version
cat .claude/MG_INSTALL.json

# List available agents
ls .claude/agents/

# List available skills
ls .claude/skills/

# Test a script
.claude/scripts/mg-help
```

## Uninstalling

```bash
# Remove framework, preserve memory
/path/to/miniature-guacamole/dist/miniature-guacamole/uninstall.sh

# Remove everything (DESTRUCTIVE)
/path/to/miniature-guacamole/dist/miniature-guacamole/uninstall.sh --purge
```

## Quick Start Examples

### Example 1: Assess a New Feature

```
/mg-assess Add user authentication system
```

The feature assessment skill will:
1. Ask clarifying questions about the feature
2. Spawn the Product Owner for strategic fit analysis
3. Spawn the Product Manager for scope breakdown
4. Spawn the CTO for technical feasibility
5. Synthesize a GO/NO-GO recommendation with next steps

### Example 2: Execute a Workstream

```
/mg-leadership-team Build a user authentication system
```

Leadership team creates executive review and workstream plan:
- WS-1: Login endpoint
- WS-2: Password hashing
- WS-3: Session management

Then execute the first workstream:

```
/mg-build Execute WS-1: Add login endpoint
```

This runs the full CAD cycle:
1. QA Engineer writes failing tests (misuse-first ordering)
2. Dev implements code to pass tests (with artifact bundle)
3. QA verifies all tests pass with 99% coverage
4. Workstream classified as MECHANICAL or ARCHITECTURAL
5. Mechanical gate (automated) or Staff Engineer review

### Example 3: Review and Deploy

After implementation, request leadership review:

```
/mg-leadership-team Review WS-1 on branch feature/ws-1-login
```

Leadership team (CEO, CTO, Engineering Director) reviews and provides:
- APPROVED or REQUEST CHANGES decision
- Specific feedback if changes needed

On approval, merge to main:

```
/deployment-engineer Merge feature/ws-1-login
```

### Example 4: Invoke Individual Agents

You can also work directly with individual agents:

```bash
# Strategic planning
/ceo Review our Q4 product strategy

# Technical architecture
/cto Evaluate our microservices architecture

# Product management
/product-owner Prioritize the feature backlog

# Implementation
/dev Implement user authentication
/qa Write comprehensive test suite for auth flow
/design Create mockups for the login experience

# Operations
/devops-engineer Set up CI/CD pipeline
/security-engineer Review authentication implementation
```

### Example 5: Team Collaboration

Use team commands for coordinated multi-perspective collaboration:

```bash
# Leadership perspective
/mg-leadership-team Evaluate build vs buy for payment processing

# Product perspective
/mg-spec Define requirements for user onboarding flow

# Engineering perspective
/mg-build Break down and implement authentication feature

# Design perspective
/mg-design Create design system for the new dashboard

# Documentation perspective
/mg-document Document the API endpoints and write user guides
```

## Next Steps

- Read the [Architecture Guide](/architecture) to understand the agent hierarchy
- Explore the [Agent Reference](/agents) for detailed role specifications
- Learn the [Development Workflow](/workflows) for CAD development cycles
- Check [Contributing](/contributing) to extend the system

## Configuration

### Shared Memory

The shared memory layer stores agent state in `.claude/memory/`:

```
.claude/memory/
├── workstream-{id}-state.json     # Workstream status tracking
├── tasks-{role}.json              # Task queues per agent role
├── agent-{name}-decisions.json    # Agent decision records
├── handoffs-{from}-{to}.json      # Agent-to-agent handoffs
└── decisions.json                 # Architecture decisions
```

### Audit Logging

Enable audit logging to track token usage and API costs:

Add to `~/.claude/config.json`:
```json
{
  "audit_logging": {
    "enabled": true
  }
}
```

See [docs/audit-logging.md](https://github.com/rivermark-research/miniature-guacamole/blob/main/docs/audit-logging.md) for full documentation.

## Troubleshooting

### Agent Not Found

If you see "agent not found" errors:

1. Verify `.claude` directory exists in your project root or `~/.claude/`
2. Check that `skills/` and `agents/` directories are present
3. Restart Claude Code

### Missing Dependencies

If shared memory features fail:

```bash
npm install
npm test  # Verify shared memory layer works
```

### Permission Issues

If file operations fail:

```bash
chmod -R 755 .claude/
chmod -R 755 src/
```

## Support

- [Report Issues](https://github.com/rivermark-research/miniature-guacamole/issues)
- [View Documentation](https://rivermarkresearch.github.io/miniature-guacamole/)
- [Read Contributing Guide](/contributing)
