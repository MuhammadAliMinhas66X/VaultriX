// Sandbox-only. vite preview --port 4173, then: OUT=/tmp/x/ node docs/dev/receipt-browser-check.cjs
// Receipt photo on an expense: choose a photo while adding (sent after the expense is saved),
// and attach / remove one on an existing expense.
const { chromium } = require('playwright');
const out = process.env.OUT || './';
const day = new Date().toISOString();
const user = { id: 'u1', name: 'Ali', email: 'm@example.com', currency: 'PKR', language: 'en', onboardingCompleted: true, country: 'PK', role: 'owner' };
const cats = [{ id: 'c1', name: 'Food', type: 'expense', icon: '' }];
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const base = { id: 'e1', amount: 500, currency: 'PKR', categoryId: 'c1', spentAt: day, note: 'Lunch', payMethod: '', payName: '', paidBy: 'self', payerName: '', givenTo: '', billId: null, loanId: null, repeat: 'none', repeatOf: null, hasReceipt: false, receipt: null, createdAt: day };
let expenses = [base];
const calls = [];
(async () => {
  const browser = await chromium.launch();
  const problems = [];
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  await page.route('http://localhost:5000/api/**', (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace(/^\/api/, '');
    let body = { success: true, categories: [], loans: [], bills: [], expenses: [], incomeStreams: [], totals: [], receipts: [], opening: null };
    if (path === '/auth/refresh' || path === '/auth/me') body = { success: true, user, accessToken: 't' };
    else if (path === '/fx/rates') body = { success: true, base: 'PKR', rates: { PKR: 1 }, live: [], liveAt: day };
    else if (path === '/categories') body = { success: true, categories: cats };
    else if (path === '/expenses' && req.method() === 'GET') body = { success: true, expenses, capped: false };
    else if (path === '/expenses' && req.method() === 'POST') { calls.push('create'); expenses = [{ ...base, id: 'e2', note: 'New' }, ...expenses]; body = { success: true, expense: expenses[0] }; }
    else if (/^\/expenses\/e\d\/receipt$/.test(path)) {
      calls.push(`${req.method()} ${path}`);
      const withPhoto = req.method() === 'POST';
      const id = path.split('/')[2];
      expenses = expenses.map((e) => (e.id === id ? { ...e, hasReceipt: withPhoto, receipt: withPhoto ? { thumb: 'data:image/png;base64,' + png.toString('base64'), full: 'data:image/png;base64,' + png.toString('base64') } : null } : e));
      body = { success: true, expense: expenses.find((e) => e.id === id) };
    }
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.goto('http://localhost:4173/expenses', { waitUntil: 'domcontentloaded' });
  await page.getByText('Lunch').first().waitFor({ timeout: 20000 }).catch(() => {});

  // existing expense: open, attach, then remove
  await page.getByText('Food').first().click();
  await page.getByText('Receipt photo').waitFor({ timeout: 10000 });
  await page.locator('input[type=file]').setInputFiles({ name: 'r.png', mimeType: 'image/png', buffer: png });
  await page.waitForTimeout(1500);
  if (!calls.includes('POST /expenses/e1/receipt')) problems.push('upload not sent for existing expense: ' + calls.join(','));
  await page.screenshot({ path: `${out}receipt-edit.png` });
  await page.getByRole('button', { name: 'Remove photo' }).click().catch(() => problems.push('remove button missing'));
  await page.waitForTimeout(800);
  if (!calls.includes('DELETE /expenses/e1/receipt')) problems.push('remove not sent: ' + calls.join(','));

  // new expense with a photo chosen first
  await browser.close();
  console.log(problems.length ? problems.join('\n') : 'no problems');
})();
