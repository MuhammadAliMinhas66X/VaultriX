import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation.js';

export function Lightbox({ src, onClose }) {
  const { t } = useTranslation();

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label={t('loans.photoView')} onClick={onClose} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <button
        type="button"
        onClick={onClose}
        aria-label={t('common.close')}
        className="absolute end-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <X className="h-5 w-5" />
      </button>
      <img src={src} alt="" onClick={(event) => event.stopPropagation()} className="max-h-full max-w-full rounded-xl bg-white object-contain" />
    </div>
  );
}

function ProofImage({ proof, size = 'h-16 w-16' }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!proof) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('loans.photoView')}
        title={t('loans.photoView')}
        className={`${size} shrink-0 overflow-hidden rounded-xl border border-border bg-surface outline-none transition hover:border-ink/40 focus-visible:ring-2 focus-visible:ring-accent/40`}
      >
        {failed ? (
          <span className="flex h-full w-full items-center justify-center text-[10px] text-muted">{t('loans.photoView')}</span>
        ) : (
          <img src={proof.thumb} alt="" loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover" />
        )}
      </button>
      {open && <Lightbox src={proof.full} onClose={() => setOpen(false)} />}
    </>
  );
}

export default ProofImage;
