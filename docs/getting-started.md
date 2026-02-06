# Getting Started

## Prerequisites

Before installing miniature-guacamole, ensure you have:

- [Claude Code CLI](https://claude.ai/code) installed and authenticated
- Git (for cloning the repository)
- Node.js 20+ and npm (for the shared memory layer)

## Installation

Choose the installation method that best fits your needs.

### Option 1: Clone into Project (Recommended)

Clone this repository and the `.claude` directory will be automatically recognized by Claude Code:

```bash
git clone https://github.com/RivermarkResearch/miniature-guacamole.git
cd miniature-guacamole
npm install  # Install shared memory dependencies
claude      # Start Claude Code - agents will be available
```

### Option 2: Add to Existing Project

Copy the `.claude` directory to the root of any existing project:

```bash
cp -r /path/to/miniature-guacamole/.claude /path/to/your-project/
cp -r /path/to/miniature-guacamole/src /path/to/your-project/
cd /path/to/your-project
npm install  # Install dependencies
claude      # Agents now available in this project
```

### Option 3: Install Globally (User-level)

To make these agents available across all projects:

```bash
# Copy skills to user-level location
cp -r /path/to/miniature-guacamole/.claude/skills/* ~/.claude/skills/

# Copy agents to user-level location
cp -r /path/to/miniature-guacamole/.claude/agents/* ~/.claude/agents/

# Copy shared protocols
mkdir -p ~/.claude/shared
cp -r /path/to/miniature-guacamole/.claude/shared/* ~/.claude/shared/

# Copy shared memory layer
mkdir -p ~/.claude/src
cp -r /path/to/miniature-guacamole/src/* ~/.claude/src/
```

## Verify Installation

After installation, start Claude Code and verify agents are available:

```bash
claude
# Then type: /ceo
# You should see the CEO agent respond
```

List available skills:
```
/help
```

You should see all available agents and workflow skills listed.

## Quick Start Examples

### Example 1: Assess a New Feature

```
/feature-assessment Add user authentication system
```

The feature assessment skill will:
1. Ask clarifying questions about the feature
2. Spawn the Product Owner for strategic fit analysis
3. Spawn the Product Manager for scope breakdown
4. Spawn the CTO for technical feasibility
5. Synthesize a GO/NO-GO recommendation with next steps

### Example 2: Execute a Workstream

```
/leadership-team Build a user authentication system
```

Leadership team creates executive review and workstream plan:
- WS-1: Login endpoint
- WS-2: Password hashing
- WS-3: Session management

Then execute the first workstream:

```
/engineering-team Execute WS-1: Add login endpoint
```

This runs the full TDD cycle:
1. QA Engineer writes failing tests
2. Dev implements code to pass tests
3. QA verifies all tests pass with 99% coverage
4. Staff Engineer conducts code review

### Example 3: Review and Deploy

After implementation, request leadership review:

```
/leadership-team Review WS-1 on branch feature/ws-1-login
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
/dev Implement user authentication with TDD
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
/leadership-team Evaluate build vs buy for payment processing

# Product perspective
/product-team Define requirements for user onboarding flow

# Engineering perspective
/engineering-team Break down and implement authentication feature

# Design perspective
/design-team Create design system for the new dashboard

# Documentation perspective
/docs-team Document the API endpoints and write user guides
```

## Next Steps

- Read the [Architecture Guide](/architecture) to understand the agent hierarchy
- Explore the [Agent Reference](/agents) for detailed role specifications
- Learn the [Development Workflow](/workflows) for TDD/BDD cycles
- Check [Contributing](/contributing) to extend the system

## Configuration

### Shared Memory

The shared memory layer stores agent state in `.claude/memory/`:

```
.claude/memory/
├── shared.json              # Primary shared state
├── ws-1.json               # Workstream-specific state
├── ws-2.json
└── backups/                # Automatic backups
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

See [docs/audit-logging.md](https://github.com/RivermarkResearch/miniature-guacamole/blob/main/docs/audit-logging.md) for full documentation.

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

- [Report Issues](https://github.com/RivermarkResearch/miniature-guacamole/issues)
- [View Documentation](https://github.com/RivermarkResearch/miniature-guacamole/blob/main/.claude/README.md)
- [Read Contributing Guide](/contributing)
