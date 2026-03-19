# Cryptography

Domain reference for cryptographic implementation and key management security reviews. Load this file when the review targets encryption, hashing, digital signatures, key management, or TLS/certificate handling.

## Review Areas

1. **Key Management and Rotation** — Verify encryption keys are stored in HSM or key management services, check key rotation policies with defined maximum lifetime, review key derivation functions (KDF) for appropriate parameters, confirm key material is never logged or exposed, and validate separate keys for different purposes.
2. **Transport Layer Security (TLS)** — Verify TLS 1.2+ enforcement (TLS 1.0/1.1 disabled), check cipher suite configuration (prefer AEAD ciphers like AES-GCM, ChaCha20-Poly1305), review certificate validation and chain verification, confirm certificate pinning where appropriate, and validate HSTS deployment.
3. **Algorithm and Cipher Selection** — Verify modern algorithms are used (AES-256-GCM, Ed25519, X25519), check for deprecated or broken algorithms (MD5, SHA-1, DES, RC4, ECB mode), review random number generation (CSPRNG), confirm appropriate key sizes, and validate authenticated encryption modes.
4. **Hashing and Password Storage** — Verify password hashing uses memory-hard functions (argon2id, bcrypt, scrypt), check hash function selection for integrity (SHA-256/SHA-3), review HMAC usage for message authentication, confirm unique salts per password, and validate constant-time hash digest comparison.
5. **Digital Signatures and Verification** — Verify signature algorithms (Ed25519, ECDSA P-256, RSA-PSS), check signature verification on all received signed data, review code signing and artifact verification in CI/CD, and confirm nonce/timestamp inclusion to prevent replay attacks.

## Threat Model

1. **Weak algorithm usage** — Application uses deprecated algorithms (MD5, SHA-1, DES, RC4) that are vulnerable to collision or brute-force attacks. Mitigate by maintaining an approved algorithm list and scanning for deprecated usage.
2. **Key exposure** — Encryption keys leaked via logs, error messages, or insecure storage enable decryption of protected data. Mitigate with HSM/KMS storage, memory protection, and key access auditing.
3. **Improper randomness** — Use of predictable random sources (Math.random, unseeded PRNGs) for cryptographic operations enables prediction attacks. Mitigate by mandating CSPRNG (crypto.randomBytes, /dev/urandom) for all security-sensitive randomness.
4. **Downgrade attacks** — Attacker forces negotiation of weaker TLS versions or cipher suites. Mitigate with strict TLS configuration, disabling legacy protocols, and testing with tools like testssl.sh.
5. **Padding oracle attacks** — Attacker exploits error messages from CBC-mode decryption to recover plaintext. Mitigate by using AEAD modes (GCM) and constant-time error handling.
6. **Replay attacks** — Attacker resubmits valid signed messages to perform duplicate operations. Mitigate with nonces, timestamps, and sequence numbers in signed payloads.

## Checklist

- [ ] All symmetric encryption uses AES-256-GCM or ChaCha20-Poly1305 (AEAD)
- [ ] No use of ECB mode, bare CBC without HMAC, or stream ciphers without authentication
- [ ] Password hashing uses argon2id, bcrypt (cost >= 10), or scrypt
- [ ] All hash comparisons use constant-time functions (crypto.timingSafeEqual)
- [ ] Random values for tokens, nonces, and keys generated via CSPRNG
- [ ] TLS 1.2+ enforced; TLS 1.0 and 1.1 disabled
- [ ] Cipher suites limited to AEAD algorithms with forward secrecy (ECDHE)
- [ ] RSA keys >= 2048 bits; ECC keys >= 256 bits; Ed25519 preferred for signatures
- [ ] Key rotation policy defined with maximum key lifetime
- [ ] Encryption keys stored in KMS/HSM, not in source code or config files
- [ ] No deprecated algorithms in use (MD5, SHA-1, DES, 3DES, RC4, Blowfish)
- [ ] Digital signatures verified before trusting any signed payload
- [ ] Certificate validation enabled (no skip-verify flags in production)
