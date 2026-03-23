# Enterprise Session Schema

**File location:** `~/.claude/ext-session.json`

This file is written by `mg-login` and removed by `mg-logout`. It is read by `mg-upgrade` and `mg-status` to authenticate requests to the Wonton API.

## Permissions

The file is created with mode `0600` (owner read/write only). The `~/.claude/` directory is `0700`. Neither should ever be world-readable.

## Schema

```json
{
  "token": "uuid",
  "user": {
    "id": "cuid-string",
    "email": "user@example.com",
    "name": "Jane Smith"
  },
  "org": {
    "id": "cuid-string",
    "name": "Acme Corp",
    "slug": "acme-corp"
  },
  "license": {
    "tier": "enterprise",
    "seats": 5,
    "expiresAt": "2027-03-22T00:00:00.000Z"
  },
  "machineId": "a1b2c3d4e5f6a7b8",
  "createdAt": "2026-03-22T10:00:00Z",
  "signature": "base64-encoded-ed25519-signature"
}
```

## Field Definitions

| Field | Type | Source | Description |
|---|---|---|---|
| `token` | string (UUID) | API response | Bearer token for subsequent API calls. Corresponds to `MgSession.token` in the database. |
| `user.id` | string (cuid) | API response | Wonton user ID. |
| `user.email` | string | API response | Authenticated user's email address. |
| `user.name` | string | API response | Authenticated user's display name. |
| `org.id` | string (cuid) | API response | `MgOrganization.id` of the user's enterprise org. |
| `org.name` | string | API response | Human-readable org name (e.g. "Acme Corp"). |
| `org.slug` | string | API response | URL-safe org slug (e.g. "acme-corp"). |
| `license.tier` | enum | API response | One of `starter`, `team`, `enterprise`. |
| `license.seats` | integer | API response | Total licensed seats from `MgLicense.seats`. |
| `license.expiresAt` | ISO 8601 datetime | API response | License expiry from `MgLicense.expiresAt`. |
| `machineId` | string (16 chars) | Computed locally | First 16 characters of `SHA256(hostname::username::platform::arch::homedir)`. Written at login time and sent to the API as part of the `MgSession` record. |
| `createdAt` | ISO 8601 datetime | Computed locally | UTC timestamp of when this local session file was written. |

## Machine ID Construction

The `machineId` is derived from system information available without elevated privileges:

```
raw = hostname + "::" + username + "::" + platform + "::" + arch + "::" + homedir
machineId = SHA256(raw)[0:16]  # first 16 hex characters
```

Where:
- `hostname` — output of `hostname(1)`
- `username` — output of `whoami(1)`
- `platform` — output of `uname -s` (e.g. `Darwin`, `Linux`)
- `arch` — output of `uname -m` (e.g. `arm64`, `x86_64`)
- `homedir` — value of `$HOME`

The machineId is stored in the API as `MgSession.machineId` for audit purposes. It is not used to gate access in Layer 1 — that is a Layer 3 concern.

## Token Lifecycle

1. Token is issued by `POST /api/mg/auth/login` and stored in `MgSession` with an `expiresAt` set server-side.
2. Token is presented as `Authorization: Bearer <token>` on all subsequent requests.
3. Token is revoked server-side by `POST /api/mg/auth/logout`.
4. Local session file is removed by `mg-logout` regardless of whether the server-side revocation succeeds (to handle network failures cleanly).
5. If the token has expired or been revoked, the API returns `401`. CLI commands that receive a `401` direct the user to run `mg-login` again.

## Signature Verification (v5.2+)

Sessions include an Ed25519 `signature` field. The server signs the canonical JSON payload (all fields except `signature`, keys sorted) with the private key. The client verifies using the public key shipped with the framework at `keys/enterprise-signing.pub`.

**Signing (server-side):**
```
payload = JSON.stringify(session_without_signature, sorted_keys)
signature = Ed25519.sign(payload, private_key)
session.signature = base64(signature)
```

**Verification (client-side):**
```bash
verify-session.sh [session-file]
# Exit 0 = valid, Exit 1 = invalid/expired, Exit 2 = tooling unavailable
```

**Dev mode sessions** (created by `mg-dev-key` with `devMode: true`) skip signature verification. They are local-only, non-expiring, and intended for framework development.

**Fallback behavior:** If verification fails, the system silently falls back to community mode. It never blocks work — only removes enterprise features.

## Security Notes

- Never commit `~/.claude/ext-session.json` to version control.
- The `.claude/` directory in user home is separate from the project-local `.claude/` directory — the session file never lives inside a project repo.
- The `features` array from the license is intentionally not stored locally in the session file. It is fetched live from the API by `mg-status`. `mg-upgrade` trusts the server to gate the download to entitled users rather than performing a local feature check.
