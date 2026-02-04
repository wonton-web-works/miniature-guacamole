# Engineering Principles

These principles guide all engineering work in this organization.

## Core Principles

### 1. TDD/BDD First
**Tests are written BEFORE code.**

- Tests define the contract
- Code is written to satisfy tests
- Red → Green → Refactor cycle
- Never ship without tests

```
Write Test (fails) → Write Code (passes) → Refactor (still passes)
```

### 2. Configuration Over Composition
**Prefer configurable components over composed ones.**

```typescript
// BAD: Deep composition
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardBody>Content</CardBody>
</Card>

// GOOD: Configuration
<Card title="Title" body="Content" />

// BETTER: Config-driven
const cardConfig = { title: "Title", body: "Content", variant: "primary" };
<Card config={cardConfig} />
```

**Why?**
- Easier to test (config is data)
- Easier to serialize (store in DB, send over API)
- Single source of truth for variations
- Reduces prop drilling

### 3. DRY (Don't Repeat Yourself)
**Every piece of knowledge has a single, unambiguous representation.**

- If you write it twice, extract it
- Use shared utilities and constants
- Create reusable hooks/functions
- Centralize configuration

```typescript
// BAD: Repeated validation
const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const otherEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(otherEmail);

// GOOD: Single source of truth
const validators = {
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
};
const emailValid = validators.email(email);
const otherEmailValid = validators.email(otherEmail);
```

### 4. 99% Code Coverage
**Unit + Integration tests must cover 99% of all code.**

| Test Type | Purpose | Target |
|-----------|---------|--------|
| Unit | Individual functions/components | 99% of functions |
| Integration | Component interactions | 99% of flows |
| E2E (Playwright) | User journeys | Critical paths |
| Visual Regression | UI consistency | All components |

**Coverage = (Lines + Branches + Functions + Statements) / 4**

---

## Testing Standards

### Test Types

#### Unit Tests (Vitest/Jest)
- Test individual functions in isolation
- Mock external dependencies
- Fast, focused, many of these

#### Integration Tests (Testing Library)
- Test component interactions
- Test API integrations
- Test state management flows

#### E2E Tests (Playwright)
- Test complete user journeys
- Run in real browser
- Include visual regression screenshots

#### Visual Regression (Playwright Screenshots)
- Capture baseline screenshots
- Detect visual changes
- Design team approves changes

### Coverage Requirements

```bash
# Must pass before merge
npm test -- --coverage --coverageThreshold='{
  "global": {
    "lines": 99,
    "branches": 99,
    "functions": 99,
    "statements": 99
  }
}'
```

### Test File Structure

```
tests/
├── unit/
│   └── [feature].test.ts
├── integration/
│   └── [feature].integration.test.ts
├── e2e/
│   ├── [feature].spec.ts
│   └── [feature].spec.ts-snapshots/
│       ├── component-default.png
│       └── component-hover.png
└── fixtures/
    └── [feature].fixtures.ts
```

---

## Code Quality Standards

### TypeScript Strict Mode
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### ESLint Rules (Enforced)
- No unused variables
- No any types (explicit)
- Consistent return types
- No console.log in production

### Prettier (Formatting)
- Consistent across codebase
- Run on pre-commit hook
- No debates about style

---

## Git Workflow

### Branch Naming
```
feature/ws-{N}-{short-name}
fix/ws-{N}-{short-name}
```

### Commit Messages
```
test: Add test specs for [feature]
feat: Implement [feature]
fix: Correct [issue] in [area]
refactor: Extract [what] to [where]
```

### Pre-commit Checks
1. Linting passes
2. Type checking passes
3. Tests pass
4. Coverage threshold met
5. No console.logs

---

## Review Checklist

Before submitting for review:

- [ ] All tests pass
- [ ] Coverage is 99%+
- [ ] No linting errors
- [ ] No TypeScript errors
- [ ] DRY principles followed
- [ ] Configuration over composition used
- [ ] Visual regression screenshots captured
- [ ] No console.logs left
- [ ] Documentation updated (if API changed)
