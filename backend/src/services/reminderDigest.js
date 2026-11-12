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

export const digestMail = (name, items) => {
  const lines = items.map((item) => `- ${what(item)}: ${money(item)} (${when(item.days)})`);
  const first = String(name || '').split(' ')[0] || 'there';
  const text = `Hi ${first},\n\nThese need your attention in Vaultrix:\n\n${lines.join('\n')}\n\nYou can turn these emails off any time in Settings > Preferences.`;
  const rows = items
    .map((item) => `<tr><td style="padding:6px 0">${what(item).replace(/</g, '&lt;')}</td><td style="padding:6px 0 6px 16px;white-space:nowrap"><b>${money(item)}</b></td><td style="padding:6px 0 6px 16px;color:#6b6b70;white-space:nowrap">${when(item.days)}</td></tr>`)
    .join('');
  const html = `<div style="font-family:Arial,sans-serif;color:#111114"><p>Hi ${first.replace(/</g, '&lt;')},</p><p>These need your attention in Vaultrix:</p><table style="border-collapse:collapse;font-size:14px">${rows}</table><p style="color:#6b6b70;font-size:12px">You can turn these emails off any time in Settings &gt; Preferences.</p></div>`;
  return { subject: `Vaultrix: ${items.length} ${items.length === 1 ? 'reminder' : 'reminders'}`, text, html };
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
