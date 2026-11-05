import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, Download, Mail, MessageCircle, Share2, X } from 'lucide-react';
import BrandMark from '../BrandMark.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { notify } from '../../i18n/notifications.js';
import { buildBillDocument, billShareText, pdfFile } from '../../utils/billPdf.js';

function Paper({ doc }) {
  return (
    <div dir="ltr" className="overflow-hidden rounded-xl border border-border bg-white text-left text-ink shadow-sm">
      <div className="flex items-start justify-between gap-3 bg-ink px-5 py-4 text-white">
        <p className="text-lg font-bold tracking-[0.12em]">VAULTRIX</p>
        <div className="text-right">
          <p className="text-xs font-bold tracking-[0.1em]">{doc.title}</p>
          <p className="mt-0.5 text-[11px] text-white/60">{doc.reference}</p>
        </div>
      </div>
      <div className="flex flex-col gap-5 px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <BrandMark method="biller" name={doc.biller} size="sm" />
            <p className="truncate text-lg font-bold">{doc.biller}</p>
          </div>
          <span className={`shrink-0 rounded-md border border-ink px-2.5 py-1 text-[11px] font-bold ${doc.statusKey === 'paid' ? 'bg-ink text-white' : 'bg-white text-ink'}`}>{doc.status}</span>
        </div>

        <dl className="divide-y divide-border border-y border-border">
          {doc.details.map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-4 py-2.5 text-sm">
              <dt className="shrink-0 text-muted">{label}</dt>
              <dd className="min-w-0 break-words text-right font-semibold">{value}</dd>
            </div>
          ))}
        </dl>

        <dl className="rounded-lg border border-border bg-surface px-4 py-3">
          {doc.amounts.map(([label, value, strong]) => (
            <div key={label} className={`flex items-center justify-between gap-4 py-1.5 ${strong ? 'text-base' : 'text-sm'}`}>
              <dt className={strong ? 'font-bold' : 'text-muted'}>{label}</dt>
              <dd className={`tabular-nums font-bold ${strong ? 'text-lg' : ''}`}>{value}</dd>
            </div>
          ))}
        </dl>

        {doc.payments.length > 0 && (
          <div>
            <p className="mb-2 text-[10px] font-bold tracking-[0.14em] text-muted">PAYMENT HISTORY</p>
            <ul className="overflow-hidden rounded-lg border border-border text-xs">
              {doc.payments.map((payment, index) => (
                <li key={`${payment.date}-${index}`} className={`flex items-start justify-between gap-3 px-3 py-2.5 ${index % 2 ? 'bg-surface' : 'bg-white'}`}>
                  <span className="min-w-0">
                    <span className="block font-semibold">{payment.date}</span>
                    <span className="block truncate text-muted">{[payment.source, payment.note].filter((part) => part && part !== '-').join(' · ') || '-'}</span>
                  </span>
                  <span className="shrink-0 font-bold tabular-nums">{payment.amount}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-[11px] text-muted">{doc.generated}</p>
      </div>
    </div>
  );
}

function BillShare({ bill, categoryName, today, onClose }) {
  const { t } = useTranslation();
  const [options, setOptions] = useState(false);
  const [copied, setCopied] = useState(false);
  const doc = useMemo(() => buildBillDocument(bill, { categoryName, today }), [bill, categoryName, today]);
  const text = useMemo(() => billShareText(doc), [doc]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey, true);
    };
  }, [onClose]);

  const download = () => {
    try {
      const url = URL.createObjectURL(pdfFile(doc));
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (error) {
      notify.error(t('bills.pdfFailed'));
    }
  };

  const share = async () => {
    try {
      const file = pdfFile(doc);
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `${doc.title} - ${doc.biller}`, text });
        return;
      }
    } catch (error) {
      if (error?.name === 'AbortError') return;
    }
    setOptions((prev) => !prev);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      notify.error(t('loans.copyFailed'));
    }
  };

  const subject = `${doc.title} - ${doc.biller}`;
  const chip = 'flex items-center justify-center gap-2 rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm font-medium text-ink outline-none transition hover:border-ink/30 focus-visible:ring-2 focus-visible:ring-accent/40';

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 backdrop-blur-[3px] sm:items-center sm:p-6" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={t('bills.previewTitle')} onClick={(event) => event.stopPropagation()} className="flex max-h-[94vh] w-full max-w-xl flex-col overflow-hidden rounded-t-[28px] bg-surface shadow-2xl sm:rounded-[28px]">
        <div className="flex h-14 shrink-0 items-center justify-between gap-3 px-5">
          <h2 className="text-base font-semibold tracking-tight text-ink">{t('bills.previewTitle')}</h2>
          <button type="button" onClick={onClose} aria-label={t('common.close')} className="flex h-10 w-10 items-center justify-center rounded-full text-muted outline-none transition hover:bg-black/5 hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/40">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-5">
          <Paper doc={doc} />
          <p className="mt-3 text-xs text-muted">{t('bills.shareNote')}</p>
        </div>
        <div className="shrink-0 border-t border-border bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-5">
          {options && (
            <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" className={chip}>
                <MessageCircle className="h-4 w-4" /> {t('bills.shareWhatsapp')}
              </a>
              <a href={`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`} className={chip}>
                <Mail className="h-4 w-4" /> {t('bills.shareEmail')}
              </a>
              <button type="button" onClick={copy} className={chip}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? t('loans.copied') : t('bills.shareCopy')}
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={download} className="flex items-center justify-center gap-2 rounded-lg bg-ink px-4 py-3 text-sm font-medium text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent/40">
              <Download className="h-4 w-4" /> {t('bills.download')}
            </button>
            <button type="button" onClick={share} aria-expanded={options} className="flex items-center justify-center gap-2 rounded-lg border border-ink bg-white px-4 py-3 text-sm font-medium text-ink outline-none transition hover:bg-surface focus-visible:ring-2 focus-visible:ring-accent/40">
              <Share2 className="h-4 w-4" /> {t('bills.share')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default BillShare;
