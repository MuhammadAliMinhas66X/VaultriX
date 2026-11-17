import { useState } from 'react';
import { Pencil, Trash2, Vault } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation.js';
import { isSavingsLine } from '../../utils/salaryPlanMath.js';
import { btn } from './ui.js';

export default function AllocationList({ rows, names, money, canWrite, busy, editingId, onEdit, onDelete }) {
  const { t } = useTranslation();
  const [confirmId, setConfirmId] = useState(null);

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
      {rows.map((line) => {
        const savings = isSavingsLine(line);
        const tracked = !savings && line.spent !== null;
        const ratio = tracked && line.amount > 0 ? Math.min(1, line.spent / line.amount) : 0;
        const burst = tracked && line.spent > line.amount;
        const categoryName = line.categoryId ? names.get(line.categoryId) : null;
        const confirming = confirmId === line.id;
        return (
          <li
            key={line.id}
            onKeyDown={(event) => event.key === 'Escape' && confirming && setConfirmId(null)}
            className={`relative ${editingId === line.id ? 'bg-surface' : 'bg-white'}`}
          >
            <div className="flex min-h-[60px] items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-medium text-ink">{line.label}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
                  {savings ? (
                    <span className="inline-flex items-center gap-1"><Vault className="h-3.5 w-3.5" />{t('salary.categorySavings')}</span>
                  ) : (
                    <span>{categoryName || t('salary.categoryNone')}</span>
                  )}
                  {tracked && <span className="tabular-nums">· {t('salary.spentOf', { spent: money(line.spent), planned: money(line.amount) })}</span>}
                </p>
              </div>
              <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-ink">{money(line.amount)}</span>
              {canWrite && (
                <span className="flex shrink-0 items-center">
                  <button type="button" aria-label={`${t('salary.edit')}: ${line.label}`} disabled={busy} onClick={() => { setConfirmId(null); onEdit(line); }} className={btn.icon}><Pencil className="h-4 w-4" /></button>
                  <button type="button" aria-label={`${t('salary.delete')}: ${line.label}`} aria-expanded={confirming} disabled={busy} onClick={() => setConfirmId(confirming ? null : line.id)} className={btn.dangerIcon}><Trash2 className="h-4 w-4" /></button>
                </span>
              )}
            </div>
            {confirming && (
              <div role="group" aria-label={t('salary.confirmDelete')} className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-surface px-4 py-2.5">
                <p className="text-sm font-medium text-ink">{t('salary.confirmDelete')}</p>
                <span className="flex gap-2">
                  <button type="button" autoFocus onClick={() => setConfirmId(null)} className={btn.secondary}>{t('common.cancel')}</button>
                  <button type="button" disabled={busy} onClick={() => { setConfirmId(null); onDelete(line); }} className={btn.danger}>{t('salary.delete')}</button>
                </span>
              </div>
            )}
            {tracked && ratio > 0 && !confirming && (
              <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-border/60">
                <span className={`block h-full ${burst ? 'bg-ink' : 'bg-slate-400'}`} style={{ width: `${ratio * 100}%` }} />
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
