import { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import MoneyInput from '../MoneyInput.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { notify } from '../../i18n/notifications.js';
import { useResource } from '../../data/useResource.js';
import { createReceipt, updateReceipt, deleteReceipt } from '../../services/receiptService.js';
import { receiptAmounts } from '../../utils/balanceMath.js';
import { dateOptions, todayInput } from '../../utils/dates.js';

const input = 'w-full rounded-lg border border-border px-3.5 py-2.5 text-base text-ink outline-none transition hover:border-ink/30 focus:border-accent focus:ring-2 focus:ring-accent/20 sm:text-sm';
const NONE = [];

function ReceiptForm({ stream, receipt, onCancel, onDone }) {
  const { t, tServer } = useTranslation();
  const [amount, setAmount] = useState(receipt ? String(receipt.amount) : stream.expectedAmount ? String(stream.expectedAmount) : '');
  const [date, setDate] = useState(receipt ? receipt.receivedAt.slice(0, 10) : todayInput());
  const [note, setNote] = useState(receipt ? receipt.note : '');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (receipt) await updateReceipt(receipt.id, { amount, receivedAt: date, note });
      else await createReceipt({ streamId: stream.id, amount, receivedAt: date, note, currency: stream.currency });
      notify.success(t('receipts.saved'));
      onDone();
    } catch (error) {
      notify.error(tServer(error), { title: t('receipts.saveFailed') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">
          {t('receipts.amount')} ({stream.currency})
          <MoneyInput value={amount} onChange={setAmount} className={input} placeholder="0.00" />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">
          {t('receipts.date')}
          <input type="date" value={date} max={todayInput()} onChange={(event) => setDate(event.target.value)} className={input} />
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-xs font-medium text-muted">
        {t('receipts.note')}
        <input type="text" value={note} maxLength={200} onChange={(event) => setNote(event.target.value)} placeholder={t('receipts.notePlaceholder')} className={input} />
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg border border-border bg-white px-3.5 py-2 text-sm font-medium text-ink transition hover:bg-surface">
          {t('common.cancel')}
        </button>
        <button type="submit" disabled={busy || !(Number(amount) > 0) || !date} className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40">
          {t('receipts.save')}
        </button>
      </div>
    </form>
  );
}

// Every payment that really came in from this stream. The Dashboard balance and
// the Income overview are built from these same records.
function ReceiptsPanel({ stream }) {
  const { t, tServer } = useTranslation();
  const { formatMoney, formatDate } = useFormat();
  const resource = useResource('receipts');
  const [mode, setMode] = useState(null); // null | { receipt } for edit | {} for new
  const [confirmId, setConfirmId] = useState(null);

  const list = useMemo(() => (resource.data ? resource.data.receipts : NONE).filter((item) => item.streamId === stream.id), [resource.data, stream.id]);
  const gross = useMemo(() => list.reduce((sum, item) => sum + item.amount, 0), [list]);
  const net = useMemo(() => list.reduce((sum, item) => sum + receiptAmounts(item, stream).net, 0), [list, stream]);
  const deducted = Math.abs(gross - net) > 0.005;

  const remove = async (id) => {
    try {
      await deleteReceipt(id);
      notify.success(t('receipts.deleted'));
    } catch (error) {
      notify.error(tServer(error), { title: t('receipts.deleteFailed') });
    } finally {
      setConfirmId(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">{t('receipts.title')}</h3>
          <p className="mt-1 text-xs text-muted">
            {t('receipts.totalReceived')}: <span className="font-semibold tabular-nums text-ink">{formatMoney(net, { decimals: 2, currency: stream.currency })}</span>
            {deducted ? ` · ${t('income.afterDeductions')}` : ''}
          </p>
        </div>
        {!mode && (
          <button type="button" onClick={() => setMode({})} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-ink px-3.5 py-2 text-sm font-medium text-white transition hover:opacity-90">
            <Plus className="h-4 w-4" /> {t('receipts.add')}
          </button>
        )}
      </div>

      {mode && <ReceiptForm stream={stream} receipt={mode.receipt} onCancel={() => setMode(null)} onDone={() => setMode(null)} />}

      {list.length === 0 && !mode ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-5 text-sm text-muted">{t('receipts.empty')}</p>
      ) : (
        <ul className="overflow-hidden rounded-xl border border-border">
          {list.map((item) => {
            const amounts = receiptAmounts(item, stream);
            return (
              <li key={item.id} className="border-b border-border bg-white last:border-b-0">
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="whitespace-nowrap text-sm font-medium text-ink">{formatDate(new Date(item.receivedAt), dateOptions)}</span>
                    <span className="flex shrink-0 gap-1">
                      <button type="button" onClick={() => setMode({ receipt: item })} aria-label={t('income.edit')} title={t('income.edit')} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted outline-none transition hover:bg-surface hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/40">
                        <Pencil className="h-4 w-4" strokeWidth={1.75} />
                      </button>
                      <button type="button" onClick={() => setConfirmId(confirmId === item.id ? null : item.id)} aria-label={t('income.delete')} title={t('income.delete')} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted outline-none transition hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-accent/40">
                        <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                      </button>
                    </span>
                  </div>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    <span className="whitespace-nowrap text-base font-semibold tabular-nums text-ink">{formatMoney(amounts.gross, { decimals: 2, currency: item.currency })}</span>
                    {Math.abs(amounts.gross - amounts.net) > 0.005 && (
                      <span className="text-xs tabular-nums text-muted">
                        <span className="whitespace-nowrap">{formatMoney(amounts.net, { decimals: 2, currency: item.currency })}</span> {t('income.afterDeductions')}
                      </span>
                    )}
                  </div>
                  {item.note && <p className="mt-1 break-words text-xs text-muted">{item.note}</p>}
                </div>
                {confirmId === item.id && (
                  <div className="flex flex-wrap items-center gap-3 border-t border-red-100 bg-red-50 px-4 py-2.5">
                    <span className="me-auto text-sm font-medium text-red-700">{t('receipts.deleteAsk')}</span>
                    <button type="button" onClick={() => setConfirmId(null)} className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-surface">{t('common.cancel')}</button>
                    <button type="button" onClick={() => remove(item.id)} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-700">{t('income.delete')}</button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default ReceiptsPanel;
