## Output Examples

**Show intake flow diagram when entering Phase 0:**

```
               +--------------------+
               |    mg-assess       |
               +---------+----------+
                         |
                 +-------+-------+
                 |  Detect Mode  |
                 +---+-------+---+
             rough   |       |   structured
                     v       v
             +----------+  +----------+
             | INTAKE   |  | EVALUATE |
             | Phase 0  |  | Phase 1+ |
             +----+-----+  +----------+
                  |
                  v
             +----------+
             | EVALUATE |
             | Phase 1+ |
             +----------+
```

**Show multi-lens evaluation diagram when spawning experts:**

```
                    +------------------+
                    |    mg-assess     |
                    +--------+---------+
                             |
          +------------------+------------------+
          v                  v                  v
   +--------------+    +--------------+    +--------------+
   | product-     |    | product-     |    |    cto       |
   |   owner      |    |  manager     |    |              |
   |  (vision)    |    |  (scope)     |    | (technical)  |
   |     {s1}     |    |     {s2}     |    |     {s3}     |
   +--------------+    +--------------+    +--------------+

Legend: pass = done, * = active, o = pending
```

**Intake brief template (Phase 0 output):**

```
## Intake Brief: {Feature Idea}

### Detection
**Mode:** Rough idea | Semi-structured | Structured
**Intake required:** Yes | No

### Structured Brief
**Problem:** {articulated problem statement}
**Users:** {who benefits}
**Success Criteria:** {what success looks like}
**Constraints:** {any limitations}
**Hypothesis:** {initial scope hypothesis}

### Proceeding to Evaluation
Phase 1: Discovery -- {skipping questions already covered | full discovery}
```

**Full assessment template (Phase 1-4 output):**

```
## Feature Assessment: {Feature Name}

### Summary
{1-2 sentence summary of the request}

### Clarifications
**Q:** {question}
**A:** {answer}
...

### Scope Definition
**User Stories:**
- As a {user}, I want {goal} so that {benefit}

**Acceptance Criteria:**
- [ ] {criterion}

**Out of Scope:**
- {explicitly excluded items}

### Feasibility Assessment
**Technical Feasibility:** {CTO input}
**Dependencies:** {list}
**Risks:** {list}

### Value Assessment
**Strategic Fit:** {PO input}
**User Impact:** {expected impact}
**Priority:** {high|medium|low}

### Effort Estimate
{rough sizing: small/medium/large or T-shirt sizing}

### Recommendation
**Decision:** GO | NO-GO | NEEDS MORE INFO

**Rationale:**
{why this decision}

### Next Steps
{If GO:}
- [ ] /mg-assess-tech for architecture planning
- [ ] /mg-design-review for UX planning
- [ ] Assign to /mg-spec for detailed spec

{If NO-GO:}
- [ ] Document decision for future reference
- [ ] Communicate rationale to stakeholders

{If NEEDS MORE INFO:}
- [ ] {specific questions to answer}
```
