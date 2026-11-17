// Sandbox-only. vite preview --port 4173, then: OUT=/tmp/x/ node docs/dev/groups-invite-browser-check.cjs
// Invitations: signed-out email link goes to login and back; Groups card + invitation on the Dashboard; bell; join page; accept.
const { chromium } = require('playwright');
const out = process.env.OUT || './';
const user = { id: 'u1', name: 'Ali', email: 'm@example.com', currency: 'PKR', language: 'en', onboardingCompleted: true, country: 'PK' };
const day = new Date().toISOString();
const invite = { id: 'i1', groupName: 'Flat 4B', memberCount: 2, inviterName: 'Sara', expiresAt: day };
let signedIn = true;
const calls = [];
const respond = (url, method) => {
  const path = new URL(url).pathname.replace(/^\/api/, '');
  if (path === '/auth/refresh') return signedIn ? { success: true, user, accessToken: 'token' } : null;
  if (path === '/auth/me') return { success: true, user };
  if (path === '/fx/rates') return { success: true, base: 'PKR', rates: { PKR: 1 }, live: [], liveAt: day };
  if (path === '/groups/invites/mine') return { success: true, invites: calls.includes('accept') ? [] : [invite] };
  if (path === '/groups/invites/i1/accept') { calls.push('accept'); return { success: true, id: 'g1' }; }
  if (path === '/groups' && method === 'GET') return { success: true, groups: [{ id: 'g1', name: 'Flat 4B', currency: 'PKR', members: 2, memberNames: ['Ali', 'Sara'], mine: [{ currency: 'PKR', amount: 15000 }] }] };
  if (path === '/groups/g1') return { success: true, group: { id: 'g1', name: 'Flat 4B', currency: 'PKR', isCreator: false, limit: 12 }, me: 'u1', members: [], expenses: [], settlements: [], invites: [], balances: [], capped: false };
  return { success: true, categories: [], loans: [], bills: [], expenses: [], incomeStreams: [], totals: [], receipts: [], opening: null };
};
(async () => {
  const browser = await chromium.launch();
  const problems = [];
  for (const [tag, w, h] of [['desktop', 1280, 900], ['phone', 390, 844]]) {
    calls.length = 0;
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => problems.push(`${tag} pageerror: ${e.message}`));
    await page.route('http://localhost:5000/api/**', (route) => {
      const body = respond(route.request().url(), route.request().method());
      if (body === null) return route.fulfill({ status: 401, contentType: 'application/json', body: '{"success":false,"message":"Unauthorized"}' });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    signedIn = false;
    await page.goto('http://localhost:4173/join-group', { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/login', { timeout: 20000 });
    const kept = await page.evaluate(() => sessionStorage.getItem('vx.next'));
    if (kept !== '/join-group') problems.push(`${tag}: return path not kept (${kept})`);

    signedIn = true;
    await page.goto('http://localhost:4173/dashboard', { waitUntil: 'domcontentloaded' });
    await page.getByText('Split rent, food and trips').first().waitFor({ timeout: 20000 });
    await page.getByText('Sara invited you').first().waitFor();
    await page.screenshot({ path: `${out}invite-dashboard-${tag}.png`, fullPage: true });
    if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) problems.push(`${tag}: horizontal scroll on dashboard`);

    const bell = page.getByRole('button', { name: /notifications|reminders/i }).first();
    await bell.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${out}invite-bell-${tag}.png` });
    await page.keyboard.press('Escape');

    await page.goto('http://localhost:4173/join-group', { waitUntil: 'domcontentloaded' });
    await page.getByText('Flat 4B').first().waitFor({ timeout: 20000 });
    await page.screenshot({ path: `${out}invite-join-${tag}.png` });
    await page.getByRole('button', { name: 'Join group' }).first().click();
    await page.waitForURL('**/groups/g1', { timeout: 10000 });
    if (!calls.includes('accept')) problems.push(`${tag}: accept not sent`);
    await ctx.close();
  }
  await browser.close();
  console.log(problems.length ? problems.join('\n') : 'no problems');
})();
