## Model Escalation

This skill runs on Sonnet for cost efficiency. Follow `../_shared/model-escalation.md` protocol.

**Escalate to Opus-tier agent (cto) when:**
- New attack surface with no existing mitigation pattern in codebase
- Cryptographic implementation decisions (key management, algorithm selection)
- Authentication/authorization architecture changes
- Findings conflict with business requirements (security vs. usability tradeoff)

**Stay on Sonnet for:**
- OWASP Top 10 checklist evaluation (pattern-based)
- Dependency scanning (npm audit, known CVEs)
- Hardcoded secrets detection (grep patterns)
- Coordinating security-engineer specialist
- Standard input validation and XSS checks
