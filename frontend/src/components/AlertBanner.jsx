import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation.js';

const toneStyles = {
  success: { icon: CheckCircle2, tint: 'bg-emerald-50 text-emerald-600', bar: 'bg-emerald-500', titleKey: 'toast.successTitle' },
  error: { icon: AlertCircle, tint: 'bg-red-50 text-red-600', bar: 'bg-red-500', titleKey: 'toast.errorTitle' },
  warning: { icon: AlertTriangle, tint: 'bg-amber-50 text-amber-600', bar: 'bg-amber-500', titleKey: 'toast.warningTitle' },
  info: { icon: Info, tint: 'bg-sky-50 text-sky-600', bar: 'bg-sky-500', titleKey: 'toast.infoTitle' },
};

function AlertBanner({ tone = 'error', title, message, duration, stamp = 0, onDismiss }) {
  const { t } = useTranslation();
  const config = toneStyles[tone] || toneStyles.error;
  const Icon = config.icon;
  const [paused, setPaused] = useState(false);
  const remaining = useRef(duration);
  const startedAt = useRef(0);

  useEffect(() => {
    remaining.current = duration;
  }, [duration, stamp, message]);

  useEffect(() => {
    if (!duration || paused) return undefined;
    startedAt.current = Date.now();
    const timer = setTimeout(() => onDismiss?.(), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt.current));
    };
  }, [duration, paused, stamp, message]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.16 } }}
      transition={{ type: 'spring', stiffness: 460, damping: 36 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      role={tone === 'error' || tone === 'warning' ? 'alert' : 'status'}
      className="pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-white shadow-xl shadow-black/[0.08]"
    >
      <div className="flex items-start gap-3 py-3.5 pe-3 ps-4">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${config.tint}`}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm font-semibold leading-tight text-ink">{title || t(config.titleKey)}</p>
          <p className="mt-1 break-words text-[13px] leading-snug text-muted">{message}</p>
        </div>
        <button
          type="button"
          onClick={() => onDismiss?.()}
          aria-label={t('common.dismiss')}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted outline-none transition hover:bg-surface hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {duration > 0 && (
        <span
          key={`${stamp}-${message}`}
          className={`absolute inset-x-0 bottom-0 h-[3px] origin-left ${config.bar} opacity-50`}
          style={{ animation: `toast-shrink ${duration}ms linear forwards`, animationPlayState: paused ? 'paused' : 'running' }}
        />
      )}
    </motion.div>
  );
}

export default AlertBanner;
