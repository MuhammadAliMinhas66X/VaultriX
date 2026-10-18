import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation.js';

// A dedicated, full-width status bar for connectivity - distinct from the
// toast stack (ToastViewport), because losing the internet isn't a
// one-off event to flash and dismiss, it's a state the whole app is in
// until it isn't. Mounted once, globally, so it shows on every page
// (including login, where a person is most likely to notice and be
// confused by a silent network failure).
function OfflineBanner() {
  const { t } = useTranslation();
  const [isOffline, setIsOffline] = useState(() => (typeof navigator !== 'undefined' ? !navigator.onLine : false));
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      setShowRestored(false);
    };
    const handleOnline = () => {
      setIsOffline(false);
      setShowRestored(true);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  useEffect(() => {
    if (!showRestored) return undefined;
    const timer = setTimeout(() => setShowRestored(false), 3000);
    return () => clearTimeout(timer);
  }, [showRestored]);

  return (
    <div aria-live="assertive" className="pointer-events-none fixed inset-x-0 top-0 z-[200] flex justify-center">
      <AnimatePresence>
        {isOffline && (
          <motion.div
            key="offline"
            initial={{ y: -64, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -64, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className="pointer-events-auto flex w-full items-center justify-center gap-2.5 bg-amber-500 px-4 py-3 text-center text-sm font-medium text-white shadow-md"
            style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
          >
            <WifiOff className="h-4 w-4 shrink-0" />
            <span>{t('offline.lost')}</span>
          </motion.div>
        )}
        {!isOffline && showRestored && (
          <motion.div
            key="restored"
            initial={{ y: -64, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -64, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className="pointer-events-auto flex w-full items-center justify-center gap-2.5 bg-emerald-600 px-4 py-3 text-center text-sm font-medium text-white shadow-md"
            style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
          >
            <Wifi className="h-4 w-4 shrink-0" />
            <span>{t('offline.restored')}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default OfflineBanner;
