# FINDINGS

All findings come from reading code in session 1. None was reproduced against a running server. Status is OPEN unless stated. Verification of every fix needs a regression test.

## F-001 Admin step-up skipped when the admin has no password hash
- Severity: Medium. CVSS 3.1 AV:N/AC:H/PR:H/UI:N/S:U/C:H/I:H/A:H, about 6.6 (self-computed).
- Category: Broken function-level authorization. Area: Admin dashboard.
- File: `backend/src/middleware/requireAdminPassword.js` (`if (!user || !user.passwordHash) return next();`).
- Description: destructive admin actions that require the admin password are allowed without it when the admin account has no `passwordHash` (signed in with Google only).
- Reproduce (not run): sign in as a Google-only admin, call a step-up route such as delete user without `adminPassword`.
- Expected: step-up required or action refused. Actual by code: passes.
- Impact: a stolen admin session performs delete, force reset, MFA disable, export with no second check.
- Fix: fail closed when no password exists (require the admin to set one, or use a fresh Google re-auth).
- Test: integration test with a hash-less admin expecting 403.
- Status: OPEN. Note: admin files are owned by the other agent (CLAUDE.md section 8).

## F-002 No per-account limit on MFA login codes
- Severity: Medium. File: `backend/src/controllers/authController.js` (`verifyMfaLogin`), `rateLimiters.js` (`verifyCodeLimiter`).
- Description: wrong TOTP codes do not count against the account, the MFA login token stays valid 10 minutes, and TOTP codes are not marked used (replay inside the 30 s step). Only the per-IP limiter applies.
- Impact: with a known password, a distributed attacker can guess 6-digit codes; stolen code can be replayed in the same step.
- Fix: attempt counter on the account or token, invalidate the token after N failures, remember the last accepted step.
- Test: 6th wrong code is refused; same code twice is refused.
- Status: OPEN.

## F-003 Very high production rate limits on anonymous endpoints
- Severity: Low. File: `backend/src/middleware/rateLimiters.js`.
- Values read: login 300, verify codes 1000, MFA 200 per IP per 15 min. Per-account lockout and per-record OTP attempt caps reduce the risk.
- Fix: lower per-IP caps for unauthenticated credential endpoints, keep signed-in limits generous (owner prefers no "too many tries" in normal use). Needs owner decision.
- Status: OPEN.

## F-004 Personal email hardcoded as admin default
- Severity: Low. Files: `backend/src/config/env.js`, frontend admin email default, both `.env.example`.
- Impact: admin identity is public and a phishing target; backend falls back to it if `ADMIN_EMAIL` is unset in production.
- Fix: no default in production (fail startup), keep UI hint from env only.
- Status: OPEN.

## F-005 Frontend CSP is report-only
- Severity: Low. File: `frontend/public/_headers`.
- Description: policy is not enforced, includes `localhost:5000`, lacks the production API origin, allows inline styles. No XSS sinks found (`dangerouslySetInnerHTML`, `innerHTML`, `eval` absent), so impact is defence in depth.
- Fix: add production origin, remove localhost, test, then enforce.
- Status: OPEN.

## F-006 Avatar upload trusts client extension and MIME type
- Severity: Low. File: `backend/src/middleware/upload.js`.
- Description: disk path uses `path.extname(file.originalname)`, no magic-byte check. Served from `/uploads` with `nosniff` and sandbox CSP. Only when Cloudinary is not configured.
- Fix: derive extension from a validated type, check magic bytes.
- Status: OPEN.

## F-007 Dependency audit cannot fail CI; multer 1.x
- Severity: Low. Files: `.github/workflows/security.yml`, `backend/package.json`.
- Description: `npm audit` has `continue-on-error: true`. `multer ^1.4.5-lts.1` is the 1.x line that upstream flags as having advisories fixed in 2.x. Evidence added 2026-11-18: the owner's `npm install` reports 10 vulnerabilities (6 moderate, 4 high) in the backend; package names not captured yet (see DEPENDENCY-AUDIT.md). The multer point is still NOT VERIFIED.
- Fix: run audit on a networked machine, upgrade multer after testing uploads, make high findings fail CI.
- Status: OPEN, NOT VERIFIED.

## F-008 MFA disable needs password only, limiter per IP
- Severity: Low. File: `backend/src/controllers/mfaController.js` (`disableMfa`), route limiter `mfaLimiter`.
- Description: no TOTP code required, no session revocation after disabling, and a hash-less account would reach `bcrypt.compare` with undefined (likely a 500; NOT VERIFIED).
- Status: OPEN.

## F-009 Account enumeration through messages
- Severity: Low. File: `authController.js` (login, signup, `loginStatus`).
- Description: distinct responses for Google-only, deactivated, locked and already-registered accounts. Common usability trade-off; owner decision.
- Status: OPEN.

## F-010 Refresh cookie not path-scoped
- Severity: Informational. File: `authController.js` cookie options. HttpOnly is set. Scope `path` to `/api/auth`.
- Status: OPEN.

## F-011 Git history not auditable
- Severity: Informational. The zip has no `.git`. Secret scan of history is NOT VERIFIED (CI runs gitleaks).
- Status: NOT VERIFIED.

## Controls inspected that held up (by code reading, not by attack)
No secret patterns in source. No tokens in web storage. OTP attempts are atomic. Reset nonce is single-use. Refresh rotation with replay detection. Profile update uses an allow-list. Team role changes are owner-only and org-scoped. Group access checks membership. Receipt images are private and signed. Writes in committees, budgets and goals are role-guarded.
