# CI/CD Setup

This repository uses GitHub Actions for continuous integration and deployment.

## Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)

Runs on every pull request and push to `main`.

**Jobs:**
- `test` - Root project validation
  - TypeScript type checking
  - Unit tests
  - Coverage reporting

- `dashboard` - Dashboard project validation
  - TypeScript type checking
  - Unit tests

**Configuration:**
- Node.js version: 20
- Uses `npm ci` for reproducible builds
- Caches npm dependencies for faster builds

### 2. Documentation Deployment (`.github/workflows/deploy-docs.yml`)

Deploys VitePress documentation to GitHub Pages.

**Triggers:**
- Push to `main` with changes in `docs/**`
- Manual workflow dispatch

**Jobs:**
- `build` - Builds VitePress documentation
- `deploy` - Deploys to GitHub Pages

**Requirements:**
- GitHub Pages must be enabled in repository settings
- Pages source must be set to "GitHub Actions"

## Local Testing

Before pushing, run these commands locally to catch issues:

```bash
# Root project
npm ci
npx tsc --noEmit
npm test
npm run test:coverage

# Dashboard
cd dashboard
npm ci
npx tsc --noEmit
npm test
```

## Coverage Thresholds

Current configuration runs coverage but does not enforce thresholds. To add enforcement, update the respective `vitest.config.ts` files (see `BRANCH_PROTECTION.md` for details).

## Troubleshooting

### Build failures
- Check Actions logs in GitHub UI
- Run commands locally to reproduce
- Verify all dependencies are in `package.json`

### Cache issues
- GitHub Actions cache may be stale
- Clear cache via repository settings or wait for automatic expiry
- Try manually triggering workflow with "Re-run all jobs"

### Documentation deployment issues
- Verify GitHub Pages is enabled
- Check Pages source is "GitHub Actions" not "Deploy from branch"
- Review deployment logs in Actions tab

## Future Enhancements

Potential additions:
- Lint checks (ESLint)
- Format checks (Prettier)
- E2E tests (Playwright - already in package.json)
- Security scanning (CodeQL, Dependabot)
- Release automation with semantic-release
- Docker image building and publishing
