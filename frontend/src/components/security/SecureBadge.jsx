import { Maximize2, ShieldCheck } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation.js';
import { canFullscreen, useSecureMode } from '../../hooks/useSecureMode.js';

const WANT_FULLSCREEN_KEY = 'vaultrix.secure.fs';

function SecureBadge() {
  const { t } = useTranslation();
  const secure = useSecureMode();
  if (!secure) return null;

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      try {
        window.sessionStorage.removeItem(WANT_FULLSCREEN_KEY);
      } catch (error) {
        return;
      }
      document.exitFullscreen().catch(() => {});
      return;
    }
    try {
      window.sessionStorage.setItem(WANT_FULLSCREEN_KEY, '1');
    } catch (error) {
      return;
    }
    document.documentElement.requestFullscreen().catch(() => {});
  };

  const body = (
    <>
      <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2} />
      <span className="hidden sm:inline">{t('secure.badge')}</span>
      {canFullscreen() && <Maximize2 className="ms-0.5 hidden h-3 w-3 text-white/60 sm:block" />}
    </>
  );
  const className = 'flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-ink px-2.5 text-xs font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-accent/40 sm:px-3';

  return canFullscreen() ? (
    <button type="button" onClick={toggleFullscreen} title={t('secure.fullscreen')} aria-label={t('secure.fullscreen')} className={className}>
      {body}
    </button>
  ) : (
    <span title={t('secure.badge')} className={className}>
      {body}
    </span>
  );
}

export default SecureBadge;
