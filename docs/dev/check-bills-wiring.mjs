// Run from the repo root:  node docs/dev/check-bills-wiring.mjs
// Fails (exit 1) if another change has overwritten the pieces that make Bills work.
// Run it after every merge or new zip. It takes under a second and needs no install.
import { readFileSync, existsSync } from 'node:fs';

const read = (path) => (existsSync(path) ? readFileSync(path, 'utf8') : '');
const checks = [
  ['backend/src/app.js', "app.use('/api/bills'", 'the /api/bills route is not mounted'],
  ['backend/src/app.js', "import billRoutes", 'billRoutes is not imported'],
  ['backend/src/app.js', "app.use('/api/receipts'", 'the /api/receipts route is not mounted'],
  ['backend/src/utils/organizations.js', 'IncomeReceipt.deleteMany', 'deleting an account does not delete its income receipts'],
  ['backend/src/utils/organizations.js', 'Bill.deleteMany', 'deleting an account does not delete its bills'],
  ['backend/src/models/Expense.js', 'billPaymentId', 'Expense has no billId / billPaymentId'],
  ['backend/src/controllers/expenseController.js', 'BILL_LINKED', 'bill-linked expenses can be edited or deleted from Expenses'],
  ['frontend/src/App.jsx', 'path="/bills"', 'the /bills page route is missing (Bills would redirect to login)'],
  ['frontend/src/App.jsx', 'BillsPage', 'BillsPage is not imported in App.jsx'],
  ['frontend/src/components/layout/useAppNav.jsx', "to: '/bills'", 'the Bills item is missing from the menu'],
  ['frontend/src/i18n/translate.js', 'errors.billCurrencyLocked', 'bill error messages are not mapped in translate.js'],
  ['frontend/src/i18n/translate.js', 'errors.expenseBillLinked', 'expenseBillLinked is not mapped in translate.js'],
  ['frontend/src/components/Combobox.jsx', 'footer', 'Combobox lost its footer (+ New category)'],
  ['frontend/src/pages/ExpensesPage.jsx', 'bills.fromBill', 'Expenses lost the "Bill" label on bill payments'],
  ['frontend/src/pages/DashboardPage.jsx', 'BillsPanel', 'the Dashboard lost the Bills section'],
  ['frontend/src/data/resources.js', "registerResource('bills'", 'bills are not registered in the data store'],
  ['backend/src/app.js', "app.use('/api/data'", 'the /api/data (export and import) route is not mounted'],
  ['frontend/src/pages/SettingsPage.jsx', 'DataSection', 'Settings lost the Data (export / import) section'],
  ['frontend/src/App.jsx', '<MainShell />', 'the persistent MainShell is not wired: the sidebar is rebuilt (flickers) on every page change'],
  ['frontend/src/App.jsx', '<ErrorBoundary', 'App.jsx lost the ErrorBoundary: a crash shows a blank white page'],
  ['backend/src/app.js', "app.use('/api/team'", 'the /api/team route is not mounted (People)'],
  ['backend/src/app.js', "app.use('/api/groups'", 'the /api/groups route is not mounted (Groups)'],
  ['frontend/src/App.jsx', 'path="/groups"', 'the Groups route is missing from App.jsx'],
  ['backend/src/app.js', "app.use('/api/salary-plan'", 'the /api/salary-plan route is not mounted (Salary planner)'],
  ['frontend/src/App.jsx', 'path="/salary"', 'the Salary planner route is missing from App.jsx'],
  ['frontend/src/App.jsx', 'path="/join-group"', 'the join-group page route is missing from App.jsx (invitation emails link to it)'],
  ['backend/src/routes/groupRoutes.js', '/invites/mine', 'group invitations (invites/mine) are missing'],
  // v1_161: Groups left the Dashboard on purpose; they show in the menu when switched on in Settings.
  ['frontend/src/components/layout/useAppNav.jsx', 'useNavPrefs', 'the menu lost its per-link switches (Settings > Menu)'],
  ['frontend/src/pages/GroupsPage.jsx', 'GroupsHub', 'the Groups page lost GroupsHub'],
  ['frontend/src/components/layout/NotificationsBell.jsx', 'useGroupInvites', 'the bell lost group invitations'],
  ['frontend/src/pages/SettingsPage.jsx', 'MenuSection', 'Settings lost the Menu section (link toggles)'],
  ['backend/src/app.js', "app.use('/api/savings'", 'the /api/savings route is not mounted'],
  ['backend/src/app.js', "app.use('/api/budgets'", 'the /api/budgets route is not mounted (Reports)'],
  ['backend/src/app.js', "app.use('/api/goals'", 'the /api/goals route is not mounted (Reports)'],
  ['frontend/src/App.jsx', '/reports', 'the /reports route is missing (Reports)'],
  ['frontend/src/pages/SettingsPage.jsx', 'PeopleSection', 'Settings lost the People section'],
  ['frontend/src/components/layout/NotificationsBell.jsx', 'useReminders', 'the notification bell is missing'],
];

let failed = 0;
for (const [file, needle, message] of checks) {
  if (!read(file).includes(needle)) {
    failed += 1;
    console.log(`MISSING  ${file}\n         ${message}`);
  }
}

// Every language must have the bills text.
for (const lang of ['en', 'fr', 'es', 'ar', 'hi', 'ur']) {
  const text = read(`frontend/src/i18n/locales/${lang}.js`);
  const count = (text.match(/^\s*['"]bills\./gm) || []).length;
  if (count < 150) {
    failed += 1;
    console.log(`MISSING  frontend/src/i18n/locales/${lang}.js\n         only ${count} "bills." texts (expected about 230)`);
  }
}

if (failed) {
  console.log(`\n${failed} problem(s). Bills will break until these are restored.`);
  process.exit(1);
}
console.log('Bills wiring is intact.');
