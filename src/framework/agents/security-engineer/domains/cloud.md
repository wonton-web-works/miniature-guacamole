# Cloud Security

Domain reference for cloud infrastructure, container, and deployment security reviews. Load this file when the review targets cloud-hosted services, container orchestration, CI/CD pipelines, or infrastructure-as-code.

## Review Areas

1. **Identity and Access Management (IAM)** — Verify IAM policies follow least privilege (no wildcard actions or resources), check for overly permissive service account roles, review cross-account trust relationships, confirm MFA enforcement, and validate temporary credential usage over long-lived keys.
2. **Secrets Management** — Verify secrets stored in dedicated vaults (AWS Secrets Manager, HashiCorp Vault), check secrets are not committed to version control, review secret rotation policies, confirm runtime injection over baked-in configs, and validate encryption at rest and in transit.
3. **Network Policy and Isolation** — Review VPC/network segmentation and security groups, check for overly permissive ingress/egress rules (0.0.0.0/0), verify private subnets for internal services, confirm TLS termination, and review firewall rules and network ACLs.
4. **Container and Orchestration Security** — Verify container images use minimal base images (distroless, alpine), check for root containers, review Kubernetes RBAC and pod security standards, confirm image scanning in CI pipeline, and validate resource limits.
5. **Supply Chain and Dependency Security** — Verify dependency lock files are committed, check for known vulnerabilities (npm audit, Snyk, Trivy), review CI/CD pipeline permissions and artifact signing, confirm base images pinned to digest, and validate SBOM generation.
6. **Data and Storage Security** — Verify storage buckets are not publicly accessible, check encryption at rest for databases and object stores, review backup encryption, and confirm logging and audit trails for data access.

## Threat Model

1. **IAM policy misconfiguration** — Overly broad IAM policies grant attackers lateral movement or data exfiltration after initial compromise. Mitigate with policy linting, automated least-privilege analysis, and regular access reviews.
2. **Exposed secrets** — Credentials leaked in source code, CI logs, or container images enable unauthorized access. Mitigate with secret scanning in CI, vault-based secret injection, and automated rotation.
3. **Network exposure** — Misconfigured security groups or public endpoints expose internal services to the internet. Mitigate with infrastructure-as-code reviews, network policy enforcement, and regular port scanning.
4. **Container escape** — Attacker breaks out of a container to access the host or other containers. Mitigate with non-root containers, read-only file systems, seccomp profiles, and pod security standards.
5. **Supply chain compromise** — Attacker injects malicious code via compromised dependencies, base images, or CI plugins. Mitigate with dependency pinning, image digest verification, and pipeline isolation.
6. **Data exfiltration** — Attacker accesses cloud storage or databases via misconfigured permissions. Mitigate with bucket policies, VPC endpoints, and data access logging.

## Checklist

- [ ] IAM policies use explicit allow with specific actions and resources (no wildcards)
- [ ] Service accounts have dedicated roles scoped to their function
- [ ] All secrets stored in vault/secrets manager (not in env files, repos, or images)
- [ ] Secret rotation automated with maximum 90-day lifetime
- [ ] Security groups restrict ingress to required ports and known CIDR ranges
- [ ] Internal services deployed in private subnets with no public IP
- [ ] Container images scanned for CVEs before deployment
- [ ] Containers run as non-root with read-only root filesystem
- [ ] Kubernetes pods have resource limits, network policies, and security contexts
- [ ] Dependencies pinned with lock files and audited for known vulnerabilities
- [ ] CI/CD pipeline artifacts are signed and verified before deployment
- [ ] Storage buckets have explicit deny for public access
- [ ] Audit logging enabled for all cloud APIs and data access
- [ ] Infrastructure changes deployed via IaC with peer review (no manual console changes)
