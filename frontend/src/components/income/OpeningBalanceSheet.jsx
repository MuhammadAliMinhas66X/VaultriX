import { useState } from 'react';
import Combobox from '../Combobox.jsx';
import MoneyInput from '../MoneyInput.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { notify } from '../../i18n/notifications.js';
import { setOpeningBalance } from '../../services/receiptService.js';
import { todayInput } from '../../utils/dates.js';

const input = 'w-full rounded-lg border border-border px-3.5 py-2.5 text-base text-ink outline-none transition hover:border-ink/30 focus:border-accent focus:ring-2 focus:ring-accent/20 sm:text-sm';

function OpeningBalanceSheet({ opening, currency, currencies, onDone }) {
  const { t, tServer } = useTranslation();
  const has = Boolean(opening && opening.amount > 0);
  const [amount, setAmount] = useState(has ? String(opening.amount) : '');
  const [code, setCode] = useState(has && opening.currency ? opening.currency : currency);
  const [asOf, setAsOf] = useState(has && opening.asOf ? opening.asOf : `${todayInput().slice(0, 7)}-01`);
  const [busy, setBusy] = useState(false);

  const save = async (clear) => {
    setBusy(true);
    try {
      await setOpeningBalance(clear ? { amount: 0 } : { amount, currency: code, asOf });
      notify.success(t(clear ? 'balance.openingCleared' : 'balance.openingSaved'));
      onDone();
    } catch (error) {
      notify.error(tServer(error), { title: t('balance.openingFailed') });
    } finally {
      setBusy(false);
    }
  };

  const valid = Number(amount) > 0 && Boolean(code) && /^\d{4}-\d{2}-\d{2}$/.test(asOf);

  return (
    <div className="flex flex-col gap-5 p-5">
      <p className="text-sm text-muted">{t('balance.openingHelp')}</p>
      <div className="grid grid-cols-[1fr_auto] items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          {t('balance.openingAmount')}
          <MoneyInput value={amount} onChange={setAmount} className={input} placeholder="0.00" />
        </label>
        <div className="flex w-32 flex-col gap-1.5 text-sm font-medium text-ink sm:w-40">
          <span>{t('balance.openingCurrency')}</span>
          <Combobox items={currencies} ariaLabel={t('balance.openingCurrency')} value={code} onChange={setCode} />
        </div>
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        {t('balance.openingDate')}
        <input type="date" value={asOf} max={todayInput()} onChange={(event) => setAsOf(event.target.value)} className={input} />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {has ? (
          <button type="button" disabled={busy} onClick={() => save(true)} className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-surface disabled:opacity-50">
            {t('balance.openingClear')}
          </button>
        ) : (
          <span />
        )}
        <button type="button" disabled={busy || !valid} onClick={() => save(false)} className="rounded-xl bg-ink px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40">
          {t('balance.openingSave')}
        </button>
      </div>
    </div>
  );
}

export default OpeningBalanceSheet;
