import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import Button from '../Button.jsx';
import FormField from '../FormField.jsx';
import MoneyInput from '../MoneyInput.jsx';
import Combobox from '../Combobox.jsx';
import FieldError from '../FieldError.jsx';
import ErrorSlot from '../ErrorSlot.jsx';
import BrandMark from '../BrandMark.jsx';
import WherePicker from '../loans/WherePicker.jsx';
import NewCategorySheet from './NewCategorySheet.jsx';
import { CategoryIcon } from '../expenses/categoryIcons.jsx';
import { FREQUENCY_KEY } from './BillStatus.jsx';
import { splitKey, isOtherKey, keyFor, customFor } from '../loans/loanOptions.js';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';
import { BILLERS, billerById } from '../../utils/billers.js';
import { FREQUENCIES } from '../../utils/billMath.js';
import { addPeriods, addDaysKey, toDate } from '../../utils/billDates.js';
import { readBillerPrefs, readRecent } from '../../utils/billPrefs.js';
import { todayInput, dateOptions } from '../../utils/dates.js';

const GROUP_KEY = {
  electricity: 'bills.groupElectricity',
  gas: 'bills.groupGas',
  water: 'bills.groupWater',
  internet: 'bills.groupInternet',
  mobile: 'bills.groupMobile',
  insurance: 'bills.groupInsurance',
  government: 'bills.groupGovernment',
  other: 'bills.groupOther',
};

const DESC_KEY = {
  none: 'bills.descNone',
  daily: 'bills.descDaily',
  weekly: 'bills.descWeekly',
  monthly: 'bills.descMonthly',
  quarterly: 'bills.descQuarterly',
  yearly: 'bills.descYearly',
};

const QUICK_DAYS = [0, 7, 15, 30];
const LEAD = { daily: 0, weekly: 5, monthly: 5, quarterly: 5, yearly: 5 };
const OTHER = '__other__';
const day = (value) => (value ? String(value).slice(0, 10) : '');

export const emptyBillForm = (currency, last = {}, categories = []) => ({
  billerKey: '',
  billerName: '',
  categoryId: '',
  amount: '',
  currency: last.currency || currency,
  dueAt: '',
  periodStart: '',
  periodEnd: '',
  frequency: FREQUENCIES.includes(last.frequency) ? last.frequency : 'none',
  nextBill: '',
  installation: '',
  payKey: last.payKey || '',
  payCustom: last.payCustom || '',
  account: '',
  note: '',
});

export const formFromBill = (bill) => {
  const known = billerById(bill.billerId);
  const isKnown = known && known.name === bill.billerName;
  return {
    billerKey: isKnown ? known.id : OTHER,
    billerName: isKnown ? '' : bill.billerName,
    categoryId: bill.categoryId || '',
    amount: String(bill.amount),
    currency: bill.currency,
    dueAt: day(bill.dueAt),
    periodStart: day(bill.periodStart),
    periodEnd: day(bill.periodEnd),
    frequency: bill.frequency,
    nextBill: day(bill.nextBillAt),
    installation: bill.installation > 0 ? String(bill.installation) : '',
    payKey: keyFor(bill.payMethod, bill.payName),
    payCustom: customFor(bill.payMethod, bill.payName),
    account: bill.billerAccount || '',
    note: bill.note || '',
  };
};

function Section({ title, children }) {
  return (
    <section className="flex min-w-0 flex-col gap-4">
      {title && <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{title}</h3>}
      {children}
    </section>
  );
}

function Label({ children, optional }) {
  const { t } = useTranslation();
  return (
    <span className="text-sm font-medium text-ink">
      {children}
      {optional && <span className="font-normal text-muted"> ({t('loans.optional')})</span>}
    </span>
  );
}

const prefKey = (billerId, name) => billerId || (name ? `c:${name.trim().toLowerCase()}` : '');

function BillForm({ initial, mode, bill, categories, currencies, preferredCurrencies = [], onSubmit, onCancel, busy, onAddCategory }) {
  const { t } = useTranslation();
  const { formatDate } = useFormat();
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [moreOpen, setMoreOpen] = useState(() => mode === 'edit' && Boolean(initial.installation || initial.account));
  const [sheet, setSheet] = useState(null);
  const [filledFrom, setFilledFrom] = useState('');
  const [paidNow, setPaidNow] = useState(false);
  const touched = useRef(new Set());
  const rootRef = useRef(null);
  const again = useRef(false);

  const locked = mode === 'edit' && bill.payments.length > 0;
  const lockRepeat = mode === 'edit' && bill.frequency !== 'none' && !bill.isHead;
  const allowInstallation = mode === 'add' || bill.sequence === 1;
  const recurring = form.frequency !== 'none';
  const today = todayInput();
  const recent = useMemo(() => (mode === 'add' ? readRecent().slice(0, 6) : []), [mode]);

  useEffect(() => {
    if (mode === 'add') rootRef.current?.scrollIntoView({ block: 'start' });
  }, [mode]);

  const billerItems = useMemo(
    () => [
      ...BILLERS.map((biller) => ({ value: biller.id, label: biller.name, icon: <BrandMark method="biller" name={biller.name} size="sm" />, group: t(GROUP_KEY[biller.group]) })),
      { value: OTHER, label: t('bills.billerOther'), icon: <BrandMark method="biller" size="sm" />, group: t(GROUP_KEY.other) },
    ],
    [t]
  );

  const categoryItems = useMemo(
    () => categories.map((category) => ({ value: category.id, label: category.name, icon: <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface text-ink"><CategoryIcon category={category} className="h-4 w-4" /></span> })),
    [categories]
  );

  const currencyItems = useMemo(() => {
    const mine = new Set([...preferredCurrencies, form.currency].filter(Boolean));
    const first = currencies.filter((item) => mine.has(item.value)).map((item) => ({ ...item, group: t('bills.yourCurrencies') }));
    const rest = currencies.filter((item) => !mine.has(item.value)).map((item) => ({ ...item, group: first.length ? t('bills.otherCurrencies') : undefined }));
    return [...first, ...rest];
  }, [currencies, preferredCurrencies, form.currency, t]);

  const frequencyItems = useMemo(() => FREQUENCIES.map((value) => ({ value, label: t(FREQUENCY_KEY[value]), sub: t(DESC_KEY[value]) })), [t]);

  const set = (key) => (value) => {
    touched.current.add(key);
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev));
  };

  // Fill what the user has not typed yet from the last bill for this company.
  const applyBiller = (key, customName = '') => {
    setErrors((prev) => ({ ...prev, biller: '' }));
    const known = billerById(key);
    const prefs = mode === 'add' ? readBillerPrefs(prefKey(known ? known.id : '', customName)) : null;
    setForm((prev) => {
      const next = { ...prev, billerKey: key };
      if (key === OTHER && customName) next.billerName = customName;
      if (!prefs) return next;
      const keep = (field) => touched.current.has(field);
      if (!keep('categoryId') && categories.some((category) => category.id === prefs.categoryId)) next.categoryId = prefs.categoryId;
      if (!keep('amount') && prefs.amount) next.amount = String(prefs.amount);
      if (!keep('currency') && prefs.currency) next.currency = prefs.currency;
      if (!keep('account') && prefs.account) next.account = prefs.account;
      if (!keep('installation') && prefs.installation) next.installation = String(prefs.installation);
      if (!keep('frequency') && FREQUENCIES.includes(prefs.frequency)) next.frequency = prefs.frequency;
      if (!keep('payKey') && prefs.payKey) {
        next.payKey = prefs.payKey;
        next.payCustom = prefs.payCustom || '';
      }
      return next;
    });
    setFilledFrom(prefs ? (known ? known.name : customName) : '');
  };

  const nextDates = useMemo(() => {
    if (!recurring || !form.dueAt) return [];
    return [1, 2, 3].map((step) => addPeriods(form.dueAt, form.frequency, step));
  }, [recurring, form.dueAt, form.frequency]);
  const fmt = (key) => (key ? formatDate(toDate(key), { ...dateOptions, timeZone: 'UTC' }) : '');
  const lead = LEAD[form.frequency] || 0;

  const submit = (event) => {
    event.preventDefault();
    const found = {};
    const known = billerById(form.billerKey);
    const billerName = known ? known.name : form.billerName.trim();
    if (!billerName) found.biller = t('bills.errBiller');
    if (!form.amount || !(Number(form.amount) > 0)) found.amount = t('loans.errAmount');
    if (!form.currency) found.currency = t('income.errCurrency');
    if (!form.dueAt) found.dueAt = t('bills.errDue');
    if (form.installation && !(Number(form.installation) >= 0)) found.installation = t('loans.errAmount');
    if (isOtherKey(form.payKey) && !form.payCustom.trim()) found.payCustom = t('loans.errOther');
    setErrors(found);
    if (Object.keys(found).length) {
      if (found.installation) setMoreOpen(true);
      return;
    }
    const where = splitKey(form.payKey, form.payCustom);
    const payload = {
      billerName,
      billerId: known ? known.id : '',
      categoryId: form.categoryId || null,
      amount: Number(form.amount),
      currency: form.currency,
      dueAt: form.dueAt,
      billerAccount: form.account.trim(),
      payMethod: where.method,
      payName: where.name,
      note: form.note.trim(),
    };
    if (allowInstallation) payload.installation = form.installation ? Number(form.installation) : 0;
    if (!lockRepeat) payload.frequency = form.frequency;
    const wantsAnother = again.current;
    again.current = false;
    onSubmit(payload, { ...form, billerName, billerId: known ? known.id : '', prefKey: prefKey(known ? known.id : '', billerName) }, wantsAnother, mode === 'add' && paidNow);
  };

  const missingBiller = !form.billerKey && errors.biller;

  return (
    <form ref={rootRef} onSubmit={submit} noValidate className="flex min-w-0 flex-col gap-7 rounded-2xl border border-border bg-white p-4 sm:p-6">
      {recent.length > 0 && (
        <div className="flex min-w-0 flex-col gap-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{t('bills.recentLabel')}</p>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
            {recent.map((item) => {
              const known = billerById(item.key);
              const name = known ? known.name : item.name;
              const active = known ? form.billerKey === known.id : form.billerKey === OTHER && form.billerName === name;
              return (
                <button
                  key={`${item.key}|${item.name}`}
                  type="button"
                  aria-pressed={active}
                  onClick={() => applyBiller(known ? known.id : OTHER, known ? '' : name)}
                  className={`flex shrink-0 items-center gap-2 rounded-full border py-1.5 pe-3.5 ps-1.5 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-accent/40 ${active ? 'border-ink bg-ink text-white' : 'border-border bg-white text-ink hover:border-ink/40'}`}
                >
                  <BrandMark method="biller" name={name} size="sm" />
                  <span className="max-w-[9rem] truncate">{name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Section>
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label>{t('bills.billerLabel')}</Label>
            <Combobox items={billerItems} ariaLabel={t('bills.billerLabel')} placeholder={t('bills.billerPlaceholder')} searchPlaceholder={t('common.search')} value={form.billerKey} onChange={(key) => applyBiller(key)} error={missingBiller ? errors.biller : undefined} />
            {filledFrom && <p className="text-xs text-muted">{t('bills.autofilled', { name: filledFrom })}</p>}
          </div>
          {form.billerKey === OTHER && (
            <FormField label={t('bills.billerNameLabel')} value={form.billerName} maxLength={60} onChange={(event) => set('billerName')(event.target.value)} placeholder={t('bills.billerNamePlaceholder')} error={errors.biller} />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="bill-amount" className="text-sm font-medium text-ink">{t('bills.amountLabel')}</label>
          <div className="flex items-end gap-3">
            <MoneyInput
              id="bill-amount"
              value={form.amount}
              onChange={set('amount')}
              placeholder="0"
              className="min-w-0 flex-1 border-b-2 border-border bg-transparent pb-2 text-[2.25rem] font-bold leading-none tracking-tight tabular-nums text-ink outline-none transition placeholder:text-border focus:border-ink"
            />
            <div className="w-36 shrink-0">
              <Combobox items={currencyItems} ariaLabel={t('income.currencyLabel')} placeholder={t('income.currencyPlaceholder')} searchPlaceholder={t('common.search')} value={form.currency} onChange={locked ? () => null : set('currency')} />
            </div>
          </div>
          <FieldError>{errors.amount || errors.currency}</FieldError>
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <Label optional>{t('bills.categoryLabel')}</Label>
          <Combobox
            items={categoryItems}
            ariaLabel={t('bills.categoryLabel')}
            placeholder={t('bills.categoryPlaceholder')}
            searchPlaceholder={t('bills.categorySearch')}
            value={form.categoryId}
            onChange={set('categoryId')}
            footer={{
              icon: <Plus className="h-4 w-4" strokeWidth={2.5} />,
              label: t('bills.newCategory'),
              labelWithQuery: (name) => t('bills.newCategoryNamed', { name }),
              onClick: (name) => setSheet({ name }),
            }}
          />
        </div>
      </Section>

      <Section>
        <div className="flex min-w-0 flex-col gap-2.5">
          <FormField label={t('bills.dueDateLabel')} type="date" value={form.dueAt} onChange={(event) => set('dueAt')(event.target.value)} error={errors.dueAt} />
          <div className="flex flex-wrap gap-2">
            {QUICK_DAYS.map((days) => {
              const key = addDaysKey(today, days);
              return (
                <button
                  key={days}
                  type="button"
                  aria-pressed={form.dueAt === key}
                  onClick={() => set('dueAt')(key)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-accent/40 ${form.dueAt === key ? 'border-ink bg-ink text-white' : 'border-border bg-white text-muted hover:border-ink/30 hover:text-ink'}`}
                >
                  {days === 0 ? t('bills.quickToday') : t('bills.quickDays', { count: days })}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <Label>{t('bills.repeatLabel')}</Label>
          {lockRepeat ? (
            <p className="text-sm text-muted">{t(FREQUENCY_KEY[form.frequency])} · {t('bills.repeatLockedNote')}</p>
          ) : (
            <Combobox items={frequencyItems} searchable={false} ariaLabel={t('bills.repeatLabel')} value={form.frequency} onChange={set('frequency')} />
          )}
          {recurring && !lockRepeat && (
            <div className="flex flex-col gap-2 rounded-xl bg-surface px-3.5 py-3">
              {nextDates.length > 0 ? (
                <>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{t('bills.nextDates')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {nextDates.map((key) => (
                      <span key={key} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium tabular-nums text-ink ring-1 ring-border">{fmt(key)}</span>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-[13px] text-muted">{t('bills.pickDueFirst')}</p>
              )}
              <p className="text-xs leading-snug text-muted">{lead > 0 ? t('bills.appearsBefore', { count: lead }) : t('bills.appearsOnDay')}</p>
            </div>
          )}
        </div>
      </Section>

      <Section>
        <WherePicker
          optional
          label={<Label optional>{t('bills.sourceLabel')}</Label>}
          value={form.payKey}
          custom={form.payCustom}
          onChange={set('payKey')}
          onCustomChange={set('payCustom')}
          customError={errors.payCustom}
        />
        {mode === 'add' && (
          <button
            type="button"
            role="switch"
            aria-checked={paidNow}
            onClick={() => setPaidNow((prev) => !prev)}
            className="flex items-center justify-between gap-4 rounded-xl border border-border px-4 py-3 text-start outline-none transition hover:border-ink/30 focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            <span className="min-w-0">
              <span className="block text-sm font-medium text-ink">{t('bills.paidNowLabel')}</span>
              <span className="block text-xs text-muted">{t('bills.paidNowHint')}</span>
            </span>
            <span className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${paidNow ? 'bg-ink' : 'bg-border'}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${paidNow ? 'start-[1.125rem]' : 'start-0.5'}`} />
            </span>
          </button>
        )}
      </Section>

      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => setMoreOpen((prev) => !prev)}
          aria-expanded={moreOpen}
          className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-border px-4 py-3 text-start outline-none transition hover:border-ink/40 focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <span className="min-w-0">
            <span className="block text-sm font-medium text-ink">{moreOpen ? t('bills.lessOptions') : t('bills.moreOptions')}</span>
            {!moreOpen && <span className="block truncate text-xs text-muted">{t('bills.moreOptionsHint')}</span>}
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-muted transition ${moreOpen ? 'rotate-180' : ''}`} />
        </button>

        {moreOpen && (
          <div className="flex min-w-0 flex-col gap-4">
            {allowInstallation && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="bill-installation" className="text-sm font-medium text-ink">{t('bills.installationLabel')} <span className="font-normal text-muted">({t('loans.optional')})</span></label>
                <MoneyInput id="bill-installation" value={form.installation} onChange={set('installation')} placeholder="0" className="w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-base text-ink outline-none transition placeholder:text-muted hover:border-ink/30 focus:border-accent focus:ring-2 focus:ring-accent/20 sm:text-sm" />
                <FieldError>{errors.installation}</FieldError>
              </div>
            )}
            <FormField label={<Label optional>{t('bills.accountLabel')}</Label>} value={form.account} maxLength={60} onChange={(event) => set('account')(event.target.value)} placeholder={t('bills.accountPlaceholder')} />
          </div>
        )}
      </div>

      <p className="text-xs text-muted">{t('loans.enteredOn', { date: formatDate(new Date(mode === 'edit' ? bill.createdAt : Date.now()), dateOptions) })}</p>

      <ErrorSlot />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
        <button type="button" onClick={onCancel} className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted transition hover:bg-surface hover:text-ink">
          {t('common.cancel')}
        </button>
        {mode === 'add' && (
          <button
            type="submit"
            disabled={busy}
            onClick={() => {
              again.current = true;
            }}
            className="rounded-lg border border-ink px-5 py-2.5 text-sm font-semibold text-ink outline-none transition hover:bg-surface focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50"
          >
            {t('bills.saveAnother')}
          </button>
        )}
        <div className="sm:w-44">
          <Button type="submit" loading={busy} loadingLabel={t('common.saving')} onClick={() => { again.current = false; }}>
            {t('bills.save')}
          </Button>
        </div>
      </div>

      {sheet && (
        <NewCategorySheet
          initialName={sheet.name}
          categories={categories}
          onCreate={onAddCategory}
          onClose={(created) => {
            setSheet(null);
            if (created && created.id) set('categoryId')(created.id);
          }}
        />
      )}
    </form>
  );
}

export default BillForm;
