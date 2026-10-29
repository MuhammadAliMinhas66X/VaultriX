import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import BrandMark from '../BrandMark.jsx';
import ErrorSlot from '../ErrorSlot.jsx';
import PaymentForm from './PaymentForm.jsx';
import PaymentsChart from './PaymentsChart.jsx';
import ProofSlot from './ProofSlot.jsx';
import { statusLabel, statusClass } from './loanStatus.js';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { notify } from '../../i18n/notifications.js';
import { dateOptions } from '../../utils/dates.js';
import { loanState } from '../../utils/loanMath.js';

function Detail({ label, children, wide = false }) {
  return (
    <div className={`min-w-0 ${wide ? 'col-span-2 sm:col-span-3' : ''}`}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-ink">{children}</dd>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-xs text-muted">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold tabular-nums tracking-tight text-ink sm:text-xl">{value}</p>
    </div>
  );
}

const iconButton =
  'flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-muted outline-none transition hover:border-ink/30 hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/40';

function LoanDetail({
  loan,
  currency,
  converted,
  onEdit,
  onDelete,
  onAddPayment,
  onDeletePayment,
  onUploadReceived,
  onRemoveReceived,
  onUploadPaymentProof,
  onRemovePaymentProof,
  paymentBusy,
  uploadingKey,
}) {
  const { t } = useTranslation();
  const { formatMoney, formatDate } = useFormat();
  const [confirming, setConfirming] = useState(false);
  const [paying, setPaying] = useState(false);
  const [confirmPaymentId, setConfirmPaymentId] = useState(null);

  const state = loanState(loan);
  const borrowed = loan.direction === 'borrowed';
  const money = (value) => formatMoney(value, { decimals: 0, currency: loan.currency });
  const day = (value) => formatDate(new Date(value), dateOptions);

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(loan.payoutNumber);
      notify.success(t('loans.copied'));
    } catch (error) {
      notify.error(t('loans.copyFailed'));
    }
  };

  const submitPayment = async (payload, file) => {
    const ok = await onAddPayment(payload, file);
    if (ok) setPaying(false);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white">
      <div className="flex items-start gap-4 p-5">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold tracking-tight text-ink">{loan.personName}</h2>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-ink">{borrowed ? t('loans.directionBorrowed') : t('loans.directionLent')}</span>
            <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(state)}`}>
              {state.done && <Check className="h-3 w-3" strokeWidth={2.5} />}
              {statusLabel(t, formatDate, loan, state)}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={onEdit} title={t('loans.edit')} aria-label={t('loans.edit')} className={iconButton}>
            <Pencil className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            title={t('loans.delete')}
            aria-label={t('loans.delete')}
            className={`${iconButton} hover:border-red-200 hover:bg-red-50 hover:text-red-600`}
          >
            <Trash2 className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {confirming && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-y border-red-100 bg-red-50 px-5 py-3">
              <span className="me-auto text-sm font-medium text-red-700">{t('loans.deleteAsk')}</span>
              <button type="button" onClick={() => setConfirming(false)} className="rounded-lg border border-red-200 bg-white px-3.5 py-2 text-sm font-medium text-ink transition hover:bg-surface">
                {t('common.cancel')}
              </button>
              <button type="button" onClick={onDelete} className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-red-700">
                <Trash2 className="h-4 w-4" /> {t('loans.delete')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ErrorSlot className="mx-5 mb-3" />

      <div className="mx-5 rounded-xl bg-surface px-4 py-4">
        <div className="grid grid-cols-3 gap-3">
          <Stat label={t('loans.statTotal')} value={money(loan.amount)} />
          <Stat label={t('loans.statPaid')} value={money(loan.paid)} />
          <Stat label={t('loans.statLeft')} value={money(loan.remaining)} />
        </div>
        {converted !== null && !state.done && (
          <p className="mt-3 text-xs tabular-nums text-muted">{t('income.approx', { amount: formatMoney(converted, { decimals: 0, currency }) })}</p>
        )}
      </div>

      <div className="flex flex-col gap-7 p-5">
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-ink">{t('loans.payments')}</h3>
            {state.done ? (
              <span className="flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-ink">
                <Check className="h-3 w-3" strokeWidth={2.5} /> {t('loans.paidInFull')}
              </span>
            ) : (
              !paying && (
                <button type="button" onClick={() => setPaying(true)} className="flex items-center gap-1.5 rounded-lg bg-ink px-3.5 py-2 text-sm font-medium text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent/40">
                  <Plus className="h-4 w-4" /> {t('loans.addPayment')}
                </button>
              )
            )}
          </div>

          <AnimatePresence initial={false}>
            {paying && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                <PaymentForm loan={loan} busy={paymentBusy} onCancel={() => setPaying(false)} onSubmit={submitPayment} />
              </motion.div>
            )}
          </AnimatePresence>

          <PaymentsChart loan={loan} />

          {loan.payments.length > 0 && (
            <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
              {loan.payments.map((payment) => (
                <li key={payment.id} className="flex flex-col gap-2 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold tabular-nums text-ink">{money(payment.amount)}</p>
                      <p className="truncate text-xs text-muted">
                        {day(payment.paidAt)}
                        {payment.note ? ` · ${payment.note}` : ''}
                      </p>
                    </div>
                    <ProofSlot
                      compact
                      proof={payment.proof}
                      uploading={uploadingKey === `payment:${payment.id}`}
                      onUpload={(file) => onUploadPaymentProof(payment.id, file)}
                      onRemove={() => onRemovePaymentProof(payment.id)}
                    />
                    <button
                      type="button"
                      onClick={() => setConfirmPaymentId(payment.id)}
                      title={t('loans.deletePayment')}
                      aria-label={t('loans.deletePayment')}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted outline-none transition hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-accent/40"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                  </div>
                  {confirmPaymentId === payment.id && (
                    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-red-50 px-3 py-2">
                      <span className="me-auto text-xs font-medium text-red-700">{t('loans.deletePaymentAsk')}</span>
                      <button type="button" onClick={() => setConfirmPaymentId(null)} className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-ink">
                        {t('common.cancel')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmPaymentId(null);
                          onDeletePayment(payment.id);
                        }}
                        className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white"
                      >
                        {t('loans.delete')}
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <dl className="grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-3">
          <Detail label={borrowed ? t('loans.sentDateBorrowed') : t('loans.sentDateLent')}>{day(loan.sentAt)}</Detail>
          <Detail label={t('loans.enteredLabel')}>{day(loan.createdAt)}</Detail>
          <Detail label={t('loans.dueLabel')}>{loan.dueAt ? day(loan.dueAt) : '-'}</Detail>
          <Detail label={borrowed ? t('loans.receivedBorrowedLabel') : t('loans.receivedLentLabel')} wide>
            {loan.receivedMethod ? (
              <span className="flex items-center gap-2">
                <BrandMark method={loan.receivedMethod} name={loan.receivedName} size="sm" />
                {loan.receivedMethod === 'cash' ? t('loans.cash') : loan.receivedName}
              </span>
            ) : (
              '-'
            )}
          </Detail>
          {loan.note && <Detail label={borrowed ? t('loans.noteLabelBorrowed') : t('loans.noteLabelLent')} wide>{loan.note}</Detail>}
        </dl>

        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-ink">{borrowed ? t('loans.payoutBorrowed') : t('loans.payoutLent')}</h3>
          {loan.payoutMethod ? (
            <dl className="grid grid-cols-1 gap-4 rounded-xl border border-border p-4 sm:grid-cols-3">
              <Detail label={t('loans.payoutName')}>{loan.payoutName}</Detail>
              <Detail label={t('loans.accountType')}>
                <span className="flex items-center gap-2">
                  <BrandMark method={loan.payoutMethod} name={loan.payoutInstitution} size="sm" />
                  {loan.payoutMethod === 'cash' ? t('loans.cash') : loan.payoutInstitution}
                </span>
              </Detail>
              <Detail label={t('loans.payoutNumber')}>
                <span className="flex items-center gap-2">
                  <span className="min-w-0 break-all tabular-nums">{loan.payoutNumber}</span>
                  {loan.payoutNumber && loan.payoutNumber !== '-' && (
                    <button type="button" onClick={copyNumber} title={t('loans.copy')} aria-label={t('loans.copy')} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted outline-none transition hover:bg-surface hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/40">
                      <Copy className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                  )}
                </span>
              </Detail>
            </dl>
          ) : (
            <p className="text-sm text-muted">{t('loans.notSet')}</p>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-ink">{borrowed ? t('loans.photoReceivedBorrowed') : t('loans.photoReceivedLent')}</h3>
          <ProofSlot proof={loan.receivedProof} uploading={uploadingKey === 'received'} onUpload={onUploadReceived} onRemove={onRemoveReceived} />
        </section>
      </div>
    </div>
  );
}

export default LoanDetail;
