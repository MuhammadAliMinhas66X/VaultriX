import { describe, it, expect } from 'vitest';
import { buildDigestItems, digestMail } from '../../src/services/reminderDigest.js';

const today = '2026-11-12';
const bill = (name, dueAt, extra = {}) => ({ billerName: name, dueAt: new Date(`${dueAt}T00:00:00Z`), amountMinor: 100000, installationMinor: 0, payments: [], currency: 'PKR', cancelledAt: null, ...extra });
const loan = (name, dueAt, extra = {}) => ({ personName: name, dueAt: dueAt && new Date(`${dueAt}T00:00:00Z`), amountMinor: 50000, payments: [], direction: 'borrowed', currency: 'PKR', ...extra });

describe('reminder digest items', () => {
  it('keeps overdue and due within 3 days, drops paid, cancelled and far-off, overdue first', () => {
    const items = buildDigestItems(
      [bill('far', '2026-11-20'), bill('late', '2026-11-09'), bill('soon', '2026-11-14'), bill('paid', '2026-11-10', { payments: [{ amountMinor: 100000 }] }), bill('off', '2026-11-10', { cancelledAt: new Date() })],
      [loan('Ali', '2026-11-12'), loan('none', null), loan('done', '2026-11-11', { payments: [{ amountMinor: 50000 }] })],
      today
    );
    expect(items.map((item) => item.name)).toEqual(['late', 'Ali', 'soon']);
    expect(items[0]).toMatchObject({ days: -3, amount: 1000, currency: 'PKR' });
  });

  it('counts part-paid bills by what is left and builds a readable mail', () => {
    const items = buildDigestItems([bill('IESCO', '2026-11-12', { payments: [{ amountMinor: 40000 }] })], [], today);
    expect(items[0].amount).toBe(600);
    const mail = digestMail('Muhammad Ali', items, 'https://app.example.com');
    expect(mail.subject).toBe('Vaultrix: 1 reminder');
    expect(mail.html).toContain('Open Vaultrix');
    expect(mail.html).not.toContain('<script');
    expect(mail.text).toContain('Bill: IESCO');
    expect(mail.text).toContain('due today');
    expect(mail.text).toContain('https://app.example.com/dashboard');
    expect(digestMail('<b>x</b>', [{ kind: 'bill', name: '<i>Jazz</i>', amount: 1, currency: 'PKR', days: -2 }], '').html).not.toContain('<i>Jazz</i>');
  });
});
