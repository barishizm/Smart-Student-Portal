# Security Policy

This document defines how security vulnerabilities are reported, triaged, and remediated for **Smart Student Portal**.

## Supported Versions

Security fixes are provided for the following scope:

| Version / Branch | Status |
| --- | --- |
| `main` (latest code) | ✅ Supported |
| Latest released line (`v1.x`) | ✅ Supported |
| Older releases | ❌ Not supported |

Notes:
- Security fixes are applied to `main` first.
- Backports are made to the latest supported release when needed.

## Reporting a Vulnerability

### Preferred channel (private reporting)

- Use GitHub **Private Vulnerability Reporting / Security Advisory** whenever possible.
- If private reporting is unavailable, contact maintainers through a private channel.

### Please do not

- Open a public issue with full exploit details before coordinated disclosure.
- Publish proof-of-concept links or sensitive data in public channels.

### Include in your report

- Short summary and impact
- Affected route/flow (e.g., login, password reset, avatar upload)
- Reproduction steps
- Minimal PoC (safe, non-destructive)
- Estimated CIA impact (Confidentiality / Integrity / Availability)
- Environment details (Node version, OS, browser, reverse proxy, etc.)

## Response Targets (SLA)

- **Initial acknowledgment:** within 72 hours
- **Initial triage:** within 5 business days
- **Critical/High vulnerabilities:** target remediation in 7–14 days when feasible
- **Medium/Low vulnerabilities:** handled in planned maintenance windows

These are target timelines and may vary based on complexity and validation needs.

## Responsible Disclosure

- Please keep findings confidential until a fix is available.
- After a fix is released, affected versions and remediation notes are published.
- Researchers may be credited when appropriate.

## Scope (Project-Specific)

This policy covers:

- Authentication and session flows (`/auth/*`)
- Authorization and admin access (`/admin/students/*`)
- Password reset flows
- Profile image upload/delete flows
- Database interactions (SQLite)
- Docker deployment configuration

Typical out-of-scope examples:

- Visual/UI-only issues without security impact
- Dependency notices with no practical exploit path in this project context

## Security Controls Currently Implemented

Key controls present in the codebase include:

- `helmet` for baseline HTTP security headers
- `express-session` with `httpOnly`, `sameSite=lax`, and `secure` in production
- CSRF protection using HMAC-based token validation
- `express-rate-limit` on authentication and password reset endpoints
- Password hashing with `bcrypt`
- Password reset tokens stored as hashes with expiry/usage checks
- Role-based access enforcement for admin routes
- Avatar upload MIME/type checks and size limits
- SQLite foreign keys and indexes for data integrity

## Production Security Requirements

For production deployments, the following are required:

1. Strong, random `SESSION_SECRET`
2. `NODE_ENV=production` for secure-cookie behavior
3. HTTPS/TLS termination (reverse proxy or load balancer)
4. Sensitive data redaction in logs (tokens, passwords, session values)
5. Regular dependency review (`npm audit` plus manual validation)
6. Backup, access control, and least-privilege operational practices

## Known Risks and Hardening Recommendations

This project is suitable for academic/learning scenarios. Before production use, apply hardening such as:

- Enable strict Content Security Policy (CSP)
- Move session storage from default memory store to a persistent secure store
- Strengthen password policy (length, complexity, denylist)
- Add MFA and step-up authentication for sensitive actions
- Introduce centralized monitoring/alerting (e.g., SIEM/Sentry)
- Add Secure SDLC controls (SAST/DAST/secret scanning)

## Dependency and Supply Chain Security

- Keep third-party packages up to date.
- Evaluate new dependencies for maintenance health, licensing, and CVE history.
- Ensure lockfile changes (`package-lock.json`) are code-reviewed.

## Data Protection and Privacy

- Process user data (identity, email, student records) with data minimization principles.
- Do not log sensitive payloads or secrets.
- Align retention/deletion practices with institutional policy and legal obligations.

## Security Testing Guidance

Recommended minimum verification includes:

- Authentication bypass tests
- Privilege escalation and IDOR checks
- CSRF/XSS/injection validation
- Upload abuse tests (type, size, content)
- Brute-force and rate-limit resilience checks

## Legal and Ethical Boundaries

- Test only systems you are authorized to test.
- Avoid disruptive testing that impacts availability.
- Handle any personal data in findings with strict confidentiality.

## Maintenance Note

This file is a technical coordination guide. Update it whenever security contacts, process, or scope changes.
