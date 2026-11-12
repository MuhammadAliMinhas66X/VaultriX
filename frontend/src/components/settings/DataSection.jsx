import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileSpreadsheet, Loader2, Upload, Banknote, Receipt, HandCoins, Wallet, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { notify } from '../../i18n/notifications.js';
import { downloadExport, importExpenseRows } from '../../services/dataService.js';
import { parseCsv, toExpenseRows } from '../../utils/csvImport.js';

const CHUNK = 40;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_ROWS = 5000;
const SAMPLE = 'Date,Amount,Currency,Category,Note\r\n2026-11-01,250.50,PKR,Food,Lunch\r\n2026-11-02,1200,PKR,Transport,Fuel\r\n';

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
    { kind: 'income', icon: Banknote, label: t('data.exportIncome') },
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

function ImportBlock() {
  const { t, tServer } = useTranslation();
  const { currency } = useAuth();
  const inputRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState(null);
  const [problem, setProblem] = useState('');
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);

  const reset = () => {
    setFileName('');
    setParsed(null);
    setProblem('');
    setProgress(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const pick = async (event) => {
    const file = event.target.files && event.target.files[0];
    setParsed(null);
    setResult(null);
    setProblem('');
    if (!file) return;
    setFileName(file.name);
    if (file.size > MAX_FILE_BYTES) {
      setProblem(t('data.fileTooBig'));
      return;
    }
    try {
      const out = toExpenseRows(parseCsv(await file.text()), currency);
      if (out.error === 'empty') setProblem(t('data.fileEmpty'));
      else if (out.error === 'columns') setProblem(t('data.fileColumns'));
      else if (out.rows.length === 0) setProblem(t('data.noneReady'));
      else if (out.rows.length > MAX_ROWS) setProblem(t('data.tooManyRows', { count: MAX_ROWS }));
      else setParsed(out);
    } catch (error) {
      setProblem(t('data.fileEmpty'));
    }
  };

  const start = async () => {
    if (!parsed) return;
    let created = 0;
    let duplicates = 0;
    let invalid = parsed.bad.length;
    setResult(null);
    try {
      for (let at = 0; at < parsed.rows.length; at += CHUNK) {
        setProgress({ done: at, total: parsed.rows.length });
        const data = await importExpenseRows(parsed.rows.slice(at, at + CHUNK));
        created += data.created;
        data.skipped.forEach((item) => {
          if (item.reason === 'duplicate') duplicates += 1;
          else invalid += 1;
        });
      }
      setResult({ created, duplicates, invalid });
      setParsed(null);
      notify.success(t('data.done', { count: created }));
    } catch (error) {
      notify.error(tServer(error));
      if (created > 0) setResult({ created, duplicates, invalid, partial: true });
    } finally {
      setProgress(null);
    }
  };

  const sample = () => {
    const url = URL.createObjectURL(new Blob([`﻿${SAMPLE}`], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vaultrix-expenses-sample.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const busy = Boolean(progress);

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

      {parsed && (
        <div className="mt-5">
          <p className="text-sm font-semibold text-ink">{t('data.ready', { count: parsed.rows.length })}</p>
          {parsed.bad.length > 0 && <p className="mt-1 text-sm text-muted">{t('data.badLines', { count: parsed.bad.length, lines: parsed.bad.slice(0, 8).join(', ') })}</p>}
          <div className="mt-3 overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[26rem] text-start text-sm">
              <thead className="bg-surface text-[11px] uppercase tracking-[0.1em] text-muted">
                <tr>
                  <th className="px-3 py-2 text-start font-semibold">{t('data.colDate')}</th>
                  <th className="px-3 py-2 text-end font-semibold">{t('data.colAmount')}</th>
                  <th className="px-3 py-2 text-start font-semibold">{t('data.colCategory')}</th>
                  <th className="px-3 py-2 text-start font-semibold">{t('data.colNote')}</th>
                </tr>
              </thead>
              <tbody>
                {parsed.rows.slice(0, 5).map((row) => (
                  <tr key={row.row} className="border-t border-border">
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums text-ink">{row.date}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-end tabular-nums text-ink">{row.amount} {row.currency}</td>
                    <td className="max-w-[8rem] truncate px-3 py-2 text-muted">{row.category || '-'}</td>
                    <td className="max-w-[10rem] truncate px-3 py-2 text-muted">{row.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {parsed.rows.length > 5 && <p className="mt-2 text-xs text-muted">{t('data.more', { count: parsed.rows.length - 5 })}</p>}
          <p className="mt-3 text-xs text-muted">{t('data.rules')}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <button type="button" onClick={start} disabled={busy} className="flex items-center gap-2 rounded-xl bg-ink px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {busy ? t('data.importing', { done: progress.done, total: progress.total }) : t('data.importBtn', { count: parsed.rows.length })}
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
            <p className="font-semibold text-ink">{t('data.done', { count: result.created })}</p>
            {(result.duplicates > 0 || result.invalid > 0) && (
              <p className="mt-0.5 text-muted">{t('data.skippedSummary', { duplicates: result.duplicates, invalid: result.invalid })}</p>
            )}
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
