## Model Escalation

This skill runs on Sonnet for cost efficiency. Follow `../_shared/model-escalation.md` protocol.

**Escalate to Opus-tier agent (cto) when:**
- Review involves novel architecture patterns not seen in codebase
- Conflicting quality tradeoffs with no clear winner (e.g., performance vs. maintainability)
- Security-critical code requiring threat modeling (auth, crypto, data protection)
- Changes impact 5+ modules or introduce new system-level patterns

**Stay on Sonnet for:**
- Standard quality gate checks (coverage, standards, naming)
- Coordinating staff-engineer and security-engineer specialists
- Synthesizing specialist findings into review output
- Clear pass/fail criteria evaluation
