// Sandbox-only. Serve the build (vite preview --port 4173), then: OUT=/dir node docs/dev/sidebar-browser-check.cjs
// Checks the Income Stream menu: plain link with no streams, closed dropdown with streams, opens when clicked.
const { chromium } = require('playwright');
const out = (process.env.OUT || '.') + '/';
const user = { id: 'u1', name: 'Test', email: 'm@example.com', currency: 'PKR', language: 'en', onboardingCompleted: true, country: 'PK' };
const mkStream = (id, name) => ({ id, name, expectedAmount: 62000, currency: 'PKR', incomeType: 'salaried', frequency: 'monthly', receivedAt: new Date().toISOString(), createdAt: new Date().toISOString(), destinationMethod: 'cash', destinationName: '' });
const respond = (url, streams) => {
  const path = new URL(url).pathname.replace(/^\/api/, '');
  if (path === '/auth/refresh') return { success: true, user, accessToken: 'token' };
  if (path === '/auth/me') return { success: true, user };
  if (path === '/fx/rates') return { success: true, base: 'PKR', rates: { PKR: 1 }, live: [], liveAt: new Date().toISOString() };
  if (path === '/income-streams') return { success: true, incomeStreams: streams };
  if (path === '/expenses') return { success: true, expenses: [] };
  if (path === '/categories') return { success: true, categories: [] };
  if (path === '/loans') return { success: true, loans: [] };
  if (path === '/bills') return { success: true, bills: [] };
  return { success: true };
};
(async () => {
  const browser = await chromium.launch();
  const problems = [];
  for (const [tag, streams] of [['empty', []], ['two', [mkStream('s1', 'Main Stream'), mkStream('s2', 'Freelance')]]]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => problems.push(`${tag} pageerror: ${e.message}`));
    await page.route('http://localhost:5000/api/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(respond(route.request().url(), streams)) }));
    await page.goto('http://localhost:4173/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('nav >> text=Income Stream', { timeout: 20000 });
    await page.waitForTimeout(500);
    const chevron = await page.locator('nav button[aria-expanded]').count();
    const addLink = await page.locator('nav').getByText('Add income stream').count();
    const child = await page.locator('nav >> text=Main Stream').count();
    await page.screenshot({ path: `${out}side-${tag}-1.png`, clip: { x: 0, y: 0, width: 340, height: 460 } });
    if (tag === 'empty' && (chevron || addLink)) problems.push('empty: should be a plain Income Stream link');
    if (tag === 'two') {
      if (!chevron) problems.push('two: dropdown arrow missing');
      if (child) problems.push('two: dropdown should start closed');
      await page.locator('nav button[aria-expanded]').click();
      await page.waitForTimeout(700);
      if (!(await page.locator('nav >> text=Main Stream').count())) problems.push('two: streams not shown after click');
      await page.screenshot({ path: `${out}side-${tag}-2.png`, clip: { x: 0, y: 0, width: 340, height: 460 } });
      await page.locator('nav button[aria-expanded]').click();
      await page.waitForTimeout(700);
      if (await page.locator('nav >> text=Main Stream').count()) problems.push('two: did not close');
    }
    await ctx.close();
  }
  await browser.close();
  console.log(problems.length ? problems.join('\n') : 'no problems');
})();
