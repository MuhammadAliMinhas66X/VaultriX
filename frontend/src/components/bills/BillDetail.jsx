import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Ban, Copy, CopyPlus, Pause, Pencil, Play, Plus, Repeat, RotateCcw, Share2, Trash2 } from 'lucide-react';
import BrandMark from '../BrandMark.jsx';
import ErrorSlot from '../ErrorSlot.jsx';
import BillPayForm from './BillPayForm.jsx';
import { StatusBadge, FREQUENCY_KEY } from './BillStatus.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { notify } from '../../i18n/notifications.js';
import { dateOptions } from '../../utils/dates.js';
import { billStatus, isPastDue } from '../../utils/billMath.js';

function Detail({ label, children, wide = false }) {
  return (
    <div className={`min-w-0 ${wide ? 'col-span-2 sm:col-span-3' : ''}`}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-ink">{children}</dd>
    </div>
  );
}

const iconButton =
  'flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-muted outline-none transition hover:border-ink/30 hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/40';
const textButton =
  'flex items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-3.5 py-2 text-sm font-medium text-ink outline-none transition hover:bg-surface focus-visible:ring-2 focus-visible:ring-accent/40';

function Confirm({ message, confirmLabel, onCancel, onConfirm, tone = 'danger' }) {
  const { t } = useTranslation();
  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 ${tone === 'danger' ? 'bg-red-50' : 'bg-surface'}`}>
      <span className={`me-auto text-sm font-medium ${tone === 'danger' ? 'text-red-700' : 'text-ink'}`}>{message}</span>
      <button type="button" onClick={onCancel} className="rounded-lg border border-border bg-white px-3.5 py-2 text-sm font-medium text-ink transition hover:bg-surface">
        {t('common.cancel')}
      </button>
      <button type="button" onClick={onConfirm} className={`rounded-lg px-3.5 py-2 text-sm font-medium text-white transition ${tone === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-ink hover:opacity-90'}`}>
        {confirmLabel}
      </button>
    </div>
  );
}

function BillDetail({ bill, today, categoryName, siblings, paymentBusy, autoPay, onEdit, onShare, onPay, onDeletePayment, onToggleCancel, onDelete, onRecurring, onOpenBill, onAddSimilar }) {
  const { t } = useTranslation();
  const { formatMoney, formatDate } = useFormat();
  const [paying, setPaying] = useState(Boolean(autoPay));
  const [confirm, setConfirm] = useState(null);
  const [paymentToDelete, setPaymentToDelete] = useState(null);

  const status = billStatus(bill, today);
  const open = status !== 'paid' && status !== 'cancelled';
  const money = (value) => formatMoney(value, { decimals: 2, currency: bill.currency });
  const day = (value) => formatDate(new Date(value), dateOptions);
  const progress = bill.total > 0 ? Math.min(100, (bill.paid / bill.total) * 100) : 0;
  const recurring = bill.frequency !== 'none';
  const sourceText = bill.payMethod ? (bill.payMethod === 'cash' ? t('loans.cash') : bill.payName) : '';

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(bill.billerAccount);
      notify.success(t('loans.copied'));
    } catch (error) {
      notify.error(t('loans.copyFailed'));
    }
  };

  const submitPayment = async (payload) => {
    const ok = await onPay(payload);
    if (ok) setPaying(false);
  };

  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-white">
      <div className="flex items-start gap-4 p-5">
        <BrandMark method="biller" name={bill.billerName} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold tracking-tight text-ink">{bill.billerName}</h2>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <StatusBadge status={status} pastDue={isPastDue(bill, today)} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={onShare} title={t('bills.share')} aria-label={t('bills.share')} className={iconButton}>
            <Share2 className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>
          <button type="button" onClick={onAddSimilar} title={t('bills.addSimilar')} aria-label={t('bills.addSimilar')} className={iconButton}>
            <CopyPlus className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>
          <button type="button" onClick={onEdit} title={t('loans.edit')} aria-label={t('loans.edit')} className={iconButton}>
            <Pencil className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <ErrorSlot className="mx-5 mb-3" />

      <div className="mx-5 rounded-xl bg-surface px-4 py-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted">{t('bills.total')}</p>
            <p className="mt-1 whitespace-nowrap text-[13px] font-semibold tabular-nums text-ink sm:text-base">{money(bill.total)}</p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted">{t('bills.paid')}</p>
            <p className="mt-1 whitespace-nowrap text-[13px] font-semibold tabular-nums text-ink sm:text-base">{money(bill.paid)}</p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted">{t('bills.remaining')}</p>
            <p className="mt-1 whitespace-nowrap text-[13px] font-bold tabular-nums text-ink sm:text-base">{money(bill.remaining)}</p>
          </div>
        </div>
        {bill.paid > 0 && (
          <span className="mt-3 block h-1.5 w-full overflow-hidden rounded-full bg-border/70">
            <span style={{ width: `${progress}%` }} className="block h-full rounded-full bg-ink transition-[width] duration-500" />
          </span>
        )}
      </div>

      <div className="flex flex-col gap-7 p-5">
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-ink">{t('bills.payments')}</h3>
            {open && !paying && (
              <button type="button" onClick={() => setPaying(true)} className="flex items-center gap-1.5 rounded-lg bg-ink px-3.5 py-2 text-sm font-medium text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent/40">
                <Plus className="h-4 w-4" /> {t('bills.addPayment')}
              </button>
            )}
          </div>

          <AnimatePresence initial={false}>
            {paying && open && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                <BillPayForm bill={bill} busy={paymentBusy} onCancel={() => setPaying(false)} onSubmit={submitPayment} />
              </motion.div>
            )}
          </AnimatePresence>

          {bill.payments.length === 0 ? (
            <p className="text-sm text-muted">{t('bills.noPayments')}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
              {bill.payments.map((payment) => (
                <li key={payment.id} className="flex flex-col gap-2 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold tabular-nums text-ink">{money(payment.amount)}</p>
                      <p className="truncate text-xs text-muted">
                        {[day(payment.paidAt), payment.payMethod ? (payment.payMethod === 'cash' ? t('loans.cash') : payment.payName) : '', payment.note].filter(Boolean).join(' · ')}
                      </p>
                      <p className="truncate text-[11px] text-muted">{t('bills.recordedOn', { date: day(payment.createdAt) })}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPaymentToDelete(payment.id)}
                      title={t('bills.deletePayment')}
                      aria-label={t('bills.deletePayment')}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted outline-none transition hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-accent/40"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                  </div>
                  {paymentToDelete === payment.id && (
                    <Confirm
                      message={t('bills.deletePaymentAsk')}
                      confirmLabel={t('loans.delete')}
                      onCancel={() => setPaymentToDelete(null)}
                      onConfirm={() => {
                        setPaymentToDelete(null);
                        onDeletePayment(payment.id);
                      }}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <dl className="grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-3">
          <Detail label={t('bills.dueDateLabel')}>{day(bill.dueAt)}</Detail>
          <Detail label={t('bills.periodLabel')}>{bill.periodStart && bill.periodEnd ? `${day(bill.periodStart)} - ${day(bill.periodEnd)}` : '-'}</Detail>
          <Detail label={t('bills.typeLabel')}>{categoryName}</Detail>
          <Detail label={t('bills.amountLabel')}>{money(bill.amount)}</Detail>
          {bill.installation > 0 && <Detail label={t('bills.installationLabel')}>{money(bill.installation)}</Detail>}
          <Detail label={t('bills.sourceLabel')}>{sourceText || '-'}</Detail>
          <Detail label={t('bills.accountLabel')} wide>
            {bill.billerAccount ? (
              <span className="flex items-center gap-2">
                <span className="min-w-0 break-all tabular-nums">{bill.billerAccount}</span>
                <button type="button" onClick={copyNumber} title={t('loans.copy')} aria-label={t('loans.copy')} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted outline-none transition hover:bg-surface hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/40">
                  <Copy className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </span>
            ) : (
              '-'
            )}
          </Detail>
          <Detail label={t('bills.enteredLabel')}>{day(bill.createdAt)}</Detail>
          {bill.note && <Detail label={t('bills.noteLabel')} wide>{bill.note}</Detail>}
        </dl>

        {recurring && (
          <section className="flex flex-col gap-3 rounded-xl border border-border p-4">
            <div className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-ink" strokeWidth={1.75} />
              <h3 className="text-sm font-semibold text-ink">{t('bills.recurringTitle')}</h3>
              {bill.seriesState === 'paused' && <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-muted">{t('bills.paused')}</span>}
            </div>
            <p className="text-sm text-muted">{t('bills.recurringEvery', { frequency: t(FREQUENCY_KEY[bill.frequency]).toLowerCase() })}</p>
            {bill.isHead && bill.nextBillAt && bill.seriesState === 'active' && <p className="text-sm font-medium text-ink">{t('bills.recurringNext', { date: day(bill.nextBillAt) })}</p>}
            {bill.isHead ? (
              <div className="flex flex-wrap gap-2">
                {bill.seriesState === 'active' ? (
                  <button type="button" onClick={() => onRecurring('pause')} className={textButton}>
                    <Pause className="h-4 w-4" /> {t('bills.pause')}
                  </button>
                ) : (
                  <button type="button" onClick={() => onRecurring('resume')} className={textButton}>
                    <Play className="h-4 w-4" /> {t('bills.resume')}
                  </button>
                )}
                <button type="button" onClick={() => setConfirm('stop')} className={textButton}>
                  <Ban className="h-4 w-4" /> {t('bills.stopRepeating')}
                </button>
              </div>
            ) : (
              <p className="text-xs text-muted">{t('bills.repeatLockedNote')}</p>
            )}
            {confirm === 'stop' && (
              <Confirm
                tone="neutral"
                message={t('bills.stopAsk')}
                confirmLabel={t('bills.stopRepeating')}
                onCancel={() => setConfirm(null)}
                onConfirm={() => {
                  setConfirm(null);
                  onRecurring('stop');
                }}
              />
            )}
          </section>
        )}

        {siblings.length > 0 && (
          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-ink">{t('bills.occurrences')}</h3>
            <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
              {siblings.map((other) => (
                <li key={other.id}>
                  <button type="button" onClick={() => onOpenBill(other.id)} className="flex w-full items-center gap-3 px-4 py-3 text-start outline-none transition hover:bg-surface/60 focus-visible:bg-surface/60">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{day(other.dueAt)}</span>
                    <span className="shrink-0 text-sm tabular-nums text-muted">{formatMoney(other.total, { decimals: 2, currency: other.currency })}</span>
                    <span className="flex shrink-0 gap-1.5">
                      <StatusBadge status={billStatus(other, today)} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="flex flex-col gap-3 border-t border-border pt-5">
          <div className="flex flex-wrap gap-2">
            {bill.cancelledAt ? (
              <button type="button" onClick={onToggleCancel} className={textButton}>
                <RotateCcw className="h-4 w-4" /> {t('bills.reopen')}
              </button>
            ) : (
              status !== 'paid' && (
                <button type="button" onClick={() => setConfirm('cancel')} className={textButton}>
                  <Ban className="h-4 w-4" /> {t('bills.cancelBill')}
                </button>
              )
            )}
            {bill.payments.length === 0 && (
              <button type="button" onClick={() => setConfirm('delete')} className="flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium text-red-600 outline-none transition hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-accent/40">
                <Trash2 className="h-4 w-4" /> {t('loans.delete')}
              </button>
            )}
          </div>
          {confirm === 'cancel' && (
            <Confirm
              tone="neutral"
              message={t('bills.cancelAsk')}
              confirmLabel={t('bills.cancelBill')}
              onCancel={() => setConfirm(null)}
              onConfirm={() => {
                setConfirm(null);
                onToggleCancel();
              }}
            />
          )}
          {confirm === 'delete' && (
            <Confirm
              message={t('bills.deleteAsk')}
              confirmLabel={t('loans.delete')}
              onCancel={() => setConfirm(null)}
              onConfirm={() => {
                setConfirm(null);
                onDelete();
              }}
            />
          )}
        </section>
      </div>
    </div>
  );
}

export default BillDetail;
