# Diagrams

Visual architecture and process flow diagrams for the framework. All diagrams are in Mermaid format (`.mmd` files in `diagrams/`).

## Architecture

| Diagram | Description |
|---------|-------------|
| [Agent Hierarchy](https://github.com/wonton-web-works/miniature-guacamole/blob/main/docs/diagrams/agent-hierarchy.mmd) | 24-agent organizational chart with delegation arrows across 5 tiers |
| [Security Trust Boundaries](https://github.com/wonton-web-works/miniature-guacamole/blob/main/docs/diagrams/security-trust-boundaries.mmd) | Trust boundaries, tool access matrix, audit logging |
| [Data Isolation](https://github.com/wonton-web-works/miniature-guacamole/blob/main/docs/diagrams/data-isolation.mmd) | NDA-safe project isolation model |
| [Installation Flow](https://github.com/wonton-web-works/miniature-guacamole/blob/main/docs/diagrams/installation-flow.mmd) | Two-phase install: global bundle + per-project init |

## Process Flows

| Diagram | Description |
|---------|-------------|
| [Skill Invocation](https://github.com/wonton-web-works/miniature-guacamole/blob/main/docs/diagrams/skill-invocation-flow.mmd) | User command through agent spawning to result |
| [Memory Protocol](https://github.com/wonton-web-works/miniature-guacamole/blob/main/docs/diagrams/memory-protocol-flow.mmd) | Read/write patterns across 5 memory file types |
| [CAD Workflow](https://github.com/wonton-web-works/miniature-guacamole/blob/main/docs/diagrams/cad-workflow.mmd) | INTAKE to SHIP gates with MECHANICAL/ARCHITECTURAL fork |
| [TDD Workflow](https://github.com/wonton-web-works/miniature-guacamole/blob/main/docs/diagrams/tdd-workflow.mmd) | Misuse-first test ordering for both tracks |

---

To render these diagrams locally, use the [Mermaid CLI](https://github.com/mermaid-js/mermaid-cli):

```bash
npx @mermaid-js/mermaid-cli -i docs/diagrams/agent-hierarchy.mmd -o docs/diagrams/agent-hierarchy.svg
```
