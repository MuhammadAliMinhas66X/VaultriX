import { registerResource, registerRules } from './dataStore.js';
import { listBills } from '../services/billService.js';
import { listExpenses, listExpenseCategories } from '../services/expenseService.js';
import { getExchangeRates } from '../services/fxService.js';

registerResource('bills', { fetch: ({ today }) => listBills(today), staleMs: 30000 });
registerResource('expenses', { fetch: ({ month }) => listExpenses(month), staleMs: 30000 });
registerResource('categories', { fetch: () => listExpenseCategories(), staleMs: 5 * 60 * 1000 });
registerResource('rates', {
  fetch: ({ base, symbols }) => getExchangeRates(base, symbols ? symbols.split(',') : []),
  staleMs: 30000,
  pollMs: 30000,
});

// One place that says what a save changes. A save to the left makes the data
// on the right reload by itself, so no page has to remember to do it.
registerRules([
  { prefix: '/bills', invalidates: ['bills', 'expenses'] },
  { prefix: '/expenses', invalidates: ['expenses'] },
  { prefix: '/categories', invalidates: ['categories', 'expenses', 'bills'] },
  { prefix: '/loans', invalidates: ['expenses'] },
]);
