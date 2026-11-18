# REMEDIATION-ROADMAP

One task per change. Add a regression test with each. Do not mark COMPLETED without passing the acceptance check.

| ID | Objective | Findings | Files | Acceptance | Priority | Status |
|---|---|---|---|---|---|---|
| HM-1 | Admin System health (backend + UI) | n/a | see CHANGELOG | Unit + integration tests pass under real vitest; `vite build` ok; screen checked on phone and desktop | High | IN PROGRESS: backend VERIFIED (218/218 tests); frontend tests, build and visual check NOT VERIFIED |
| SEC-1 | Fail closed in `requireAdminPassword` | F-001 | middleware/requireAdminPassword.js | Hash-less admin gets 403 on step-up routes | High | NOT STARTED |
| SEC-2 | MFA login attempt cap and TOTP replay guard | F-002 | authController.js, User model | 6th wrong code refused; same code twice refused | High | NOT STARTED |
| SEC-3 | MFA disable: require code, revoke sessions, handle no hash | F-008 | mfaController.js | tests for each | Medium | NOT STARTED |
| DEP-1 | Run `npm audit` both packages; upgrade multer; make CI fail on high | F-007 | package.json, security.yml | audit clean or documented | Medium | IN PROGRESS (backend shows 10 vulnerabilities; names needed) |
| SEC-4 | Tune anonymous rate limits | F-003 | rateLimiters.js | owner approves numbers | Low | BLOCKED (owner) |
| SEC-5 | Enforce frontend CSP | F-005 | public/_headers | no console violations on all routes | Low | NOT STARTED |
| SEC-6 | Validate avatar type by content | F-006 | middleware/upload.js | fake extension refused | Low | NOT STARTED |
| SEC-7 | No default admin email in production; scope refresh cookie | F-004, F-010 | env.js, authController.js | startup fails without ADMIN_EMAIL in production | Low | NOT STARTED |
| AUD-1 | Dynamic IDOR and authorization tests for every area | n/a | tests/integration | tests for each route group in API-INVENTORY | High | NOT STARTED |
| AUD-2 | Financial correctness audit: bills, salary, groups, committees (loans read-only) | n/a | controllers, utils | documented per feature with numbers | High | NOT STARTED |
| AUD-3 | Database model audit: indexes, cascade, ownership | n/a | models/ | DATABASE-AUDIT.md filled | Medium | NOT STARTED |
| AUD-4 | UI/UX, accessibility, RTL, performance audits | n/a | frontend | the four docs filled | Medium | NOT STARTED |
| HM-2 | Optional probes for Google and Turnstile | n/a | healthProbes.js | owner wants them | Low | NOT STARTED |
