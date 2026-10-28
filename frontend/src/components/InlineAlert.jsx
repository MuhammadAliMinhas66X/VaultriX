import { motion } from 'framer-motion';
import { AlertTriangle, Check, Info, X } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation.js';

const tones = {
  error: { icon: X, titleKey: 'toast.errorTitle', border: 'border-ink' },
  warning: { icon: AlertTriangle, titleKey: 'toast.warningTitle', border: 'border-ink' },
  success: { icon: Check, titleKey: 'toast.successTitle', border: 'border-border' },
  info: { icon: Info, titleKey: 'toast.infoTitle', border: 'border-border' },
};

function InlineAlert({ tone = 'error', title, message, onDismiss }) {
  const { t } = useTranslation();
  const config = tones[tone] || tones.error;
  const Icon = config.icon;

  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden"
    >
      <div className={`flex items-start gap-3 rounded-xl border bg-white p-3.5 ${config.border}`}>
        <span className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-white">
          <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-ink">{title || t(config.titleKey)}</p>
          <p className="mt-0.5 break-words text-[13px] leading-snug text-muted">{message}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t('common.dismiss')}
          className="-me-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted outline-none transition hover:bg-surface hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

export default InlineAlert;
