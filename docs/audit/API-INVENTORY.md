# API-INVENTORY

Generated from the real route files on 2026-11-18 by parsing `backend/src/routes/*.js` (139 route declarations before the health work, 141 now). Nothing here is invented. Columns: Auth = `authenticate` present; Role guard = what stops a viewer or another person; Rate limit = route-specific limiter (the global `apiLimiter` applies to every `/api` route except `/api/admin`).

Controllers are one per area (`backend/src/controllers/<area>Controller.js`). Request/response shapes are not duplicated here; read the controller named by the area.

**Counts:** 141 route declarations, 14 without authentication (all in `/api/auth`, by nature), plus the public `GET /api/health` declared in `app.js`.

**Parser limits (read this):** the table is built by a regex over the route files. Guards applied in a way the regex does not see would show as "none found"; every such case was checked by hand and is listed under Notes. Tests column counts how many times the area's path appears in `backend/tests/integration/*.test.js` (a rough coverage hint, not a coverage measurement).

| Method | Endpoint | Auth | Role guard | Rate limit |
|---|---|---|---|---|
| GET | /api/health | no | n/a | apiLimiter only |
| GET | /api/accounts | yes | any signed-in role (read) | apiLimiter only |
| POST | /api/accounts | yes | owner/admin/member (viewer blocked) | financeLimiter |
| PATCH | /api/accounts/:id | yes | owner/admin/member (viewer blocked) | financeLimiter |
| DELETE | /api/accounts/:id | yes | owner/admin/member (viewer blocked) | financeLimiter |
| GET | /api/admin/overview | yes | any signed-in role (read) | apiLimiter only |
| GET | /api/admin/audit-log | yes | any signed-in role (read) | apiLimiter only |
| GET | /api/admin/security-overview | yes | any signed-in role (read) | apiLimiter only |
| GET | /api/admin/health | yes | any signed-in role (read) | apiLimiter only |
| POST | /api/admin/health/check | yes | ADMIN_EMAIL (requireAdmin, 404 for others) | healthCheckLimiter |
| GET | /api/admin/users/export | yes | any signed-in role (read) + admin password | apiLimiter only |
| GET | /api/admin/users | yes | any signed-in role (read) | apiLimiter only |
| GET | /api/admin/users/:id | yes | any signed-in role (read) | apiLimiter only |
| PATCH | /api/admin/users/:id | yes | ADMIN_EMAIL (requireAdmin, 404 for others) | apiLimiter only |
| POST | /api/admin/users/:id/deactivate | yes | ADMIN_EMAIL (requireAdmin, 404 for others) | apiLimiter only |
| POST | /api/admin/users/:id/reactivate | yes | ADMIN_EMAIL (requireAdmin, 404 for others) | apiLimiter only |
| POST | /api/admin/users/:id/unlock | yes | ADMIN_EMAIL (requireAdmin, 404 for others) | apiLimiter only |
| DELETE | /api/admin/users/:id | yes | ADMIN_EMAIL (requireAdmin, 404 for others) + admin password | apiLimiter only |
| POST | /api/admin/users/:id/force-password-reset | yes | ADMIN_EMAIL (requireAdmin, 404 for others) + admin password | apiLimiter only |
| POST | /api/admin/users/:id/disable-mfa | yes | ADMIN_EMAIL (requireAdmin, 404 for others) + admin password | apiLimiter only |
| DELETE | /api/admin/users/:id/sessions/:sessionId | yes | ADMIN_EMAIL (requireAdmin, 404 for others) | apiLimiter only |
| POST | /api/auth/signup | **no** | - | signupLimiter |
| POST | /api/auth/signup/verify | **no** | - | verifyCodeLimiter |
| POST | /api/auth/login | **no** | - | loginLimiter |
| POST | /api/auth/verify-device | **no** | - | verifyCodeLimiter |
| POST | /api/auth/verify-mfa | **no** | - | verifyCodeLimiter |
| POST | /api/auth/login-status | **no** | - | loginStatusLimiter |
| POST | /api/auth/logout | **no** | - | apiLimiter only |
| POST | /api/auth/google | **no** | - | googleLimiter |
| POST | /api/auth/link-google | yes | - | googleLimiter |
| POST | /api/auth/unlink-google | yes | - | googleLimiter |
| POST | /api/auth/google/callback | **no** | - | googleLimiter |
| POST | /api/auth/refresh | **no** | - | refreshLimiter |
| GET | /api/auth/me | yes | any signed-in role (read) | apiLimiter only |
| POST | /api/auth/validate-email | **no** | - | emailCheckLimiter |
| POST | /api/auth/forgot-password | **no** | - | forgotLimiter |
| POST | /api/auth/verify-reset-code | **no** | - | verifyCodeLimiter |
| POST | /api/auth/reset-password | **no** | - | resetLimiter |
| GET | /api/bills | yes | any signed-in role (read) | apiLimiter only |
| POST | /api/bills | yes | owner/admin/member (viewer blocked) | financeLimiter |
| PATCH | /api/bills/:id | yes | owner/admin/member (viewer blocked) | financeLimiter |
| DELETE | /api/bills/:id | yes | owner/admin/member (viewer blocked) | financeLimiter |
| POST | /api/bills/:id/payments | yes | owner/admin/member (viewer blocked) | financeLimiter |
| DELETE | /api/bills/:id/payments/:paymentId | yes | owner/admin/member (viewer blocked) | financeLimiter |
| POST | /api/bills/:id/cancel | yes | owner/admin/member (viewer blocked) | financeLimiter |
| POST | /api/bills/:id/recurring | yes | owner/admin/member (viewer blocked) | financeLimiter |
| GET | /api/categories | yes | any signed-in role (read) | apiLimiter only |
| POST | /api/categories | yes | owner/admin/member (viewer blocked) | financeLimiter |
| PATCH | /api/categories/:id | yes | owner/admin/member (viewer blocked) | financeLimiter |
| DELETE | /api/categories/:id | yes | owner/admin/member (viewer blocked) | financeLimiter |
| GET | /api/committees | yes | any signed-in role (read) | apiLimiter only |
| POST | /api/committees | yes | owner/admin/member (viewer blocked) | apiLimiter only |
| PUT | /api/committees/:id | yes | owner/admin/member (viewer blocked) | apiLimiter only |
| PATCH | /api/committees/:id | yes | owner/admin/member (viewer blocked) | apiLimiter only |
| DELETE | /api/committees/:id | yes | owner/admin/member (viewer blocked) | apiLimiter only |
| POST | /api/committees/:id/payments | yes | owner/admin/member (viewer blocked) | apiLimiter only |
| DELETE | /api/committees/:id/payments/:round | yes | owner/admin/member (viewer blocked) | apiLimiter only |
| POST | /api/committees/:id/payout | yes | owner/admin/member (viewer blocked) | apiLimiter only |
| DELETE | /api/committees/:id/payout | yes | owner/admin/member (viewer blocked) | apiLimiter only |
| GET | /api/data/export/:kind | yes | any signed-in role (read) | financeLimiter |
| POST | /api/data/import/expenses | yes | owner/admin/member (viewer blocked) | financeLimiter |
| POST | /api/data/import | yes | owner/admin/member (viewer blocked) | financeLimiter |
| GET | /api/expenses/totals | yes | any signed-in role (read) | apiLimiter only |
| GET | /api/expenses | yes | any signed-in role (read) | apiLimiter only |
| POST | /api/expenses | yes | owner/admin/member (viewer blocked) | financeLimiter |
| PATCH | /api/expenses/:id | yes | owner/admin/member (viewer blocked) | financeLimiter |
| DELETE | /api/expenses/:id | yes | owner/admin/member (viewer blocked) | financeLimiter |
| POST | /api/expenses/:id/receipt | yes | owner/admin/member (viewer blocked) | uploadLimiter |
| DELETE | /api/expenses/:id/receipt | yes | owner/admin/member (viewer blocked) | financeLimiter |
| GET | /api/fx/rates | yes | any signed-in role (read) | fxLimiter |
| GET | /api/groups | yes | any signed-in role (read) | teamLimiter |
| POST | /api/groups | yes | member of group (checked in controller) | teamLimiter |
| POST | /api/groups/join | yes | member of group (checked in controller) | joinLimiter |
| GET | /api/groups/invites/mine | yes | any signed-in role (read) | teamLimiter |
| POST | /api/groups/invites/:inviteId/accept | yes | member of group (checked in controller) | joinLimiter |
| DELETE | /api/groups/invites/:inviteId | yes | member of group (checked in controller) | teamLimiter |
| GET | /api/groups/:id | yes | any signed-in role (read) | teamLimiter |
| PATCH | /api/groups/:id | yes | member of group (checked in controller) | teamLimiter |
| DELETE | /api/groups/:id | yes | member of group (checked in controller) | teamLimiter |
| POST | /api/groups/:id/leave | yes | member of group (checked in controller) | teamLimiter |
| POST | /api/groups/:id/invites | yes | member of group (checked in controller) | inviteLimiter |
| DELETE | /api/groups/:id/invites/:inviteId | yes | member of group (checked in controller) | teamLimiter |
| POST | /api/groups/:id/expenses | yes | member of group (checked in controller) | teamLimiter |
| PATCH | /api/groups/:id/expenses/:expenseId | yes | member of group (checked in controller) | teamLimiter |
| DELETE | /api/groups/:id/expenses/:expenseId | yes | member of group (checked in controller) | teamLimiter |
| POST | /api/groups/:id/expenses/:expenseId/my-expenses | yes | owner/admin/member (viewer blocked) | teamLimiter |
| POST | /api/groups/:id/settlements | yes | member of group (checked in controller) | teamLimiter |
| DELETE | /api/groups/:id/settlements/:settlementId | yes | member of group (checked in controller) | teamLimiter |
| GET | /api/income-streams | yes | any signed-in role (read) | apiLimiter only |
| POST | /api/income-streams | yes | owner/admin/member (viewer blocked) | financeLimiter |
| PATCH | /api/income-streams/:id | yes | owner/admin/member (viewer blocked) | financeLimiter |
| DELETE | /api/income-streams/:id | yes | owner/admin/member (viewer blocked) | financeLimiter |
| GET | /api/loans | yes | any signed-in role (read) | apiLimiter only |
| POST | /api/loans | yes | owner/admin/member (viewer blocked) | financeLimiter |
| PATCH | /api/loans/:id | yes | owner/admin/member (viewer blocked) | financeLimiter |
| DELETE | /api/loans/:id | yes | owner/admin/member (viewer blocked) | financeLimiter |
| POST | /api/loans/:id/payments | yes | owner/admin/member (viewer blocked) | financeLimiter |
| DELETE | /api/loans/:id/payments/:paymentId | yes | owner/admin/member (viewer blocked) | financeLimiter |
| POST | /api/loans/:id/received-proof | yes | owner/admin/member (viewer blocked) | uploadLimiter |
| DELETE | /api/loans/:id/received-proof | yes | owner/admin/member (viewer blocked) | financeLimiter |
| POST | /api/loans/:id/payments/:paymentId/proof | yes | owner/admin/member (viewer blocked) | uploadLimiter |
| DELETE | /api/loans/:id/payments/:paymentId/proof | yes | owner/admin/member (viewer blocked) | financeLimiter |
| GET | /api/budgets | yes | any signed-in role (read) | apiLimiter only |
| PUT | /api/budgets | yes | owner/admin/member (viewer blocked) | apiLimiter only |
| DELETE | /api/budgets/:id | yes | owner/admin/member (viewer blocked) | apiLimiter only |
| GET | /api/goals | yes | any signed-in role (read) | apiLimiter only |
| POST | /api/goals | yes | owner/admin/member (viewer blocked) | apiLimiter only |
| PUT | /api/goals/:id | yes | owner/admin/member (viewer blocked) | apiLimiter only |
| PATCH | /api/goals/:id | yes | owner/admin/member (viewer blocked) | apiLimiter only |
| DELETE | /api/goals/:id | yes | owner/admin/member (viewer blocked) | apiLimiter only |
| POST | /api/goals/:id/contributions | yes | owner/admin/member (viewer blocked) | apiLimiter only |
| DELETE | /api/goals/:id/contributions/:contributionId | yes | owner/admin/member (viewer blocked) | apiLimiter only |
| GET | /api/receipts/opening | yes | any signed-in role (read) | apiLimiter only |
| PUT | /api/receipts/opening | yes | owner/admin/member (viewer blocked) | financeLimiter |
| GET | /api/receipts | yes | any signed-in role (read) | apiLimiter only |
| POST | /api/receipts | yes | owner/admin/member (viewer blocked) | financeLimiter |
| PATCH | /api/receipts/:id | yes | owner/admin/member (viewer blocked) | financeLimiter |
| DELETE | /api/receipts/:id | yes | owner/admin/member (viewer blocked) | financeLimiter |
| GET | /api/salary-plan | yes | any signed-in role (read) | apiLimiter only |
| GET | /api/salary-plan/:month | yes | any signed-in role (read) | apiLimiter only |
| PUT | /api/salary-plan/:month | yes | owner/admin/member (viewer blocked) | financeLimiter |
| POST | /api/security/events | yes | own events only | securityEventLimiter |
| GET | /api/team | yes | any signed-in role (read) | teamLimiter |
| POST | /api/team/invites | yes | role checked in controller (owner/admin rules) | inviteLimiter |
| DELETE | /api/team/invites/:id | yes | role checked in controller (owner/admin rules) | teamLimiter |
| POST | /api/team/join | yes | role checked in controller (owner/admin rules) | joinLimiter |
| POST | /api/team/leave | yes | role checked in controller (owner/admin rules) | teamLimiter |
| PATCH | /api/team/members/:id | yes | role checked in controller (owner/admin rules) | teamLimiter |
| DELETE | /api/team/members/:id | yes | role checked in controller (owner/admin rules) | teamLimiter |
| PATCH | /api/users/me | yes | own account only (req.user.id) | apiLimiter only |
| POST | /api/users/me/password | yes | own account only (req.user.id) | passwordChangeLimiter |
| POST | /api/users/me/avatar | yes | own account only (req.user.id) | apiLimiter only |
| GET | /api/users/me/sessions | yes | any signed-in role (read) | sessionsLimiter |
| DELETE | /api/users/me/sessions/:id | yes | own account only (req.user.id) | sessionsLimiter |
| POST | /api/users/me/sessions/logout-all | yes | own account only (req.user.id) | sessionsLimiter |
| POST | /api/users/me/email/request-change | yes | own account only (req.user.id) | emailChangeLimiter |
| POST | /api/users/me/email/verify-change | yes | own account only (req.user.id) | emailChangeLimiter |
| POST | /api/users/me/delete/request | yes | own account only (req.user.id) | accountDeleteLimiter |
| POST | /api/users/me/delete/confirm | yes | own account only (req.user.id) | accountDeleteLimiter |
| POST | /api/users/me/mfa/setup | yes | own account only (req.user.id) | mfaLimiter |
| POST | /api/users/me/mfa/confirm | yes | own account only (req.user.id) | mfaLimiter |
| POST | /api/users/me/mfa/disable | yes | own account only (req.user.id) | mfaLimiter |

## Test references per area

| Area | Path mentions in integration tests |
|---|---|
| /api/accounts | 1 |
| /api/admin | 7 |
| /api/auth | 42 |
| /api/bills | 17 |
| /api/categories | 1 |
| /api/committees | 23 |
| /api/data | 6 |
| /api/expenses | 31 |
| /api/fx | 0 |
| /api/groups | 43 |
| /api/income-streams | 9 |
| /api/loans | 12 |
| /api/budgets | 11 |
| /api/goals | 13 |
| /api/receipts | 22 |
| /api/salary-plan | 20 |
| /api/security | 1 |
| /api/team | 20 |
| /api/users | 26 |

## Notes

- Committees, budgets and goals guard writes with a `write` array (`[requireRole(...), financeLimiter]`) spread into the route; the regex first missed this and reported them unguarded. Checked by hand: they are guarded.
- `/api/groups/*` and `/api/team/*` do not use `requireRole` on the route. Group access is "active member of that group" (`findMine` in `groupController.js`), team rules live in `teamController.js`.
- `/api/admin/*` routes run behind `authenticate` then `requireAdmin` (ADMIN_EMAIL). Destructive ones add `stepUp` (`requireAdminPassword`), see FINDINGS F-001.
- `/api/admin/health` and `/api/admin/health/check` were added by this audit (task HM-1).
- Auth endpoints that are anonymous by nature: signup, verify, login, verify-device, verify-mfa, login-status, logout, google, google/callback, refresh, validate-email, forgot-password, verify-reset-code, reset-password.
- Static files: `GET /uploads/*` serves avatar images from disk when Cloudinary is not configured. No authentication (avatars are not private), see F-006.
