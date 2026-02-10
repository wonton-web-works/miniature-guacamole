# miniature-guacamole

A Product Development Team agent system for [Claude Code](https://claude.ai/code).

## What is this?

miniature-guacamole provides a team of AI agents that work together to build software using a TDD/BDD workflow. Each agent has a specific role and can delegate to others, communicate through shared memory, and escalate issues up the chain.

## Quick Start

```bash
# Clone the repo
git clone https://github.com/yourusername/miniature-guacamole.git
cd miniature-guacamole

# Install agents to ~/.claude/
./install.sh

# Start using agents in any Claude Code session
claude
```

## Available Agents

### Executive (Opus model - deep reasoning)
| Agent | Role |
|-------|------|
| `ceo` | Business vision, strategic decisions, final approvals |
| `cto` | Technical vision, architecture, technology choices |
| `engineering-director` | Engineering operations, delivery, resource allocation |

### Leadership (Sonnet model - implementation)
| Agent | Role |
|-------|------|
| `product-owner` | Product vision, backlog prioritization |
| `product-manager` | Feature specs, user stories, BDD scenarios |
| `engineering-manager` | Team coordination, TDD/BDD cycle management |
| `staff-engineer` | Technical standards, code review, architecture guidance |
| `art-director` | Design vision, brand standards, visual approvals |

### Individual Contributors (Sonnet model)
| Agent | Role |
|-------|------|
| `dev` | Implementation with TDD, 99% coverage target |
| `qa` | Test creation, verification, visual regression |
| `design` | UI/UX design, frontend implementation |

### Operations (Haiku model - fast validation)
| Agent | Role |
|-------|------|
| `deployment-engineer` | Merges and deployments after approval |
| `supervisor` | Monitors depth limits, detects loops, triggers escalations |

## Usage Examples

### Ad-hoc Agent Requests

```
"Have the engineering-manager review this code"

"Ask the QA engineer to write tests for the auth module"

"Get the CTO's opinion on this architecture decision"
```

### Using the Task Tool Directly

```javascript
Task(
  subagent_type="dev",
  prompt="Implement the login feature to pass the tests in tests/auth.test.ts"
)
```

### Workflow Skills (Project-level)

Copy `.claude/skills/` to your project for workflow commands:

```
/new-feature - Full product development workflow
/mg-code-review - Code review process
```

## How Agents Communicate

Agents use **shared memory** to coordinate:

```
.claude/memory/
├── tasks-{agent}.json        # Task queue per agent
├── workstream-{id}-state.json # Workflow progress
├── agent-{id}-decisions.json  # Agent outputs
└── escalations.json           # Issues needing attention
```

Each agent:
1. **Reads** their task queue and relevant context
2. **Executes** their work
3. **Writes** results back to memory
4. **Escalates** if blocked

## Configuration

See `.claude/team-config.yaml` for:
- Model assignments per agent
- Provider configuration (Anthropic, with hooks for OpenAI/Google/xAI)
- Workflow stages and gates
- Engineering principles

## Uninstall

```bash
./uninstall.sh
```

Only removes symlinks created by the installer. Your backups remain.

## Contributing

This is the distribution build. For development, see the [contribution repo](https://github.com/yourusername/miniature-guacamole-dev).

## License

MIT
