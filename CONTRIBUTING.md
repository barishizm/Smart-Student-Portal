# Contributing to Smart Student Portal

Thank you for helping improve **Smart Student Portal**. This guide explains how to contribute safely and consistently.

## Table of Contents

- [Ways to Contribute](#ways-to-contribute)
- [Before You Start](#before-you-start)
- [Local Development Setup](#local-development-setup)
- [Project Conventions](#project-conventions)
- [Coding Guidelines](#coding-guidelines)
- [UI, Views, and i18n Guidelines](#ui-views-and-i18n-guidelines)
- [Database and Data Safety](#database-and-data-safety)
- [Security Requirements](#security-requirements)
- [Testing and Validation](#testing-and-validation)
- [Branching, Commits, and Pull Requests](#branching-commits-and-pull-requests)
- [Issue Reporting](#issue-reporting)
- [Release and Versioning Notes](#release-and-versioning-notes)

## Ways to Contribute

You can contribute by:

- Fixing bugs or security issues
- Improving existing features
- Adding small, focused enhancements
- Improving documentation
- Improving translations in `locales/*.json`
- Refining accessibility and UX consistency

For large changes, open an issue first to align scope before implementation.

## Before You Start

1. Read `README.md` for architecture and routes.
2. Read `SECURITY.md` for vulnerability handling and disclosure rules.
3. Check open issues/PRs to avoid duplicate work.
4. Keep changes focused; avoid unrelated refactors in the same PR.

## Local Development Setup

### Prerequisites

- Node.js 18+
- npm 9+
- Optional: Docker Desktop

### Start locally

```bash
npm install
node scripts/seedAdmin.js
npm start
```

Application default URL:

```text
http://localhost:3001
```

### Optional environment variables

- `PORT` (default in app is `3001`)
- `SESSION_SECRET` (required for production; strongly recommended locally)
- `ADMIN_PASSWORD` (recommended before running seed script)
- `NODE_ENV=production` (enables secure session cookie behavior)

### Run with Docker

```bash
docker compose up --build
```

## Project Conventions

### Architecture

- `controllers/`: route handlers and business logic
- `routes/`: route definitions and middleware composition
- `models/`: DB setup and low-level persistence helpers
- `utils/`: security, i18n, event helpers, shared logic
- `views/`: EJS templates
- `public/`: static assets (CSS/JS/images)

### Keep responsibilities clear

- Do not put DB query logic in EJS templates.
- Keep route files thin; move logic to controllers/utils.
- Reuse existing helpers instead of duplicating logic.

## Coding Guidelines

### JavaScript style

- Use clear, descriptive names.
- Prefer `const` and `let`; avoid `var`.
- Keep functions small and focused.
- Follow existing formatting and naming patterns in nearby files.
- Avoid introducing new dependencies unless justified.

### Error handling

- Handle expected errors (validation, DB conflicts, missing records).
- Avoid leaking stack traces or sensitive details to end users.
- Use flash messages consistently for user-visible outcomes.

### Logging

- Keep logs actionable and concise.
- Do not log passwords, reset tokens, session values, or secret material.

## UI, Views, and i18n Guidelines

### EJS and frontend scripts

- Keep templates readable and avoid embedding complex business logic.
- Reuse existing partials under `views/partials/`.
- Place page-specific JS in `public/js/` and keep it scoped.

### Styling

- Reuse existing CSS structure in `public/css/`.
- Keep visual changes consistent with current layout and branding.
- Avoid broad global style changes unless the PR specifically targets them.

### Localization

- Add/modify translation keys across all supported locale files when possible:
	- `locales/en.json`
	- `locales/lt.json`
	- `locales/lv.json`
	- `locales/ru.json`
	- `locales/tr.json`
- Use stable key names and avoid duplicate semantics with different keys.
- Verify missing keys fail gracefully in UI.

## Database and Data Safety

- Maintain compatibility with existing SQLite schema behavior.
- When changing schema or constraints, ensure startup/migration path remains safe.
- Preserve uniqueness constraints and role normalization rules.
- Be careful with destructive changes affecting `users` and `students` data.

If your change touches persistence:

- Describe data impact in the PR.
- Include rollback notes for risky changes.

## Security Requirements

Security-sensitive areas include auth, sessions, password reset, file uploads, and admin routes.

Contributor expectations:

- Keep CSRF protections intact.
- Preserve authorization checks for admin-only routes.
- Keep secure cookie/session configuration behavior unchanged unless explicitly improving it.
- Validate and sanitize untrusted input.
- Maintain upload restrictions (type/size/content checks).

For vulnerability reporting, follow `SECURITY.md` and use private disclosure channels.

## Testing and Validation

This repository currently has no automated test suite configured.

Before opening a PR, at minimum:

1. Start app locally and verify it boots cleanly.
2. Verify core flows impacted by your change:
	 - register/login/logout
	 - dashboard rendering
	 - admin student CRUD (if touched)
	 - notifications/events/schedules (if touched)
3. Verify no console/server errors for normal usage.
4. Check important edge cases (invalid input, permission denial, duplicate data).

Recommended checks:

- Run dependency audit and review findings:

	```bash
	npm audit
	```

- If you add scripts or checks, document usage in `README.md`.

## Branching, Commits, and Pull Requests

### Branch naming

Use descriptive branch names, for example:

- `fix/login-rate-limit`
- `feat/event-filtering`
- `docs/contributing-guide`

### Commit messages

Prefer concise, imperative messages:

- `fix: normalize email before auth lookup`
- `feat: add admin schedule update endpoint`
- `docs: clarify local setup steps`

### Pull request checklist

Include the following in your PR:

- Clear summary of what changed and why
- Scope boundaries (what is intentionally not included)
- Screenshots/GIFs for UI changes
- Manual validation steps performed
- Risk notes (security/data impact)
- Linked issue(s), if applicable

PR quality expectations:

- Keep PRs focused and reviewable.
- Avoid mixing feature work with unrelated cleanup.
- Update docs when behavior/setup changes.

## Issue Reporting

When opening a bug report, include:

- Expected behavior
- Actual behavior
- Reproduction steps
- Environment (OS, Node version, browser)
- Relevant logs or screenshots (without sensitive data)

For feature requests, include:

- Problem statement
- Proposed solution
- Alternatives considered
- Impacted routes/files if known

## Release and Versioning Notes

- Security fixes are applied to `beta` first.
- Backports (if needed) follow the policy in `SECURITY.md`.
- Keep dependency changes explicit and reviewed.

---

Thanks for contributing and helping keep Smart Student Portal reliable, secure, and maintainable.
