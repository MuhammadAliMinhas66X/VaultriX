import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTranslation } from '../../i18n/useTranslation.js';
import { useSecureMode } from '../../hooks/useSecureMode.js';
import { reportSecurityEvent } from '../../services/securityService.js';
import Logo from '../Logo.jsx';

const FLASH_MS = 1800;
const WANT_FULLSCREEN_KEY = 'vaultrix.secure.fs';

const escapeXml = (text) => text.replace(/[<>&"']/g, '');

const pad = (value) => String(value).padStart(2, '0');
const stamp = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;

const watermarkUrl = (label) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="380" height="240"><text x="30" y="150" transform="rotate(-24 190 120)" font-family="Arial, sans-serif" font-size="14" font-weight="600" fill="#000" fill-opacity="0.055">${escapeXml(label)}</text></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};

function SecureGuard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const secure = useSecureMode();
  const [masked, setMasked] = useState(false);
  const [reason, setReason] = useState('');
  const [now, setNow] = useState(() => new Date());
  const flashTimer = useRef(null);

  const mask = useCallback((why, flash = false) => {
    document.documentElement.dataset.secureMask = '1';
    setReason(why);
    setMasked(true);
    if (flash) {
      clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => {
        if (document.visibilityState === 'visible') {
          delete document.documentElement.dataset.secureMask;
          setMasked(false);
        }
      }, FLASH_MS);
    }
  }, []);

  const resume = useCallback(() => {
    clearTimeout(flashTimer.current);
    delete document.documentElement.dataset.secureMask;
    setMasked(false);
    let wantsFullscreen = false;
    try {
      wantsFullscreen = window.sessionStorage.getItem(WANT_FULLSCREEN_KEY) === '1';
    } catch (error) {
      wantsFullscreen = false;
    }
    if (wantsFullscreen && !document.fullscreenElement && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!secure) {
      document.documentElement.removeAttribute('data-secure');
      delete document.documentElement.dataset.secureMask;
      setMasked(false);
      return undefined;
    }

    document.documentElement.dataset.secure = '1';

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') mask('hidden');
    };
    const onPageHide = () => mask('hidden');
    const onBlur = () => mask('blur');
    const onBeforePrint = () => {
      mask('print');
      reportSecurityEvent('print_attempt');
    };
    const onKeyUp = (event) => {
      if (event.key === 'PrintScreen') {
        mask('capture', true);
        reportSecurityEvent('capture_key');
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(' ').catch(() => {});
      }
    };
    const onKeyDown = (event) => {
      const key = String(event.key || '').toLowerCase();
      const combo = event.ctrlKey || event.metaKey;
      if (combo && key === 'p') {
        event.preventDefault();
        mask('print', true);
        reportSecurityEvent('print_attempt');
      } else if (combo && key === 's') {
        event.preventDefault();
        mask('save', true);
        reportSecurityEvent('save_attempt');
      } else if (event.metaKey && event.shiftKey && key === 's') {
        mask('capture', true);
        reportSecurityEvent('capture_key');
      }
    };
    const onFullscreen = () => {
      if (document.fullscreenElement) return;
      let wantsFullscreen = false;
      try {
        wantsFullscreen = window.sessionStorage.getItem(WANT_FULLSCREEN_KEY) === '1';
        window.sessionStorage.removeItem(WANT_FULLSCREEN_KEY);
      } catch (error) {
        wantsFullscreen = false;
      }
      if (wantsFullscreen) {
        mask('fullscreen');
        reportSecurityEvent('fullscreen_exit');
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('fullscreenchange', onFullscreen);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('blur', onBlur);
    window.addEventListener('beforeprint', onBeforePrint);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('fullscreenchange', onFullscreen);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('beforeprint', onBeforePrint);
      clearTimeout(flashTimer.current);
      document.documentElement.removeAttribute('data-secure');
      delete document.documentElement.dataset.secureMask;
    };
  }, [secure, mask]);

  useEffect(() => {
    if (!secure) return undefined;
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, [secure]);

  const label = user ? `${user.email}  ${stamp(now)}` : '';
  const background = useMemo(() => (label ? watermarkUrl(label) : ''), [label]);

  if (!secure) return null;

  return createPortal(
    <>
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[90] select-none" style={{ backgroundImage: background, backgroundRepeat: 'repeat' }} />

      <div className="secure-print-notice" role="note">
        <p>{t('secure.printBlocked')}</p>
      </div>

      {masked && (
        <div role="alertdialog" aria-modal="true" aria-label={t('secure.maskedTitle')} className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-black px-6 text-center">
          <Logo dark size="md" />
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-ink">
            <ShieldCheck className="h-7 w-7" strokeWidth={1.75} />
          </div>
          <div className="max-w-xs">
            <h2 className="text-lg font-semibold text-white">{t('secure.maskedTitle')}</h2>
            <p className="mt-1.5 text-sm text-white/60">{t(`secure.reason.${reason}`) || t('secure.maskedBody')}</p>
          </div>
          <button
            type="button"
            autoFocus
            onClick={resume}
            className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-ink outline-none transition hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-white/60"
          >
            {t('secure.continue')}
          </button>
        </div>
      )}
    </>,
    document.body
  );
}

export default SecureGuard;
