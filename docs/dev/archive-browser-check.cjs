// Sandbox-only. Serve the build (vite preview --port 4173), then: OUT=/tmp/x/ node docs/dev/archive-browser-check.cjs
// Income streams: Archive moves a stream to the Archived list, Restore brings it back; old receipts still count.
const { chromium } = require('playwright');
const out = process.env.OUT || './';
const user = { id: 'u1', name: 'Test', email: 'm@example.com', currency: 'PKR', language: 'en', onboardingCompleted: true, country: 'PK' };
const day = new Date().toISOString();
const mk = (id, name, archived) => ({ id, name, expectedAmount: 50000, currency: 'PKR', incomeType: 'salaried', frequency: 'monthly', receivedAt: day, createdAt: day, destinationMethod: 'cash', destinationName: '', deductionsEnabled: false, deductions: [], isArchived: archived });
let streams = [mk('s1', 'Main Income', false), mk('s2', 'Old Shop', true)];
const patches = [];
const respond = (url, method, body) => {
  const path = new URL(url).pathname.replace(/^\/api/, '');
  if (path === '/auth/refresh') return { success: true, user, accessToken: 'token' };
  if (path === '/auth/me') return { success: true, user };
  if (path === '/fx/rates') return { success: true, base: 'PKR', rates: { PKR: 1 }, live: [], liveAt: day };
  if (path.startsWith('/income-streams/') && method === 'PATCH') {
    const id = path.split('/')[2]; const b = JSON.parse(body); patches.push(`${id}:${b.isArchived}`);
    streams = streams.map((s) => (s.id === id ? { ...s, isArchived: b.isArchived } : s));
    return { success: true, incomeStream: streams.find((s) => s.id === id) };
  }
  if (path === '/income-streams') return { success: true, incomeStreams: streams };
  if (path === '/receipts') return { success: true, receipts: [{ id: 'r1', streamId: 's2', receivedAt: day, amount: 7000, currency: 'PKR', note: '', source: 'manual' }] };
  if (path === '/receipts/opening') return { success: true, opening: null };
  return { success: true, categories: [], loans: [], bills: [], expenses: [], totals: [] };
};
(async () => {
  const browser = await chromium.launch();
  const problems = [];
  for (const [tag, w, h] of [['desktop', 1280, 900], ['phone', 390, 844]]) {
    streams = [mk('s1', 'Main Income', false), mk('s2', 'Old Shop', true)];
    patches.length = 0;
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => problems.push(`${tag} pageerror: ${e.message}`));
    await page.route('http://localhost:5000/api/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(respond(route.request().url(), route.request().method(), route.request().postData() || '{}')) }));
    await page.goto('http://localhost:4173/income', { waitUntil: 'domcontentloaded' });
    await page.getByText('Main Income').first().waitFor({ timeout: 20000 });
    if (await page.getByText('Old Shop').count()) problems.push(`${tag}: archived stream visible before opening Archived`);
    await page.getByRole('button', { name: /^Archived/ }).click();
    await page.getByText('Old Shop').waitFor();
    await page.screenshot({ path: `${out}archived-${tag}.png` });
    await page.getByRole('button', { name: 'Restore' }).click();
    await page.getByText('Old Shop').first().waitFor();
    if (patches[0] !== 's2:false') problems.push(`${tag}: restore sent ${patches[0]}`);
    // archive Main Income from its detail
    await page.locator('li#stream-s1 button').first().click();
    await page.getByRole('button', { name: 'Archive', exact: true }).first().click();
    await page.waitForTimeout(500);
    if (patches[1] !== 's1:true') problems.push(`${tag}: archive sent ${patches[1]}`);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (over > 0) problems.push(`${tag}: horizontal overflow ${over}px`);
    await ctx.close();
  }
  await browser.close();
  console.log(problems.length ? problems.join('\n') : 'no problems');
})();
