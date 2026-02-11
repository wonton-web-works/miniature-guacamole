# Launch Checklist for miniature-guacamole

## Pre-Launch (DO NOT SKIP)

### Git History Cleanup (DESTRUCTIVE - backup first!)
- [ ] Install git-filter-repo: `pip install git-filter-repo`
- [ ] Backup repo: `git clone --mirror . ../miniature-guacamole-backup`
- [ ] Remove .claude/memory/ from history:
  ```bash
  git filter-repo --path .claude/memory/ --invert-paths
  ```
- [ ] Force push to remote: `git push origin --force --all`
- [ ] All team members must re-clone the repository

### Final Validation
- [ ] Run tests: `npm test`
- [ ] Build docs: `cd docs && npm run build`
- [ ] Security scan: `npm audit`
- [ ] Fresh clone test in clean directory

### GitHub Setup
- [ ] Enable GitHub Pages: Settings > Pages > Source: GitHub Actions
- [ ] Set up branch protection: Settings > Branches > Add rule for `main`
  - Require PR reviews: 1
  - Require status checks: `test`, `dashboard`
  - No force pushes
  - No deletions

### Go Live
- [ ] Set repository visibility to Public
- [ ] Create GitHub release v1.0.0
- [ ] Verify docs site deploys: https://rivermark-research.github.io/miniature-guacamole/
- [ ] Update repository description on GitHub

## Post-Launch
- [ ] Monitor GitHub Actions for first PR
- [ ] Test docs site is accessible
- [ ] Share repository link
