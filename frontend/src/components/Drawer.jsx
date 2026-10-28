import { useEffect } from 'react';
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation.js';

function Drawer({ open, onClose, title, label, children }) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const controls = useDragControls();

  useEffect(() => {
    if (!open) return undefined;
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
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.25 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[3px]"
          />
          <motion.div
            key="drawer-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={label || title}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 340, damping: 34, mass: 0.9 }}
            drag="y"
            dragControls={controls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 550) onClose();
            }}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[94vh] max-w-2xl flex-col overflow-hidden rounded-t-[32px] bg-surface shadow-[0_-24px_70px_-20px_rgba(0,0,0,0.5)] ring-1 ring-black/5"
          >
            <div onPointerDown={(event) => controls.start(event)} className="flex shrink-0 cursor-grab touch-none flex-col items-center px-5 pt-3 active:cursor-grabbing">
              <span className="h-1.5 w-11 rounded-full bg-black/15" />
              <div className="flex h-14 w-full items-center justify-between gap-3">
                <p className="min-w-0 truncate text-lg font-semibold tracking-tight text-ink">{title}</p>
                <button
                  type="button"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={onClose}
                  aria-label={t('common.close')}
                  className="ms-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-ink shadow-sm ring-1 ring-black/10 outline-none transition hover:bg-black/[0.04] focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  <X className="h-[18px] w-[18px]" strokeWidth={2} />
                </button>
              </div>
            </div>
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduced ? 0 : 0.08, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
            >
              {children}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default Drawer;
