# Web Security

Domain reference for web application security reviews. Load this file when the review targets HTTP services, browser-facing applications, APIs, or any code that handles web requests and responses.

## Review Areas

1. **Authentication and Session Management** — Verify authentication mechanisms (OAuth/OIDC, JWT, session cookies), session token generation with CSPRNG, session expiration and invalidation on logout, password storage with bcrypt/scrypt/argon2, and multi-factor authentication (MFA) implementation.
2. **Input Validation and Injection Prevention** — Check all user inputs are validated and sanitized server-side, review parameterized queries for SQL injection (SQLi) prevention, verify output encoding to prevent Cross-Site Scripting (XSS), check for command injection in shell/exec calls, and validate file upload restrictions.
3. **Authorization and Access Control** — Verify role-based access control (RBAC) enforcement on every endpoint, check for insecure direct object references (IDOR), review API authorization scopes and resource ownership, confirm admin function protection, and validate CORS configuration.
4. **Transport and Data Protection** — Confirm TLS enforcement with HSTS headers, review Content Security Policy (CSP) headers, check cookie attributes (Secure, HttpOnly, SameSite), verify sensitive data is not leaked in error messages, and review API key management.
5. **CSRF and Request Integrity** — Verify Cross-Site Request Forgery (CSRF) tokens on state-changing endpoints, check anti-CSRF mechanisms for SPA architectures, and review CORS preflight configuration for cross-origin requests.
6. **API and Protocol Security** — Review WebSocket authentication and message validation, check GraphQL endpoints for injection, batching attacks, introspection exposure, and depth limits, verify rate-limit bypass mitigations, check for mass assignment vulnerabilities in request body parsing, review HTTP request smuggling exposure (chunked encoding, CL.TE), and assess cache poisoning risk (unkeyed headers, host header injection).

## Threat Model

1. **Injection attacks** — Attacker sends crafted input (SQL, NoSQL, OS commands, LDAP) to execute unintended operations. Mitigate with parameterized queries, input validation, and least-privilege database accounts.
2. **Cross-Site Scripting (XSS)** — Attacker injects malicious scripts into pages viewed by other users, stealing sessions or credentials. Mitigate with context-aware output encoding and strict CSP.
3. **Broken authentication** — Attacker exploits weak credential storage, session fixation, or missing brute-force protection to impersonate users. Mitigate with secure password hashing, rate limiting, and MFA.
4. **CSRF and request forgery** — Attacker tricks authenticated users into performing unintended actions. Mitigate with anti-CSRF tokens and SameSite cookie attributes.
5. **Server-Side Request Forgery (SSRF)** — Attacker manipulates server to make requests to internal resources. Mitigate with URL allowlists and blocking internal network ranges.
6. **Insecure deserialization** — Attacker sends crafted serialized objects to achieve remote code execution or privilege escalation. Mitigate by avoiding native deserialization of untrusted data.
7. **API abuse** — Attacker bypasses rate limiting to brute-force credentials or scrape data; mass assignment vulnerabilities allow overwriting protected fields. Mitigate with per-user rate limits and explicit allowlists for writable fields.
8. **HTTP request smuggling** — Attacker exploits disagreements between front-end proxy and back-end server on request boundaries to poison queues or bypass access controls. Mitigate by normalizing chunked encoding handling and using HTTP/2 end-to-end.
9. **Cache poisoning** — Attacker injects malicious responses into shared caches via unkeyed inputs (Host header, X-Forwarded-Host). Mitigate by keying caches on all user-controllable headers and avoiding caching of responses that vary on unvalidated headers.
10. **WebSocket hijacking** — Attacker performs cross-site WebSocket hijacking (CSWSH) by luring victim to open a malicious page that upgrades a WebSocket without CSRF protection. Mitigate with origin validation and session tokens in the WebSocket handshake.
11. **GraphQL attacks** — Attacker uses introspection to enumerate schema, batches queries to amplify load, or crafts deeply nested queries to trigger DoS. Mitigate with disabled introspection in production, query depth and complexity limits, and batching restrictions.

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
- [ ] WebSocket endpoints validate Origin header and authenticate the handshake
- [ ] GraphQL: introspection disabled in production, depth limit enforced, batching restricted
- [ ] API endpoints protected against mass assignment (explicit field allowlists)
- [ ] Rate-limit bypass vectors checked (IP rotation, header spoofing, parameter variation)
- [ ] HTTP request smuggling risk assessed for all reverse-proxy/backend pairs
- [ ] Cache poisoning risk assessed; unkeyed headers do not influence cached responses

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
