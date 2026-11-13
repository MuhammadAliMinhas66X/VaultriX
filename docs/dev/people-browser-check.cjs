// Sandbox-only. Serve the build (vite preview --port 4173), then: OUT=/tmp/x/ node docs/dev/people-browser-check.cjs
// Settings > People: list, invite (code shown), role change, join block for a lone account.
const { chromium } = require('playwright');
const out = process.env.OUT || './';
const user = { id: 'u1', name: 'Test Owner', email: 'm@example.com', currency: 'PKR', language: 'en', onboardingCompleted: true, country: 'PK' };
const day = new Date().toISOString();
const base = () => [{ id: 'u1', name: 'Test Owner', email: 'm@example.com', role: 'owner', isOwner: true, joinedAt: day }, { id: 'u2', name: 'Sara Khan', email: 'sara@example.com', role: 'member', isOwner: false, joinedAt: day }];
let members = base();
let invites = [];
const calls = [];
const respond = (url, method, body) => {
  const path = new URL(url).pathname.replace(/^\/api/, '');
  if (path === '/auth/refresh') return { success: true, user, accessToken: 'token' };
  if (path === '/auth/me') return { success: true, user };
  if (path === '/fx/rates') return { success: true, base: 'PKR', rates: { PKR: 1 }, live: [], liveAt: day };
  if (path === '/team' && method === 'GET') return { success: true, workspace: "Test's workspace", me: { id: 'u1', role: 'owner' }, members, invites, limit: 10 };
  if (path === '/team/invites' && method === 'POST') { const b = JSON.parse(body); calls.push(`invite:${b.email}:${b.role}`); invites = [{ id: 'i1', email: b.email, role: b.role, expiresAt: day, createdAt: day }]; return { success: true, invite: invites[0], code: 'ABCDE-23456' }; }
  if (path.startsWith('/team/members/') && method === 'PATCH') { const b = JSON.parse(body); calls.push(`role:${path.split('/')[3]}:${b.role}`); members = members.map((m) => (m.id === path.split('/')[3] ? { ...m, role: b.role } : m)); return { success: true }; }
  return { success: true, categories: [], loans: [], bills: [], expenses: [], incomeStreams: [], sessions: [] };
};
(async () => {
  const browser = await chromium.launch();
  const problems = [];
  for (const [tag, w, h] of [['desktop', 1280, 900], ['phone', 390, 844]]) {
    members = base(); invites = []; calls.length = 0;
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => problems.push(`${tag} pageerror: ${e.message}`));
    await page.route('http://localhost:5000/api/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(respond(route.request().url(), route.request().method(), route.request().postData() || '{}')) }));
    await page.goto('http://localhost:4173/settings', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'People', exact: true }).locator('visible=true').first().click({ timeout: 20000 });
    await page.getByText('Sara Khan').waitFor();
    await page.fill('input[type=email]', 'new@example.com');
    await page.getByRole('button', { name: 'Send invite' }).click();
    await page.getByText('ABCDE-23456').waitFor();
    if (calls[0] !== 'invite:new@example.com:member') problems.push(`${tag}: invite call ${calls[0]}`);
    await page.getByText('new@example.com').first().waitFor();
    await page.getByRole('button', { name: 'Role for Sara Khan' }).click();
    await page.getByRole('option', { name: 'Viewer' }).click();
    await page.waitForTimeout(400);
    if (!calls.includes('role:u2:viewer')) problems.push(`${tag}: role not sent ${calls.join(',')}`);
    await page.screenshot({ path: `${out}people-${tag}.png`, fullPage: true });
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (over > 0) problems.push(`${tag}: horizontal overflow ${over}px`);
    // lone account sees the join block
    members = [members[0]];
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'People', exact: true }).locator('visible=true').first().click();
    await page.getByText('Join with a code').first().waitFor({ timeout: 10000 }).catch(() => problems.push(`${tag}: join block missing`));
    await ctx.close();
  }
  await browser.close();
  console.log(problems.length ? problems.join('\n') : 'no problems');
})();
