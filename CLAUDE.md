# CLAUDE.md - Vaultrix

Read this first, every session. It exists so work is not repeated and past decisions are not forgotten.
Keep it current: when something here becomes false, fix the line in the same round.

## 0. SESSION START RULES (he asked for these on 2026-11-10; follow them without being told)

He should never have to say "read CLAUDE.md" or explain history. On the FIRST message of any session:
1. If his message has a zip attached: unzip it into a new folder, read this file, run `node docs/dev/check-bills-wiring.mjs`, and start the task. Read `docs/APP-MAP.md` sections 2 to 5 (feature graph, screens, API, backend routes) instead of browsing folders, then open only the files it names for the feature at hand. Do not read its section 9 file index unless I need to find a file. No questions about what this project is.
2. If he asks to build or change something and there is NO zip attached and no copy of his latest code in the sandbox that I can confirm is his latest (my sandbox folders can be wiped, and the other agent edits the same repo): reply with ONE short line asking for the newest zip, and stop. Do not start, do not ask other questions, do not guess from an old copy. He will come back with the zip later. Exception: pure questions and brainstorming need no zip.
3. "Continue", "next" or "build this" with no detail means: do the first open item in section 11B (NEXT AFTER v1_143), then 11A. If he names something else, his words win.
4. Keep every reply short: what changed, verified, not verified, next step. No recaps, no history, no offers of plans.
5. Be cheap: do not open or build more than the task needs, batch his small fixes in one round, skip screenshots for logic-only work, and reuse the previous round's delivery scripts.
6. Before a long task say what I am doing in one sentence. When tokens or time look short, finish the current item, update this file (last delivered, what is open), deliver, and say what comes next, so the next session starts clean.
7. Before every delivery run `node docs/dev/make-app-map.mjs` from the repo root and include the refreshed `docs/APP-MAP.md` in the zip (it is generated from the real imports and routes; never edit it by hand). Every delivery still ends with the three files (zip, merge script, commit script) unless he asks for an answer only. When he says "just answer, don't write", answer in two or three sentences and make no files.

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
- Hands off Loans unless he says otherwise (exception: he asked directly for the payments graph in v1_118/v1_119, so `PaymentsChart.jsx` and new `PaymentBar.jsx` are mine; tell the other agent). He is working on loans in another agent. Do not edit `loanController`, `Loan.js`, `components/loans/*` (except importing existing shared pieces like `WherePicker`, `loanOptions.js`, which must keep working), `LoansPage.jsx`.
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
6. Version numbers continue from the last round. Last delivered: v1_146 (ADVANCE SALARY PLANNER at `/salary`, see section 6D). v1_145 (viewers no longer see Add/Pay buttons; owner deleting their account hands the workspace to an admin/member, `handOverWorkspace`). v1_144 (CLAUDE.md only: section 11B to-do list). v1_143 (group costs can be split by percent; ownership test fixed to pass ?month= for expenses). v1_142 (Groups: invitations for people without an account, bell + /join-group page, Groups card on the Dashboard, People vs Groups explainer in Settings, see section 6C). v1_137 to v1_141 built People (shared workspace) and Groups. v1_129 (landing: same focus story on phones and tablets, no V mark in the navbar, Founder replaced by Questions, new nav hover and Join button, see section 6B). v1_128 (landing page redesign). v1_127 (gitleaks false alarm fixed with `.gitleaksignore` + `.gitleaks.toml`; error boundary; list-capped notice; clear bill conflict message). v1_126 (generated app map `docs/APP-MAP.md` + `docs/dev/make-app-map.mjs`). v1_125 (CLAUDE.md only: session start rules). v1_124 (CLAUDE.md only: audit and BUILD FIRST list). v1_123 (sidebar: solid ink active pill, chevrons collapse icon that turns, row entrance and hover motion). v1_122 (sidebar restyled like the MongoDB Atlas side nav: one row style for every item, `Sidebar.jsx`). v1_121 (menu flicker fix: one persistent shell, `components/layout/MainShell.jsx` + `shellSlot.js`; pages keep writing `<AppShell>` but inside MainShell it only passes the page title; check `docs/dev/shell-persist-browser-check.cjs`). v1_120 (sidebar Income Stream: plain link when there are no streams, closed dropdown when there are, opens on click; `Sidebar.jsx` `Group`, check `docs/dev/sidebar-browser-check.cjs`). v1_119 (loan payments graph redone as a ring plus running-balance bars, `PaymentBar.jsx`; v1_118 was the first, rejected, bar version). v1_117 (Bills have no category field: the company type shows as a tag in the dropdown and the expense category is made from it; Dashboard balance subtracts loan money paid back; section titles restyled; logo source fixed). v1_116 (Bills was missing again: the `/bills` route, bills text and wiring were overwritten by the other agent's zip; restored). v1_115 was the request storm fix, per-user rate limits, one currency list, refresh token replay detection. v1_112 was the bills redesign, v1_111 the CLAUDE.md and bills-fix round.
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
- Secret scanning (GitHub Actions gitleaks, `.github/workflows/security.yml`): `.gitleaks.toml` extends the default rules and allows storage key names like `const STORAGE_KEY = 'vaultrix.x'`; `.gitleaksignore` holds the one old finding by fingerprint (it is in git history, so editing the file cannot clear it). Name every new localStorage key constant `STORAGE_KEY`, `REMEMBER_KEY` or `...KEY` with a `vaultrix.` value so it stays allowed. Never put real secrets in code.
- Screens are wrapped in `ErrorBoundary` (`components/ErrorBoundary.jsx`, once in `App.jsx`, once in `MainShell` so the sidebar survives a crash). List endpoints for expenses and bills return `capped: true` at 2000 rows and the pages show a notice.
- Do not weaken origin guard, rate limits, sanitising, or admin password checks (another agent owns these).
- Rate limits (`middleware/rateLimiters.js`) count per signed-in person (`userKey`) when the route is behind `authenticate`, and per IP otherwise. Data routes allow thousands per 15 minutes; only brute-force guards (login, admin password, account delete) stay small. The owner wants no "Too many tries" in normal use, so raise a number before lowering one, and keep new limiters per user.
- Refresh tokens rotate and carry `rv`. An old token replayed after 30 seconds closes that session and logs `refresh_reuse` (`authController.refresh`, `Session.refreshVersion`).
- One currency list: `frontend/src/utils/options.js CURRENCIES` equals `backend/src/utils/currencies.js SUPPORTED_CURRENCIES` equals live rates. `currencies-consistent.test.js` fails if they drift. Every dropdown (onboarding, settings, income, expenses, bills, loans) uses `useLocalizedOptions().currencies`, never its own list.

i18n (six languages, flat keys)
- Every user-visible string goes through `t('key')`. Add the key to ALL six locale files. `i18n-parity.test.js` checks keys and `{placeholders}` match.
- Raw backend `message:` strings must be listed in `tests/server-message-coverage.test.js` `KNOWN_BACKEND_MESSAGES` AND mapped in `translate.js` `SERVER_MESSAGE_KEYS`.
- Use `t(...)` keys that exist. A missing key shows as raw uppercase text (this happened with `expenses.chooseIcon`).
- Arabic and Urdu are RTL: use `ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-` classes, not left/right. Hindi, Urdu and Arabic text has not been reviewed by a native speaker.

Frontend habits
- Dates are `YYYY-MM-DD` keys in UTC (`utils/dates.js`, `utils/expenseMath.js shiftDay`). "Today" comes from the local date (`todayInput()`), never `new Date().toISOString()`.
- Money inputs: `MoneyInput` (no spinner arrows).
- Never fetch from an effect whose dependencies change every render. `t` and `tServer` from `useTranslation` are stable (memoized on language); any new hook or context value used in a dependency list must be too. An unstable dependency caused the Bills request storm (v1_115).
- Fetched data lives in ONE place: `frontend/src/data/`. `useResource(name, params)` gives `{ data, loading, refreshing, error, reload, update }`. Resources (bills, expenses, categories, rates) are declared in `data/resources.js`, and the same file holds the rules saying which saves reload which data (a save to `/bills` reloads bills and expenses by itself). Pages must not fetch these in their own effects. To add data to the store: register it there, add a rule, use `useResource`. Not yet on the store: income streams, loans (hands-off), accounts, `/auth/me`.
- GET requests go through `services/requestCache.js` (same request at the same time is sent once, answers are reused for 8 seconds, any save clears it, admin/auth/security are never cached). Do not add your own caching on top.
- Dropdowns: use `Combobox` (portal, searchable, grouped, supports `footer`, `searchable={false}`, item `sub`). Do not hand-roll new select popups.
- Toasts: single animation only (Framer). Do not add a CSS fade on top of it (that caused the blink).
- Mobile first. No horizontal page scroll at 390 px. Bottom nav is fixed; leave bottom padding.

## 6B. Landing page (`frontend/src/portfolio/`, route `/`)

The owner's rules for it (v1_128, from his marked screenshots):
- No vertical grid lines behind or through any text (hero, stats strip, privacy, footer). The `pf-gridlines*` classes are gone; do not add background lines. The only line decoration is the `Divider` ruler in `components/ui.jsx`.
- Navbar: Product, How it connects, Privacy, Security, Details, Questions and ONE button, Join Vaultrix (Open Vaultrix when signed in). The logo is the word Vaultrix only: NO round V mark anywhere (the app name has no V logo). No Sign in button. No scrambling text. Hover = one soft pill that glides between items (`layoutId pf-nav-hover`), active = darker text plus a small dot. Glass look once scrolled (`bg-white/55 backdrop-blur-2xl backdrop-saturate-150`). `JoinButton` (`Buttons.jsx`): leans toward the pointer, soft light follows it, a sheen sweeps across, the arrow chip swaps its arrow; reduced motion keeps only the colour change.
- Device frames in `ui.jsx`: `PhoneFrame` (iPhone, round, approved), `AndroidFrame` (small corner radius, punch-hole camera, side keys), `TabletFrame` (iPad style, even bezel, front camera), `LaptopFrame` (MacBook, approved), `MonitorFrame` (display with stand). Keep the Android one rectangular and the tablet realistic.
- Product (`ProductStory.jsx`): pinned, ONE device at a time in focus: 01 Dashboard = tablet, 02 Income = laptop, 03 Expenses = Android phone, 04 Loans = monitor. It is the SAME experience on desktop, tablet and phone (no stacked version): on small screens the layout is tabs on top, the device in the middle, the feature text below; device size follows the `--pf-h` CSS variable. Scroll or ArrowDown / ArrowUp / PageDown / PageUp step through the four while pinned; at the first and last item the page scrolls on. There is no intro sentence under the heading (he asked for it removed). The `Divider` (02 How it connects) closes the section.
- Stats strip (`Hero.jsx`): a 3 column `dl` (4 screens, 6 languages, 0 data shared).
- Privacy (`Trust.jsx`): each chart draws once when seen, then ONE highlight steps through (`useTicker`). No constant wobble. Donut has a legend, loan balance is a stepped line with a dot and label.
- Everyday details (`Bento.jsx`, `Logos.jsx` `LogoPulse`): language tiles glide one highlight (`layoutId`), banks pulse one at a time with a caption, one outline morphs phone, tablet, desktop, and a working animations switch with a dots demo. Everything must be visible ink-on-white.
- Questions (`Faq.jsx`, id `faq`, replaces the old Founder section by his request): six answered questions in an animated accordion. Answers must stay true to the app (27 currencies, six languages, no bank connection, private organizations, tax is an estimate, delete means delete). The founder photo and `assets/owner` are deleted; the footer copyright still says Owned by the owner's name.
- Footer: "Ready when you are." with the button aligned to its bottom, brand block, four link columns, languages, copyright, faint giant wordmark. No lines cross text.
- Every animation honours `useAppReducedMotion()`.
- Not verified by eye in v1_128: the sandbox cannot build Vite or Tailwind, so it was checked only by compiling every file and bundling the app. If he reports a visual problem, ask for a screenshot of that section first.

## 6C. People and Groups (v1_137 to v1_142)

- People (Settings > People, `/api/team`, `PeopleSection`): ONE shared workspace, everyone sees all the money. Roles owner/admin/member/viewer, max 10, joining only for accounts with no own data.
- Groups (`/api/groups`, `groupController`, `GroupsHub`, `GroupPage`): private workspaces, only shared costs are visible. Access = active member of the Group (not org-scoped). Money in minor units per currency, no conversion; equal or exact split; settle up (NOT a loan, Loans stay hands-off); "add my share to my expenses" makes a private Expense. Limits 12 people per group, 20 groups per person; leaving needs zero balance.
- Invites: stored by email (`GroupInvite`, code hash, 7 days). The email has a button to `CLIENT_URL/join-group` plus a code; people without an account get a signup link (`?next=/join-group`). `GET /groups/invites/mine`, `POST /groups/invites/:id/accept`, `DELETE /groups/invites/:id` work by account email, no code needed. Those routes must stay BEFORE `/:id` in `groupRoutes.js`.
- Return path: `utils/returnPath.js` keeps where the person was heading (route state or `?next=`) in sessionStorage so login, signup and onboarding end on `/join-group`.
- UI: Groups live on the Dashboard (`GroupsHub`, animated `GroupsIcon`, how-it-works steps when empty, invitations on top); NOT in the sidebar or bottom bar. `/groups` and `/groups/:id` remain as pages. The bell (`NotificationsBell`) lists invitations via `useGroupInvites`.
- Checks: `docs/dev/groups-browser-check.cjs`, `groups-invite-browser-check.cjs`, `people-browser-check.cjs`.
- Open: viewers can still open edit drawers by clicking rows (server answers 403); groups have no recurring group costs or currency conversion; real SMTP delivery of invites and the MongoDB integration tests (`groups`, `team`) are not run in the sandbox.

## 6D. Salary planner (v1_146, route `/salary`, sidebar "Salary plan", Dashboard promo card)

- Page `SalaryPage.jsx`, ring `components/salary/SalaryRing.jsx` (outer ring: spent vs left of the salary, inner ring: planned share; draws in and counts up, still under reduced motion), maths `utils/salaryPlanMath.js` (`monthlyNet`, `comparePlan`; has tests `tests/salary-plan.test.js`).
- Salary comes from an Income Stream (picker, salaried first): net per month after tax and deductions via `salaryCuts.calculateCuts`, other frequencies are averaged to a month. Nothing is typed twice.
- Plan = lines (label, amount, optional expense category). Real spending of the month (expenses, which already include bill payments and "my share" of group costs; money others paid is skipped) is counted against a line when it has a category. Spending in other categories shows as "Spent outside the plan".
- Backend: `SalaryPlan` model (one per org and month, max 40 lines), `GET/PUT /api/salary-plan/:month`, PUT needs canWrite; removed on org cleanup. Resource `salaryPlan` on the data store. Check `docs/dev/salary-browser-check.cjs`, test `backend/tests/integration/salary-plan.test.js` (not run in the sandbox).
- Not built: planned lines linked to a specific bill or loan, copy last month, receipt-based "salary arrived" state, charts per category.

## 6A. Feature catalogue (one block per feature)

Status words: DONE (built, in use), HANDS-OFF (another agent owns it), PLANNED (not built). Names in backticks are the files to open first.

1. Sign up and sign in - DONE. `authController`, `LoginPage`, `SignupPage`.
   - Email + password signup with an emailed code (max 5 sends per hour, 5 wrong tries). Disposable email domains are blocked (`utils/disposableDomains.js`, `EXTRA_BLOCKED_EMAIL_DOMAINS`).
   - Login has a captcha (Cloudflare Turnstile), lockout (5 failed tries locks 15 min, then 2 failed tries lock 60 min), a new-device email check (`PendingDeviceLogin`), and optional MFA code.
   - Max 3 accounts per device (`utils/deviceLimit.js`, device cookie plus `X-Device-Fallback-Id` header).
   - Google sign in, link and unlink. Forgot password: email code, then reset. Refresh token cookie keeps the session; the access token lives in memory.
2. Onboarding - DONE. `OnboardingPage`, `components/onboarding/*`. First-run steps in this order: country, language, currency, photo (photo skipped if the user already has one). `RequireOnboarding` blocks the app until `onboardingCompleted`.
3. Settings - DONE. `SettingsPage` (sections: Profile, Security, Devices, Preferences, Danger zone).
   - Profile: name, avatar (upload). Security: change password, change email (code to the new address), MFA setup with QR and backup codes, Google link.
   - Devices: list sessions, revoke one, log out everywhere. Preferences: country, app language and currency. Danger: delete account (request code, then confirm; cleans the organisation).
   - Secure mode and lock screen: `hooks/useSecureMode.js`, `LockScreen`, `SecureGuard`, `SecureBadge`.
4. Admin area - DONE (owned by the other agent). `AdminPage`, `adminController`, `requireAdmin`, `requireAdminPassword`.
   - Overview, audit log, security overview, users list and detail, edit, deactivate, reactivate, unlock. Delete user, force password reset, disable MFA and CSV export need the admin password again (step-up). Admin routes have no rate limit by design. Admin email comes from `ADMIN_EMAIL`.
5. Income streams - DONE. `IncomeStream` model, `IncomePage`, `components/income/*`, `utils/incomeMath.js`.
   - Types: salaried, business, freelance, bonus, gift, profit, sale, other. Frequency: once, daily, weekly, monthly, yearly, variable. Fields: payer, received date, expected amount, destination (cash, bank, wallet and which one), archive flag.
   - Tax and deductions (`utils/taxRules.js`, `utils/salaryCuts.js`, `SalaryCutsPanel`): tax estimate per currency rule, deductions as percent or fixed, `deductFromTotal` switches totals between "after deductions" and "before deductions".
   - Everything is summed in the user's base currency with live rates.
6. Accounts - API only. `Account` model and `/api/accounts`; there is no page for it yet. Do not build UI unless asked.
7. Categories - DONE. `Category` model, `/api/categories`, `utils/categoryIcons.js`, `components/expenses/categoryIcons.jsx` (about 30 icon keys, name-based icon guess).
   - Shared by Expenses and Bills. Expenses use the tile grid `CategoryPicker`; Bills use the `Combobox` dropdown with "+ New category" (`NewCategorySheet`).
8. Expenses - DONE. `ExpensesPage`, `components/expenses/*`, `utils/expenseMath.js`, `expenseController`.
   - Month view with previous-month comparison, daily chart, category breakdown, add and edit form.
   - Each expense has amount, currency, category, date, note, payment source (cash, bank, wallet and name), "paid by" (self or someone else with a name), and optional links to a loan (`loanId`) or a bill (`billId`, `billPaymentId`).
   - Expenses created by a bill payment show a "Bill" pill and open the bill; they cannot be edited here.
9. Loans - HANDS-OFF. `Loan` model, `LoansPage`, `components/loans/*`, `utils/loanMath.js`.
   - Borrowed or lent, person name, amount (scale 10^4), date, due date, payments with optional proof photos (Cloudinary), received-proof photo, states open, done and critical (due within 7 days), filters, overview, payment charts.
   - Shared pieces other features use: `WherePicker`, `loanOptions.js` (`keyFor`, `splitKey`, `customFor`, `isOtherKey`). Do not change their behaviour.
10. Bills - DONE (v1_109, v1_110). See section 7 "Bills" for the design. Page: `BillsPage`; Dashboard section: `BillsPanel`.
    - Add and edit bill, recurring series (daily, weekly, monthly, quarterly, yearly; next one shows 5 days before it is due) with pause, resume, cancel, full and partial and multiple payments each creating an expense, "already paid" switch and Pay buttons, statuses, PDF bill, receipt and partial summary with preview, download, share, search and one filter button, grouped list, detail drawer, remembered choices and recent companies, Save and add another, Add again.
11. Live exchange rates - DONE. `exchangeRateService`, `fxController`, `IncomeContext`. 27 currencies, refreshed live; see section 7 "Live rates".
12. Dashboard - DONE. `DashboardPage`, `components/dashboard/*`.
    - Balance card (net, before deductions, deductions with 2-decimal share), rate line with update time, spent this month, latest income, Bills section.
    - Mobile-only premium card is PLANNED (section 11).
13. Navigation and layout - DONE. `components/layout/*` (`AppShell`, `Sidebar`, `BottomNav`, `AccountMenu`, `useAppNav.jsx`).
    - Sidebar on desktop, floating bottom bar on phones. Items: Dashboard, Income Stream (expandable with streams), Expenses, Bills, Loans. Pages are wrapped in `IncomeLayout` so income data and rates are shared.
14. Languages - DONE. English, French, Spanish, Arabic, Hindi, Urdu. Language switcher on auth pages and in settings; direction switches to RTL for Arabic and Urdu (`utils/direction.js`); currency and country names come from `Intl.DisplayNames` (`i18n/useLocalizedOptions.js`).
15. Messages and errors - DONE. `i18n/notifications.js`.
    - `notify.success/error/warning/info` shows toasts (max 3, same message stacks, errors may show inline in the form via `ErrorSlot` when one is on screen). `OfflineBanner` for lost connection. A slow request (8 s) shows an info toast. Server messages are translated through `SERVER_MESSAGE_KEYS`.
16. Security hardening - DONE. helmet, `sanitizeInput`, `originGuard`, `apiLimiter`, per-route limiters, MFA secret encryption (`utils/mfaCrypto.js`), security event log (`SecurityEvent`, `utils/securityLog.js`, `/api/security/events`), `docs/CLOUDFLARE-SETUP.md` (set `TRUST_PROXY=1` behind Cloudflare). Do not weaken any of it.
17. Background cleanup - DONE. Empty organisations are removed after a grace period and on a 6-hour sweep (`utils/organizations.js`); scripts in `backend/scripts` (`cleanupEmptyOrganizations`, `unlockAccount`, `wipeAllAccounts`).
18. PLANNED modules (README list, not built): budgeting and goals, rental management, group and shared expense splitting, committees and ROSCA, notifications and feedback centre, reports. Salary and tax exists inside income streams only.

## 7. Deep notes for rates and bills (so I do not redo them)

Live rates (v1_104 to v1_108)
- Server `exchangeRateService.js` reads Yahoo chart quotes for 27 currencies, each pair as its own live quote with a USD cross fallback. Live TTL 20 s, general cache 10 min, `fxLimiter` on `/api/fx`.
- Yahoo `regularMarketPrice` has only about 4 decimals, so always quote in the direction where the price is at least 1 (PKR per USD, not USD per PKR). This fixed the $181.02 vs $182.03 gap.
- Dashboard rate line reads like Yahoo: `1 USD = 276.4500 PKR` plus time to the second. The client polls every 30 s. Two numbers read minutes apart will differ; only compare at the same moment.
- Yahoo is unofficial and I cannot reach it from the sandbox. A Google Sheets CSV or Twelve Data source was offered and is waiting for his decision.

Bills (v1_109, v1_110, v1_112)
- Each Bill document is ONE occurrence of a series: `seriesId`, `sequence`, `anchor`, `generated`, `seriesState` (active|paused), `frequency` (none, daily, weekly, monthly, quarterly, yearly), `payments[]`, `installationMinor`.
- Next due dates come from the anchor (21 Nov monthly -> 21 Dec; 31 Jan -> 28 Feb -> 31 Mar). A repeating bill's next occurrence APPEARS IN THE LIST 5 DAYS BEFORE ITS DUE DATE (`LEAD_DAYS` in `billRecurrence.js`: weekly, monthly, quarterly, yearly = 5, daily = 0), never a month early. `generationDate` = occurrence due date minus lead; `defaultNextBillAt(bill, frequency)`. The form no longer sends `nextBillAt` or a billing period (the server still supports both). Unique index `(orgId, seriesId, sequence)` plus claim-by-flag means no duplicate generation.
- Resume uses `skipMissed`. A bill with payments cannot be deleted. Currency locks once paid. Status (Upcoming, Due Today, Overdue, Partially Paid, Paid, Cancelled) is computed on the client from local today.
- Each payment creates an Expense (`billId`, `billPaymentId`, unique partial index). Bill-linked expenses cannot be edited or deleted from `/expenses`. Payment failure rolls back.
- Add and pay are not two chores: the add form has an "I already paid this bill" switch (records a full payment today from the chosen source, client makes create then payment), every unpaid row has a "Pay" button, and the detail view has "Add again" (copies the bill one period later). Note field is NOT in the form anymore (the field still exists on the model).
- Add-bill form order: recently used companies (chips), Company, Amount + Currency, (no category field since v1_117: the company's type tag, e.g. Electricity, decides the expense category, created by name on first use in `BillsPage.categoryForType`), Due date (+ quick chips), Repeats (dropdown, shows the next 3 due dates), Payment source, paid switch, "More options" (Installation charges, Account / reference / bill number), "Entered in Vaultrix", Save bill, Save & add another.
- Money boxes use `components/MoneyInput.jsx` (text box, no up/down arrows, digits and one dot, 2 decimals). Never use `type="number"` for money.
- Choices are remembered per company in localStorage (`utils/billPrefs.js`: last values, `recent` list of 8). "Save & add another" resets the form.
- Bills page layout (v1_112): `BillsSummary` (one animated card: outstanding count-up, proportion bar, Overdue / Due today / Next 7 days / Paid this month), search + one small filter button (`BillFilter` sheet: status and company type, badge shows active count, removable chips under the search), then sections from `groupBills` (Overdue, Due today, Next 7 days, Later, Paid, Cancelled) with `BillRow` rows (relative due text like "Overdue by 3d", Pay button). There is NO "next recurring bill" line anywhere (removed on request). Animations respect `useAppReducedMotion`.
- Biller list is `utils/billers.js` (about 45 Pakistani companies: electricity, gas, water, internet, mobile, insurance, government). Logos: `BrandMark` tries `public/logos/index.json`, Google and DuckDuckGo favicons, the site's own icons, then a coloured monogram tile. I cannot download logos here; run `node scripts/fetch-logos.mjs` on his PC.
- PDFs (bill, receipt, partial summary) use the dependency-free `pdfWriter.js`, always English and Latin letters only. Preview is an HTML replica. Share uses `navigator.share({files})` with WhatsApp, email and copy fallbacks.
- Dashboard shows `BillsPanel` between the hero card and latest income (no next-recurring line).

Toast blink (fixed in v1_109): two fade-ins on one element. Keep one animation.

## 8. Hot files the other agent also edits - check after every new zip

When a new zip arrives, diff these against my last copy and re-apply my parts if they were lost. This has already happened (found at the start of v1_111):
- `backend/src/app.js` - must import and mount `billRoutes` at `/api/bills`.
- `frontend/src/i18n/translate.js` - must keep the 5 bill entries in `SERVER_MESSAGE_KEYS` (`errors.billCurrencyLocked`, `errors.billTotalLow`, `errors.billCancelled`, `errors.billDeletePaid`, `errors.expenseBillLinked`) next to his 429 retry-after code.
- `backend/src/utils/organizations.js` - must delete `Bill` on org cleanup.
- `backend/src/middleware/rateLimiters.js` - must export `financeLimiter` and `fxLimiter`.
- `frontend/src/services/api.js`, `apiError.js`, `adminService.js`, `AdminPage.jsx` - his security work; do not overwrite, merge by hand if I must touch them.
- `frontend/src/App.jsx` - must import `BillsPage` and keep `<Route path="/bills" ...>` inside the `IncomeLayout` routes. Lost at v1_116: Bills then redirects away and "does not appear".
- `frontend/src/i18n/locales/*.js` (all six) - must keep every `bills.*` key, `nav.bills`, `errors.bill*`, `errors.expenseBillLinked`, `expenses.chooseIcon/quickAdd/categoryName`.
- `frontend/src/components/Combobox.jsx` - must keep the `footer` and `searchable` props and item `sub` and `tag`.
- `backend/src/models/Expense.js` - must keep `billId`, `billPaymentId` and their two indexes. `backend/src/controllers/expenseController.js` - must keep `BILL_LINKED` guards and `billId` in the DTO.
- `frontend/src/pages/ExpensesPage.jsx` - must keep the "Bill" pill and the row click to `/bills?bill=ID`.
- `frontend/src/data/resources.js` - 'bills' must stay registered; `BillsPage` and `DashboardPage` read bills through `useResource`.
FASTEST CHECK: `node docs/dev/check-bills-wiring.mjs` from the repo root. It lists exactly which piece is missing. Run it after every new zip and before every delivery.
Quick check after unzipping: `grep -n bill backend/src/app.js`, run frontend tests (a lost translate.js mapping shows as failing `server-message-coverage` tests), then diff my known-changed files.

Dashboard balance (v1_117): `net - spentBySelf`; money someone else paid only leaves the balance once repaid (`expenseMath.repaidAmount/sumRepaid`, from each expense's `loan.paid / loan.amount`). Loan saves already reload expenses.

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

- BUILD FIRST list is in section 11A and beats everything below.
- Pending, waiting for his go-ahead: mobile-only premium Dashboard card (rolling digits, tap-to-cycle net / before deductions / deductions, sheen), plus a browser-engine check of loan charts and a review of the hi/ur/ar loan text.
- Pending, his choice: Google Sheets CSV or Twelve Data as the rates source.
- Split payments paid with money borrowed from someone, tracked in Loans: NOT started, because loans belong to the other agent. Bill payments already support several steps from different sources. Revisit only when he says loans are ready.
- Not verified yet (needs his machine): bills saving to real MongoDB (new indexes are created on first backend start, restart after merging), the integration `ownership` test with the new bills case, real Yahoo feed, real biller logos, native-speaker review of hi/ur/ar.
- Known limits: PDFs are English only; Yahoo is unofficial and may break.

Round log v1_116 to v1_119 (what was asked, what was done, so it is not redone)
- v1_116 Bills "not appearing": the other agent's zip had overwritten `App.jsx` (no `/bills` route), the six locale files (no `bills.*` text), `translate.js`, `Combobox.jsx` footer, `Expense.js` bill fields, `expenseController.js` bill guard, `ExpensesPage.jsx` Bill pill. All re-applied. `docs/dev/check-bills-wiring.mjs` now detects this; run it after every zip.
- v1_117 asks and results:
  - Bills: NO category field (form, filter, detail). Each company shows its type tag next to its name in the dropdown (`Combobox` item `tag`, `GROUP_KEY` and `groupOfBill` in `utils/billers.js`). Expense category is created/found by type name in `BillsPage.categoryForType`. Filter and detail use the company type (`bills.typeLabel`, `bills.allTypes`).
  - Dashboard balance: money someone else paid leaves the balance only when repaid (`expenseMath.repaidAmount/sumRepaid`, uses each expense's `loan.paid/loan.amount`). Spent this month still shows the full amount. Note `dashboard.repaidNote`. Only the current month's expenses are loaded, so repayments of older months are not counted (same limit the balance already had).
  - Dashboard section titles ("Bills", "Latest income") are bold with a dark icon tile and a pill "View all". Keep titles visible, not tiny grey caps.
  - Logos: Google `s2/favicons` returns a grey default tile that passes as a logo. `BrandMark` now uses `t1.gstatic.com/faviconV2 ... nfrd=1` (404 when no icon) so the coloured initials tile shows. Real logos still need `node scripts/fetch-logos.mjs` on his PC. The faviconV2 address was never tested from the sandbox.
- v1_118/v1_119 Loan payments graph: the old step chart used time on the x axis, so same-day payments became one vertical line. `PaymentBar.jsx` now shows a ring split by payment, Paid/Left/Total, and running-balance bars (what was left after each payment). `StepChart` shows only when payments fall on more than one distinct day. Browser check: `docs/dev/loan-chart-browser-check.cjs`.
- v1_120 sidebar: the Income Stream menu no longer remembers open/closed in localStorage and always loads closed (opens on its own only when landing on a stream); with zero streams there is no arrow and no "Add income stream" child.
- v1_121 flicker: every page used to render its own `AppShell`, so the sidebar/header/bottom bar were destroyed and rebuilt on every link click (icons and text flickered). Dashboard, Income, Loans, Expenses, Bills now sit under `MainShell` in `App.jsx`. Settings and Admin still render their own full shell (different menus). Do not wrap a main page's content in a second shell, and do not move `useAppNav` back into pages' render path for the shell.
- v1_122 sidebar (Atlas style, he asked "be consistent"): every row is 40 px high with a 20 px icon, 14 px text, same padding (`ROW`, `ICON` constants); children are 36 px with 13 px text. Active row = soft background plus a 3 px bar on the start edge, both glide between rows (`ActiveMark`, framer `layoutId`). Collapsed width 72 px, icons never move when collapsing, labels fade (opacity) instead of remounting, tooltips when collapsed. Group header looks exactly like a normal row; arrow rotates; children slide in with a stagger. Ignore the old `big` flag in `useAppNav` items (kept but unused). Check shots with a 2-stream mock (`docs/dev/sidebar-browser-check.cjs`).
- v1_123 sidebar colour and motion: active top-level row is a solid ink pill with white text (same black as primary buttons and the balance card), child rows use a soft tint; the sidebar has a faint white-to-#f9f9fa gradient. The collapse button is a double chevron that rotates 180 degrees (the old panel icon was judged irrelevant). Rows slide in with a small stagger on first load, icons scale slightly on hover. Phone bottom bar untouched.
- He rejects UI that looks plain or unclear: show a screenshot-level check on phone (390 px) and desktop before sending; numbers must never wrap mid-number (use `whitespace-nowrap`).
- Still owed: Google Sheets vs Twelve Data "how to" answer (verify free limits by search first).

Audit of v1_123 codebase (Tue 2026-11-10, for brainstorming with him; not yet built, pick with him)
- Money logic: `Total balance = sum of each stream's one expectedAmount - THIS month's self-paid expenses`. Income has no receipt history (one record per stream), so a second month's salary never adds, earlier months' spending is never subtracted, yearly/once/monthly amounts are all summed alike. Rates are today's for old data. Needs a real model: income receipts (date, amount) and a balance or per-month "left this month" view.
- Expenses over money are allowed by design (he confirmed); add a soft warning only.
- CORRECTION (v1_127): the server already rejects future dates (`financeInput.parseDay`, 1 day of slack, 2 days for bills) and Bill and Loan already use `optimisticConcurrency`, so a second quick payment fails instead of overpaying. The only gap was that a bill VersionError answered "not found"; it now answers 409 with a clear message (`errors.billConflict`). Loans untouched (hands-off). The bill payment still creates its Expense first and cleans it up on failure (no transaction).
- Missing: data export (CSV/PDF) and import for users (admin CSV only); due-date reminders (no email, push or in-app alert for bills or loans); recurring expenses; expense search beyond notes and filters by category or payer; receipts on expenses; budgets and goals; reports; member invites (roles owner/admin/member/viewer exist but no way to add a second person); account balances (Account API exists, no page); income stream archive is in the API but not in the UI.
- Limits: expenses list caps at 2000 per month, bills at `LIST_LIMIT`, silently. Bill generation runs on GET /bills (a GET with side effects).
- Tests: integration tests only cover auth, sessions, devices, ownership; nothing for expense, bill, loan, income CRUD, payments or generation.

## 11A. BUILD FIRST (his decision on 2026-11-10: these come before any new feature or polish)

Work in this order. Each item: build it, test it, deliver, then tick it here. Do not start a new feature while an earlier item is open, unless he says so.
1. [OPEN, NEXT, needs ONE answer first; a draft was written in a chat on 2026-11-13 (receipt model, API, expense totals, balance maths) but it was NOT delivered and is not in the repo, so start this item fresh] Income receipts and a real balance. Ask him this single question before building: "When you start, should the total balance start from zero (only receipts you add count) or from an opening balance you type in?" Then build without asking more. Add a per-receipt record (stream, date, amount, currency, optional note) so each salary or payment is its own entry. Replace "sum of each stream's one amount minus this month's expenses" with a clear model: a running balance (all received income minus all self-paid expenses, with repaid loan money) and a "left this month" view with month switching. Keep rates honest: say which rate was used for old amounts. Dashboard, Income page and the stream detail must all read the same numbers. Add a soft warning when expenses are more than the money (expenses over money stay allowed).
2. [DONE v1_127, smaller than first thought] Safe payments: server already blocked future dates and double payments (see CORRECTION above); added a clear 409 message for bills. Leftover idea only if he wants it: a real transaction for bill payment plus expense (needs a MongoDB replica set).
3. [DONE v1_127] React error boundary around the app and around each page, with a friendly "Something went wrong, reload" card and the page title still visible, plus a way to report it.
4. [DONE v1_127, expenses and bills] Tell the user when a list is capped (expenses 2000 per month, bills `LIST_LIMIT`), or add paging.
5. Integration tests for expense, bill (create, pay, overpay, generate), loan payment and income CRUD, including ownership, plus a test for the double-tap case (his PC runs them).
6. Reminders: in-app alert and optional email for bills and loans due soon or overdue.
7. Export (CSV and PDF) of income, expenses, bills and loans, and CSV import for expenses.
8. Income stream archive and unarchive in the UI (API already has `isArchived`).
9. Invite a second person to the organisation (roles owner, admin, member, viewer already exist) so "shared" is real.
10. After the above: recurring expenses, receipt photos on expenses, expense filters (category, payer, text), reports, budgets and goals, an Accounts page.


## 11B. NEXT AFTER v1_143 (his order, 2026-11-17)

ORDER 2026-11-17 14:27: item 6 (salary planner) was built FIRST (v1_146). Still open, in this order: 3 (recurring group costs), 4 (receipt photos), 5 (reports, budgets, goals). Items 1 and 2 are done in v1_145. Possible salary-planner follow-ups: link a plan line to a Bill or Loan, copy last month's plan, a salary-arrived indicator from receipts.

1. [DONE v1_145, Add and Pay buttons; row edit drawers still open] Hide Add/Edit buttons from viewers (server already answers 403; `Sidebar`/pages need the role from `/api/team` or the user).
2. [DONE v1_145] Owner deleting their account must hand the shared People workspace to another member (today the others lose it).
3. Recurring group costs (monthly rent adds itself to the group; reuse the expense-repeat idea, `utils/expenseRepeat` and `generateRepeats`).
4. Receipt photos on expenses (Cloudinary like loan proofs, `services/imageStorage.js`).
5. Reports, then budgets and goals.
6. [DONE v1_146, see 6D] ADVANCE SALARY CALCULATOR (his idea, wants a gorgeous UI and "the sexiest animations"):
   - Reads the salary from Income Streams (salaried stream: amount, deductions, tax, currency), nothing typed twice.
   - Lets him plan BEFORE the salary arrives: add where it will go (rent, bills, loans, groups, savings, food, etc.) as planned lines, see what is left.
   - After the salary arrives, compare plan against real spending (expenses, bills, loan payments, group costs) so he knows where everything went.
   - A donut/pie chart of total income against what is left (spent by category versus remaining) with animated draw-in, count-up numbers, and a clean black/white/grey layout (no decorative gradients); phone 390 px and desktop; honour `useAppReducedMotion`.
   - Needs a small model (planned lines per month and stream) and an API; check with `docs/dev/*-browser-check.cjs`. Ask him nothing unless truly blocked.
   - Open design question to settle when building: whether the plan lives on the Dashboard or its own page (default: own page `/salary`, linked from the Income stream detail and a Dashboard card).

## 12. Quick checklist before sending a round

1. New zip unpacked into a fresh folder and hot files (section 8) checked.
2. Frontend `npx vitest run` green, `npx vite build` green, backend unit tests green.
3. New strings in all six locales; new backend messages mapped.
4. New model: ownership test case and org cleanup added.
5. UI looked at on phone and desktop, no horizontal scroll.
6. Three files delivered; header lists WHAT CHANGED, VERIFIED, NOT VERIFIED.
7. CLAUDE.md updated if a decision or trap changed.
