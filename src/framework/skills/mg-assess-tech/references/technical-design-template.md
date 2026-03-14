# Technical Design Document

Use this template when documenting a technical approach for a feature, architectural change, or significant implementation decision. Each section has guidance — replace the guidance text with content specific to the work being designed.

---

## Problem Statement

Describe the technical challenge that needs to be solved. Explain the constraints, current limitations, and what a good solution needs to achieve. Be concrete about the scope: what does this design cover, and what is explicitly out of scope?

Example: "The current job queue processes tasks synchronously on the web server, which causes request timeouts under load and limits throughput to roughly 20 jobs per minute. We need an approach that decouples job execution from the request cycle and can scale to 500+ jobs per minute without changes to the API surface."

---

## Approaches Evaluated

Document each option that was considered before selecting an approach. For each option, list the pros, cons, and any risks specific to this codebase and context. Do not document only the winning option — this section exists to show the trade-offs were considered.

Options evaluated (add a sub-section for each):

- Option 1: [name the first approach]
- Option 2: [name the second approach]

### Option 1: [Name the approach]

Describe the approach in enough detail that an engineer unfamiliar with the decision can understand what it would involve.

**Pros:**
- List the advantages of this approach relative to the problem and constraints.
- Consider performance, simplicity, maintainability, and fit with existing patterns.

**Cons:**
- List the disadvantages or trade-offs.
- Be specific — "harder to maintain" is less useful than "requires coordinating changes across 4 services."

**Risks:**
- List technical risks specific to this option.

---

### Option 2: [Name the approach]

Describe the second approach.

**Pros:**
- List the advantages.

**Cons:**
- List the disadvantages and trade-offs.

**Risks:**
- List technical risks specific to this option.

---

Add additional options as needed. Consider at least two alternatives before documenting the selected approach.

---

## Selected Approach

State which option was selected and explain the rationale. The explanation should reference the specific pros and cons from the section above — not introduce new reasoning that wasn't already documented.

**Selected:** Option N — [approach name]

**Rationale:** Explain why this option best satisfies the constraints and goals from the Problem Statement. If the decision involved trade-offs, acknowledge them explicitly.

---

## Risk Mitigation

Identify the risks associated with the selected approach and describe how each will be mitigated. Consider implementation risk, operational risk, and rollback risk.

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Describe the risk | Low/Medium/High | Low/Medium/High | Describe what steps reduce this risk |
| Add rows as needed | | | |

---

## Implementation Plan

Describe the phased plan for implementing this design. Break the work into discrete steps that can be reviewed, tested, and merged independently where possible.

**Phase 1: [Name]**
- List the specific tasks in this phase.
- Explain what is deliverable and testable at the end of this phase.

**Phase 2: [Name]**
- List tasks.
- Explain the deliverable.

Add phases as needed. For smaller changes, a flat list of steps is sufficient — the key requirement is that the plan is concrete enough for engineering to estimate and execute.
