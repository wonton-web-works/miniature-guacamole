# Systems Security

Domain reference for operating system, infrastructure, and daemon security reviews. Load this file when the review targets system-level code, background services, CLI tools, file system operations, or process management.

## Review Areas

1. **Process Isolation and Sandboxing** — Verify processes run with minimum required privileges (not root/admin), check for proper use of sandboxing mechanisms (seccomp, AppArmor, macOS sandbox), review subprocess spawning for shell injection, validate process isolation between workloads, and confirm Linux namespace separation (PID, network, mount) where applicable.
2. **File System and Permissions** — Verify sensitive files have restrictive permissions (600/700, not world-readable), check for path traversal vulnerabilities, review temporary file creation for TOCTOU race conditions, and validate symlink handling.
3. **Daemon and Service Security** — Review daemon lifecycle management, check that services drop privileges after binding to privileged ports, verify PID/lock file handling, review launchd/systemd unit files for security directives, and validate cron jobs and scheduled tasks run with least privilege and restricted PATH.
4. **Privilege Escalation Prevention** — Check for SUID/SGID binaries and justify each one, review sudo configurations for least privilege, verify setuid/setgid error handling, and confirm no capability leaks through environment variables or file descriptors.
5. **System Hardening** — Verify unnecessary services are disabled, check kernel parameters and sysctl settings, review network listener exposure for unintended open ports, validate backup and recovery procedures, and confirm memory protections (ASLR, stack canaries, NX/DEP) are enabled.
6. **IPC and Resource Controls** — Review inter-process communication channels (Unix sockets, shared memory, D-Bus) for authentication and access control, verify resource limits (ulimits, cgroups) prevent denial-of-service through resource exhaustion, and confirm audit logging captures security-relevant events with tamper-resistant storage.

## Threat Model

1. **Privilege escalation** — Attacker exploits misconfigured SUID binaries, weak sudo rules, or capability leaks to gain root access. Mitigate with least privilege enforcement, capability dropping, and regular SUID audits.
2. **Subprocess injection** — Attacker controls arguments or environment variables passed to child processes, achieving code execution. Mitigate by using exec-style calls (no shell), validating all inputs, and sanitizing environment.
3. **File system race conditions** — Attacker exploits TOCTOU gaps between checking and using files to swap in malicious content. Mitigate with atomic file operations, O_NOFOLLOW, and secure temporary directory creation.
4. **Daemon compromise** — Attacker exploits a long-running service to gain persistent access. Mitigate with process isolation, automatic restart policies, and minimal attack surface.
5. **Supply chain attacks** — Attacker compromises build tools, dependencies, or update mechanisms to inject malicious code. Mitigate with checksum verification, signed packages, and reproducible builds.
6. **Information disclosure** — Attacker reads sensitive data from logs, core dumps, or environment variables. Mitigate with secret redaction, restricted file permissions, and disabled core dumps for sensitive processes.
7. **Resource exhaustion** — Attacker consumes CPU, memory, file descriptors, or disk space to deny service to legitimate processes. Mitigate with ulimits, cgroups, disk quotas, and process-level resource caps.
8. **IPC abuse** — Attacker exploits unauthenticated or weakly-permissioned Unix sockets, D-Bus interfaces, or shared memory segments to escalate privileges or exfiltrate data. Mitigate with socket permissions, D-Bus policy restrictions, and shared memory access controls.

## Checklist

- [ ] All services and daemons run as dedicated non-root users
- [ ] Subprocess calls use exec-style invocation (no shell interpolation)
- [ ] Sensitive files (keys, configs, secrets) are chmod 600 or 640
- [ ] Temporary files created with mkstemp/mkdtemp in restricted directories
- [ ] launchd/systemd units include hardening directives (NoNewPrivileges, ProtectHome)
- [ ] SUID/SGID binaries are inventoried and justified
- [ ] Environment variables sanitized before passing to child processes
- [ ] PID files and lock files use atomic creation with proper cleanup
- [ ] Core dumps disabled or restricted for processes handling secrets
- [ ] Log files rotated and permissions set to 640 or stricter
- [ ] File descriptor inheritance explicitly controlled (CLOEXEC)
- [ ] Signal handlers are async-signal-safe and cannot be abused
- [ ] Binary integrity verified via code signing or checksums
- [ ] Resource limits (ulimits, cgroups) configured for all long-running services
- [ ] Unix sockets and IPC channels have restrictive permissions (no world-accessible)
- [ ] Audit logging enabled for privilege changes, authentication events, and file access
- [ ] Cron jobs and scheduled tasks run as dedicated users with restricted PATH
- [ ] Memory protections (ASLR, NX/DEP, stack canaries) verified enabled at build and runtime
