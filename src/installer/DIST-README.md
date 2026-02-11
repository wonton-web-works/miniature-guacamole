# miniature-guacamole

A Product Development Team agent system for [Claude Code](https://claude.ai/code).

## What is this?

miniature-guacamole provides a team of AI agents that work together to build software using a Constraint-Driven Agentic Development (CAD) workflow. Each agent has a specific role and can delegate to others, communicate through shared memory, and escalate issues up the chain.

**Version:** 1.0.0

## Quick Start

```bash
# Install to your project
./install.sh /path/to/your-project

# Navigate to your project
cd /path/to/your-project

# Start using agents in Claude Code
claude
```

## What Gets Installed

The installer creates a `.claude/` directory in your project with:
- **agents/** - 19 specialized agent roles
- **skills/** - 16 team collaboration workflows (all with mg- prefix)
- **shared/** - 6 protocol documents
- **scripts/** - 11 mg-* utility commands
- **hooks/** - Project initialization and safety checks
- **memory/** - Agent memory directory (gitignored)
- **settings.json** - Project-level permissions
- **CLAUDE.md** - Framework documentation

## Available Agents (19 Total)

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
| `product-manager` | Feature specs, user stories, acceptance criteria |
| `engineering-manager` | Team coordination, CAD cycle management |
| `staff-engineer` | Technical standards, code review, architecture guidance |
| `art-director` | Design vision, brand standards, visual approvals |

### Individual Contributors (Sonnet model)
| Agent | Role |
|-------|------|
| `dev` | Implementation test-first, 99% coverage target |
| `qa` | Misuse-first test specs, verification, visual regression |
| `design` | UI/UX design, frontend implementation |
| `api-designer` | API specifications and documentation |
| `technical-writer` | Technical documentation and guides |
| `copywriter` | Brand-aligned marketing and user-facing copy |
| `devops-engineer` | Infrastructure and deployment automation |
| `security-engineer` | Security audits and vulnerability scanning |
| `data-engineer` | Data pipelines and analytics infrastructure |

### Operations (Haiku model - fast validation)
| Agent | Role |
|-------|------|
| `deployment-engineer` | Merges and deployments after approval |
| `supervisor` | Monitors depth limits, detects loops, triggers escalations |

## Available Skills (16 Total)

All skills use the `mg-` prefix for consistency:

```
/mg-accessibility-review - WCAG compliance and inclusive design workflow
/mg-add-context          - Cross-project context references
/mg-assess               - Product assessment and discovery
/mg-assess-tech          - Technical feasibility analysis
/mg-build                - CAD development cycle from tests to production
/mg-code-review          - Implementation quality review workflow
/mg-debug                - Structured debugging workflow
/mg-design               - Visual design and frontend implementation
/mg-design-review        - Visual quality and UX assessment workflow
/mg-document             - Documentation generation and review
/mg-init                 - Project initialization for agent collaboration
/mg-leadership-team      - Executive collaboration and strategic decisions
/mg-refactor             - Test-safe refactoring workflow
/mg-security-review      - Security audits and vulnerability assessments
/mg-spec                 - Product definition and requirements
/mg-write                - Brand-aligned copywriting workflow
```

## Usage Examples

### Using Skills

```
/mg-leadership-team Build a user authentication system
/mg-build Execute workstream WS-1: Add login endpoint
/mg-code-review Review PR-123
```

### Using Agents

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

## How Agents Communicate

Agents use **shared memory** in `.claude/memory/` to coordinate:

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

## Project-Local Architecture

Each project has its own `.claude/` directory with complete isolation:
- **Data isolation** - No code or data crosses between projects
- **NDA-safe** - Project memory stays local, agents are shared role definitions
- **Independent versions** - Each project can use different framework versions
- **Complete control** - Full access to agents, skills, and protocols in your project

## Uninstall

```bash
./uninstall.sh
```

Removes the `.claude/` directory from your project. Your project files remain untouched.

## Documentation

- **Framework Repository**: [rivermark-research/miniature-guacamole](https://github.com/rivermark-research/miniature-guacamole)
- **Agent Definitions**: `.claude/agents/{agent-name}/AGENT.md`
- **Skill Definitions**: `.claude/skills/{skill-name}/SKILL.md`
- **Protocol Documents**: `.claude/shared/{protocol-name}.md`

## License

MIT
