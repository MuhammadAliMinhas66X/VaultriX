import { Link } from 'react-router-dom';
import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { resolveAvatarUrl, initialsFromName } from '../utils/avatar.js';
import Logo from './Logo.jsx';
import { useTranslation } from '../i18n/useTranslation.js';
import { ADMIN_EMAIL } from './RequireAdmin.jsx';

function DashboardHeader() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const avatarSrc = resolveAvatarUrl(user?.avatarUrl);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;

  return (
    <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-6 sm:py-4">
      <Logo size="sm" linkTo="/dashboard" />

      <div className="flex items-center gap-2">
        {isAdmin && (
          <Link
            to="/admin"
            aria-label="Admin Dashboard"
            title="Admin Dashboard"
            className="flex items-center gap-1.5 rounded-full border border-border bg-ink py-1.5 pl-2.5 pr-3 text-sm font-medium text-white transition hover:opacity-90"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Admin
          </Link>
        )}

        <Link
          to="/settings"
          aria-label={t('settings.title')}
          className="flex items-center gap-2 rounded-full border border-border py-1.5 pl-1.5 pr-1.5 transition hover:bg-surface sm:pr-3"
        >
          {avatarSrc && !avatarFailed ? (
            <img
              src={avatarSrc}
              alt=""
              referrerPolicy="no-referrer"
              onError={() => setAvatarFailed(true)}
              className="h-7 w-7 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-xs font-medium text-white">
              {initialsFromName(user?.name)}
            </span>
          )}
          <span className="hidden max-w-[10rem] truncate text-sm font-medium text-ink sm:inline">{user?.name}</span>
        </Link>
      </div>
    </header>
  );
}

export default DashboardHeader;
