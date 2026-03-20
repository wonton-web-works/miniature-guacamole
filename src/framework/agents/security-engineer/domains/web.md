# Web Security

Domain reference for web application security reviews. Load this file when the review targets HTTP services, browser-facing applications, APIs, or any code that handles web requests and responses.

## Review Areas

1. **Authentication and Session Management** — Verify authentication mechanisms (OAuth/OIDC, JWT, session cookies), session token generation with CSPRNG, session expiration and invalidation on logout, password storage with bcrypt/scrypt/argon2, and multi-factor authentication (MFA) implementation.
2. **Input Validation and Injection Prevention** — Check all user inputs are validated and sanitized server-side, review parameterized queries for SQL injection (SQLi) prevention, verify output encoding to prevent Cross-Site Scripting (XSS), check for command injection in shell/exec calls, and validate file upload restrictions.
3. **Authorization and Access Control** — Verify role-based access control (RBAC) enforcement on every endpoint, check for insecure direct object references (IDOR), review API authorization scopes and resource ownership, confirm admin function protection, and validate CORS configuration.
4. **Transport and Data Protection** — Confirm TLS enforcement with HSTS headers, review Content Security Policy (CSP) headers, check cookie attributes (Secure, HttpOnly, SameSite), verify sensitive data is not leaked in error messages, and review API key management.
5. **CSRF and Request Integrity** — Verify Cross-Site Request Forgery (CSRF) tokens on state-changing endpoints, check anti-CSRF mechanisms for SPA architectures, and review CORS preflight configuration for cross-origin requests.
6. **API and Protocol-Level Security** — Review GraphQL endpoints for introspection disabled in production, query depth limiting, and batching attack prevention. Verify WebSocket connections enforce authentication, origin validation, and message-size limits. Check for HTTP request smuggling vectors (CL/TE desync) and cache poisoning via unkeyed headers. Validate rate limiting cannot be bypassed via header manipulation or endpoint aliasing. Confirm mass assignment protection on API request bodies.

## Threat Model

1. **Injection attacks** — Attacker sends crafted input (SQL, NoSQL, OS commands, LDAP) to execute unintended operations. Mitigate with parameterized queries, input validation, and least-privilege database accounts.
2. **Cross-Site Scripting (XSS)** — Attacker injects malicious scripts into pages viewed by other users, stealing sessions or credentials. Mitigate with context-aware output encoding and strict CSP.
3. **Broken authentication** — Attacker exploits weak credential storage, session fixation, or missing brute-force protection to impersonate users. Mitigate with secure password hashing, rate limiting, and MFA.
4. **CSRF and request forgery** — Attacker tricks authenticated users into performing unintended actions. Mitigate with anti-CSRF tokens and SameSite cookie attributes.
5. **Server-Side Request Forgery (SSRF)** — Attacker manipulates server to make requests to internal resources. Mitigate with URL allowlists and blocking internal network ranges.
6. **Insecure deserialization** — Attacker sends crafted serialized objects to achieve remote code execution or privilege escalation. Mitigate by avoiding native deserialization of untrusted data.
7. **HTTP request smuggling** — Attacker exploits discrepancies between front-end and back-end HTTP parsing (Content-Length vs Transfer-Encoding) to smuggle requests past security controls, poison caches, or hijack other users' requests. Mitigate by normalizing HTTP parsing, disabling HTTP/1.1 connection reuse where possible, and using HTTP/2 end-to-end.
8. **Cache poisoning** — Attacker manipulates unkeyed request headers or query parameters to store malicious responses in shared caches, serving poisoned content to other users. Mitigate by auditing cache keys, restricting Vary headers, and validating all inputs that influence response content.
9. **GraphQL abuse** — Attacker exploits GraphQL introspection to map the schema, sends deeply nested or batched queries to cause denial of service, or uses alias-based attacks to bypass rate limits. Mitigate by disabling introspection in production, enforcing query depth and complexity limits, and rate limiting by operation cost.
10. **WebSocket hijacking and abuse** — Attacker exploits missing origin validation or authentication on WebSocket upgrades to hijack sessions or inject malicious messages. Mitigate by validating Origin headers, requiring authentication tokens on upgrade, and enforcing message-size limits.
11. **API abuse and mass assignment** — Attacker bypasses rate limiting via header spoofing (X-Forwarded-For), endpoint aliasing, or distributed requests, or exploits mass assignment to overwrite protected fields (role, isAdmin). Mitigate with server-side rate limiting tied to authenticated identity, explicit allowlists on request body fields, and strict DTO validation.

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
- [ ] Rate limiting on login, registration, and password reset endpoints; rate limiting cannot be bypassed via X-Forwarded-For spoofing
- [ ] File uploads validated by content type, not just extension
- [ ] Error responses do not leak stack traces, SQL errors, or internal paths
- [ ] No hardcoded API keys, tokens, or secrets in source code
- [ ] GraphQL introspection disabled in production; query depth and complexity limits enforced
- [ ] WebSocket endpoints validate Origin header and require authentication on upgrade
- [ ] HTTP request smuggling mitigated: consistent CL/TE handling across proxies and backends
- [ ] Cache keys include all security-relevant headers; no cache poisoning via unkeyed inputs
- [ ] Mass assignment protection: API endpoints use explicit field allowlists (not blanket object spread)
- [ ] OWASP Top 10 (2021) coverage verified for each applicable category

## OWASP Top 10 (2021) Mapping

| Category | Key Checks |
|----------|-----------|
| A01 Broken Access Control | RBAC enforcement, IDOR, CORS, directory traversal, mass assignment protection |
| A02 Cryptographic Failures | TLS enforcement, password hashing, secret exposure, cookie Secure attribute |
| A03 Injection | SQLi, XSS, command injection, LDAP injection, GraphQL injection |
| A04 Insecure Design | Threat modeling, abuse case coverage, rate-limit bypass scenarios, mass assignment |
| A05 Security Misconfiguration | Default credentials, verbose errors, unnecessary features, GraphQL introspection enabled |
| A06 Vulnerable Components | Dependency audit, known CVEs, outdated framework versions |
| A07 Identity & Auth Failures | MFA, session management, credential stuffing, WebSocket auth on upgrade |
| A08 Software & Data Integrity | CI/CD pipeline security, unsigned updates, cache poisoning validation |
| A09 Logging & Monitoring | Security event logging, alerting, rate-limit breach detection |
| A10 SSRF | URL validation, internal network protection, DNS rebinding checks |
