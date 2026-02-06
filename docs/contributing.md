# Contributing

Thank you for considering contributing to miniature-guacamole. We welcome contributions from developers who want to improve the agent system, add new features, or fix bugs.

## Quick Links

- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Pull Request Process](#pull-request-process)
- [Adding New Features](#adding-new-features)

## How to Contribute

1. Fork the repository
2. Create a feature branch following our naming convention
3. Write tests first (TDD)
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
git clone https://github.com/YOUR_ORG/miniature-guacamole.git
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

### Project Structure

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

## Coding Standards

### Test-Driven Development (TDD)

We follow strict TDD practices:
- **Write tests before code** (RED phase)
- **Write minimal code to pass tests** (GREEN phase)
- **Refactor while keeping tests green** (REFACTOR phase)
- All features must have tests before implementation

### Test Coverage

- Maintain **99% test coverage** across the codebase
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

**Types:**
- `feat/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation changes
- `test/` - Test additions or modifications
- `chore/` - Maintenance tasks

**Examples:**
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

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code refactoring
- `test` - Test additions/updates
- `docs` - Documentation changes
- `chore` - Maintenance tasks

**Scope examples:** `dashboard`, `memory`, `audit`, `skills`, `agents`

**Example commits:**
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

## Adding New Features

### Adding a New Agent

1. **Create skill definition:**
   ```bash
   mkdir -p .claude/skills/<agent-name>
   # Create .claude/skills/<agent-name>/SKILL.md
   ```

2. **Create subagent definition (if IC):**
   ```bash
   mkdir -p .claude/agents/<agent-name>
   # Create .claude/agents/<agent-name>/agent.md
   ```

3. **Update delegation hierarchy:**
   - Edit `.claude/shared/handoff-protocol.md`
   - Update delegation authority matrix

4. **Add tests:**
   ```bash
   # Create tests/unit/agents/<agent-name>.test.ts
   # Verify delegation patterns work
   ```

5. **Update documentation:**
   - Add agent to README.md agent roster
   - Add to `.claude/README.md`
   - Update architecture diagrams

### Adding a New Workflow

1. **Create workflow skill:**
   ```bash
   mkdir -p .claude/skills/<workflow-name>
   # Create .claude/skills/<workflow-name>/SKILL.md
   ```

2. **Define workflow steps:**
   - Document agent spawning logic
   - Define memory read/write protocol
   - Specify success criteria

3. **Add integration tests:**
   ```bash
   # Create tests/integration/<workflow-name>.test.ts
   # Test complete workflow execution
   ```

4. **Document workflow:**
   - Add to README.md workflows section
   - Add examples showing usage
   - Update workflow guide

### Modifying the Delegation Hierarchy

1. **Update handoff protocol:**
   - Edit `.claude/shared/handoff-protocol.md`
   - Update delegation authority matrix
   - Document new delegation patterns

2. **Update agent skills:**
   - Modify relevant SKILL.md files
   - Update delegation instructions
   - Update reporting relationships

3. **Test delegation chains:**
   - Verify new chains work correctly
   - Test depth limits still enforced
   - Test loop prevention still works

4. **Update architecture docs:**
   - Update hierarchy diagrams
   - Update delegation flow charts
   - Update architecture documentation

### Extending the Shared Memory Layer

1. **Write tests first:**
   ```bash
   # Add tests to tests/unit/memory/
   # Verify new functionality
   ```

2. **Implement feature:**
   ```typescript
   // Add to src/memory/
   // Follow existing patterns
   // Maintain type safety
   ```

3. **Update API docs:**
   - Document new functions
   - Add usage examples
   - Update src/memory/README.md

4. **Verify coverage:**
   ```bash
   npm run test:coverage
   # Ensure 99%+ coverage maintained
   ```

## Testing Guidelines

### Unit Tests

Unit tests should:
- Test a single function or module
- Be fast (< 100ms per test)
- Not depend on external services
- Use mocks for dependencies

Example:
```typescript
import { writeMemory } from '../memory/write';

describe('writeMemory', () => {
  it('should write memory to file', async () => {
    const result = await writeMemory({
      agent_id: 'test',
      data: { key: 'value' }
    });
    expect(result.success).toBe(true);
  });
});
```

### Integration Tests

Integration tests should:
- Test multiple components together
- Verify end-to-end workflows
- Use real files (in test directory)
- Clean up after themselves

Example:
```typescript
describe('TDD Workflow', () => {
  it('should execute complete cycle', async () => {
    // Test QA writes tests
    // Test Dev implements
    // Test QA verifies
    // Test Staff Eng reviews
  });
});
```

### Test Naming

Use descriptive names that explain what is being tested:
```typescript
// Good
it('should return error when file does not exist')
it('should increment depth when delegating')
it('should prevent circular delegation')

// Bad
it('should work')
it('test function')
it('handles errors')
```

## Documentation Standards

### Code Comments

Only add comments when code cannot be self-documenting:

```typescript
// Good - complex algorithm needs explanation
// Use binary search to find insertion point
// Time complexity: O(log n)
const index = binarySearch(arr, target);

// Bad - obvious comment
// Increment counter
counter++;
```

### README Updates

When adding features, update README.md with:
- Feature description
- Usage examples
- Configuration options
- Breaking changes (if any)

### Documentation Site

This site is built with VitePress. To update:

```bash
cd docs
npm run dev  # Preview locally
npm run build  # Build for production
```

## Getting Help

- Review existing code and tests for patterns
- Check `.claude/shared/` directory for protocols and standards
- Read the [Architecture Guide](/architecture)
- Read the [Agent Reference](/agents)
- Open an issue for questions or clarifications
- Join discussions on GitHub

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please:
- Be respectful and professional
- Provide constructive feedback
- Focus on the code, not the person
- Help others learn and grow

See our full [Code of Conduct](https://github.com/YOUR_ORG/miniature-guacamole/blob/main/CODE_OF_CONDUCT.md).

## License

By contributing, you agree that your contributions will be licensed under the same MIT License that covers the project.

---

**Thank you for contributing to miniature-guacamole!**

We appreciate your time and effort in making this project better.
