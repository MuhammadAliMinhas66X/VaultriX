import Bill from '../models/Bill.js';
import Loan from '../models/Loan.js';
import User from '../models/User.js';
import { sendMail } from '../utils/mailer.js';

// Reminder emails. One digest per person per day, only when something is
// overdue or due within DIGEST_DAYS days, and only for people who switched
// "Email me reminders" on in Settings. Limits: at most MAX_USERS people and
// MAX_ITEMS lines per run, so a bug can never mail the whole world.
export const DIGEST_DAYS = 3;
const MAX_USERS = 500;
const MAX_ITEMS = 25;
const SEND_FROM_UTC_HOUR = 3; // 08:00 in Pakistan; earlier hours do nothing
const EVERY_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const dayKey = (value) => new Date(value).toISOString().slice(0, 10);
const daysBetween = (fromKey, toKey) => Math.round((Date.parse(`${toKey}T00:00:00Z`) - Date.parse(`${fromKey}T00:00:00Z`)) / DAY_MS);
const paidOf = (item) => (item.payments || []).reduce((sum, payment) => sum + payment.amountMinor, 0);

// Pure: turns raw bills and loans into sorted digest lines (money in major units).
export const buildDigestItems = (bills, loans, today, withinDays = DIGEST_DAYS) => {
  const items = [];

  (bills || []).forEach((bill) => {
    if (bill.cancelledAt) return;
    const remaining = bill.amountMinor + (bill.installationMinor || 0) - paidOf(bill);
    if (remaining <= 0) return;
    const days = daysBetween(today, dayKey(bill.dueAt));
    if (days > withinDays) return;
    items.push({ kind: 'bill', name: bill.billerName, amount: remaining / 100, currency: bill.currency, days });
  });

  (loans || []).forEach((loan) => {
    if (!loan.dueAt) return;
    const remaining = loan.amountMinor - paidOf(loan);
    if (remaining <= 0) return;
    const days = daysBetween(today, dayKey(loan.dueAt));
    if (days > withinDays) return;
    items.push({ kind: loan.direction === 'borrowed' ? 'loanOwe' : 'loanOwed', name: loan.personName, amount: remaining / 100, currency: loan.currency, days });
  });

  return items.sort((a, b) => a.days - b.days).slice(0, MAX_ITEMS);
};

const when = (days) => (days < 0 ? `${Math.abs(days)} day${days === -1 ? '' : 's'} overdue` : days === 0 ? 'due today' : `due in ${days} day${days === 1 ? '' : 's'}`);
const what = (item) => (item.kind === 'bill' ? `Bill: ${item.name}` : item.kind === 'loanOwe' ? `You owe ${item.name}` : `${item.name} owes you`);
const money = (item) => `${item.currency} ${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const esc = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const appUrl = () => {
  const first = String(process.env.CLIENT_URL || '').split(',')[0].trim().replace(/\/$/, '');
  return /^https?:\/\//.test(first) ? first : '';
};

const GROUPS = [
  { key: 'late', title: 'Overdue', test: (item) => item.days < 0 },
  { key: 'today', title: 'Due today', test: (item) => item.days === 0 },
  { key: 'soon', title: 'Coming up', test: (item) => item.days > 0 },
];

export const digestMail = (name, items, url = appUrl()) => {
  const first = String(name || '').split(' ')[0] || 'there';
  const late = items.filter((item) => item.days < 0).length;
  const total = items.length;
  const summary = `${total} ${total === 1 ? 'item needs' : 'items need'} your attention${late > 0 ? `, ${late} overdue` : ''}.`;

  const textGroups = GROUPS.map((group) => {
    const rows = items.filter(group.test);
    return rows.length ? `${group.title}\n${rows.map((item) => `  ${what(item)}  -  ${money(item)}  (${when(item.days)})`).join('\n')}` : '';
  }).filter(Boolean);
  const text = `Hi ${first},\n\n${summary}\n\n${textGroups.join('\n\n')}\n\n${url ? `Open Vaultrix: ${url}/dashboard\n\n` : ''}You get one email a day, only when something is due. Turn it off any time in Settings > Preferences.`;

  const sections = GROUPS.map((group) => {
    const rows = items.filter(group.test);
    if (rows.length === 0) return '';
    const badge = group.key === 'late' ? 'background:#111114;color:#ffffff' : group.key === 'today' ? 'background:#e9e9ec;color:#111114' : 'background:#f4f4f6;color:#6b6b70';
    const lines = rows
      .map(
        (item) => `<tr>
          <td style="padding:14px 0;border-top:1px solid #ececef;font-size:15px;color:#111114;line-height:1.35"><b>${esc(item.name)}</b><br><span style="font-size:12px;color:#6b6b70">${esc(item.kind === 'bill' ? 'Bill' : item.kind === 'loanOwe' ? 'You owe' : 'Owes you')}</span></td>
          <td align="right" style="padding:14px 0;border-top:1px solid #ececef;font-size:15px;color:#111114;white-space:nowrap"><b>${esc(money(item))}</b><br><span style="display:inline-block;margin-top:4px;padding:2px 9px;border-radius:999px;font-size:11px;font-weight:600;${badge}">${esc(when(item.days))}</span></td>
        </tr>`
      )
      .join('');
    return `<p style="margin:22px 0 4px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#6b6b70;font-weight:700">${group.title}</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${lines}</table>`;
  }).join('');

  const button = url
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 4px"><tr><td style="background:#111114;border-radius:10px"><a href="${esc(url)}/dashboard" style="display:inline-block;padding:12px 22px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none">Open Vaultrix</a></td></tr></table>`
    : '';

  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f4f4f6">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f6"><tr><td align="center" style="padding:28px 12px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#111114">
      <tr><td style="background:#111114;padding:20px 28px;color:#ffffff;font-size:15px;font-weight:700;letter-spacing:.22em">VAULTRIX</td></tr>
      <tr><td style="padding:28px 28px 8px">
        <p style="margin:0 0 6px;font-size:20px;font-weight:700;letter-spacing:-.01em">Hi ${esc(first)},</p>
        <p style="margin:0;font-size:14px;color:#6b6b70;line-height:1.5">${esc(summary)}</p>
        ${sections}
        ${button}
      </td></tr>
      <tr><td style="padding:18px 28px 26px;font-size:12px;color:#8a8a90;line-height:1.5;border-top:1px solid #ececef">You get one email a day, and only when something is due. Turn it off any time in Settings &gt; Preferences.</td></tr>
    </table>
  </td></tr></table></body></html>`;

  return { subject: `Vaultrix: ${total} ${total === 1 ? 'reminder' : 'reminders'}${late > 0 ? ` (${late} overdue)` : ''}`, text, html };
};

export const runReminderDigest = async (now = new Date()) => {
  const today = dayKey(now);
  const limit = new Date(Date.parse(`${today}T00:00:00Z`) + (DIGEST_DAYS + 1) * DAY_MS);
  const users = await User.find({ reminderEmails: true, isActive: { $ne: false }, lastReminderEmailOn: { $ne: today } })
    .select('name email orgId')
    .limit(MAX_USERS)
    .lean();

  let sent = 0;
  for (const user of users) {
    try {
      const [bills, loans] = await Promise.all([
        Bill.find({ orgId: user.orgId, cancelledAt: null, dueAt: { $lt: limit } }).sort({ dueAt: 1 }).limit(200).lean(),
        Loan.find({ orgId: user.orgId, dueAt: { $ne: null, $lt: limit } }).sort({ dueAt: 1 }).limit(200).lean(),
      ]);
      const items = buildDigestItems(bills, loans, today);
      if (items.length === 0) continue;
      await sendMail({ to: user.email, ...digestMail(user.name, items) });
      await User.updateOne({ _id: user._id }, { $set: { lastReminderEmailOn: today } });
      sent += 1;
    } catch (error) {
      console.error('Reminder email failed:', error.message);
    }
  }
  return sent;
};

export const startReminderJob = () => {
  const run = async () => {
    if (new Date().getUTCHours() < SEND_FROM_UTC_HOUR) return;
    try {
      const sent = await runReminderDigest();
      if (sent > 0) console.log(`Sent ${sent} reminder email(s).`);
    } catch (error) {
      console.error('Reminder job failed:', error.message);
    }
  };
  setTimeout(run, 60 * 1000).unref();
  setInterval(run, EVERY_MS).unref();
};
