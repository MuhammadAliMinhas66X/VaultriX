# TEST-RESULTS

Environment limit: no npm registry access, so `npm ci` left empty folders and neither vitest nor the server could run.

| Test | Purpose | Expected | Actual | Status | Evidence |
|---|---|---|---|---|---|
| backend/tests/unit/healthMonitor.test.js (16 cases) | status rules, no leaking, caching, throttling, metrics | pass | 16 passed | PASSED (real vitest, and earlier under local shim) | owner's run |
| frontend/tests/health-view.test.js (5 cases) | label and format helpers | pass | 5 passed | PASSED under local shim only; real vitest NOT VERIFIED | shim output |
| backend/tests/integration/admin-health.test.js (5 tests) | admin gating, shape, no sensitive data, throttle, public liveness | pass | 5 passed | PASSED (real vitest) | owner's run 2026-11-18 |
| Syntax parse of SystemHealth.jsx, AdminPage.jsx, adminService.js, healthView.js | no syntax errors | parse ok | parse ok | PASSED (parse only) | TypeScript parser |
| `node --check` on all new backend files | syntax | ok | ok | PASSED | |
| Full backend suite | no regression | pass | 33 files, 218 tests passed (was 29 files, 175 before the merge) | PASSED (real vitest v5.0.5) | owner's run, 207 s |
| Existing frontend suite | no regression | pass | not reported yet | NOT VERIFIED | |
| `vite build` | UI compiles | ok | not run | NOT VERIFIED | |
| `npm audit` (backend, owner's `npm install` output) | dependency advisories | report | 10 vulnerabilities (6 moderate, 4 high); an earlier install showed 18 (5 moderate, 13 high). Details not yet captured | PARTIAL, see DEPENDENCY-AUDIT.md | npm output |
| Dynamic penetration tests | | | none performed | NOT STARTED | |

Run on your PC: `cd backend && npm test`, `cd frontend && npm test && npm run build`, then `node docs/dev/check-bills-wiring.mjs`.
