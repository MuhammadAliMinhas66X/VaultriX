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
  ['frontend/src/App.jsx', '<MainShell />', 'the persistent MainShell is not wired: the sidebar is rebuilt (flickers) on every page change'],
  ['frontend/src/App.jsx', '<ErrorBoundary', 'App.jsx lost the ErrorBoundary: a crash shows a blank white page'],
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
