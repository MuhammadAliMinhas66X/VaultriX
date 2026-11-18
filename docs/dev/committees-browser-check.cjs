// Sandbox-only. cd frontend && npx vite build && npx vite preview --port 4173, then from the repo root:
// OUT=/tmp/x/ node docs/dev/committees-browser-check.cjs
// Committees tab in Reports: empty state, add, pay a round, undo, payout, rounds list, delete confirm, overflow.
const { chromium } = require('playwright');
const out = process.env.OUT || './';
const day = new Date().toISOString();
const user = { id: 'u1', name: 'Ali', email: 'm@example.com', currency: 'PKR', language: 'en', onboardingCompleted: true, country: 'PK', role: 'owner' };

const addMonths = (start, steps) => {
  const [y, m, d] = start.split('-').map(Number);
  const idx = m - 1 + steps;
  const year = y + Math.floor(idx / 12);
  const month = idx % 12;
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(d, last))).toISOString().slice(0, 10);
};
const today = () => new Date().toISOString().slice(0, 10);
const dto = (c) => {
  const rounds = [];
  for (let round = 1; round <= c.size; round += 1) {
    const due = addMonths(c.startDate, round - 1);
    const hit = c.paid.find((p) => p.round === round);
    rounds.push({ round, due, status: hit ? 'paid' : due < today() ? 'overdue' : due === today() ? 'due' : 'upcoming', paidAt: hit ? hit.date : null, mine: round === c.mySlot });
  }
  const payoutDay = rounds[c.mySlot - 1].due;
  return {
    id: c.id, name: c.name, currency: c.currency, contribution: c.contribution, size: c.size, frequency: 'monthly', startDate: c.startDate, mySlot: c.mySlot,
    rounds, paidCount: c.paid.length, paid: c.paid.length * c.contribution, total: c.size * c.contribution,
    next: rounds.find((r) => r.status !== 'paid') || null, overdueCount: rounds.filter((r) => r.status === 'overdue').length,
    payout: c.size * c.contribution, payoutDay, payoutStatus: c.payoutAt ? 'received' : payoutDay <= today() ? 'ready' : 'upcoming',
    payoutReceivedAt: c.payoutAt, endDay: rounds[rounds.length - 1].due, finished: false,
  };
};

(async () => {
  const browser = await chromium.launch();
  const problems = [];
  for (const [tag, w, h] of [['desktop', 1280, 900], ['tablet', 768, 1000], ['phone', 390, 844]]) {
    let list = [];
    const calls = [];
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => problems.push(`${tag} pageerror: ${e.message}`));
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await page.route('http://localhost:5000/api/**', (route) => {
      const req = route.request();
      const path = new URL(req.url()).pathname.replace(/^\/api/, '');
      const method = req.method();
      const sent = req.postData() ? JSON.parse(req.postData()) : {};
      let body = { success: true, categories: [], expenses: [], totals: [], incomeStreams: [], budgets: [], goals: [], accounts: [], receipts: [], bills: [] };
      if (path === '/auth/refresh' || path === '/auth/me') body = { success: true, user, accessToken: 't' };
      else if (path === '/fx/rates') body = { success: true, base: 'PKR', rates: { PKR: 1 }, live: [], liveAt: day };
      else if (path === '/committees' && method === 'GET') body = { success: true, committees: list.map(dto) };
      else if (path === '/committees' && method === 'POST') {
        calls.push(['create', sent]);
        const c = { id: 'c1', name: sent.name, currency: sent.currency, contribution: sent.contribution, size: sent.size, mySlot: sent.mySlot, startDate: sent.startDate, paid: [], payoutAt: null };
        list.push(c);
        body = { success: true, committee: dto(c) };
      } else if (/^\/committees\/c1\/payments$/.test(path) && method === 'POST') {
        calls.push(['pay', sent.round]);
        list[0].paid.push({ round: sent.round, date: sent.date });
        body = { success: true, committee: dto(list[0]) };
      } else if (/^\/committees\/c1\/payments\/\d+$/.test(path) && method === 'DELETE') {
        calls.push(['undo', path.split('/').pop()]);
        list[0].paid = list[0].paid.filter((p) => String(p.round) !== path.split('/').pop());
        body = { success: true, committee: dto(list[0]) };
      } else if (path === '/committees/c1/payout' && method === 'POST') {
        calls.push(['payout']);
        list[0].payoutAt = sent.date;
        body = { success: true, committee: dto(list[0]) };
      } else if (path === '/committees/c1' && method === 'DELETE') {
        calls.push(['delete']);
        list = [];
      }
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.goto('http://localhost:4173/reports?tab=committees', { waitUntil: 'domcontentloaded' });
    await page.getByText('No committee yet').waitFor({ timeout: 20000 });
    await page.screenshot({ path: `${out}committees-${tag}-1-empty.png`, fullPage: true });

    // add: start 2 months ago so rounds 1-2 are overdue and the payout (round 2) is ready
    const start = addMonths(today(), -2);
    await page.getByRole('button', { name: 'Add committee' }).click();
    await page.getByPlaceholder('Office kameti').fill('Office kameti');
    await page.getByLabel('Each payment').fill('5000');
    await page.getByPlaceholder('10').fill('4');
    await page.getByPlaceholder('3').fill('9');
    await page.getByText('Your turn must be between').waitFor().catch(() => problems.push(`${tag}: slot error missing`));
    if (await page.getByRole('button', { name: 'Save', exact: true }).isEnabled()) problems.push(`${tag}: save enabled with a bad slot`);
    await page.getByPlaceholder('3').fill('2');
    await page.locator('input[type="date"]').fill(start);
    await page.getByText(/The pot is/).waitFor().catch(() => problems.push(`${tag}: preview missing`));
    await page.screenshot({ path: `${out}committees-${tag}-2-form.png`, fullPage: true });
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.getByRole('heading', { name: 'Office kameti' }).waitFor();
    if (!calls.some((c) => c[0] === 'create' && c[1].size === 4 && c[1].mySlot === 2 && c[1].contribution === 5000)) problems.push(`${tag}: create payload wrong`);
    if (!(await page.locator('body').innerText()).includes('Payments due or overdue: 3')) problems.push(`${tag}: due summary wrong`);

    // pay next round, then undo it from the rounds list
    await page.getByRole('button', { name: 'Mark paid' }).click();
    await page.getByText('1 of 4 rounds paid').first().waitFor().catch(() => problems.push(`${tag}: paid progress missing`));
    if (!calls.some((c) => c[0] === 'pay' && c[1] === 1)) problems.push(`${tag}: pay payload wrong`);
    await page.getByRole('button', { name: /Show rounds/ }).click();
    await page.getByRole('button', { name: 'Undo: Round 1' }).click();
    await page.waitForTimeout(400);
    if (!calls.some((c) => c[0] === 'undo' && c[1] === '1')) problems.push(`${tag}: undo payload wrong`);
    await page.getByRole('button', { name: 'Mark paid: Round 2' }).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${out}committees-${tag}-3-card.png`, fullPage: true });

    // payout
    await page.getByRole('button', { name: 'Mark received' }).click();
    await page.getByText(/Received /).first().waitFor().catch(() => problems.push(`${tag}: payout not shown`));

    // delete needs confirmation
    await page.getByRole('button', { name: 'Delete: Office kameti' }).click();
    await page.getByText('Delete this committee?').waitFor();
    if (calls.some((c) => c[0] === 'delete')) problems.push(`${tag}: deleted without confirmation`);
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.getByText('No committee yet').waitFor().catch(() => problems.push(`${tag}: not empty after delete`));

    if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) problems.push(`${tag}: horizontal overflow`);
    await ctx.close();
  }
  await browser.close();
  console.log(problems.length ? problems.join('\n') : 'no problems');
})();
