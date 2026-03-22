# Agent Reference

This page provides detailed specifications for all 24 agents in the system, organized by organizational level.

## Sage

The Sage sits above all other roles. It is the project-level orchestrator and entry point for all miniature-guacamole work. One Sage per project.

| Agent | Slash Command | Model | Role |
|-------|---------------|-------|------|
| **Sage** | `/sage` | opus | Project orchestrator, session manager, research evaluator, quality enforcer |

### Sage

**Responsibilities:**
- Receive and route all incoming work (intake)
- Assess scope and selectively spawn the appropriate C-Suite roles
- Evaluate research quality using structured gap detection
- Enforce gates and challenge shallow or skipped work
- Manage session scope to prevent context bloat
- Persist specialist knowledge across sessions

**Delegation Authority:**
- Can delegate to: CEO, CTO, CMO, CFO, supervisor
- Does not reach past C-Suite — C-Suite spawns its own directors and ICs

**Example Usage:**
```
/sage Plan the Q3 launch for the new dashboard feature
/sage We need to evaluate migrating from REST to GraphQL
/sage Research the tradeoffs between Postgres and DynamoDB for this use case
```

---

## Executive Level

Executive agents set strategic vision and make high-level decisions. They use the opus model for complex reasoning.

| Agent | Slash Command | Model | Role | Direct Reports |
|-------|---------------|-------|------|----------------|
| **CEO** | `/ceo` | opus | Sets business vision and strategic direction | CTO, Engineering Director, Product Owner, Art Director |
| **CTO** | `/cto` | opus | Sets technical vision, evaluates architectures | Engineering Director, Staff Engineer |
| **CMO/COO** | `/cmo` | opus | Sets marketing direction and operational standards | Art Director, Product Owner, Copywriter, Design |
| **CFO** | `/cfo` | sonnet | Cost analysis, resource allocation, ROI assessment | (analysis only — no direct reports) |
| **Engineering Director** | `/engineering-director` | opus | Oversees engineering operations and delivery | Engineering Manager, Staff Engineer |

### CEO (Chief Executive Officer)

**Responsibilities:**
- Define business strategy and product vision
- Approve major initiatives and feature decisions
- Participate in executive reviews and code approvals
- Ensure alignment between business goals and technical execution

**Delegation Authority:**
- Can delegate to: CTO, Engineering Director, Product Owner, Art Director
- Cannot delegate to ICs directly (must go through leadership)

**Example Usage:**
```
/ceo Review our Q4 product strategy
/ceo Should we build or buy for payment processing?
/ceo Evaluate the competitive landscape for authentication
```

### CTO (Chief Technology Officer)

**Responsibilities:**
- Set technical vision and architecture standards
- Evaluate technical feasibility of initiatives
- Make build vs buy decisions for infrastructure
- Participate in executive reviews and code approvals

**Delegation Authority:**
- Can delegate to: Engineering Director, Staff Engineer
- Can use Task tool to spawn: dev

**Tool Access:** Read, Glob, Grep, Edit, Write

**Example Usage:**
```
/cto Evaluate microservices vs monolith architecture
/cto Review our database scaling strategy
/cto Assess technical feasibility of real-time features
```

### CMO/COO (Chief Marketing Officer / Chief Operating Officer)

**Responsibilities:**
- Approve or block marketing campaigns and go-to-market plans
- Set brand direction and voice standards
- Evaluate operational readiness before launches
- Ensure what is promised externally matches what can be delivered internally

**Delegation Authority:**
- Can delegate to: Art Director, Copywriter, Product Owner, Design
- Escalates resource conflicts to CEO

**Example Usage:**
```
/cmo Evaluate the GTM plan for the v4.2 release
/cmo Review brand consistency across the new onboarding flow
/cmo Assess operational readiness before we open the pilot
```

### CFO (Chief Financial Officer)

**Responsibilities:**
- Audit agent spawn patterns for cost efficiency
- Recommend model tier selection (opus/sonnet/haiku) based on task complexity
- Assess ROI of research spikes and feature investment
- Challenge wasteful workflows or unjustified deep spawn chains
- Flag sunk-cost reasoning

**Delegation Authority:**
- Analysis and recommendation only — does not delegate implementation
- Escalates strategic resource conflicts to CEO

**Example Usage:**
```
/cfo Audit the token cost of the current mg-build workflow
/cfo Assess ROI of a three-day research spike on GraphQL migration
/cfo Recommend model tiers for the new onboarding feature workstream
```

### Engineering Director

**Responsibilities:**
- Oversee engineering operations and delivery
- Manage engineering team capacity and priorities
- Participate in executive reviews and code approvals
- Ensure operational readiness for deployments

**Delegation Authority:**
- Can delegate to: Engineering Manager, Staff Engineer
- Can use Task tool to spawn: dev, qa

**Example Usage:**
```
/engineering-director Review team capacity for Q4
/engineering-director Assess operational readiness for launch
/engineering-director Evaluate engineering process improvements
```

## Leadership Level

Leadership agents handle tactical planning and team coordination. They use the sonnet model for balanced capability and cost.

| Agent | Slash Command | Model | Role | Direct Reports |
|-------|---------------|-------|------|----------------|
| **Product Owner** | `/product-owner` | sonnet | Owns product vision and backlog prioritization | Product Manager |
| **Product Manager** | `/product-manager` | sonnet | Manages feature specs and cross-functional coordination | - |
| **Engineering Manager** | `/engineering-manager` | sonnet | Manages team execution and delivery | Dev, QA |
| **Staff Engineer** | `/staff-engineer` | sonnet | Technical leader, sets standards | Dev |
| **Art Director** | `/art-director` | sonnet | Sets design vision and brand standards | Design |

### Product Owner

**Responsibilities:**
- Own product vision and strategy
- Prioritize product backlog
- Define feature requirements at strategic level
- Participate in feature assessments

**Delegation Authority:**
- Can delegate to: Product Manager
- Cannot use Task tool to spawn ICs

**Example Usage:**
```
/product-owner Prioritize the Q4 feature backlog
/product-owner Define requirements for user onboarding
/product-owner Evaluate strategic fit of two-factor auth
```

### Product Manager

**Responsibilities:**
- Break down features into user stories
- Define acceptance criteria (Given/When/Then)
- Coordinate cross-functional work
- Work with QA to define test specifications

**Delegation Authority:**
- Can use Task tool to spawn: dev, qa, design

**Tool Access:** Read, Glob, Grep (read-only)

**Example Usage:**
```
/product-manager Break down authentication feature into stories
/product-manager Define acceptance criteria for login flow
/product-manager Coordinate design and dev for checkout
```

### Engineering Manager

**Responsibilities:**
- Manage team execution and delivery
- Assign work to dev and QA
- Coordinate CAD cycle execution
- Report on team progress and blockers

**Delegation Authority:**
- Can use Task tool to spawn: dev, qa

**Tool Access:** Read, Glob, Grep, Edit, Write

**Example Usage:**
```
/engineering-manager Assign authentication tasks to team
/engineering-manager Review sprint progress and blockers
/engineering-manager Coordinate dev and QA for testing
```

### Staff Engineer

**Responsibilities:**
- Set technical standards and patterns
- Conduct code reviews for ICs
- Mentor developers on architecture
- Make technical decisions for implementation

**Delegation Authority:**
- Can use Task tool to spawn: dev

**Tool Access:** Read, Glob, Grep, Edit, Write

**Example Usage:**
```
/staff-engineer Review code quality for WS-1
/staff-engineer Define API design patterns
/staff-engineer Evaluate testing strategy for auth
```

### Art Director

**Responsibilities:**
- Set design vision and brand standards
- Define design system components
- Review UI/UX work from designers
- Ensure brand consistency across features

**Delegation Authority:**
- Can use Task tool to spawn: design

**Example Usage:**
```
/art-director Define brand guidelines for new feature
/art-director Review design system for dashboard
/art-director Set visual standards for mobile app
```

## Individual Contributor Level

IC agents perform hands-on implementation work. They use sonnet or haiku models depending on task complexity.

| Agent | Slash Command | Model | Role | Can Consult |
|-------|---------------|-------|------|-------------|
| **Senior Fullstack Engineer** | `/dev` | sonnet | Implements test-first, DRY, config-over-composition, 99% coverage | QA, Design |
| **QA Engineer** | `/qa` | sonnet | Misuse-first test specs, Playwright E2E, visual regression screenshots | Dev, Design |
| **UI/UX Designer** | `/design` | sonnet | Creates wireframes, mockups, and interaction designs | Dev, QA |
| **Security Engineer** | `/security-engineer` | sonnet | Security reviews and threat modeling | Dev, QA |
| **DevOps Engineer** | `/devops-engineer` | sonnet | Infrastructure and deployment automation | Dev |
| **Data Engineer** | `/data-engineer` | sonnet | Data pipelines and analytics | Dev |
| **API Designer** | `/api-designer` | sonnet | API specifications and documentation | Dev, Technical Writer |
| **Technical Writer** | `/technical-writer` | sonnet | Documentation and guides | Dev, API Designer |
| **Copywriter** | `/copywriter` | sonnet | Natural, human-sounding copy for marketing and user-facing content | Dev, Design |

### Senior Fullstack Engineer (Dev)

**Responsibilities:**
- Implement features test-first with artifact bundles
- Follow DRY principle (Don't Repeat Yourself)
- Use config-over-composition patterns
- Achieve 99% test coverage
- Refactor code while maintaining green tests

**Consultation:**
- Can consult QA for testing guidance (peer consultation)
- Can consult Design for implementation feasibility (peer consultation)
- Peer consultations do NOT count toward delegation depth

**Tool Access:** Read, Glob, Grep, Edit, Write

**Example Usage:**
```
/dev Implement login endpoint
/dev Refactor authentication service for DRY
/dev Add input validation to user registration
```

### QA Engineer

**Responsibilities:**
- Write tests BEFORE implementation (misuse-first ordering)
- Define acceptance specifications (Given/When/Then)
- Implement Playwright E2E tests
- Capture visual regression screenshots
- Verify 99% code coverage

**Consultation:**
- Can consult Dev for implementation details (peer consultation)
- Can consult Design for expected behavior (peer consultation)

**Tool Access:** Read, Glob, Grep, Edit, Write

**Example Usage:**
```
/qa Write test specs for login endpoint
/qa Verify test coverage for authentication
/qa Create Playwright E2E tests for checkout flow
```

### UI/UX Designer

**Responsibilities:**
- Create wireframes and mockups
- Define interaction designs
- Ensure accessibility compliance
- Maintain design system consistency

**Consultation:**
- Can consult Dev for implementation feasibility (peer consultation)
- Can consult QA for testing requirements (peer consultation)

**Tool Access:** Read, Glob, Grep (read-only)

**Example Usage:**
```
/design Create mockups for login screen
/design Design user onboarding flow
/design Ensure WCAG 2.1 AA compliance for forms
```

### Security Engineer

**Responsibilities:**
- Conduct security reviews (OWASP Top 10)
- Threat modeling and risk assessment
- Review authentication and authorization
- Validate data protection measures

**Consultation:**
- Can consult Dev for implementation details (peer consultation)
- Can consult QA for security test coverage (peer consultation)

**Tool Access:** Read, Glob, Grep, Edit, Write

**Example Usage:**
```
/security-engineer Review authentication implementation
/security-engineer Conduct threat model for payment flow
/security-engineer Validate OWASP compliance
```

### DevOps Engineer

**Responsibilities:**
- Set up CI/CD pipelines
- Infrastructure as code
- Deployment automation
- Monitoring and alerting

**Consultation:**
- Can consult Dev for deployment requirements (peer consultation)

**Tool Access:** Read, Glob, Grep, Edit, Write

**Example Usage:**
```
/devops-engineer Set up GitHub Actions workflow
/devops-engineer Configure Docker deployment
/devops-engineer Create monitoring alerts
```

### Data Engineer

**Responsibilities:**
- Design data pipelines
- Implement ETL processes
- Optimize database queries
- Build analytics infrastructure

**Consultation:**
- Can consult Dev for data requirements (peer consultation)

**Tool Access:** Read, Glob, Grep, Edit, Write

**Example Usage:**
```
/data-engineer Design user analytics pipeline
/data-engineer Optimize database query performance
/data-engineer Build reporting infrastructure
```

### API Designer

**Responsibilities:**
- Define API specifications (OpenAPI/Swagger)
- Design RESTful endpoints
- Document API contracts
- Ensure API consistency

**Consultation:**
- Can consult Dev for implementation constraints (peer consultation)
- Can consult Technical Writer for documentation (peer consultation)

**Tool Access:** Read, Glob, Grep, Edit, Write

**Example Usage:**
```
/api-designer Create OpenAPI spec for authentication
/api-designer Design REST endpoints for user management
/api-designer Document API versioning strategy
```

### Technical Writer

**Responsibilities:**
- Write user documentation
- Create API documentation
- Maintain README files
- Document workflows and processes

**Consultation:**
- Can consult Dev for technical details (peer consultation)
- Can consult API Designer for specifications (peer consultation)

**Tool Access:** Read, Glob, Grep, Edit, Write

**Example Usage:**
```
/technical-writer Document authentication API
/technical-writer Create user guide for onboarding
/technical-writer Update README with examples
```

### Copywriter

**Responsibilities:**
- Write natural, human-sounding marketing copy
- Create narration, web content, and scripts
- Ensure authentic voice in user-facing prose
- Collaborate with design and product teams

**Consultation:**
- Can consult Dev for technical details (peer consultation)
- Can consult Design for visual context (peer consultation)

**Tool Access:** Read, Glob, Grep, Edit, Write

**Example Usage:**
```
/copywriter Write landing page copy for the new feature
/copywriter Create onboarding email sequence
/copywriter Draft release announcement
```

## Operations Level

Operations agents handle deployment and infrastructure concerns.

| Agent | Slash Command | Model | Role |
|-------|---------------|-------|------|
| **Deployment Engineer** | `/deployment-engineer` | sonnet | Handles merges and releases after leadership approval |

### Deployment Engineer

**Responsibilities:**
- Merge approved branches to main
- Resolve merge conflicts (with dev help)
- Tag releases
- Clean up feature branches

**Tool Access:** Read, Glob, Grep, Edit, Write (plus Git commands via Bash)

**Example Usage:**
```
/deployment-engineer Merge feature/ws-1-login
/deployment-engineer Tag release v1.0.0
/deployment-engineer Clean up merged branches
```

## System Agents

System agents provide monitoring and coordination functions.

| Agent | Slash Command | Role |
|-------|---------------|------|
| **Supervisor** | `/supervisor` | Monitors depth limits, detects loops, prevents infinite chains |

### Supervisor

**Responsibilities:**
- Monitor delegation depth across all chains
- Detect circular delegation attempts
- Enforce depth limits (max 3 levels)
- Report delegation violations

**Example Usage:**
```
/supervisor Check delegation depth for current chain
/supervisor Report on delegation patterns
/supervisor Validate handoff protocol compliance
```

## Tool Access Matrix

| Agent | Read | Glob | Grep | Edit | Write |
|-------|------|------|------|------|-------|
| Sage | ✅ | ✅ | ✅ | - | - |
| CEO | - | - | - | - | - |
| CTO | ✅ | ✅ | ✅ | ✅ | ✅ |
| CMO/COO | ✅ | ✅ | ✅ | - | - |
| CFO | ✅ | ✅ | ✅ | - | - |
| Engineering Director | - | - | - | - | - |
| Product Owner | - | - | - | - | - |
| Product Manager | ✅ | ✅ | ✅ | - | - |
| Engineering Manager | ✅ | ✅ | ✅ | ✅ | ✅ |
| Staff Engineer | ✅ | ✅ | ✅ | ✅ | ✅ |
| Art Director | - | - | - | - | - |
| Dev | ✅ | ✅ | ✅ | ✅ | ✅ |
| QA | ✅ | ✅ | ✅ | ✅ | ✅ |
| Design | ✅ | ✅ | ✅ | - | - |
| Security Engineer | ✅ | ✅ | ✅ | ✅ | ✅ |
| DevOps Engineer | ✅ | ✅ | ✅ | ✅ | ✅ |
| Data Engineer | ✅ | ✅ | ✅ | ✅ | ✅ |
| API Designer | ✅ | ✅ | ✅ | ✅ | ✅ |
| Technical Writer | ✅ | ✅ | ✅ | ✅ | ✅ |
| Copywriter | ✅ | ✅ | ✅ | ✅ | ✅ |
| Deployment Engineer | ✅ | ✅ | ✅ | ✅ | ✅ |
| Supervisor | ✅ | ✅ | ✅ | - | - |

## Composite Teams

Teams provide coordinated multi-agent collaboration.

| Team | Slash Command | Model | Members | Purpose |
|------|---------------|-------|---------|---------|
| **Leadership Team** | `/mg-leadership-team` | opus | CEO, CTO, Engineering Director | Strategic decisions, executive reviews, code review approvals |
| **Product Team** | `/mg-spec` | sonnet | Product Owner, Product Manager, Designer | Product definition, requirements, UX specifications |
| **Build Team** | `/mg-build` | sonnet | Engineering Manager, Staff Engineer, Dev, QA | CAD development cycle with 99% coverage |
| **Design Team** | `/mg-design` | sonnet | Art Director, Designer | UI/UX design with visual regression |
| **Docs Team** | `/mg-document` | sonnet | Technical Writer, API Designer | Documentation and API specs |

See [Workflows Guide](/workflows) for examples of team usage.
