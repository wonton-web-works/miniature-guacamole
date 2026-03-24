# Security Audit — miniature-guacamole / PrivatePremium Premium
**Auditor:** Security Engineer (miniature-guacamole)
**Date:** 2026-03-23
**Scope:** Premium auth CLI scripts, Wonton API routes, premium marketing site, session/credential files, dependency vulnerabilities, secret scanning
**Domains assessed:** web, systems, cloud, crypto
**Prior audit:** docs/design-specs/premium-security-review.md (2026-03-22)

---

## What Changed Since Last Audit

- `premium.astro` was **removed from `site/src/pages/`** — the premium page is no longer served from the site. The file exists at `site/src/scripts/premium.ts` as extracted JS only.
- `site/public/_headers` now **exists** with security headers — the HIGH finding from the prior audit (no headers) has been remediated.
- `site/public/robots.txt` now **exists** — but the `/pilot` path is NOT disallowed. The LOW finding from the prior audit (no robots.txt) is partially remediated.
- Premium auth pipeline (`mg-login`, `mg-logout`, `mg-upgrade`, `mg-status`, `mg-dev-key`) is **new surface area** not covered by the prior audit.
- Wonton API routes for `auth/`, `licenses/`, and `premium/` are **new surface area**.

---

## Summary

No critical vulnerabilities were found in the API layer. The most impactful new findings are: (1) JSON injection via unsanitized user input in `mg-login` shell script; (2) the `/api/mg/auth/login` endpoint has no rate limiting despite being a password authentication endpoint; (3) the `mg-dev-key` script ships in the distribution and creates non-expiring premium sessions; (4) `robots.txt` was added but still does not disallow `/pilot`; and (5) two HIGH-severity CVEs in the dashboard's `next` and `undici` dependencies require upgrade.

---

## Findings

---

### HIGH — JSON injection in `mg-login` via unsanitized email/password in `printf`

**SEVERITY:** HIGH
**LOCATION:** `src/installer/mg-login:111-112`

```bash
REQUEST_BODY="$(printf '{"email":"%s","password":"%s","machineId":"%s"}' \
  "$EMAIL" "$PASSWORD" "$MACHINE_ID")"
```

**Finding:** User-supplied `EMAIL` and `PASSWORD` are interpolated directly into a JSON string using `printf`. No escaping or sanitization is applied. An attacker who controls the email or password field can inject arbitrary JSON by including `"`, `\`, or JSON structure characters.

Example: entering an email of `x","role":"admin","extra":"` transforms the body into:
```json
{"email":"x","role":"admin","extra":"","password":"...","machineId":"..."}
```

While the server-side login route (`app/api/mg/auth/login/route.ts`) uses `request.json()` and Prisma parameterized queries (so the injection does not reach the database), JSON injection can still:
- Corrupt the request body structure and cause unexpected server behavior
- Break the `machineId` field binding (a device fingerprinting value)
- If the API ever evolves to parse additional top-level fields without strict validation, this becomes a privilege escalation vector

**Fix:** Use `jq` when available to construct the JSON body safely. Fall back to manual escaping (replacing `\` with `\\` and `"` with `\"`) when jq is absent:

```bash
if $HAS_JQ; then
  REQUEST_BODY=$(jq -n \
    --arg email "$EMAIL" \
    --arg password "$PASSWORD" \
    --arg machineId "$MACHINE_ID" \
    '{"email":$email,"password":$password,"machineId":$machineId}')
else
  # Escape backslash first, then double-quote
  EMAIL_ESC=$(printf '%s' "$EMAIL" | sed 's/\\/\\\\/g; s/"/\\"/g')
  PASS_ESC=$(printf '%s' "$PASSWORD" | sed 's/\\/\\\\/g; s/"/\\"/g')
  MID_ESC=$(printf '%s' "$MACHINE_ID" | sed 's/\\/\\\\/g; s/"/\\"/g')
  REQUEST_BODY="{\"email\":\"${EMAIL_ESC}\",\"password\":\"${PASS_ESC}\",\"machineId\":\"${MID_ESC}\"}"
fi
```

---

### HIGH — `/api/mg/auth/login` has no rate limiting (brute-force attack surface)

**SEVERITY:** HIGH
**LOCATION:** `/tmp/wonton/app/api/mg/auth/login/route.ts`, `/tmp/wonton/middleware.ts`

**Finding:** The Wonton middleware applies rate limiting only to the Wonton login path (`/login` POST, line 83). The matcher explicitly excludes API paths (`(?!_next|favicon|api).*`), meaning `/api/mg/auth/login` receives zero rate limiting. An attacker can make unlimited password guesses against any account. The endpoint also does not return `Retry-After` headers.

Combined with the fact that `mg-login` accepts a password from stdin and sends it in plaintext JSON, a scripted attacker can attempt high-volume credential stuffing with no throttle.

The API does use bcrypt (12 rounds) and constant-time comparison against a dummy hash for non-existent users — this provides timing attack resistance. But this does not prevent volume attacks.

**Fix:**
1. Add a dedicated rate-limit call in `middleware.ts` for `/api/mg/auth/login` POST requests, mirroring the existing `/login` pattern:
   ```ts
   if (nextUrl.pathname === "/api/mg/auth/login" && req.method === "POST") {
     const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
     const allowed = rateLimit(`mg-login:${ip}`, 10, 15 * 60 * 1000);
     if (!allowed) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
   }
   ```
   Note: the matcher must also include `/api/mg/:path*` for this to fire — the current matcher regex excludes all `/api` paths.
2. Consider per-email rate limiting in addition to per-IP to defend against distributed attacks.

---

### HIGH — Dashboard dependencies: CVEs in `next`, `undici`, `rollup`, `minimatch`

**SEVERITY:** HIGH
**LOCATION:** `/Users/byaizaki/miniature-guacamole/dashboard/package-lock.json`

**Finding:** `npm audit` in `dashboard/` reports 4 HIGH and 5 MODERATE vulnerabilities:

| Package | CVE Type | Severity |
|---|---|---|
| `next` (current) | DoS via Image Optimizer remotePatterns misconfiguration | HIGH |
| `next` (current) | HTTP request deserialization DoS (RSC) | HIGH |
| `next` (current) | HTTP request smuggling via rewrites | HIGH |
| `next` (current) | Unbounded next/image disk cache growth | HIGH |
| `undici` | WebSocket 64-bit length parser overflow | HIGH |
| `undici` | HTTP request/response smuggling | HIGH |
| `undici` | Unbounded memory via WebSocket permessage-deflate | HIGH |
| `undici` | CRLF injection via `upgrade` option | HIGH |
| `rollup` | Arbitrary file write via path traversal (GHSA-xxxx) | HIGH |
| `minimatch` | ReDoS via repeated wildcards | HIGH |

The `next` HTTP request smuggling vulnerability (if this is a production dashboard) is the most operationally significant — it can allow an attacker to poison shared cache entries or bypass authentication middleware.

**Fix:** Upgrade `next` to the patched version (the audit suggests a fix is available). Run `npm audit fix` for automatic resolvable upgrades; review breaking changes for semver-major bumps (`@vitest/coverage-v8` requires major version upgrade). The `rollup`, `undici`, and `minimatch` issues are likely transitive — upgrading `next` may resolve them.

**Note:** `site/` has zero vulnerabilities — only `dashboard/` is affected.

---

### MEDIUM — `mg-dev-key` creates non-expiring premium sessions; distributed in installer

**SEVERITY:** MEDIUM
**LOCATION:** `src/installer/mg-dev-key`

**Finding:** `mg-dev-key` is a shell script in the installer that creates a local premium session file (`~/.claude/ext-session.json`) with:
- `"tier": "premium"` — full premium features enabled
- `"seats": 999`
- `"expiresAt": "2099-12-31T23:59:59Z"` — effectively non-expiring
- `"devMode": true`

The token format `dev-local-{machineId}` is deterministic and based on publicly derivable machine info. The script writes the session file **without** setting 0600 permissions — the umask line used in `mg-login` is absent. The file is written with default umask (typically 0644 on most systems), making the token world-readable until `chmod 600` runs afterward (line 61).

More significantly: this script is bundled in the installer (`src/installer/`) and ships to all users. If a client discovers the script, they can generate their own premium session locally that passes all CLI-side checks (since `mg-upgrade` reads the local session file and only checks the token's presence, not its origin). The server-side download route (`/api/mg/premium/download`) validates the token against the database, so the dev session would be blocked there — but CLI workflows that only read the local session file (like `mg-status`'s local display, or any CLI tool that inspects tier/features before making an API call) would show "premium" status to the user.

**Fix:**
1. Move `mg-dev-key` out of the installer distribution. It should only exist in the framework development repository, not in client-installed packages.
2. Fix the write order: apply `chmod 600` before writing content, or use `umask 177` (matching `mg-login`) in a subshell:
   ```bash
   (umask 177 && cat > "$SESSION_FILE" <<ENDJSON
   ...
   ENDJSON
   )
   # Remove the separate chmod 600 line — umask handles it atomically
   ```
3. Add a TTL to dev sessions (e.g., 7 days) to limit blast radius if one escapes.

---

### MEDIUM — `ORCHESTRATOR_AGENT_PATH` env var in download route: server-side path traversal risk

**SEVERITY:** MEDIUM
**LOCATION:** `/tmp/wonton/app/api/mg/premium/download/route.ts:54-56`

```ts
const orchestratorAgentPath =
  process.env.ORCHESTRATOR_AGENT_PATH ??
  join(process.cwd(), "agents", "orchestrator", "AGENT.md");
```

**Finding:** The Orchestrator download endpoint reads a file from a path controlled by the `ORCHESTRATOR_AGENT_PATH` environment variable. If an attacker can set this environment variable (via a misconfigured deployment pipeline, secrets injection, SSRF to a metadata endpoint, or CI/CD environment compromise), they can cause the endpoint to serve the contents of any file readable by the Next.js process — `/etc/passwd`, other agent files, `.env.local`, private keys, etc. — to any authenticated premium user.

The variable is documented only in a test file comment (`process.env.ORCHESTRATOR_AGENT_PATH = "/fake/agents/orchestrator/AGENT.md"`), not in `.env.example`, which suggests it was added for testing convenience without a full security review.

**Fix:**
1. Validate `ORCHESTRATOR_AGENT_PATH` against an allowlist of permitted prefixes at startup:
   ```ts
   const rawPath = process.env.ORCHESTRATOR_AGENT_PATH;
   if (rawPath) {
     const resolved = path.resolve(rawPath);
     const allowed = path.resolve(process.cwd(), "agents");
     if (!resolved.startsWith(allowed + path.sep)) {
       throw new Error("ORCHESTRATOR_AGENT_PATH outside permitted directory");
     }
   }
   ```
2. Or remove the env var override entirely and use only `join(process.cwd(), "agents", "orchestrator", "AGENT.md")`.
3. Add `ORCHESTRATOR_AGENT_PATH` to `.env.example` with a comment warning that arbitrary paths are dangerous.

---

### MEDIUM — No rate limiting on `/api/mg/auth/register` (org enumeration + account creation abuse)

**SEVERITY:** MEDIUM
**LOCATION:** `/tmp/wonton/app/api/mg/auth/register/route.ts`

**Finding:** The registration endpoint is completely unauthenticated and unthrottled. It accepts `orgSlug` from user input and creates an `MgOrganization`. While duplicate slugs return 409, an attacker can:
1. Enumerate valid org slugs by scripting registrations and observing the 409 vs. 201 response difference (org slug enumeration).
2. Pre-register org slugs on behalf of target companies before they sign up (org squatting).
3. Create unlimited user accounts, which consumes database resources.

**Fix:**
1. Add rate limiting to `/api/mg/auth/register` (e.g., 3 registrations per IP per hour) in the middleware.
2. Restrict registration to admin-initiated flows: require an invite token or a pre-created org record. The endpoint comment says "Does NOT issue a license — that is a separate admin action" — make the entire registration process admin-initiated.
3. If self-service registration must remain, validate that `orgSlug` matches an allowlist format (`^[a-z0-9-]{3,50}$`) and add the route to the middleware matcher.

---

### MEDIUM — Session token is `crypto.randomUUID()` — adequate but not HMAC-signed

**SEVERITY:** MEDIUM (informational risk)
**LOCATION:** `/tmp/wonton/app/api/mg/auth/login/route.ts:85`

**Finding:** Session tokens are opaque UUIDs (`crypto.randomUUID()`). This means token validity requires a database lookup on every request (`db.mgSession.findUnique({ where: { token } })`). Under high load, this is a scalability concern. More importantly, UUID v4 tokens provide 122 bits of entropy — which is adequate — but they are not signed. If the database is breached and the `mgSession` table is read, all active session tokens are immediately usable by an attacker.

This is a design decision with a known trade-off, not an immediate vulnerability. The tokens are stored at-rest with 0600 permissions locally, so the local risk is acceptable.

**Fix (recommended, not urgent):** Consider storing a hash of the token in the database (e.g., `SHA-256(token)`) and sending only the raw token to the client. This way, a database breach exposes only hashed tokens, not live credentials. This is the pattern used by GitHub PATs (the `ghp_` format the daemon tests reference).

---

### LOW — `robots.txt` was added but still does not disallow `/pilot`

**SEVERITY:** LOW
**LOCATION:** `site/public/robots.txt`

**Prior finding status:** The prior audit found no `robots.txt` existed (LOW). A `robots.txt` has since been added, but it disallows nothing:

```
User-agent: *
Allow: /
Sitemap: https://private-premium.wontonwebworks.com/sitemap.xml
```

The `/pilot` page remains crawlable. The premium.astro page that linked to `/pilot` has been removed, which reduces public discoverability significantly. However the sitemap (`/sitemap.xml`) — if auto-generated by Astro — may include `/pilot` in its entries.

**Fix:**
```
User-agent: *
Disallow: /pilot
Allow: /

Sitemap: https://private-premium.wontonwebworks.com/sitemap.xml
```
Also verify that `site/public/sitemap.xml` or Astro's sitemap plugin excludes `/pilot`.

---

### LOW — `_headers` file: `X-XSS-Protection: 1; mode=block` is deprecated and counterproductive

**SEVERITY:** LOW
**LOCATION:** `site/public/_headers:6`

**Finding:** The new `_headers` file includes `X-XSS-Protection: 1; mode=block`. This header was deprecated by all major browser vendors in 2019-2021. In some older browsers, it can actually introduce XSS vulnerabilities by causing incorrect page blocking. Modern browsers ignore it. OWASP explicitly recommends removing it.

**Fix:** Remove the `X-XSS-Protection` line. The `Content-Security-Policy` header already present in the file provides the relevant XSS protection in modern browsers.

---

### LOW — CSP `script-src` still includes `'unsafe-inline'`; premium.ts extraction was partial

**SEVERITY:** LOW
**LOCATION:** `site/public/_headers:8`, `site/src/scripts/premium.ts`

**Finding:** The prior audit recommended extracting inline scripts to enable a meaningful `script-src 'self'` CSP. The script has been extracted to `premium.ts`. However, `_headers` still sets `script-src 'self' 'unsafe-inline'`. The `'unsafe-inline'` directive was not removed after the extraction, so the CSP still provides no XSS protection for scripts.

Additionally, the extracted script is loaded from the premium page — but since `site/src/pages/premium.astro` no longer exists in the pages directory, it is unclear whether `premium.ts` is actually being loaded anywhere or has become dead code.

**Fix:**
1. Remove `'unsafe-inline'` from `script-src` now that scripts are in external files. Update to `script-src 'self'`.
2. Confirm whether `premium.ts` is referenced from any active page. If not, it is dead code and should be removed to reduce maintenance surface.

---

### LOW — `mg-dev-key` writes to `ext-session.json` without `umask` protection (race condition)

**SEVERITY:** LOW
**LOCATION:** `src/installer/mg-dev-key:36-61`

**Finding:** The session file is written with `cat > "$SESSION_FILE"` (default umask) and then `chmod 600` is called on line 61. On a shared multi-user system, there is a TOCTOU (time-of-check-time-of-use) window between file creation and the `chmod` call where other users can read the token. `mg-login` avoids this correctly with `(umask 177 && cat > ...)`. `mg-dev-key` does not.

**Fix:** Replace lines 36-59 with a subshell using `umask 177`:
```bash
(umask 177 && cat > "$SESSION_FILE" <<ENDJSON
...
ENDJSON
)
# Remove the separate `chmod 600` line
```

---

### LOW — Admin role check in `licenses/` routes uses flat `session.user.role` field (no org scope)

**SEVERITY:** LOW
**LOCATION:** `/tmp/wonton/app/api/mg/licenses/route.ts:13`, `licenses/[id]/revoke/route.ts:16`

**Finding:** The admin checks in the license management routes use `session.user.role !== "admin"`. The `validateMgSession` function returns a session that includes the user's Wonton platform role (`User.role`), not their MG org-scoped role (`MgOrgMember.role`). This conflates two different role systems:

- `User.role` = platform-wide Wonton admin (super-admin for the entire Wonton platform)
- `MgOrgMember.role` = org-scoped role within a specific MG organization

If a user is made a Wonton platform admin for any reason, they automatically gain the ability to issue and revoke premium licenses for all MG organizations. This is likely the intended behavior (Wonton admins = PrivatePremium admins), but it should be an explicit design decision documented in the code, not an implicit coupling.

**Fix:** Add a comment to both routes clarifying that `admin` here refers to the Wonton platform role. If org-scoped admin authorization is ever needed, a separate check against `MgOrgMember.role` must be added.

---

### INFO — `ext-session.json` permissions are correct (0600)

**SEVERITY:** INFO
**LOCATION:** `~/.claude/ext-session.json`

**Finding:** The session file on this machine has permissions `0600` (owner read/write only). This is the expected and required state per the `mg-login` script's `umask 177` subshell.

**Status:** Correct. No action required.

---

### INFO — `LICENSE.ext` contains no sensitive information

**SEVERITY:** INFO
**LOCATION:** `LICENSE.ext`

**Finding:** The premium license file contains only public legal text (copyright, restrictions, contact email). No internal service URLs, tokens, pricing, or architecture details. The contact address `premium@wontonwebworks.com` is intentionally public.

**Status:** No action required.

---

### INFO — `site/` npm audit: zero vulnerabilities

**SEVERITY:** INFO
**LOCATION:** `site/package-lock.json`

**Finding:** `npm audit` for the marketing site returns zero vulnerabilities across 404 dependencies (295 prod, 19 dev, 103 optional).

**Status:** Clean. No action required.

---

### INFO — `.env.example` in wonton contains only placeholder values

**SEVERITY:** INFO
**LOCATION:** `/tmp/wonton/.env.example`

**Finding:** The `.env.example` file contains only placeholder markers (`replace-with-openssl-rand-base64-32`, `<your-stripe-test-secret-key>`, etc.) and local dev defaults (MinIO credentials `minioadmin`/`minioadmin` which are the standard Docker Compose defaults). No production credentials present.

**Status:** Clean for the example file. Ensure the actual `.env.local` is in `.gitignore` and is never committed.

---

## Prioritized Remediation Backlog

| Priority | Severity | Finding | Effort |
|---|---|---|---|
| 1 | HIGH | Add rate limiting to `/api/mg/auth/login` in middleware | Low |
| 2 | HIGH | Fix JSON injection in `mg-login` `printf` body construction | Low |
| 3 | HIGH | Upgrade `dashboard/` dependencies (`next`, `undici`, `rollup`, `minimatch`) | Medium |
| 4 | MEDIUM | Remove `mg-dev-key` from client distribution; add to dev-only tooling | Low |
| 5 | MEDIUM | Validate/restrict `ORCHESTRATOR_AGENT_PATH` env var in download route | Low |
| 6 | MEDIUM | Add rate limiting to `/api/mg/auth/register`; make admin-gated | Medium |
| 7 | LOW | Fix `mg-dev-key` to use `umask 177` (TOCTOU window on session file) | Trivial |
| 8 | LOW | Add `Disallow: /pilot` to `robots.txt` | Trivial |
| 9 | LOW | Remove `X-XSS-Protection` header from `_headers` | Trivial |
| 10 | LOW | Remove `'unsafe-inline'` from `script-src` in `_headers` | Low |
| 11 | LOW | Document `session.user.role` vs `MgOrgMember.role` distinction in license routes | Trivial |
| 12 | MEDIUM | Consider HMAC-signed or hashed token storage for session table | High |

---

## Prior Audit Finding Status

| Finding | Prior Severity | Status |
|---|---|---|
| No HTTP security headers | HIGH | REMEDIATED — `_headers` file added |
| Pilot gate is client-side only | CRITICAL | OPEN — page still exists, gate unchanged |
| Google Fonts without SRI | HIGH | OPEN — unchanged |
| robots.txt missing | LOW | PARTIALLY REMEDIATED — file added but `/pilot` not excluded |
| Inline `<script>` blocks in premium.astro | MEDIUM | PARTIALLY REMEDIATED — script extracted to `premium.ts` but `unsafe-inline` not removed from CSP |
| `svg.innerHTML = ''` pattern | LOW | REMEDIATED — `premium.ts` uses DOM removal loop (`while (svg.firstChild) svg.removeChild(svg.firstChild)`) |
| Premium page not using Base layout | MEDIUM | N/A — premium.astro removed from pages |

---

## Verdict

**Premium auth pipeline:** The CLI scripts have one concrete exploitable issue (JSON injection in `mg-login` — HIGH), one distribution concern (`mg-dev-key` in client packages — MEDIUM), and minor file permission and TOCTOU issues. The server-side API routes are well-structured, use Prisma parameterized queries throughout (no SQL injection surface), and implement proper bcrypt timing-safe authentication. The primary gap is the absence of rate limiting on auth endpoints.

**Wonton API routes:** No injection vulnerabilities. Auth middleware correctly validates token, expiry, and revocation on every request. The admin role conflation (platform role vs. org role) is a design clarity issue. `ORCHESTRATOR_AGENT_PATH` env var override is a path traversal risk if the server environment is compromised.

**Premium site:** Security headers have been added — this is a meaningful improvement. The prior CRITICAL finding (pilot gate bypass) and HIGH finding (Google Fonts SRI) remain open.

**Dependencies:** `site/` is clean. `dashboard/` has HIGH-severity CVEs in `next` and `undici` that require attention, particularly the HTTP request smuggling vulnerabilities.

**OWASP categories touched:** A01 (Broken Access Control — no rate limiting, role conflation), A03 (Injection — JSON injection in shell), A05 (Security Misconfiguration — deprecated header, unsafe-inline CSP, exposed dev tool), A06 (Vulnerable Components — dashboard deps), A07 (Authentication Failures — no brute-force protection), A08 (Software Integrity — AGENT_PATH path traversal)
