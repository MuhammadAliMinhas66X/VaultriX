import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';
import Section from './Section.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';

// Six months of income against spending, with what was kept over the whole period.
export default function CashFlowPanel({ trend, currentMonth, currency }) {
  const { t } = useTranslation();
  const { formatMoney, formatDate } = useFormat();
  const calm = useAppReducedMotion();

  const peak = Math.max(1, ...trend.flatMap((row) => [row.income, row.spent]));
  const income = trend.reduce((sum, row) => sum + row.income, 0);
  const spent = trend.reduce((sum, row) => sum + row.spent, 0);
  const kept = income - spent;
  const monthShort = (key) => formatDate(new Date(`${key}-01T00:00:00Z`), { month: 'short', timeZone: 'UTC' });
  const money = (value) => formatMoney(value, { decimals: 0, currency });

  return (
    <Section icon={BarChart3} title={t('dash.trendTitle')} to="/reports" linkLabel={t('nav.reports')}>
      <div className="px-5 pb-5">
        <div className="flex items-center gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-ink" />{t('dash.income')}</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#b8b8be]" />{t('dash.spent')}</span>
        </div>
        <div className="mt-4 grid grid-cols-6 gap-2 sm:gap-4" dir="ltr">
          {trend.map((row, index) => {
            const active = row.month === currentMonth;
            return (
              <div key={row.month} title={`${monthShort(row.month)}: ${money(row.income)} / ${money(row.spent)}`} className={`flex flex-col items-center gap-2 rounded-xl px-0.5 pb-2 pt-1 ${active ? 'bg-surface' : ''}`}>
                <div className="flex h-32 w-full items-end justify-center gap-1 sm:gap-1.5">
                  {[['income', 'bg-ink'], ['spent', 'bg-[#b8b8be]']].map(([key, tone], bar) => (
                    <motion.div
                      key={key}
                      initial={calm ? false : { height: 0 }}
                      animate={{ height: `${Math.max(row[key] > 0 ? 3 : 0, (row[key] / peak) * 100)}%` }}
                      transition={{ duration: 0.6, delay: calm ? 0 : index * 0.05 + bar * 0.04, ease: [0.22, 1, 0.36, 1] }}
                      className={`w-3 rounded-t-md sm:w-5 ${tone}`}
                    />
                  ))}
                </div>
                <span className={`text-xs font-medium ${active ? 'text-ink' : 'text-muted'}`}>{monthShort(row.month)}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-3 flex items-baseline justify-between gap-3 border-t border-border pt-3 text-xs text-muted">
          <span>{t('dash.sixKept')}</span>
          <span className={`whitespace-nowrap text-sm font-bold tabular-nums ${kept < 0 ? 'text-red-600' : 'text-ink'}`}>{kept < 0 ? '- ' : ''}{money(Math.abs(kept))}</span>
        </p>
      </div>
    </Section>
  );
}
