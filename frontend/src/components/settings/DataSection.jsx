import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileSpreadsheet, Loader2, Upload, Receipt, HandCoins, Wallet, Check } from 'lucide-react';
import RupeeNote from '../icons/RupeeNote.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { notify } from '../../i18n/notifications.js';
import { downloadExport, importMixedRows } from '../../services/dataService.js';
import { parseCsv } from '../../utils/csvImport.js';
import { analyzeTable, countByKind, orderForImport, toApiRow, KINDS } from '../../utils/smartImport.js';

const CHUNK = 20;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_ROWS = 5000;
const SAMPLE = 'Date,Description,Debit,Credit\r\n01/11/2026,Salary,,90000\r\n02/11/2026,Lunch,250,\r\n03/11/2026,IESCO electricity,8400,\r\n05/11/2026,Borrowed from Waqas,,20000\r\n10/11/2026,Repaid to Waqas,5000,\r\n';

const card = 'rounded-xl border border-border bg-white p-5 sm:p-6';

function Block({ title, hint, children }) {
  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className={card}>
      <h2 className="text-base font-semibold tracking-tight text-ink">{title}</h2>
      <p className="mt-1 text-sm text-muted">{hint}</p>
      <div className="mt-5">{children}</div>
    </motion.section>
  );
}

const outline = 'flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm font-medium text-ink outline-none transition hover:border-ink/30 hover:bg-surface focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50';

function ExportBlock() {
  const { t, tServer } = useTranslation();
  const [busy, setBusy] = useState('');
  const items = [
    { kind: 'expenses', icon: Wallet, label: t('data.exportExpenses') },
    { kind: 'income', icon: RupeeNote, label: t('data.exportIncome') },
    { kind: 'bills', icon: Receipt, label: t('data.exportBills') },
    { kind: 'loans', icon: HandCoins, label: t('data.exportLoans') },
  ];

  const run = async (kind) => {
    setBusy(kind);
    try {
      await downloadExport(kind);
    } catch (error) {
      notify.error(tServer(error));
    } finally {
      setBusy('');
    }
  };

  return (
    <Block title={t('data.exportTitle')} hint={t('data.exportHint')}>
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
        {items.map(({ kind, icon: Icon, label }) => (
          <li key={kind} className="flex items-center gap-3 px-3.5 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-ink">
              <Icon className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1 text-sm font-medium leading-tight text-ink">{label}</span>
            <button type="button" disabled={Boolean(busy)} onClick={() => run(kind)} className={outline}>
              {busy === kind ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              <span>{t('data.download')}</span>
            </button>
          </li>
        ))}
      </ul>
    </Block>
  );
}

const KIND_STYLE = {
  expense: 'bg-surface text-ink',
  income: 'bg-ink text-white',
  bill: 'border border-ink text-ink',
  loan: 'bg-muted/20 text-ink',
  loanPayment: 'bg-muted/20 text-ink',
};
const KIND_KEY = { expense: 'data.kindExpense', income: 'data.kindIncome', bill: 'data.kindBill', loan: 'data.kindLoan', loanPayment: 'data.kindLoanPayment' };
const PREVIEW = 8;

function ImportBlock() {
  const { t, tServer } = useTranslation();
  const { currency } = useAuth();
  const inputRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState(null);
  const [rows, setRows] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [problem, setProblem] = useState('');
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);

  const reset = () => {
    setFileName('');
    setParsed(null);
    setRows([]);
    setShowAll(false);
    setProblem('');
    setProgress(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const pick = async (event) => {
    const file = event.target.files && event.target.files[0];
    setParsed(null);
    setRows([]);
    setResult(null);
    setProblem('');
    setShowAll(false);
    if (!file) return;
    setFileName(file.name);
    if (file.size > MAX_FILE_BYTES) {
      setProblem(t('data.fileTooBig'));
      return;
    }
    try {
      const table = parseCsv(await file.text());
      const out = analyzeTable(table, currency);
      if (out.error === 'empty') setProblem(t('data.fileEmpty'));
      else if (out.error === 'columns') setProblem(t('data.fileColumns'));
      else if (out.rows.length === 0) setProblem(t('data.noneReady'));
      else if (out.rows.length > MAX_ROWS) setProblem(t('data.tooManyRows', { count: MAX_ROWS }));
      else {
        setParsed({ ...out, header: table[0] });
        setRows(out.rows);
      }
    } catch (error) {
      setProblem(t('data.fileEmpty'));
    }
  };

  const setKind = (line, kind) =>
    setRows((list) =>
      list.map((row) => {
        if (row.row !== line) return row;
        const next = { ...row, kind, confidence: 'high' };
        if ((kind === 'loan' || kind === 'loanPayment') && !next.direction) next.direction = 'borrowed';
        if ((kind === 'loan' || kind === 'loanPayment') && !next.person) next.person = row.note.slice(0, 40) || 'Unknown';
        return next;
      })
    );

  const start = async () => {
    if (rows.length === 0) return;
    const ordered = orderForImport(rows);
    const created = { expense: 0, income: 0, bill: 0, loan: 0, loanPayment: 0 };
    let duplicates = 0;
    let unmatched = 0;
    let invalid = parsed.bad.length;
    setResult(null);
    const total = () => Object.values(created).reduce((a, b) => a + b, 0);
    try {
      for (let at = 0; at < ordered.length; at += CHUNK) {
        setProgress({ done: at, total: ordered.length });
        const data = await importMixedRows(ordered.slice(at, at + CHUNK).map(toApiRow));
        Object.keys(created).forEach((key) => {
          created[key] += (data.created && data.created[key]) || 0;
        });
        data.skipped.forEach((item) => {
          if (item.reason === 'duplicate') duplicates += 1;
          else if (item.reason === 'noLoan' || item.reason === 'tooMuch') unmatched += 1;
          else invalid += 1;
        });
      }
      setResult({ created, count: total(), duplicates, invalid, unmatched });
      setParsed(null);
      setRows([]);
      notify.success(t('data.done', { count: total() }));
    } catch (error) {
      notify.error(tServer(error));
      if (total() > 0) setResult({ created, count: total(), duplicates, invalid, unmatched, partial: true });
    } finally {
      setProgress(null);
    }
  };

  const sample = () => {
    const url = URL.createObjectURL(new Blob([`\ufeff${SAMPLE}`], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vaultrix-import-sample.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const busy = Boolean(progress);
  const counts = countByKind(rows);
  const shown = showAll ? rows : rows.slice(0, PREVIEW);
  const kindLabel = (row) => {
    const base = t(KIND_KEY[row.kind]);
    if (row.kind === 'bill') return `${base} · ${row.paid === false ? t('data.billUnpaid') : t('data.billPaid')}`;
    if (row.kind === 'loan' || row.kind === 'loanPayment') return `${base} · ${row.direction === 'lent' ? t('data.loanLent') : t('data.loanBorrowed')}`;
    return base;
  };

  return (
    <Block title={t('data.importTitle')} hint={t('data.importHint')}>
      <div className="flex flex-wrap items-center gap-2.5">
        <input ref={inputRef} type="file" accept=".csv,text/csv" onChange={pick} disabled={busy} className="sr-only" id="import-file" />
        <label htmlFor="import-file" className={`${outline} cursor-pointer ${busy ? 'pointer-events-none opacity-50' : ''}`}>
          <FileSpreadsheet className="h-4 w-4" /> {t('data.chooseFile')}
        </label>
        <button type="button" onClick={sample} className="rounded-xl px-2.5 py-2.5 text-sm font-medium text-muted underline-offset-2 outline-none transition hover:text-ink hover:underline focus-visible:ring-2 focus-visible:ring-accent/40">
          {t('data.sample')}
        </button>
        {fileName && <span className="min-w-0 max-w-full truncate text-sm text-muted">{fileName}</span>}
      </div>

      {problem && <p role="alert" className="mt-4 rounded-xl bg-surface px-4 py-3 text-sm text-ink">{problem}</p>}

      {parsed && rows.length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-semibold text-ink">{t('data.ready', { count: rows.length })}</p>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{t('data.foundTitle')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {KINDS.filter((kind) => counts[kind] > 0).map((kind) => (
              <span key={kind} className={`rounded-full px-3 py-1 text-xs font-semibold tabular-nums ${KIND_STYLE[kind]}`}>
                {counts[kind]} {t(KIND_KEY[kind])}
              </span>
            ))}
          </div>
          {parsed.bad.length > 0 && <p className="mt-2 text-sm text-muted">{t('data.badLines', { count: parsed.bad.length, lines: parsed.bad.slice(0, 8).join(', ') })}</p>}
          <p className="mt-3 text-xs text-muted">{t('data.reviewHint')}</p>

          <ul className="mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border">
            {shown.map((row) => (
              <li key={row.row} className="flex flex-col gap-2 px-3.5 py-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{row.biller || row.person || row.note || row.category || '-'}</p>
                  <p className="mt-0.5 text-xs tabular-nums text-muted">{row.date}</p>
                </div>
                <p className="whitespace-nowrap text-sm font-semibold tabular-nums text-ink sm:text-end">{row.amount} {row.currency}</p>
                <label className="block">
                  <span className="sr-only">{t('data.colType')}</span>
                  <select
                    value={row.kind}
                    onChange={(event) => setKind(row.row, event.target.value)}
                    disabled={busy}
                    className={`w-full rounded-lg border bg-white px-2.5 py-1.5 text-xs font-medium text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent/40 sm:w-auto ${row.confidence === 'medium' && row.kind !== 'expense' ? 'border-ink/40' : 'border-border'}`}
                    aria-label={`${t('data.colType')}: ${kindLabel(row)}`}
                  >
                    {KINDS.map((kind) => (
                      <option key={kind} value={kind}>{kind === row.kind ? kindLabel(row) : t(KIND_KEY[kind])}</option>
                    ))}
                  </select>
                </label>
              </li>
            ))}
          </ul>
          {rows.length > PREVIEW && (
            <button type="button" onClick={() => setShowAll((value) => !value)} className="mt-2 text-sm font-medium text-ink underline underline-offset-2">
              {showAll ? t('data.showLess') : `${t('data.showAll')} (${rows.length})`}
            </button>
          )}
          <p className="mt-3 text-xs text-muted">{t('data.rules')}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <button type="button" onClick={start} disabled={busy} className="flex items-center gap-2 rounded-xl bg-ink px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {busy ? t('data.importing', { done: progress.done, total: progress.total }) : t('data.importBtn', { count: rows.length })}
            </button>
            {!busy && (
              <button type="button" onClick={reset} className={outline}>
                {t('common.cancel')}
              </button>
            )}
          </div>
        </div>
      )}

      {result && (
        <div role="status" className="mt-5 flex items-start gap-3 rounded-xl bg-surface px-4 py-3.5">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-white">
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
          <div className="min-w-0 text-sm">
            <p className="font-semibold text-ink">{t('data.done', { count: result.count })}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {KINDS.filter((kind) => result.created[kind] > 0).map((kind) => (
                <span key={kind} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${KIND_STYLE[kind]}`}>
                  {result.created[kind]} {t(KIND_KEY[kind])}
                </span>
              ))}
            </div>
            {(result.duplicates > 0 || result.invalid > 0) && (
              <p className="mt-1.5 text-muted">{t('data.skippedSummary', { duplicates: result.duplicates, invalid: result.invalid })}</p>
            )}
            {result.unmatched > 0 && <p className="mt-0.5 text-muted">{t('data.unmatched', { count: result.unmatched })}</p>}
            {result.partial && <p className="mt-0.5 text-muted">{t('data.partial')}</p>}
            <button type="button" onClick={reset} className="mt-2 text-sm font-medium text-ink underline underline-offset-2">{t('data.importAnother')}</button>
          </div>
        </div>
      )}
    </Block>
  );
}

export default function DataSection() {
  return (
    <div className="flex flex-col gap-5">
      <ExportBlock />
      <ImportBlock />
    </div>
  );
}
