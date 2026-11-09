import { motion } from 'framer-motion';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { useAppReducedMotion } from '../../hooks/useMotionPreference.js';
import { dateOptions } from '../../utils/dates.js';

const SHADES = ['#111114', '#3a3a42', '#55555c', '#76767d', '#97979d'];

// One bar for the whole loan. Every payment is a slice sized by its amount, in
// the order it was paid; what is still owed is the pale slice at the end. It
// reads the same whether the payments came on one day or over months.
function PaymentBar({ loan }) {
  const { t } = useTranslation();
  const { formatMoney, formatDate } = useFormat();
  const reduced = useAppReducedMotion();
  const money = (value) => formatMoney(value, { decimals: 0, maxDecimals: 4, currency: loan.currency });
  const total = loan.amount > 0 ? loan.amount : 1;
  const paid = Math.min(loan.amount, loan.payments.reduce((sum, item) => sum + item.amount, 0));
  const left = Math.max(0, loan.amount - paid);
  const slices = loan.payments.map((payment, index) => ({
    key: payment.id || index,
    amount: payment.amount,
    share: Math.max(0.012, Math.min(1, payment.amount / total)),
    shade: SHADES[Math.min(index, SHADES.length - 1)],
    date: formatDate(new Date(payment.paidAt), { ...dateOptions, timeZone: 'UTC' }),
    number: index + 1,
  }));

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-4 sm:p-5" role="img" aria-label={t('loans.paidOf', { paid: money(paid), total: money(loan.amount) })}>
      <div className="grid grid-cols-3 gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{t('loans.statPaid')}</p>
          <p className="mt-1 break-words text-base font-bold leading-tight tabular-nums text-ink sm:text-2xl">{money(paid)}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{t('loans.statLeft')}</p>
          <p className="mt-1 break-words text-base font-bold leading-tight tabular-nums text-ink sm:text-2xl">{money(left)}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{t('loans.statTotal')}</p>
          <p className="mt-1 break-words text-base font-bold leading-tight tabular-nums text-muted sm:text-2xl">{money(loan.amount)}</p>
        </div>
      </div>

      <div className="flex h-9 w-full gap-[3px] overflow-hidden rounded-xl">
        {slices.map((slice, index) => (
          <motion.div
            key={slice.key}
            title={`#${slice.number} · ${money(slice.amount)} · ${slice.date}`}
            initial={reduced ? false : { opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.45, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
            style={{ flexGrow: slice.share, flexBasis: 0, backgroundColor: slice.shade, transformOrigin: 'left center' }}
            className="flex min-w-[6px] items-center justify-center text-[11px] font-semibold tabular-nums text-white"
          >
            <span className="truncate px-1">{slice.share > 0.2 ? money(slice.amount) : ''}</span>
          </motion.div>
        ))}
        {left > 0 && (
          <div
            title={`${t('loans.statLeft')} · ${money(left)}`}
            style={{ flexGrow: left / total, flexBasis: 0, backgroundImage: 'repeating-linear-gradient(135deg, #e5e5e7 0 6px, #f1f1f2 6px 12px)' }}
            className="min-w-[6px]"
          />
        )}
      </div>
    </div>
  );
}

export default PaymentBar;
