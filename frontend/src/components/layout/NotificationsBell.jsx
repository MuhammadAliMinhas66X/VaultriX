import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, HandCoins, Receipt, Users } from 'lucide-react';
import { useGroupInvites } from '../../hooks/useGroupInvites.js';
import { useReminders } from '../../hooks/useReminders.js';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';

const iconOf = { bill: Receipt, loanOwe: HandCoins, loanOwed: HandCoins };

export const dueLabel = (days, t) => (days < 0 ? t('reminders.overdue', { count: Math.abs(days) }) : days === 0 ? t('reminders.today') : t('reminders.inDays', { count: days }));

// The bell in the top bar: a badge with how many bills and loans need attention
// and a small list of them.
function NotificationsBell() {
  const { t } = useTranslation();
  const { formatMoney } = useFormat();
  const { items } = useReminders();
  const { invites } = useGroupInvites();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const count = items.length + invites.length;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={count > 0 ? `${t('reminders.bell')} (${count})` : t('reminders.bell')}
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg text-muted outline-none transition hover:bg-black/[0.04] hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <Bell className="h-5 w-5" strokeWidth={1.75} />
        {count > 0 && (
          <span className="absolute -end-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-ink px-1 text-[10px] font-bold tabular-nums text-white ring-2 ring-white">{count > 9 ? '9+' : count}</span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute end-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-1.5rem)] origin-top-right overflow-hidden rounded-2xl border border-border bg-white shadow-[0_18px_40px_-16px_rgba(17,17,20,0.35)]"
          >
            <p className="border-b border-border px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{t('reminders.title')}</p>
            {invites.length > 0 && (
              <ul>
                {invites.map((invite) => (
                  <li key={invite.id} className="border-b border-border">
                    <Link to="/join-group" onClick={() => setOpen(false)} className="flex items-center gap-3 bg-surface/60 px-4 py-3 outline-none transition hover:bg-surface focus-visible:bg-surface">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-white"><Users className="h-4 w-4" strokeWidth={1.75} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">{invite.groupName}</span>
                        <span className="block truncate text-xs text-muted">{invite.inviterName ? t('groups.invitedBy', { name: invite.inviterName }) : t('groups.invitedGeneric')}</span>
                      </span>
                      <span className="shrink-0 rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{t('groups.accept')}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {count === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted">{t('reminders.allClear')}</p>
            ) : items.length === 0 ? null : (
              <ul className="max-h-80 overflow-y-scroll [scrollbar-color:#c4c4c9_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#c4c4c9]">
                {items.map((item) => {
                  const Icon = iconOf[item.kind];
                  const sub = item.kind === 'bill' ? t('reminders.kindBill') : item.kind === 'loanOwe' ? t('reminders.kindOwe') : t('reminders.kindOwed');
                  return (
                    <li key={item.key} className="border-b border-border last:border-b-0">
                      <Link to={item.href} onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-3 outline-none transition hover:bg-surface focus-visible:bg-surface">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-ink">
                          <Icon className="h-4 w-4" strokeWidth={1.75} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-ink">{item.name}</span>
                          <span className={`block truncate text-xs ${item.days < 0 ? 'font-semibold text-ink' : 'text-muted'}`}>
                            {sub} · {dueLabel(item.days, t)}
                          </span>
                        </span>
                        <span className="shrink-0 whitespace-nowrap text-sm font-bold tabular-nums text-ink">{formatMoney(item.amount, { decimals: 0, currency: item.currency })}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default NotificationsBell;
