import { Link } from 'react-router-dom';
import { BellRing, Receipt, HandCoins, ArrowRight } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';

const SHOWN = 5;

const iconOf = { bill: Receipt, loanOwe: HandCoins, loanOwed: HandCoins };

function Pill({ days, t }) {
  const late = days < 0;
  const label = late ? t('reminders.overdue', { count: Math.abs(days) }) : days === 0 ? t('reminders.today') : t('reminders.inDays', { count: days });
  return (
    <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${late ? 'bg-ink text-white' : days === 0 ? 'bg-ink/10 text-ink ring-1 ring-ink/30' : 'bg-surface text-muted'}`}>{label}</span>
  );
}

// Bills and loans that are overdue or due within a week. Renders nothing when
// there is nothing to chase it says so, so it is always clear where reminders live.
function RemindersPanel({ items, ready = true }) {
  const { t } = useTranslation();
  const { formatMoney } = useFormat();
  if (!ready) return null;
  const shown = (items || []).slice(0, SHOWN);
  const rest = (items || []).length - shown.length;

  return (
    <section className="rounded-2xl border border-border bg-white" aria-label={t('reminders.title')}>
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h2 className="flex items-center gap-3 text-base font-bold tracking-tight text-ink">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-ink to-[#3a3a42] text-white shadow-sm">
            <BellRing className="h-[18px] w-[18px]" strokeWidth={2} />
          </span>
          {t('reminders.title')}
        </h2>
        {(items || []).length > 0 && <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold tabular-nums text-ink">{items.length}</span>}
      </div>
      {shown.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted">{t('reminders.empty')}</p>
      ) : (
      <ul>
        {shown.map((item) => {
          const Icon = iconOf[item.kind];
          const sub = item.kind === 'bill' ? t('reminders.kindBill') : item.kind === 'loanOwe' ? t('reminders.kindOwe') : t('reminders.kindOwed');
          return (
            <li key={item.key} className="border-b border-border last:border-b-0">
              <Link to={item.href} className="flex items-center gap-3 px-5 py-3.5 outline-none transition hover:bg-surface focus-visible:bg-surface">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-ink">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{item.name}</span>
                  <span className="block truncate text-xs text-muted">{sub}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className="whitespace-nowrap text-sm font-bold tabular-nums text-ink">{formatMoney(item.amount, { decimals: 0, currency: item.currency })}</span>
                  <Pill days={item.days} t={t} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      )}
      {rest > 0 && (
        <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs font-medium text-muted">
          {t('reminders.more', { count: rest })}
          <ArrowRight className="h-4 w-4" />
        </div>
      )}
    </section>
  );
}

export default RemindersPanel;
