# CLAUDE.md - Vaultrix

Read this first, every session. It exists so work is not repeated and past decisions are not forgotten.
Keep it current: when something here becomes false, fix the line in the same round.

## 1. Who and what

- Owner: Muhammad Ali Minhas, Lahore. Timezone Asia/Karachi (UTC+05:00). Windows PC, PowerShell, VS Code.
- Vaultrix: personal and shared finance tracker (income streams, expenses, loans, bills, live exchange rates, six languages).
- The real repo is on his machine and I can never reach it. I work on a sandbox copy of the zip he sends and hand back changed files. His latest zip is the only source of truth (see section 3).
- Another agent works on other parts at the same time (Loans, admin/security, Cloudflare). Never assume my copy is current.

## 2. How he wants me to work (non-negotiable)

- Do the whole task. Do not stop to ask "should I continue", do not offer plans and wait, do not mention limits. He has said "complete this", "finish it", "make further progress" more than once. Ask only when truly blocked and a wrong guess is expensive.
- Say in one short sentence what I am doing before long work. Keep replies short and plain: what changed, what I verified, what I could not verify. No recaps of steps.
- Be honest. If I claimed something wrong (I once said rates matched when they did not), own it in one line and fix it. Never say "verified" for something I did not run.
- No AI slop UI. He wants clean, modern, restrained, "settled" layouts. Black and white with muted greys, no gradients for decoration, no emoji icons, no filler text, no cluttered rows. Look at screenshots of my own work before delivering.
- Simple for the user, fast for repeat entry: remember choices, sensible defaults, one tap where possible.
- Exact numbers matter to him. Rates must equal the live source with no rounding drift. Show real precision where asked (deduction share shows 2 decimals).
- Hands off Loans unless he says otherwise. He is working on loans in another agent. Do not edit `loanController`, `Loan.js`, `components/loans/*` (except importing existing shared pieces like `WherePicker`, `loanOptions.js`, which must keep working), `LoansPage.jsx`.
- Do not change the stack. Do not add packages unless needed, and say so loudly in the merge script header.

## 3. Delivery workflow (every round)

1. Unzip his latest codebase into a NEW folder (for example `/home/claude/work/lN/`). Never build on an older sandbox copy. Diff against the previous copy to see what the other agent changed, and re-check the hot files in section 8 before anything else.
2. Make the change. Run tests and a build. Check UI in a real browser engine (section 9).
3. Produce three files in `/mnt/user-data/outputs/` and send them with SendUserFile:
   - `vaultrix-v1_NNN.zip` - ONLY changed and new files, inside a top folder `vaultrix-v1_NNN/` with repo-relative paths.
   - `merge-vaultrix-v1_NNN.ps1` - extracts the zip next to itself and robocopies into his repo. Header comment: WHAT CHANGED, VERIFIED, NOT VERIFIED, and whether to restart the backend or run npm install.
   - `commit-v1_NNN.ps1` - `Save-Commit` per logical group (conventional messages: `feat(api): ...`, `feat(ui): ...`, `fix(ui): ...`, `feat(i18n): ...`), does NOT push without asking, refuses if files are already staged.
4. Templates: copy the last delivered pair and change names and groups. Repo path candidates in the scripts: `C:\Users\DELL\Downloads\vaultrix-main-github-origined-folder\vaultrix` then a `vaultrix` folder next to the script. Windows windows stay open with "Press Enter to close".
5. Commit scripts add NO AI attribution lines (he asked for plain messages).
6. Version numbers continue from the last round. Last delivered: v1_110 (add-bill form rework). The CLAUDE.md round is v1_111 (see section 11).
7. Final message: one or two sentences, what is in it, the one next step, and honest "not verified". Do not paste links for Artifacts; do not re-send unchanged files.

## 4. Stack and commands

- Frontend: React 18, Vite 5 (dev port 3000), Tailwind 3.4, Framer Motion, React Router v6, lucide-react, Axios, vitest. No other UI library.
- Backend: Node (ESM), Express, MongoDB with Mongoose, JWT (access token in memory, refresh via cookie), vitest + supertest + mongodb-memory-server for integration tests.
- Tailwind colours: ink `#111114`, surface `#f7f7f8`, border `#e5e5e7`, muted `#6b6b70`, accent `#1a1a1e`.
- Commands:
  - Backend: `cd backend && npm run dev` / `npx vitest run tests/unit` (integration tests need MongoDB binary; they run on his PC, not in my sandbox).
  - Frontend: `cd frontend && npx vitest run` and `npx vite build`.
- API base in the browser: `VITE_API_URL || http://localhost:5000/api`.

## 5. Map of the code

Backend `backend/src/`:
- `app.js` mounts routers under `/api`: auth, users, security, admin, accounts, categories, income-streams, fx, loans, expenses, bills. Middleware order: helmet/cors, json (10kb limit), cookies, `sanitizeInput`, `attachDeviceId`, `originGuard`, `apiLimiter`, `noStore`, routes, 404, `errorHandler`.
- `models/`: User, Organization, Session, Account, Category, IncomeStream, Loan, Expense, Bill, and Pending* models for signup/email change/device login/account deletion.
- `controllers/`, `routes/`: one pair per area. Writes use `requireRole('owner','admin','member')` and `financeLimiter` for money routes.
- `services/exchangeRateService.js`: live rates. `services/imageStorage.js`: Cloudinary proofs.
- `utils/`: `decimalMoney.js` (minor-unit parsing), `billRecurrence.js`, `organizations.js` (org cleanup), `mailer.js`, `tokens.js`, `validators.js` and security helpers.

Frontend `frontend/src/`:
- `App.jsx` routes. `context/AuthContext.jsx`, `context/IncomeContext.jsx` (income streams and live rates, polls every 30 s).
- `pages/`: Dashboard, Income, Expenses, Bills, Loans, Settings, Admin, auth pages, Onboarding.
- `components/`: shared (`Combobox`, `Drawer`, `FormField`, `BrandMark`, toasts via `AlertBanner`/`ToastViewport`/`i18n/notifications.js`), plus folders per area (`bills/`, `loans/`, `expenses/`, `income/`, `dashboard/`, `layout/`).
- `utils/`: math and formatting per area (`billMath.js`, `billDates.js`, `billPrefs.js`, `billPdf.js`, `pdfWriter.js`, `billers.js`, `paymentBrands.js`, `loanMath.js`, `expenseMath.js`, `salaryCuts.js`).
- `i18n/`: `locales/{en,fr,es,ar,hi,ur}.js`, `translate.js`, `useTranslation`, `useFormat`.
- `tests/`: `i18n-parity.test.js`, `server-message-coverage.test.js`.

## 6. Rules that prevent bugs

Money
- Stored as integer minor units. Expenses and bills use scale 100. Loans use scale 10^4 (`LOAN_SCALE`). Convert with `decimalMoney.js` helpers, never float math on stored values.
- Rates: `rates[code]` = units of `code` per 1 base currency. `toBase(amount, code, rates) = amount / rates[code]`.

Multi-tenancy and security
- Every model has `orgId`; every query filters by `req.user.orgId`. Cross-account access must return not-found, and each new model needs a case in `backend/tests/integration/ownership.test.js`.
- Every new model must be added to `utils/organizations.js` `removeOrganizationIfEmpty` so deleting an account does not leave data behind.
- Mutating routes: `authenticate`, `canWrite`, `financeLimiter`. Never trust client-computed status or totals.
- Do not weaken origin guard, rate limits, sanitising, or admin password checks (another agent owns these).

i18n (six languages, flat keys)
- Every user-visible string goes through `t('key')`. Add the key to ALL six locale files. `i18n-parity.test.js` checks keys and `{placeholders}` match.
- Raw backend `message:` strings must be listed in `tests/server-message-coverage.test.js` `KNOWN_BACKEND_MESSAGES` AND mapped in `translate.js` `SERVER_MESSAGE_KEYS`.
- Use `t(...)` keys that exist. A missing key shows as raw uppercase text (this happened with `expenses.chooseIcon`).
- Arabic and Urdu are RTL: use `ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-` classes, not left/right. Hindi, Urdu and Arabic text has not been reviewed by a native speaker.

Frontend habits
- Dates are `YYYY-MM-DD` keys in UTC (`utils/dates.js`, `utils/expenseMath.js shiftDay`). "Today" comes from the local date (`todayInput()`), never `new Date().toISOString()`.
- Dropdowns: use `Combobox` (portal, searchable, grouped, supports `footer`, `searchable={false}`, item `sub`). Do not hand-roll new select popups.
- Toasts: single animation only (Framer). Do not add a CSS fade on top of it (that caused the blink).
- Mobile first. No horizontal page scroll at 390 px. Bottom nav is fixed; leave bottom padding.

## 7. Features and decisions (so I do not redo them)

Live rates (v1_104 to v1_108)
- Server `exchangeRateService.js` reads Yahoo chart quotes for 27 currencies, each pair as its own live quote with a USD cross fallback. Live TTL 20 s, general cache 10 min, `fxLimiter` on `/api/fx`.
- Yahoo `regularMarketPrice` has only about 4 decimals, so always quote in the direction where the price is at least 1 (PKR per USD, not USD per PKR). This fixed the $181.02 vs $182.03 gap.
- Dashboard rate line reads like Yahoo: `1 USD = 276.4500 PKR` plus time to the second. The client polls every 30 s. Two numbers read minutes apart will differ; only compare at the same moment.
- Yahoo is unofficial and I cannot reach it from the sandbox. A Google Sheets CSV or Twelve Data source was offered and is waiting for his decision.

Bills (v1_109, v1_110)
- Each Bill document is ONE occurrence of a series: `seriesId`, `sequence`, `anchor`, `generated`, `seriesState` (active|paused), `frequency` (none, daily, weekly, monthly, quarterly, yearly), `payments[]`, `installationMinor`.
- Next due dates come from the anchor (21 Nov monthly -> 21 Dec; 31 Jan -> 28 Feb -> 31 Mar). "Bill coming date" (`nextBillAt`) is when the next occurrence appears in the list; default is day after period end or due date. Unique index `(orgId, seriesId, sequence)` plus claim-by-flag means no duplicate generation.
- Resume uses `skipMissed`. A bill with payments cannot be deleted. Currency locks once paid. Status (Upcoming, Due Today, Overdue, Partially Paid, Paid, Cancelled) is computed on the client from local today.
- Each payment creates an Expense (`billId`, `billPaymentId`, unique partial index). Bill-linked expenses cannot be edited or deleted from `/expenses`. Payment failure rolls back.
- PDFs (bill, receipt, partial summary) use the dependency-free `pdfWriter.js`, always English and Latin letters only. Preview is an HTML replica. Share uses `navigator.share({files})` with WhatsApp, email and copy fallbacks.
- Add-bill form: sections Bill / When / Payment, "More options" holds account number, installation, billing period, bill coming date. Choices are remembered per company in localStorage (`utils/billPrefs.js`); "Save & add another" resets the form. Category dropdown has a pinned "+ New category" that opens `NewCategorySheet`.
- Biller logos: `BrandMark` tries `public/logos/index.json` manifest, then Google and DuckDuckGo favicons, then the site's own icon, then a coloured monogram tile (colour in `billers.js`). Real logos need `node scripts/fetch-logos.mjs` on his PC.
- Dashboard shows `BillsPanel` between the hero card and latest income.

Toast blink (fixed in v1_109): two fade-ins on one element. Keep one animation.

## 8. Hot files the other agent also edits - check after every new zip

When a new zip arrives, diff these against my last copy and re-apply my parts if they were lost. This has already happened (found at the start of v1_111):
- `backend/src/app.js` - must import and mount `billRoutes` at `/api/bills`.
- `frontend/src/i18n/translate.js` - must keep the 5 bill entries in `SERVER_MESSAGE_KEYS` (`errors.billCurrencyLocked`, `errors.billTotalLow`, `errors.billCancelled`, `errors.billDeletePaid`, `errors.expenseBillLinked`) next to his 429 retry-after code.
- `backend/src/utils/organizations.js` - must delete `Bill` on org cleanup.
- `backend/src/middleware/rateLimiters.js` - must export `financeLimiter` and `fxLimiter`.
- `frontend/src/services/api.js`, `apiError.js`, `adminService.js`, `AdminPage.jsx` - his security work; do not overwrite, merge by hand if I must touch them.
Quick check after unzipping: `grep -n bill backend/src/app.js`, run frontend tests (a lost translate.js mapping shows as failing `server-message-coverage` tests), then diff my known-changed files.

## 9. Verifying UI in the sandbox

- Sandbox has Chromium and Playwright (`require('playwright')`). No internet except npm and PyPI, no MongoDB, no Yahoo. Do not retry blocked requests with other tools.
- `cd frontend && npx vite build && npx vite preview --port 4173`, then run `docs/dev/bills-browser-check.cjs` and `docs/dev/bill-form-browser-check.cjs` (set `OUT=` to a scratch folder). They mock every `/api` call and drive the Bills page, add form, detail drawer and Dashboard at 390 px and 1280 px, fail on horizontal scroll or console errors, and save screenshots to look at.
- Use `waitUntil: 'domcontentloaded'`, not `networkidle` (the app polls, so networkidle times out).
- Backend logic that needs a database is tested with a stand-in and fake timers (`readToday` clamps "today" to within 2 days of the real date). Say clearly when MongoDB behaviour was not run.
- Reading screenshots: take them at deviceScaleFactor 1 for my own checks.

## 10. Saving tokens

- Do not re-read whole files; use `grep -n`, then read the needed lines. Do not paste big files into replies.
- Do not rebuild or re-run everything for a one-line change: run the affected test and a build once at the end.
- Reuse templates (delivery scripts, browser check scripts, i18n key lists) instead of rewriting them.
- Translations: write the six-language key list in one script and append to all locale files in one pass, then run the parity test.
- Do not re-send unchanged files. Do not re-explain history; this file is the memory.
- Delegate to a sub-agent only for broad searches. Do the work myself when I know the target.

## 11. Open items and backlog

- Pending, waiting for his go-ahead: mobile-only premium Dashboard card (rolling digits, tap-to-cycle net / before deductions / deductions, sheen), plus a browser-engine check of loan charts and a review of the hi/ur/ar loan text.
- Pending, his choice: Google Sheets CSV or Twelve Data as the rates source.
- Split payments paid with money borrowed from someone, tracked in Loans: NOT started, because loans belong to the other agent. Bill payments already support several steps from different sources. Revisit only when he says loans are ready.
- Not verified yet (needs his machine): bills saving to real MongoDB (new indexes are created on first backend start, restart after merging), the integration `ownership` test with the new bills case, real Yahoo feed, real biller logos, native-speaker review of hi/ur/ar.
- Known limits: PDFs are English only; Yahoo is unofficial and may break.

## 12. Quick checklist before sending a round

1. New zip unpacked into a fresh folder and hot files (section 8) checked.
2. Frontend `npx vitest run` green, `npx vite build` green, backend unit tests green.
3. New strings in all six locales; new backend messages mapped.
4. New model: ownership test case and org cleanup added.
5. UI looked at on phone and desktop, no horizontal scroll.
6. Three files delivered; header lists WHAT CHANGED, VERIFIED, NOT VERIFIED.
7. CLAUDE.md updated if a decision or trap changed.
