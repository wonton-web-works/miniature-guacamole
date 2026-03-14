# Product Requirements Document

Use this template when writing a PRD for a new feature or significant change. Each section has guidance — replace the guidance text with real content specific to the feature being specified.

---

## Problem

Describe the problem users are currently experiencing. Be specific: who runs into this, in what context, and what goes wrong. A strong problem statement explains the root cause, not just the symptom.

Example framing: "Users who manage multiple projects cannot quickly see which ones are blocked without navigating into each project individually. This leads to missed deadlines and manual tracking in spreadsheets."

---

## Users

List the user segments who benefit from solving this problem. For each segment, describe their context, goals, and how they're currently affected by the problem.

- **Primary segment** — the main audience for this feature. Explain what they're trying to accomplish and why the current state fails them.
- **Secondary segment** — other users who benefit, even if the feature isn't primarily designed for them.

Specify user characteristics that are relevant to design decisions (technical proficiency, device type, usage frequency, etc.).

---

## Success Criteria

List measurable outcomes that define success for this feature. Each criterion should be verifiable — either by analytics, user research, or a defined test.

- Specify the metric, the baseline (if known), and the target.
- Avoid vague criteria like "users are happy." Use observable behavior instead.

Examples:
- Task completion rate for the primary flow exceeds 85% in usability testing.
- Feature adoption reaches 40% of active users within 60 days of launch.
- Support tickets related to this workflow decrease by 30%.

---

## User Stories

Write user stories using the standard format. Each story should represent a discrete unit of value — something a user can do that they couldn't before, or can do significantly better.

As a project manager, I want to see the status of all my projects on a single dashboard so that I can identify blocked items without clicking into each one.

As a team member, I want to receive a notification when my assigned task is blocked so that I can follow up without waiting for a status meeting.

Add a story for each distinct user action or outcome the feature needs to support.

---

## Acceptance Criteria

Define the specific conditions that must be true for this feature to be considered complete. These are evaluated during QA and reviewed at sign-off. Use checkbox format.

- [ ] The feature is accessible from the main navigation without more than two clicks.
- [ ] All status changes are reflected within 5 seconds without a page reload.
- [ ] The feature is fully operable using keyboard navigation only.
- [ ] Screen readers can interpret all interactive elements with appropriate labels.
- [ ] The feature behaves correctly on mobile viewports (320px minimum width).
- [ ] No existing features regress as measured by the automated test suite.

---

## Design Requirements

Describe the UX, visual, and accessibility requirements for this feature. These inform the designer's work and set expectations for engineering.

**UX Requirements:**
- Explain the key interaction patterns. How does a user initiate, progress through, and complete the flow? What happens when something goes wrong?
- Identify any flows that require empty states, loading states, or error states.

**Visual Requirements:**
- Describe how this feature fits into the existing design system. Reference specific components, color tokens, or layout patterns where relevant.
- Note any new UI elements that don't exist yet and will need to be designed from scratch.

**Accessibility Requirements:**
- List WCAG compliance level required (typically AA).
- Specify any keyboard, screen reader, or contrast requirements specific to this feature.

---

## Business Case

Explain why this feature is worth building. Describe the strategic fit, the opportunity, and the expected impact.

**Strategic fit:** Explain how this feature supports company goals or addresses a competitive gap.

**Opportunity:** Describe the size or urgency of the problem from a business perspective.

**Expected impact:** List anticipated outcomes — user retention, conversion, support cost reduction, etc.

**Risks and assumptions:**
- List the key assumptions behind this business case. What must be true for the expected impact to materialize?
- Identify risks — competitive, technical, market, or operational — that could reduce the expected value.
- Note any dependencies on external factors (market conditions, partner availability, regulatory changes).

Note: Financial figures in this section (revenue projections, cost estimates, ROI) are data provided by user and are not independently verified by the product team. Do not fabricate numbers — leave estimates blank if the user has not supplied them, and attribute any figures to their source.
