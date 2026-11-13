// Sandbox-only. Serve the build (vite preview --port 4173), then: OUT=/tmp/x/ node docs/dev/data-browser-check.cjs
// Settings > Data: export downloads a CSV, a CSV can be chosen, previewed and imported (phone + desktop).
const { chromium } = require('playwright');
const out = process.env.OUT || './';
const user = { id: 'u1', name: 'Test', email: 'm@example.com', currency: 'PKR', language: 'en', onboardingCompleted: true, country: 'PK' };
const respond = (url, method, body) => {
  const path = new URL(url).pathname.replace(/^\/api/, '');
  if (path === '/auth/refresh') return { json: { success: true, user, accessToken: 'token' } };
  if (path === '/auth/me') return { json: { success: true, user } };
  if (path.startsWith('/data/export/')) return { csv: '﻿Date,Amount\r\n2026-11-01,10\r\n' };
  if (path === '/data/import') {
    const rows = JSON.parse(body).rows;
    const created = { expense: 0, income: 0, bill: 0, loan: 0, loanPayment: 0 };
    rows.forEach((r) => { created[r.kind] += 1; });
    global.sent = (global.sent || []).concat(rows);
    return { json: { success: true, created, skipped: [] } };
  }
  if (path === '/fx/rates') return { json: { success: true, base: 'PKR', rates: { PKR: 1 }, live: [], liveAt: new Date().toISOString() } };
  return { json: { success: true, incomeStreams: [], expenses: [], bills: [], loans: [], receipts: [], totals: [], opening: null, categories: [], sessions: [] } };
};
(async () => {
  const browser = await chromium.launch();
  const problems = [];
  for (const [tag, w, h] of [['desktop', 1280, 900], ['phone', 390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, acceptDownloads: true });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => problems.push(`${tag} pageerror: ${e.message}`));
    await page.route('http://localhost:5000/api/**', (route) => {
      const r = respond(route.request().url(), route.request().method(), route.request().postData() || '{}');
      if (r.csv) return route.fulfill({ status: 200, contentType: 'text/csv', body: r.csv });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(r.json) });
    });
    await page.goto('http://localhost:4173/settings', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Data', exact: true }).locator('visible=true').first().click({ timeout: 20000 });
    await page.waitForSelector('text=Export your data');
    await page.waitForTimeout(500);
    const [download] = await Promise.all([page.waitForEvent('download', { timeout: 10000 }), page.locator('button:has-text("Download") >> nth=0').click()]);
    if (!/vaultrix-expenses-.*\.csv/.test(download.suggestedFilename())) problems.push(`${tag}: bad download name ${download.suggestedFilename()}`);
    global.sent = [];
    const csv = 'Date,Description,Debit,Credit,Balance\n01/11/2026,Salary November,,90000,90000\n02/11/2026,Lunch with team,250,,89750\n03/11/2026,IESCO electricity,8400,,81350\n05/11/2026,Borrowed from Waqas,,20000,101350\n10/11/2026,Repaid to Waqas,5000,,96350\n11/11/2026,Lent to Shahid,3000,,93350\n';
    await page.setInputFiles('#import-file', { name: 'bank.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
    await page.waitForSelector('text=6 rows read');
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${out}data-preview-${tag}.png`, fullPage: true });
    await page.click('button:has-text("Import 6 rows")');
    await page.waitForSelector('text=Imported 6 rows');
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${out}data-done-${tag}.png`, fullPage: true });
    const sent = global.sent.map((r) => `${r.kind}:${r.date}`).join(' ');
    const want = 'loan:2026-11-05 loan:2026-11-11 income:2026-11-01 expense:2026-11-02 bill:2026-11-03 loanPayment:2026-11-10';
    if (sent !== want) problems.push(`${tag}: sent ${sent}`);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (over > 0) problems.push(`${tag}: horizontal overflow ${over}px`);
    await ctx.close();
  }
  await browser.close();
  console.log(problems.length ? problems.join('\n') : 'no problems');
})();
