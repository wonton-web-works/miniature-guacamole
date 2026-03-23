# Web Security

Domain reference for web application security reviews. Load this file when the review targets HTTP services, browser-facing applications, APIs, or any code that handles web requests and responses.

## Review Areas

1. **Authentication and Session Management** — Verify authentication mechanisms (OAuth/OIDC, JWT, session cookies), session token generation with CSPRNG, session expiration and invalidation on logout, password storage with bcrypt/scrypt/argon2, and multi-factor authentication (MFA) implementation.
2. **Input Validation and Injection Prevention** — Check all user inputs are validated and sanitized server-side, review parameterized queries for SQL injection (SQLi) prevention, verify output encoding to prevent Cross-Site Scripting (XSS), check for command injection in shell/exec calls, and validate file upload restrictions.
3. **Authorization and Access Control** — Verify role-based access control (RBAC) enforcement on every endpoint, check for insecure direct object references (IDOR), review API authorization scopes and resource ownership, confirm admin function protection, and validate CORS configuration.
4. **Transport and Data Protection** — Confirm TLS enforcement with HSTS headers, review Content Security Policy (CSP) headers, check cookie attributes (Secure, HttpOnly, SameSite), verify sensitive data is not leaked in error messages, and review API key management.
5. **CSRF and Request Integrity** — Verify Cross-Site Request Forgery (CSRF) tokens on state-changing endpoints, check anti-CSRF mechanisms for SPA architectures, and review CORS preflight configuration for cross-origin requests.
6. **API Abuse and Protocol-Level Attacks** — Check rate-limit bypass techniques and enforce rate limiting on all public endpoints, verify GraphQL depth limits and introspection controls to prevent batching attacks, review WebSocket authentication and message validation, check for HTTP request smuggling via mismatched Content-Length/Transfer-Encoding headers, and validate cache poisoning mitigations (Vary headers, cache-control directives).
7. **Mass Assignment** — Verify that API endpoints do not bind all request fields to model objects without allowlisting; review ORM configurations for mass assignment vulnerabilities.

## Threat Model

1. **Injection attacks** — Attacker sends crafted input (SQL, NoSQL, OS commands, LDAP) to execute unintended operations. Mitigate with parameterized queries, input validation, and least-privilege database accounts.
2. **Cross-Site Scripting (XSS)** — Attacker injects malicious scripts into pages viewed by other users, stealing sessions or credentials. Mitigate with context-aware output encoding and strict CSP.
3. **Broken authentication** — Attacker exploits weak credential storage, session fixation, or missing brute-force protection to impersonate users. Mitigate with secure password hashing, rate limiting, and MFA.
4. **CSRF and request forgery** — Attacker tricks authenticated users into performing unintended actions. Mitigate with anti-CSRF tokens and SameSite cookie attributes.
5. **Server-Side Request Forgery (SSRF)** — Attacker manipulates server to make requests to internal resources. Mitigate with URL allowlists and blocking internal network ranges.
6. **Insecure deserialization** — Attacker sends crafted serialized objects to achieve remote code execution or privilege escalation. Mitigate by avoiding native deserialization of untrusted data.
7. **API abuse and protocol-level attacks** — Attacker exploits weak rate limiting for credential stuffing or data harvesting; GraphQL batching and introspection expose schema; HTTP request smuggling splits requests at proxy boundaries enabling cache poisoning and request hijacking; WebSocket connections lack authentication after upgrade; mass assignment allows hidden field injection. Mitigate with strict rate limiting, GraphQL depth limits, disabled introspection in production, request normalization at load balancer, WebSocket token validation, and explicit field allowlists.

## Checklist

- [ ] All endpoints require authentication unless explicitly public
- [ ] Passwords hashed with bcrypt/scrypt/argon2 (cost factor >= 10)
- [ ] SQL queries use parameterized statements (no string concatenation)
- [ ] All user-rendered output is context-encoded (HTML, JS, URL, CSS)
- [ ] CSRF protection on every state-changing endpoint
- [ ] CORS Access-Control-Allow-Origin does not use wildcard for credentialed requests
- [ ] Content-Security-Policy header deployed and restricts inline scripts
- [ ] Strict-Transport-Security header with max-age >= 31536000
- [ ] Session cookies set with Secure, HttpOnly, and SameSite attributes
- [ ] Rate limiting on login, registration, and password reset endpoints
- [ ] File uploads validated by content type, not just extension
- [ ] Error responses do not leak stack traces, SQL errors, or internal paths
- [ ] No hardcoded API keys, tokens, or secrets in source code
- [ ] OWASP Top 10 (2021) coverage verified for each applicable category

## OWASP Top 10 (2021) Mapping

| Category | Key Checks |
|----------|-----------|
| A01 Broken Access Control | RBAC enforcement, IDOR, CORS, directory traversal |
| A02 Cryptographic Failures | TLS, password hashing, secret exposure |
| A03 Injection | SQLi, XSS, command injection, LDAP injection |
| A04 Insecure Design | Threat modeling, abuse case coverage |
| A05 Security Misconfiguration | Default credentials, verbose errors, unnecessary features |
| A06 Vulnerable Components | Dependency audit, known CVEs |
| A07 Identity & Auth Failures | MFA, session management, credential stuffing |
| A08 Software & Data Integrity | CI/CD pipeline security, unsigned updates |
| A09 Logging & Monitoring | Security event logging, alerting |
| A10 SSRF | URL validation, internal network protection |
