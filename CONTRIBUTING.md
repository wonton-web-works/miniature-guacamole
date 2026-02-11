# Contributing to miniature-guacamole

Thank you for considering contributing to this project. We welcome contributions from developers who want to improve the agent system, add new features, or fix bugs.

## How to Contribute

1. Fork the repository
2. Create a feature branch following our naming convention
3. Write tests first (misuse-first ordering)
4. Implement your changes
5. Ensure all tests pass with 99% coverage
6. Submit a pull request

## Development Setup

### Prerequisites
- Node.js 20+ and npm
- Git
- Claude Code CLI (for testing agents)

### Installation
```bash
git clone https://github.com/rivermark-research/miniature-guacamole.git
cd miniature-guacamole
npm install
```

### Running Tests
```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Coding Standards

### Constraint-Driven Development (CAD)
We follow strict test-first practices:
- Write tests before code (RED phase)
- Write minimal code to pass tests (GREEN phase)
- Refactor while keeping tests green (REFACTOR phase)
- All features must have tests before implementation

### Test Coverage
- Maintain 99% test coverage across the codebase
- No exceptions - coverage must not drop below 99%
- Use `npm run test:coverage` to verify before submitting PRs

### Code Quality
- **DRY (Don't Repeat Yourself)** - Extract duplication immediately into reusable functions
- **Config over composition** - Prefer configuration objects over complex inheritance
- **Type-safe** - Use TypeScript with strict mode enabled
- **Clear naming** - Functions and variables should be self-documenting
- **Small functions** - Keep functions focused and under 50 lines

## Branch Naming Convention

Use the following format for branch names:
```
<type>/<workstream-id>-<brief-description>
```

Types:
- `feat/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation changes
- `test/` - Test additions or modifications
- `chore/` - Maintenance tasks

Examples:
- `feat/ws-1-login-endpoint`
- `fix/ws-5-memory-leak`
- `refactor/ws-10-config-module`
- `docs/update-readme`

## Commit Message Format

Follow the conventional commit format used throughout the project:

```
<type>(<scope>): <description>

[optional body]

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

Types:
- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code refactoring
- `test` - Test additions/updates
- `docs` - Documentation changes
- `chore` - Maintenance tasks

Scope examples: `dashboard`, `memory`, `audit`, `skills`, `agents`

Example commits:
```
feat(auth): add login endpoint with JWT support
fix(memory): resolve race condition in file locking
refactor(skills): optimize model usage with Sonnet+escalation protocol
docs(readme): update installation instructions
test(memory): add concurrent write tests
```

## Pull Request Process

1. **Update tests** - Add or update tests for your changes
2. **Verify coverage** - Run `npm run test:coverage` and ensure 99% coverage
3. **Update documentation** - Update README.md or relevant docs if needed
4. **Self-review** - Review your own changes before submitting
5. **Create PR** - Use a clear, descriptive title and provide context in the description
6. **Address feedback** - Respond to review comments and make requested changes

### PR Title Format
Keep titles under 70 characters and descriptive:
```
feat: Add two-factor authentication support
fix: Resolve memory leak in shared state
refactor: Extract config validation into module
```

### PR Description Template
```markdown
## Summary
Brief description of what this PR does and why.

## Changes
- Bullet point list of key changes
- Keep it focused and clear

## Test Plan
- [ ] All existing tests pass
- [ ] New tests added for new functionality
- [ ] Coverage remains at 99%+
- [ ] Manually tested feature X
- [ ] Verified no regressions

## Related Issues
Closes #123
```

## Code Review Expectations

### For Authors
- Respond to feedback within 48 hours
- Be open to suggestions and alternative approaches
- Keep PRs focused - one feature/fix per PR
- Update your PR as you receive feedback

### For Reviewers
- Review within 48 hours of PR submission
- Be constructive and specific in feedback
- Approve when code meets standards
- Request changes if standards not met

## Project Structure

```
.claude/
├── skills/       # Workflow and team slash commands
├── agents/       # Subagent definitions
├── shared/       # Shared protocols
└── memory/       # Runtime state (created dynamically)

src/
├── memory/       # Shared memory TypeScript layer
├── returns/      # Structured return envelopes
└── supervisor/   # Depth/loop monitoring

tests/
├── unit/         # Unit tests for individual modules
└── integration/  # Integration tests for workflows
```

## Adding New Features

### Adding a New Agent
1. Create `SKILL.md` in `.claude/skills/<agent-name>/`
2. If IC agent, also create `agent.md` in `.claude/agents/<agent-name>/`
3. Update the delegation hierarchy in handoff protocol
4. Add tests for the agent's behavior
5. Update documentation (README.md, .claude/README.md)

### Adding a New Workflow
1. Create `.claude/skills/<workflow-name>/SKILL.md`
2. Define workflow steps and agent spawning logic
3. Document memory protocol (read/write paths)
4. Add integration tests
5. Add examples to documentation

### Modifying the Delegation Hierarchy
1. Update `.claude/shared/handoff-protocol.md`
2. Update relevant SKILL.md files
3. Test delegation chains work correctly
4. Update architecture diagrams in documentation

## Getting Help

- Review existing code and tests for patterns
- Check `.claude/shared/` directory for protocols and standards
- Read the [architecture documentation](README.md#architecture)
- Open an issue for questions or clarifications

## License

By contributing, you agree that your contributions will be licensed under the same MIT License that covers the project.
