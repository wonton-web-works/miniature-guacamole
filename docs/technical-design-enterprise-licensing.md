# Technical Design: Enterprise Licensing System

**Status:** Draft
**Author:** Staff Engineer
**Date:** 2026-03-22
**Applies to:** miniature-guacamole / PrivateEnterprise Enterprise Edition

---

## Overview

This document specifies the enterprise licensing system for PrivateEnterprise. The system protects the Sage agent and associated enterprise features from unauthorized redistribution. It operates in three layers:

- **Layer 1 — License Key Validation** (implement now): Local HMAC-signed license files with offline validation
- **Layer 2 — Legal Framework** (draft this week): License agreement structure and split LICENSE file strategy
- **Layer 3 — Private Registry** (Month 2, design only): Private distribution channel for enterprise agent files

The design is intentionally lean for the 30-day revenue window. Layer 1 is implementable in a single workstream with no external dependencies. Layers 2 and 3 are specced to avoid re-architecting when we get there.

---

## Threat Model

Before diving into implementation, establish what we are and are not defending against.

**Realistic threats (must defend):**
- A licensed client copies their `sage/AGENT.md` to an unlicensed team member
- A client lets their license expire and continues using enterprise features
- Someone forks the repo after briefly seeing a Sage file and uses it commercially
- A client uses a single seat license across 20 developers

**Unrealistic threats (do not over-engineer for):**
- A determined developer strips the license check from `SKILL.md` and patches the skill — this is open-source software and we cannot prevent static file modification
- State-actor adversaries reverse-engineering the HMAC key from distributed public keys

**Accepted risk:**
The Sage `AGENT.md` is a Markdown file loaded by Claude Code. It cannot be compiled or encrypted in the traditional sense. Our protection is: (1) contractual via the license agreement, (2) operational via signature validation that catches honest mistakes and casual copying, and (3) distribution via private registry in Layer 3 for the strongest defense. An attacker who manually reads the file, understands what it does, and copies it without a license check is violating the contract — not defeating cryptography. The contract and the signature together are sufficient for our client profile (funded startups, not open-source purists).

---

## Layer 1: License Key Validation

### 1.1 License File Schema

Location: `.claude/enterprise-license.json` at the root of the client's project.

```json
{
  "version": 1,
  "org": {
    "name": "Acme Corp",
    "id": "acme-corp-2026-001"
  },
  "tier": "enterprise",
  "seats": 5,
  "features": [
    "sage",
    "cmo-enterprise",
    "cfo-enterprise",
    "session-management",
    "research-specialists",
    "drift-enforcement"
  ],
  "issued_at": "2026-03-22T00:00:00Z",
  "expires_at": "2027-03-22T00:00:00Z",
  "machine_fingerprint": null,
  "signature": "hmac-sha256:<hex-encoded-signature>"
}
```

**Field definitions:**

| Field | Type | Description |
|-------|------|-------------|
| `version` | integer | Schema version. Increment when schema changes break backward compat. |
| `org.name` | string | Human-readable org name. Included in warning messages. |
| `org.id` | string | Slug-format unique identifier. Used as canonical ID in our records. Format: `{slug}-{year}-{sequence}`. |
| `tier` | enum | `starter` / `team` / `enterprise`. Controls feature gate defaults. |
| `seats` | integer | Number of licensed seats. Enforced contractually; HMAC does not encode seat count in a way that prevents copying. |
| `features` | string[] | Explicit list of licensed features. Validation checks this list. New enterprise features are added here. |
| `issued_at` | ISO 8601 | Timestamp of issue. Included in HMAC payload. |
| `expires_at` | ISO 8601 | Timestamp of expiry. Null = perpetual (avoid for now). |
| `machine_fingerprint` | string or null | SHA-256 of machine identifier (see Section 1.5). Null = no per-machine enforcement. |
| `signature` | string | `hmac-sha256:<hex>` — HMAC-SHA256 over canonical payload (see Section 1.3). |

**Tier feature matrix:**

| Feature | starter | team | enterprise |
|---------|---------|------|------------|
| sage | | | yes |
| cmo-enterprise | | yes | yes |
| cfo-enterprise | | yes | yes |
| session-management | | | yes |
| research-specialists | | | yes |
| drift-enforcement | | | yes |

The `features` array in the license file is the authoritative source at validation time. The tier is informational for display and defaults. A `team` license with `sage` in the features array is valid for Sage use.

### 1.2 Signing Payload

The HMAC signature is computed over a canonical string representation of the license fields — not the raw JSON. This prevents signature bypass via JSON key reordering or whitespace manipulation.

**Canonical payload (pipe-delimited):**

```
{version}|{org.id}|{org.name}|{tier}|{seats}|{features_sorted_joined}|{issued_at}|{expires_at}|{machine_fingerprint_or_empty}
```

**Construction rules:**
- All string fields: trimmed, no surrounding whitespace
- `features`: sorted alphabetically, joined with `,` (no spaces)
- `issued_at` and `expires_at`: ISO 8601 UTC, normalized to `Z` suffix
- `machine_fingerprint`: use empty string if null
- Concatenate fields with `|` as separator
- Encode result as UTF-8 bytes
- Compute HMAC-SHA256 using the private key bytes

**Example canonical payload:**
```
1|acme-corp-2026-001|Acme Corp|enterprise|5|cfo-enterprise,cmo-enterprise,drift-enforcement,research-specialists,sage,session-management|2026-03-22T00:00:00Z|2027-03-22T00:00:00Z|
```

### 1.3 Key Management

**Private key (signing key):**
- Lives in Wonton Web Works 1Password under `private-enterprise/license-signing-key`
- Never committed to any repository, ever
- Used only by the license generation tool (see Section 1.4)
- 256-bit random key generated with `openssl rand -hex 32`
- Rotation: if key is compromised, all existing licenses must be reissued. Avoid rotation by protecting the key carefully.

**Public key (verification key):**
- Also a shared secret in this scheme — HMAC uses the same key for sign and verify
- Embedded in `src/framework/shared/enterprise-validation.md` as a protocol document
- This file must be excluded from the public GitHub repo via `.gitignore` or the private repo approach (see Layer 3)
- For Layer 1 (before private registry), embed the key directly in the validation section of the Sage `AGENT.md` and the `mg-leadership-team` SKILL.md under a clearly marked `## License Validation` section
- The public verification key has the same value as the private signing key in HMAC (symmetric). The distinction is operational: the signing key is in 1Password, the embedded key is the copy that agents use

**Key embedding format in AGENT.md:**
```
## License Validation Key
<!-- enterprise-only: do not commit to public repo -->
VALIDATION_KEY=8f3a1c9d... (64 hex chars)
```

Agents read this key from their own AGENT.md at validation time. No network call required.

### 1.4 License Generation Tool

A minimal shell script at `tools/generate-license.sh`. Not committed to the public repo — lives in the private Wonton Web Works internal tools repo.

**Inputs:**
```
--org-name "Acme Corp"
--org-id "acme-corp-2026-001"
--tier enterprise
--seats 5
--features sage,cmo-enterprise,cfo-enterprise,session-management,research-specialists,drift-enforcement
--expires "2027-03-22T00:00:00Z"
--machine-fingerprint ""   # optional
--signing-key "$LICENSE_SIGNING_KEY"  # from env, sourced from 1Password
```

**Process:**
1. Assemble the JSON object (all fields except signature)
2. Construct canonical payload string per Section 1.2
3. Compute `HMAC-SHA256(canonical_payload, signing_key)`
4. Encode as hex, prepend `hmac-sha256:`
5. Insert signature into JSON object
6. Write to `enterprise-license-{org-id}.json`
7. Print human-readable summary

**Output goes to:** Operator copies the file and delivers to client (see Section 1.6).

**Rate limit:** The tool is manual. No bulk generation mechanism exists. If someone needs 50 licenses, that is a sales conversation, not a script invocation.

### 1.5 Machine Fingerprinting

Machine fingerprinting is **optional** — enabled only on request for clients requiring strict per-seat enforcement.

**When to use:** Enterprise clients with >10 seats who specifically request it. Adds friction for legitimate use cases (CI/CD, VM migration, laptop replacement) that do not justify the support burden at our current scale.

**Default:** `machine_fingerprint: null` — no per-machine enforcement.

**Fingerprint construction (if used):**
```
SHA-256(hostname + ":" + primary-MAC-address)
```

Computed by reading `hostname` and `ip link show` (Linux) or `ifconfig en0` (macOS) at validation time. Hash is stored in the license. Validation fails if computed hash does not match stored hash.

**Known failure modes:**
- Docker containers: hostname changes per container run
- CI/CD: ephemeral machines will always fail
- Laptop replacement: requires license reissue
- VPN with MAC randomization: breaks matching

**Recommendation:** Do not enable fingerprinting by default. Add a `--skip-fingerprint` escape hatch that logs a warning rather than hard-failing, for CI/CD compatibility.

### 1.6 Validation Logic

**Where validation runs:**
1. **Sage intake** (primary gate): Sage reads and validates the license at the top of its intake flow, before spawning any C-Suite agents
2. **mg-leadership-team skill invocation** (secondary gate): Skill checks for valid enterprise license before activating Enterprise Mode. If no valid license, falls back to Community Mode silently

Both gates run independently. This prevents bypass by invoking the skill directly without going through Sage.

**Validation algorithm:**

```
function validate_license(license_file_path, validation_key):
  1. Check if license file exists
     - NO: return {mode: "community", reason: "no_license"}

  2. Parse JSON — if malformed:
     - return {mode: "community", reason: "parse_error", warn: true}

  3. Check schema version
     - version > 1: warn "license schema version unsupported, attempting validation"

  4. Reconstruct canonical payload from license fields (per Section 1.2)

  5. Compute expected_sig = HMAC-SHA256(canonical_payload, validation_key)

  6. Compare expected_sig with license.signature (constant-time comparison)
     - MISMATCH: return {mode: "community", reason: "tampered", warn: true}

  7. Check expires_at
     - current UTC time > expires_at:
       return {mode: "community", reason: "expired", warn: true}

  8. Check machine_fingerprint (if not null):
     - Compute local fingerprint
     - Compare (constant-time)
     - MISMATCH: return {mode: "community", reason: "fingerprint_mismatch", warn: true}

  9. Check feature requested is in license.features
     - NOT PRESENT: return {mode: "community", reason: "feature_not_licensed", warn: true}

  10. All checks passed:
      return {mode: "enterprise", tier: license.tier, org: license.org.name}
```

**Key property: always fails safe.** Any error condition — parse failure, missing file, tampered signature, expired license — falls back to Community Mode. The system never crashes. It never exposes an error that reveals internal validation logic. It degrades gracefully.

**Constant-time comparison:** Use a timing-safe equality function when comparing HMAC values to prevent timing oracle attacks. In shell: use `openssl` or Python `hmac.compare_digest`. Do not use string equality (`==`).

### 1.7 User-Facing Behavior

**Valid license, feature licensed:**
- No message printed. Enterprise Mode activates silently.
- The `edition: enterprise` field in the session log confirms it worked.

**Expired license:**
```
[MG] License for {org.name} expired {days_ago} days ago.
[MG] Continuing in Community Mode. Contact support@private-enterprise.com to renew.
```

**Missing license file:**
- No message. Community Mode activates silently. This is the normal path for community users.

**Tampered license:**
```
[MG] License file signature invalid.
[MG] Continuing in Community Mode. If you believe this is an error, contact support@private-enterprise.com.
```

Do not say "tampered." The message is neutral — it could be a corrupted file, a copy from another machine, or actual tampering. The user does not need to know which.

**Feature not licensed:**
```
[MG] Your license ({tier} tier) does not include {feature}.
[MG] Contact support@private-enterprise.com to upgrade.
```

**Fingerprint mismatch:**
```
[MG] License is not valid on this machine.
[MG] Contact support@private-enterprise.com to transfer your license.
```

### 1.8 Integration Points

**Sage AGENT.md — Intake Flow modification:**

Add a license validation step before Step 2 of the Intake Flow:

```
0. Validate enterprise license
   - Read .claude/enterprise-license.json
   - Run validation algorithm
   - If mode == "community": warn if applicable, then halt (do not continue as Sage in community mode — Sage is enterprise-only)
   - If mode == "enterprise": continue intake flow normally
```

The Sage should **not fall back to Community Mode** — it should simply decline to run and leave the invocation to the community flow. The skill handles the fallback. The Sage does not degrade to a partial version of itself.

**mg-leadership-team SKILL.md — Edition Detection modification:**

Replace the current edition detection block:

```
Current:
IF .claude/agents/sage/AGENT.md exists → ENTERPRISE MODE
ELSE                                    → COMMUNITY MODE

Replace with:
1. Run license validation
2. IF valid enterprise license with 'sage' feature AND .claude/agents/sage/AGENT.md exists:
   → ENTERPRISE MODE
3. ELSE:
   → COMMUNITY MODE (silently)
```

The physical presence of `AGENT.md` is still checked as a second gate — the file must exist AND the license must be valid. This prevents a scenario where someone has a valid license but has not installed the enterprise agent files.

**Install script — enterprise upgrade path:**

The `mg upgrade --enterprise` command (to be built in WS-LICENSE-04):
1. Prompts for license file path (or reads from `--license-file` flag)
2. Copies license to `.claude/enterprise-license.json`
3. Downloads enterprise agent files from private registry (Layer 3) or copies from local path (Layer 1 interim)
4. Runs validation to confirm setup is correct
5. Prints confirmation or error

**Interim (Layer 1, before private registry):**
Deliver enterprise agent files manually (email, secure file transfer). Client places them at `.claude/agents/sage/AGENT.md`. The license file validates their right to use them.

---

## Layer 2: Legal Framework

### 2.1 License Agreement Structure

The enterprise license agreement covers the following sections. This is an outline for the lawyer to draft from. Notes in brackets are instructions, not final text.

**Section 1 — Definitions**
- "Software" = the enterprise agent files, skill files, and protocol documents distributed under this agreement
- "Community Software" = the miniature-guacamole open-source components distributed under the MIT License
- "Licensed Features" = the features enumerated in the License File
- "Seat" = one (1) individual human developer who accesses or uses the Software
- "Organization" = the entity named in the License File

**Section 2 — Grant of License**
- Non-exclusive, non-transferable, non-sublicensable right to use the Software
- Scoped to the Organization named in the License File
- Limited to the number of Seats specified in the License File
- Limited to the Licensed Features specified in the License File
- Duration: from `issued_at` to `expires_at` as specified in the License File

[Note for lawyer: ensure "non-transferable" explicitly covers acquisition scenarios — if Acme Corp is acquired by BigCorp, the license does not automatically transfer to BigCorp's 500 developers.]

**Section 3 — Seat Definition**
- A Seat is consumed by any individual who: (a) runs the Software, (b) accesses agent outputs generated by the Software, or (c) configures or deploys the Software
- Automated pipelines (CI/CD, daemon processes) that run without human intervention in a given session do not consume a Seat
- Seat count is tracked by the Organization on the honor system; Wonton Web Works reserves the right to audit (see Section 8)

[Note for lawyer: "honor system" is acceptable for Tier 1 clients at current scale. Flag for revision when we have >10 clients.]

**Section 4 — Redistribution Prohibition**
- Organization shall not distribute, publish, sublicense, sell, or otherwise transfer the Software or any portion thereof to any third party
- This includes: posting to public repositories, including in OSS projects, copying to other organizations, or making available via any network service
- The AGENT.md files, SKILL.md files, and shared protocol files distributed as part of this agreement are proprietary and confidential

**Section 5 — Restrictions**
- No reverse engineering of the license validation mechanism
- No circumvention of license checks
- No modification of HMAC signatures
- No removal of license headers from enterprise files
- No use of the Software beyond the Licensed Features

**Section 6 — Intellectual Property**
- Wonton Web Works retains all IP in the Software
- Organization retains all IP in their project outputs (code, documents, plans generated by the agents working on client projects)
- The agents are tools; Wonton Web Works makes no claim on the work product the agents produce

[Note for lawyer: this "client owns outputs" clause is a selling point — make it prominent and clear.]

**Section 7 — Termination**
Wonton Web Works may terminate the license immediately upon:
- Breach of redistribution prohibition
- Non-payment after 30-day cure period
- Discovery of circumvention of license checks

Upon termination, Organization must: (a) delete all enterprise agent files, (b) cease use within 48 hours, (c) certify deletion in writing.

**Section 8 — Audit Rights**
Wonton Web Works may request, with 30 days written notice, a self-certification audit:
- Organization provides a written list of individuals with access to the Software
- Seat count verification
- No remote access to client systems required

[Note for lawyer: keep audit rights lightweight — overly invasive audit clauses kill deals at the startup/SMB level. A written self-cert is sufficient at our scale.]

**Section 9 — Data Ownership and Privacy**
- Wonton Web Works does not collect telemetry, usage data, or project data through the Software
- License validation is performed locally (no phone-home)
- The License File contains only the data provided at purchase (org name, features, seats, dates)
- No project content is transmitted to Wonton Web Works

**Section 10 — Support SLA**

| Tier | Response Time | Support Channel |
|------|--------------|-----------------|
| Starter | Best effort | Email |
| Team | 2 business days | Email + Slack |
| Enterprise | 1 business day | Email + Slack + video call |

Support covers: license issues, installation problems, agent behavior questions. It does not cover: custom agent development (consulting rate applies), integration with proprietary systems.

**Section 11 — Warranty Disclaimer**
Software provided "as is." No warranty of fitness for any particular purpose. [Standard boilerplate — lawyer to expand.]

**Section 12 — Limitation of Liability**
Liability capped at total fees paid in the prior 12 months. [Standard boilerplate — adjust cap in negotiation for large enterprise deals.]

**Section 13 — Governing Law**
[Lawyer to confirm jurisdiction — likely British Columbia, Canada given Wonton Web Works domicile.]

### 2.2 Split LICENSE File Structure

**Root `LICENSE` (MIT — applies to all community files):**
```
MIT License

Copyright (c) 2026 Wonton Web Works

Permission is hereby granted... [standard MIT text]

This license applies to all files in this repository EXCEPT those
listed in LICENSE.ext, which are governed by the PrivateEnterprise
Enterprise License Agreement.
```

**`LICENSE.ext` (proprietary — applies to enterprise files):**
```
PrivateEnterprise Enterprise License Agreement

Copyright (c) 2026 Wonton Web Works. All rights reserved.

The files listed below are proprietary software of Wonton Web Works
and are NOT licensed under the MIT License. Use of these files requires
a valid PrivateEnterprise Enterprise License Agreement.

ENTERPRISE-LICENSED FILES:
- src/framework/agents/sage/**
- src/framework/agents/cmo/enterprise/**      (if created)
- src/framework/agents/cfo/enterprise/**      (if created)
- src/framework/shared/enterprise-validation.md
- tools/generate-license.sh                  (not in public repo)

Unauthorized copying, redistribution, or use of these files without
a valid license is prohibited and constitutes copyright infringement.

For licensing: enterprise@private-enterprise.com
Full agreement: [URL to agreement on private-enterprise.wontonwebworks.com]
```

**Directory structure for clear separation:**

```
src/framework/agents/
  sage/                    <- ENTERPRISE (proprietary)
    AGENT.md
    LICENSE                <- "See ../../LICENSE.ext"
  cmo/
    AGENT.md               <- COMMUNITY (MIT)
    enterprise/            <- ENTERPRISE subfolder (if needed)
      AGENT.md
  cfo/
    AGENT.md               <- COMMUNITY (MIT)
    enterprise/
      AGENT.md
  ...all other agents...   <- COMMUNITY (MIT)
```

The `sage/` directory being entirely enterprise-scoped is cleaner than per-file headers. A single `LICENSE` file in the directory is unambiguous.

For the public GitHub repo: the `sage/` directory is either absent entirely (best for Layer 3) or present with a placeholder `AGENT.md` that says "Enterprise feature. See private-enterprise.wontonwebworks.com for licensing."

### 2.3 File-Level License Headers

For any enterprise file that could appear in a public repo context (shared protocol docs, mixed files):

```markdown
<!--
Copyright (c) 2026 Wonton Web Works. All rights reserved.
Licensed under the PrivateEnterprise Enterprise License Agreement.
Unauthorized copying, redistribution, or use without a valid license is prohibited.
See LICENSE.ext for terms or visit private-enterprise.wontonwebworks.com/enterprise
-->
```

For shell scripts and Python files:

```bash
# Copyright (c) 2026 Wonton Web Works. All rights reserved.
# Licensed under the PrivateEnterprise Enterprise License Agreement.
# Unauthorized copying, redistribution, or use without a valid license is prohibited.
# See LICENSE.ext for terms.
```

Apply these headers to:
- `src/framework/agents/sage/AGENT.md`
- `src/framework/shared/enterprise-validation.md`
- Any enterprise-specific SKILL.md modifications
- `tools/generate-license.sh` (private repo)

---

## Layer 3: Private Registry (Design Only — Month 2)

### 3.1 Architecture Decision

Three viable options for enterprise file distribution:

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Private GitHub repo | Simple, familiar, free with GitHub Team | Requires GitHub auth per client, harder to revoke | Second choice |
| Private npm/JSR registry | Standard package tooling, versioning built-in | Overkill for Markdown files, npm not natural for this format | Avoid |
| Custom API (signed URL delivery) | Full control, revocation, analytics, key-gated | Build time, infra cost | First choice for Month 2 |

**Recommended: Custom signed URL API on the same Hetzner server.**

Client requests files via:
```
GET https://registry.private-enterprise.wontonwebworks.com/enterprise/download
Authorization: License {license_key}
```

Server validates the license key, checks it is not revoked, and returns a signed URL to download a zip of enterprise agent files. The zip is versioned (matches framework version).

### 3.2 Installer Changes

**`install.sh` additions:**

```bash
# Community install (unchanged)
mg install

# Enterprise install
mg install --enterprise --license-file ./enterprise-license.json

# Enterprise upgrade
mg upgrade --enterprise
```

The enterprise install path:
1. Validates license file locally (signature check)
2. Reads `version` field to determine which enterprise package to fetch
3. Authenticates to registry using license file as credential
4. Downloads versioned enterprise package (tar.gz)
5. Extracts to `.claude/agents/sage/` and enterprise dirs
6. Copies license file to `.claude/enterprise-license.json`
7. Runs `mg verify` to confirm installation

**File locations:**
- Community files: `.claude/agents/`, `.claude/skills/` (unchanged)
- Enterprise files: `.claude/agents/sage/`, `.claude/skills/mg-leadership-team/` (extended), `.claude/shared/enterprise-validation.md`
- License: `.claude/enterprise-license.json`

Enterprise files live alongside community files. No separate directory. The license validation determines which features activate.

### 3.3 Authentication Flow

```
1. Client runs: mg install --enterprise --license-file ./enterprise-license.json

2. Installer reads license file, extracts org.id + signature

3. POST /enterprise/auth
   Body: { license: <full license JSON> }

4. Registry validates:
   a. HMAC signature (same algorithm as local validation)
   b. License not expired
   c. License not revoked (check revocation list in DB)
   d. Requested features include enterprise downloads

5. Registry returns: { download_token: "<JWT, 15min TTL>", version: "4.x.x" }

6. GET /enterprise/download/{version}
   Authorization: Bearer <download_token>

7. Registry streams versioned tar.gz of enterprise files

8. Installer extracts and places files
```

**Revocation mechanism:**
- Registry maintains a PostgreSQL table: `revoked_licenses(org_id, revoked_at, reason)`
- On auth request, check `org_id` against revocation list
- If revoked: return 403 with message "License revoked. Contact support@private-enterprise.com."
- Revocation takes effect on next install/upgrade, not mid-session (acceptable tradeoff)

**Download token TTL:** 15 minutes. Not reusable. Prevents token sharing.

### 3.4 Update Mechanism

```
mg upgrade --enterprise
```

1. Reads current license from `.claude/enterprise-license.json`
2. Checks registry for latest enterprise version compatible with current framework version
3. If update available: downloads and installs (same auth flow as initial install)
4. If license expired: exits with renewal prompt

Enterprise clients should run `mg upgrade --enterprise` as part of their normal framework upgrade cadence. No auto-update. Manual trigger only.

### 3.5 Rollback

If enterprise install fails mid-way:
1. Installer creates a backup: `.claude/agents/sage.bak/` before overwriting
2. On failure: restore from backup
3. On success: delete backup
4. Log install attempt to `.claude/memory/enterprise-install-log.json`

---

## Security Considerations

### HMAC Prevents Tampering, Not Copying

A license file with a valid signature can be copied verbatim to a different project or machine. The HMAC does not encode a project path or machine identity (unless `machine_fingerprint` is set).

**Mitigation:** The `machine_fingerprint` field is the mechanism for per-machine enforcement. For high-value clients, enable it. For startups at our current price point, the contract and the seat limit are sufficient deterrents.

**Accepted:** A single-seat licensee can share their license file with their team. This is a contract violation, not a cryptographic defeat. Our enforcement path is audit + termination, not technical prevention.

### License Check Removal

A determined attacker can edit `SKILL.md` and remove the license validation block. This is a known limitation of distributing validation logic as plaintext Markdown.

**Mitigations, in priority order:**
1. **Private registry (Layer 3):** When Sage `AGENT.md` lives in a private registry and is not in the public repo, the attacker needs the file first. Without the file, there is nothing to strip checks from.
2. **Legal deterrence:** The license agreement and LICENSE.ext file make redistribution a clear legal violation.
3. **Obfuscation (low value):** We could split validation logic across multiple files or encode it in a less readable format. This adds friction, not security. Not recommended.

**Our realistic attacker** is an employee at a client company who leaves and wants to keep using the tool, not a professional security researcher. The contract + private registry combination handles this case adequately.

### Privacy

No telemetry. No phone-home. The license is validated entirely locally in Layer 1. Layer 3 (registry) requires a network call for downloads only — not for runtime validation.

**Data we collect at purchase:** org name, contact email, billing info. Stored in Stripe + our own records.

**Data we collect at runtime:** none.

**Data in the license file:** org name, org ID, tier, seats, features, dates. No personal data. No project data. The license file is safe to commit to version control within the client's private project (they may want to track it in git).

### Timing Oracle

The HMAC comparison must use constant-time equality. If using Python, `hmac.compare_digest`. If using shell + openssl, generate both signatures and compare as hex strings — shell string comparison is acceptable for this use case since the comparison result is not a secret (we return the same degraded mode regardless of _why_ the check failed).

### Bulk Key Generation

The license generation tool is manual-only. There is no API for bulk key generation. Rate limiting is therefore not applicable in Layer 1. In Layer 3, if an automated generation endpoint is added, it must be authenticated and rate-limited.

---

## Implementation Workstreams

### WS-LICENSE-01: License File Schema + Signing Tool

**Classification:** MECHANICAL
**Priority:** 1 (do first — everything else depends on this)
**Dependencies:** None

**Scope:** Build the license generation tool and validate the HMAC schema works end-to-end.

**Acceptance criteria:**
- [ ] `tools/generate-license.sh` accepts all documented flags (Section 1.4)
- [ ] Output JSON matches schema in Section 1.1 exactly
- [ ] Canonical payload construction is deterministic (same inputs → same payload string, every time)
- [ ] HMAC-SHA256 signature is computed correctly and verifiable
- [ ] `tools/verify-license.sh` accepts a license JSON and exits 0 on valid, 1 on invalid — used for local testing
- [ ] Both tools tested with at least 3 license configurations: starter, team, enterprise with all features
- [ ] Private key documented in 1Password under `private-enterprise/license-signing-key`
- [ ] Tools are NOT committed to public repo

**Implementation notes:**
- Use Python 3 (available on macOS and Linux without installation)
- `hmac` module in stdlib handles HMAC-SHA256 + `compare_digest`
- `json` module handles parsing and canonical construction
- Target: ~150 lines of Python, no external deps

---

### WS-LICENSE-02: Validation Logic — Shared Protocol

**Classification:** MECHANICAL
**Priority:** 2
**Dependencies:** WS-LICENSE-01 (need schema finalized before writing validator)

**Scope:** Write the validation protocol document that Sage and the skill both reference.

**Acceptance criteria:**
- [ ] `src/framework/shared/enterprise-validation.md` created
- [ ] Contains the complete validation algorithm (Section 1.6) in pseudocode
- [ ] Contains the embedded verification key (placeholder during dev, real key before first client install)
- [ ] Contains all user-facing messages (Section 1.7) verbatim
- [ ] Document is self-contained — an agent can implement the check by reading only this file
- [ ] File has enterprise license header (Section 2.3)
- [ ] File is added to `.gitignore` or excluded from public repo (operator decision — document which)

---

### WS-LICENSE-03: Sage Integration

**Classification:** ARCHITECTURAL
**Priority:** 3
**Dependencies:** WS-LICENSE-02

**Scope:** Modify Sage intake flow to validate the enterprise license before proceeding.

**Acceptance criteria:**
- [ ] Sage reads `.claude/enterprise-license.json` at step 0 of intake flow
- [ ] References `enterprise-validation.md` for validation algorithm
- [ ] Valid license: intake proceeds normally, no message printed
- [ ] Invalid/missing license: Sage declines to run (does not degrade — exits cleanly with a message directing to community mode)
- [ ] Expired license: prints renewal message (Section 1.7), declines to run
- [ ] Tampered license: prints neutral error (Section 1.7), declines to run
- [ ] Sage AGENT.md updated with license header (Section 2.3)
- [ ] Session log includes `license_validated: true` and `org: <org.name>` when valid

---

### WS-LICENSE-04: mg-leadership-team Integration

**Classification:** ARCHITECTURAL
**Priority:** 4
**Dependencies:** WS-LICENSE-02

**Scope:** Replace the current file-presence edition detection with license-validated edition detection.

**Acceptance criteria:**
- [ ] SKILL.md edition detection block updated per Section 1.8
- [ ] Enterprise Mode activates only when: (a) valid license with `sage` feature AND (b) `sage/AGENT.md` physically present
- [ ] Community Mode activates when either condition is false — silently, no message
- [ ] Session log includes `edition: enterprise | community` in both modes
- [ ] Expired license → Community Mode + expiry message
- [ ] Tampered license → Community Mode + neutral error message
- [ ] Existing community tests unaffected (Community Mode behavior unchanged)

---

### WS-LICENSE-05: Legal Files

**Classification:** MECHANICAL
**Priority:** 3 (parallel with WS-LICENSE-03)
**Dependencies:** None (can be drafted immediately)

**Scope:** Create the split LICENSE files and apply headers to enterprise files.

**Acceptance criteria:**
- [ ] Root `LICENSE` updated to clarify MIT scope and reference `LICENSE.ext`
- [ ] `LICENSE.ext` created with complete file list
- [ ] All enterprise files have correct license headers (Section 2.3)
- [ ] Sage directory has its own `LICENSE` file referencing `LICENSE.ext`
- [ ] `README.md` updated with a short "Licensing" section: MIT for community, enterprise agreement for enterprise features, link to private-enterprise.wontonwebworks.com/enterprise

---

### WS-LICENSE-06: Install Script — Enterprise Path

**Classification:** MECHANICAL
**Priority:** 5
**Dependencies:** WS-LICENSE-01, WS-LICENSE-02

**Scope:** Add the enterprise install/upgrade path to `install.sh` (or create `mg` CLI wrapper).

**Acceptance criteria:**
- [ ] `mg install --enterprise --license-file <path>` validates the license, copies it to `.claude/enterprise-license.json`, and copies enterprise agent files from a specified local path
- [ ] `mg upgrade --enterprise` re-validates and re-copies (interim: from local path; Layer 3: from registry)
- [ ] On validation failure: prints specific error, exits non-zero
- [ ] On success: prints "Enterprise features activated for {org.name}"
- [ ] Rollback implemented: if install fails, previous state is restored
- [ ] Installer smoke test: after install, runs `mg verify --enterprise` which checks file presence + license validity

---

### WS-LICENSE-07: Private Registry (Month 2)

**Classification:** ARCHITECTURAL
**Priority:** 6 (design only for now — do not implement until 3+ enterprise clients)
**Dependencies:** WS-LICENSE-01, WS-LICENSE-06, server infrastructure

**Scope:** Build the authenticated download registry on Hetzner.

**Acceptance criteria (design targets, to be refined at implementation time):**
- [ ] Registry API: POST `/enterprise/auth`, GET `/enterprise/download/{version}`
- [ ] Auth validates HMAC signature (reuses same algorithm as local validation)
- [ ] Revocation list in PostgreSQL, checked on every auth request
- [ ] Download token: JWT with 15-minute TTL
- [ ] Enterprise package: versioned tar.gz containing sage + enterprise dirs
- [ ] Installer updated to use registry endpoint instead of local path
- [ ] Revocation: `tools/revoke-license.sh --org-id <id>` inserts to revocation table
- [ ] Monitoring: failed auth attempts logged (not to client, to our own log)

---

## Open Questions

1. **Placeholder in public repo:** Should `sage/` be absent from the public GitHub repo entirely, or should a placeholder file exist? Absent is cleaner for security but breaks the "fork and try" experience. Recommend: absent, with a note in the README pointing to the enterprise page.

2. **Verification key exposure:** The validation key is embedded in `enterprise-validation.md`, which itself is enterprise-only. But if the key leaks (e.g., a client commits it to a public repo), all existing licenses are compromised. Mitigation: key rotation plan (see Section 1.3). Rotation is a manual process — document the playbook before the first client goes live.

3. **Starter tier features:** The feature matrix shows starter has no unique features. Consider making starter = community + one enterprise feature (e.g., CMO/CFO access). This gives the upgrade path more steps and a lower initial price point.

4. **Seat definition for daemon:** When the mg daemon runs autonomously overnight (no human at the keyboard), does it consume a seat? The current draft says automated pipelines without human intervention in a given session do not consume a seat. Verify this is workable for the client use cases before finalizing.

5. **Grace period for expiry:** A one-week grace period after expiry (warnings on every run, not hard-fail) would reduce support burden for clients who forget to renew. Add to WS-LICENSE-03/04 if desired.

---

## Appendix: Quick Reference

### License Validation Decision Tree

```
.claude/enterprise-license.json exists?
  NO  → Community Mode (silent)
  YES → Parse JSON
          Malformed? → Community Mode + warn
          Signature valid?
            NO  → Community Mode + warn (neutral message)
            YES → Expired?
                    YES → Community Mode + renewal message
                    NO  → Feature licensed?
                            NO  → Community Mode + upgrade message
                            YES → Machine fingerprint set?
                                    YES → Fingerprint match?
                                            NO  → Community Mode + machine message
                                            YES → Enterprise Mode
                                    NO  → Enterprise Mode
```

### Files Created/Modified by This Design

| File | Action | Layer |
|------|--------|-------|
| `.claude/enterprise-license.json` | Created per client install | 1 |
| `src/framework/shared/enterprise-validation.md` | Created (enterprise-only, not in public repo) | 1 |
| `src/framework/agents/sage/AGENT.md` | Modified — add license header + validation step | 1 |
| `src/framework/skills/mg-leadership-team/SKILL.md` | Modified — replace edition detection | 1 |
| `tools/generate-license.sh` | Created (private repo only) | 1 |
| `tools/verify-license.sh` | Created (private repo only) | 1 |
| `LICENSE` | Modified — add enterprise carve-out | 2 |
| `LICENSE.ext` | Created | 2 |
| `src/framework/agents/sage/LICENSE` | Created | 2 |
| `install.sh` / `mg` CLI | Modified — add enterprise install path | 1 |
| Registry API (new service) | Created on Hetzner | 3 |
