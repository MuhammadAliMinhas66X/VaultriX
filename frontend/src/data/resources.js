import { registerResource, registerRules } from './dataStore.js';
import { listBills } from '../services/billService.js';
import { listExpenses, listExpenseCategories } from '../services/expenseService.js';
import { listLoans } from '../services/loanService.js';
import { getExchangeRates } from '../services/fxService.js';
import { listReceipts, getOpeningBalance, getExpenseTotals } from '../services/receiptService.js';

registerResource('bills', { fetch: ({ today }) => listBills(today), staleMs: 30000 });
registerResource('expenses', { fetch: ({ month }) => listExpenses(month), staleMs: 30000 });
registerResource('loans', { fetch: () => listLoans(), staleMs: 30000 });
registerResource('categories', { fetch: () => listExpenseCategories(), staleMs: 5 * 60 * 1000 });
registerResource('receipts', { fetch: () => listReceipts(), staleMs: 30000 });
registerResource('opening', { fetch: () => getOpeningBalance(), staleMs: 30000 });
registerResource('expenseTotals', { fetch: ({ since }) => getExpenseTotals(since), staleMs: 30000 });
registerResource('rates', {
  fetch: ({ base, symbols }) => getExchangeRates(base, symbols ? symbols.split(',') : []),
  staleMs: 30000,
  pollMs: 30000,
});

// One place that says what a save changes. A save to the left makes the data
// on the right reload by itself, so no page has to remember to do it.
registerRules([
  { prefix: '/bills', invalidates: ['bills', 'expenses', 'expenseTotals'] },
  { prefix: '/expenses', invalidates: ['expenses', 'expenseTotals'] },
  { prefix: '/categories', invalidates: ['categories', 'expenses', 'bills'] },
  { prefix: '/loans', invalidates: ['loans', 'expenses', 'expenseTotals'] },
  // A new stream with an amount makes a receipt; deleting a stream removes its receipts.
  { prefix: '/income-streams', invalidates: ['receipts'] },
  { prefix: '/receipts', invalidates: ['receipts', 'opening', 'expenseTotals'] },
]);
