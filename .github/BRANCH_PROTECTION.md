# Branch Protection Configuration

This document provides recommended branch protection settings for the `main` branch.

## GitHub Repository Settings

Navigate to: **Settings > Branches > Branch protection rules > Add rule**

### Branch Name Pattern
```
main
```

### Recommended Protection Rules

#### Protect matching branches
- [x] **Require a pull request before merging**
  - [x] Require approvals: **1**
  - [ ] Dismiss stale pull request approvals when new commits are pushed (optional)
  - [ ] Require review from Code Owners (if CODEOWNERS file exists)

- [x] **Require status checks to pass before merging**
  - [x] Require branches to be up to date before merging
  - **Required status checks:**
    - `test` (from CI workflow)
    - `dashboard` (from CI workflow)

- [x] **Require conversation resolution before merging**
  - Ensures all PR comments are addressed

- [x] **Require linear history**
  - Prevents merge commits, enforces rebase or squash merging

- [ ] **Require deployments to succeed before merging** (optional)
  - Use if you have staging environment deployments

#### Additional settings
- [ ] **Require signed commits** (recommended for open source)
- [x] **Include administrators**
  - Apply rules to repository administrators as well
- [x] **Restrict who can push to matching branches**
  - Prevents direct pushes, all changes must go through PRs
- [ ] **Allow force pushes** (keep disabled)
- [ ] **Allow deletions** (keep disabled)

## Recommended Merge Strategy

Configure under: **Settings > General > Pull Requests**

- [x] **Allow squash merging** (recommended)
  - Default to pull request title and description
- [ ] **Allow merge commits** (disable for cleaner history)
- [x] **Allow rebase merging** (optional, for developers who prefer rebasing)
- [x] **Automatically delete head branches** (cleanup after merge)

## Status Check Configuration

The CI workflow (`.github/workflows/ci.yml`) defines two jobs:
- `test` - Runs root project tests and coverage
- `dashboard` - Runs dashboard tests

Both must pass before merging is allowed.

## Coverage Thresholds

To enforce coverage thresholds, add to root `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    }
  }
})
```

And to `dashboard/vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70
      }
    }
  }
})
```

Note: Coverage thresholds can be adjusted based on project maturity.

## GitHub Pages Configuration

To enable documentation deployment:

1. Navigate to **Settings > Pages**
2. Under "Build and deployment":
   - Source: **GitHub Actions**
3. The `deploy-docs.yml` workflow will automatically deploy on pushes to `main` that modify `docs/**`

## Troubleshooting

### Status checks not appearing
- Push a test commit to verify workflows run
- Check Actions tab for workflow execution
- Ensure workflow job names match exactly in branch protection settings

### Pages deployment failing
- Verify Pages is enabled with "GitHub Actions" as source
- Check that repository has Pages permissions enabled
- Review Actions logs for deployment errors

## Maintenance

Review and update these settings:
- Quarterly: Review if protection rules are too strict/loose
- When adding new workflows: Update required status checks
- When project reaches stable release: Consider requiring signed commits
