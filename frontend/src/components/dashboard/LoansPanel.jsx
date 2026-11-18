import { ArrowDownLeft, ArrowUpRight, Handshake } from 'lucide-react';
import Section from './Section.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useFormat } from '../../i18n/useFormat.js';

function Side({ icon: Icon, label, data, money, t }) {
  return (
    <div className="min-w-0 rounded-xl bg-surface px-4 py-3.5">
      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted"><Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} /><span className="truncate">{label}</span></span>
      <span className="mt-2 block whitespace-nowrap text-[clamp(1.05rem,5vw,1.5rem)] font-bold leading-none tracking-tight tabular-nums text-ink">{money(data.total)}</span>
      <span className="mt-1.5 block text-xs text-muted">{t('dash.openLoans', { count: data.count })}</span>
    </div>
  );
}

// Money that is out in the world: owed to me and owed by me. Shown only when a loan is open.
export default function LoansPanel({ totals, currency }) {
  const { t } = useTranslation();
  const { formatMoney } = useFormat();
  const decimals = Math.max(totals.owedToMe.total, totals.iOwe.total) >= 10000 ? 0 : 2;
  const money = (value) => formatMoney(value, { decimals, currency });
  const net = totals.owedToMe.total - totals.iOwe.total;

  return (
    <Section icon={Handshake} title={t('nav.loans')} to="/loans" linkLabel={t('dashboard.viewAll')}>
      <div className="px-4 pb-5 sm:px-5">
        <div className="grid grid-cols-2 gap-3">
          <Side icon={ArrowDownLeft} label={t('dash.owedToYou')} data={totals.owedToMe} money={money} t={t} />
          <Side icon={ArrowUpRight} label={t('dash.youOwe')} data={totals.iOwe} money={money} t={t} />
        </div>
        <p className="mt-3 flex items-baseline justify-between gap-3 border-t border-border pt-3 text-xs text-muted">
          <span>{t('dash.loanNet')}</span>
          <span className="whitespace-nowrap text-sm font-bold tabular-nums text-ink">{net < 0 ? '- ' : ''}{money(Math.abs(net))}</span>
        </p>
      </div>
    </Section>
  );
}
