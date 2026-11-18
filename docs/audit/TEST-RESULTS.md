# TEST-RESULTS

Environment limit: no npm registry access, so `npm ci` left empty folders and neither vitest nor the server could run.

| Test | Purpose | Expected | Actual | Status | Evidence |
|---|---|---|---|---|---|
| backend/tests/unit/healthMonitor.test.js (16 cases) | status rules, no leaking, caching, throttling, metrics | pass | 16 passed | PASSED under local shim only; real vitest NOT VERIFIED | shim output 2026-11-18 |
| frontend/tests/health-view.test.js (5 cases) | label and format helpers | pass | 5 passed | PASSED under local shim only; real vitest NOT VERIFIED | shim output |
| backend/tests/integration/admin-health.test.js | admin gating, shape, no sensitive data | pass | not run (needs MongoDB memory server) | NOT VERIFIED | none |
| Syntax parse of SystemHealth.jsx, AdminPage.jsx, adminService.js, healthView.js | no syntax errors | parse ok | parse ok | PASSED (parse only) | TypeScript parser |
| `node --check` on all new backend files | syntax | ok | ok | PASSED | |
| Existing backend and frontend suites | no regression | pass | not run | NOT VERIFIED | |
| `vite build` | UI compiles | ok | not run | NOT VERIFIED | |
| `npm audit` | dependency advisories | report | registry unreachable | NOT VERIFIED | |
| Dynamic penetration tests | | | none performed | NOT STARTED | |

Run on your PC: `cd backend && npm test`, `cd frontend && npm test && npm run build`, then `node docs/dev/check-bills-wiring.mjs`.
