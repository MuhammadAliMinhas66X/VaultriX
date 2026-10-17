import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Laptop, Loader2, Mail, AlertTriangle } from 'lucide-react';
import DashboardHeader from '../components/DashboardHeader.jsx';
import FormField from '../components/FormField.jsx';
import Button from '../components/Button.jsx';
import Combobox from '../components/Combobox.jsx';
import OtpInput from '../components/OtpInput.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  updateProfile,
  changePassword,
  uploadAvatar,
  listSessions,
  revokeSession,
  logoutAllSessions,
  requestEmailChange,
  verifyEmailChange,
  deleteAccount,
} from '../services/userService.js';
import { resolveAvatarUrl, initialsFromName } from '../utils/avatar.js';
import { sanitizeNameInput, isValidName } from '../utils/nameRules.js';
import { useTranslation } from '../i18n/useTranslation.js';
import { useLocalizedOptions } from '../i18n/useLocalizedOptions.js';
import { useFormat } from '../i18n/useFormat.js';
import { notify } from '../i18n/notifications.js';
import { serverMessageKey, translate } from '../i18n/translate.js';

const EMAIL_CODE_LENGTH = 6;

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PHOTO_MAX_BYTES = 3 * 1024 * 1024;

function SettingsCard({ title, subtitle, children }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-border bg-white p-6"
    >
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </motion.section>
  );
}

function ProfileSection() {
  const { user, updateUser } = useAuth();
  const { t, tServer } = useTranslation();
  const inputRef = useRef(null);

  const [name, setName] = useState(user?.name || '');
  const [nameError, setNameError] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const avatarSrc = resolveAvatarUrl(user?.avatarUrl);

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!PHOTO_TYPES.includes(file.type)) {
      notify.error(t('errors.uploadImageType'));
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      notify.error(t('errors.imageTooLarge'));
      return;
    }

    setUploadingPhoto(true);
    try {
      const data = await uploadAvatar(file);
      updateUser(data.user);
      setAvatarFailed(false);
      notify.success(t('status.photoUpdated'));
    } catch (error) {
      notify.error(tServer(error));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleNameSave = async (event) => {
    event.preventDefault();

    if (!name.trim()) {
      setNameError('status.nameEmpty');
      return;
    }

    if (!isValidName(name)) {
      setNameError('errors.nameInvalid');
      return;
    }

    setSavingName(true);
    try {
      const data = await updateProfile({ name });
      updateUser(data.user);
      notify.success(t('status.nameUpdated'));
    } catch (error) {
      notify.error(tServer(error));
    } finally {
      setSavingName(false);
    }
  };

  return (
    <SettingsCard title={t('settings.profileTitle')} subtitle={t('settings.profileSubtitle')}>
      <div className="flex items-center gap-4">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handlePhotoChange}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploadingPhoto}
          aria-label={t('settings.changePhoto')}
          aria-busy={uploadingPhoto ? 'true' : undefined}
          className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-border bg-surface"
        >
          {uploadingPhoto ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted" />
          ) : avatarSrc && !avatarFailed ? (
            <img
              src={avatarSrc}
              alt=""
              referrerPolicy="no-referrer"
              onError={() => setAvatarFailed(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-sm font-medium text-muted">{initialsFromName(user?.name)}</span>
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition hover:bg-black/40 hover:opacity-100">
            <Camera className="h-4 w-4" />
          </span>
        </button>
        <div>
          <p className="text-sm font-medium text-ink">{t('settings.photoLabel')}</p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploadingPhoto}
            className="text-sm text-muted hover:text-ink disabled:cursor-wait"
          >
            {uploadingPhoto ? t('common.uploading') : t('settings.changePhoto')}
          </button>
        </div>
      </div>

      <form onSubmit={handleNameSave} noValidate className="mt-6 flex flex-col gap-4">
        <FormField
          label={t('settings.fullName')}
          value={name}
          onChange={(event) => {
            setName(sanitizeNameInput(event.target.value));
            setNameError('');
          }}
          error={nameError && t(nameError)}
        />
        <div>
          <Button type="submit" loading={savingName} loadingLabel={t('common.saving')}>
            {t('settings.saveName')}
          </Button>
        </div>
      </form>
    </SettingsCard>
  );
}

function PasswordSection() {
  const { user, setSession } = useAuth();
  const { t, tServer } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  if (user?.authProvider === 'google') {
    return (
      <SettingsCard title={t('settings.passwordTitle')} subtitle={t('settings.passwordSubtitle')}>
        <p className="text-sm text-muted">{t('settings.googleNoPassword')}</p>
      </SettingsCard>
    );
  }

  const clearError = (field) => setFieldErrors((prev) => ({ ...prev, [field]: undefined }));

  const validate = () => {
    const next = {};
    if (!currentPassword) next.current = 'settings.currentPasswordRequired';
    if (!newPassword) next.new = 'auth.passwordRequired';
    else if (newPassword.length < 8) next.new = 'auth.passwordTooShort';
    if (newPassword && confirmPassword !== newPassword) next.confirm = 'status.passwordMismatch';
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const data = await changePassword({ currentPassword, newPassword });
      if (data?.accessToken) setSession(data);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      notify.success(t('status.passwordUpdated'));
    } catch (error) {
      if (serverMessageKey(error) === 'errors.currentPasswordWrong') {
        setFieldErrors({ current: 'errors.currentPasswordWrong' });
      } else {
        notify.error(tServer(error));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsCard title={t('settings.passwordTitle')} subtitle={t('settings.passwordSubtitle')}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <FormField
          label={t('settings.currentPassword')}
          type="password"
          value={currentPassword}
          onChange={(event) => {
            setCurrentPassword(event.target.value);
            clearError('current');
          }}
          autoComplete="current-password"
          error={fieldErrors.current && t(fieldErrors.current)}
        />
        <FormField
          label={t('settings.newPassword')}
          type="password"
          value={newPassword}
          onChange={(event) => {
            setNewPassword(event.target.value);
            clearError('new');
          }}
          placeholder={t('auth.signupPasswordPlaceholder')}
          autoComplete="new-password"
          error={fieldErrors.new && t(fieldErrors.new)}
        />
        <FormField
          label={t('settings.confirmPassword')}
          type="password"
          value={confirmPassword}
          onChange={(event) => {
            setConfirmPassword(event.target.value);
            clearError('confirm');
          }}
          autoComplete="new-password"
          error={fieldErrors.confirm && t(fieldErrors.confirm)}
        />
        <div>
          <Button type="submit" loading={saving} loadingLabel={t('common.updating')}>
            {t('settings.updatePassword')}
          </Button>
        </div>
      </form>
    </SettingsCard>
  );
}

function EmailSection() {
  const { user, updateUser } = useAuth();
  const { t, tServer } = useTranslation();

  const [step, setStep] = useState('idle'); // idle | requesting | code
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [errorStamp, setErrorStamp] = useState(0);
  const [saving, setSaving] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setInterval(() => setCooldown((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (user?.authProvider === 'google') {
    return (
      <SettingsCard title={t('settings.emailTitle')} subtitle={t('settings.emailSubtitle')}>
        <p className="text-sm text-muted">{t('settings.emailGoogleManaged')}</p>
      </SettingsCard>
    );
  }

  const handleRequest = async (event) => {
    event.preventDefault();
    const next = {};
    if (!newEmail.trim()) next.newEmail = 'auth.emailRequired';
    if (!password) next.password = 'settings.currentPasswordRequired';
    setFieldErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      const data = await requestEmailChange({ newEmail: newEmail.trim(), password });
      setCooldown(data?.cooldownSeconds || 60);
      setCode('');
      setCodeError('');
      setStep('code');
    } catch (error) {
      notify.error(tServer(error));
    } finally {
      setSaving(false);
    }
  };

  const submitCode = async (value) => {
    if (value.length < EMAIL_CODE_LENGTH) {
      setCodeError(t('auth.deviceCodeIncomplete'));
      setErrorStamp((stamp) => stamp + 1);
      return;
    }
    setSaving(true);
    setCodeError('');
    try {
      const data = await verifyEmailChange(value);
      updateUser(data.user);
      notify.success(t('status.emailUpdated'));
      setStep('idle');
      setNewEmail('');
      setPassword('');
      setCode('');
    } catch (error) {
      setCodeError(tServer(error));
      setCode('');
      setErrorStamp((stamp) => stamp + 1);
    } finally {
      setSaving(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0 || saving) return;
    setSaving(true);
    try {
      const data = await requestEmailChange({ newEmail: newEmail.trim(), password });
      setCooldown(data?.cooldownSeconds || 60);
      notify.success(t('auth.deviceCodeResent'));
    } catch (error) {
      notify.error(tServer(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsCard title={t('settings.emailTitle')} subtitle={t('settings.emailSubtitle')}>
      <p className="mb-4 text-sm text-ink">{user?.email}</p>

      {step === 'code' ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">{t('settings.emailCodeSentTo', { email: newEmail.trim() })}</p>
          <OtpInput
            length={EMAIL_CODE_LENGTH}
            value={code}
            onChange={(value) => {
              setCode(value);
              if (codeError) setCodeError('');
            }}
            onComplete={submitCode}
            disabled={saving}
            hasError={Boolean(codeError)}
            errorStamp={errorStamp}
            label={t('auth.deviceCodeLabel')}
          />
          {codeError && (
            <p role="alert" className="text-xs font-medium text-red-600">
              {codeError}
            </p>
          )}
          <div className="flex items-center gap-4">
            <Button type="button" loading={saving} loadingLabel={t('common.saving')} onClick={() => submitCode(code)}>
              {t('settings.confirmEmail')}
            </Button>
            <button
              type="button"
              onClick={resend}
              disabled={cooldown > 0 || saving}
              className="text-sm text-muted hover:text-ink disabled:cursor-default disabled:opacity-60"
            >
              {cooldown > 0 ? t('auth.deviceResendIn', { seconds: cooldown }) : t('auth.deviceResend')}
            </button>
          </div>
          <button type="button" onClick={() => setStep('idle')} className="self-start text-sm text-muted hover:text-ink">
            {t('common.cancel')}
          </button>
        </div>
      ) : (
        <form onSubmit={handleRequest} noValidate className="flex flex-col gap-4">
          <FormField
            label={t('settings.newEmail')}
            type="email"
            value={newEmail}
            onChange={(event) => {
              setNewEmail(event.target.value);
              setFieldErrors((prev) => ({ ...prev, newEmail: undefined }));
            }}
            error={fieldErrors.newEmail && t(fieldErrors.newEmail)}
          />
          <FormField
            label={t('settings.currentPassword')}
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setFieldErrors((prev) => ({ ...prev, password: undefined }));
            }}
            autoComplete="current-password"
            error={fieldErrors.password && t(fieldErrors.password)}
          />
          <div>
            <Button type="submit" loading={saving} loadingLabel={t('common.saving')}>
              {t('settings.sendEmailCode')}
            </Button>
          </div>
        </form>
      )}
    </SettingsCard>
  );
}

function DevicesSection() {
  const { clearSession, markIntentionalLogout } = useAuth();
  const { t, tServer } = useTranslation();
  const { formatDate } = useFormat();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState(null);
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await listSessions();
        if (!cancelled) setSessions(data?.sessions || []);
      } catch (error) {
        if (!cancelled) notify.error(tServer(error));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleRevoke = async (id) => {
    setRevokingId(id);
    try {
      await revokeSession(id);
      setSessions((prev) => prev.filter((session) => session.id !== id));
      notify.success(t('status.sessionRevoked'));
    } catch (error) {
      notify.error(tServer(error));
    } finally {
      setRevokingId(null);
    }
  };

  const handleLogoutAll = async () => {
    setLoggingOutAll(true);
    markIntentionalLogout();
    try {
      await logoutAllSessions();
      notify.success(t('status.loggedOutEverywhere'));
      clearSession();
    } catch (error) {
      notify.error(tServer(error));
      setLoggingOutAll(false);
    }
  };

  const lastActiveLabel = (value) =>
    t('settings.lastActive', { time: formatDate(new Date(value), { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) });

  return (
    <SettingsCard title={t('settings.devicesTitle')} subtitle={t('settings.devicesSubtitle')}>
      {loading ? (
        <p className="text-sm text-muted">{t('common.loading')}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {sessions.map((session) => (
            <li key={session.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-muted">
                  <Laptop className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {session.device}
                    {session.isCurrent && (
                      <span className="ml-2 rounded-full bg-ink/5 px-2 py-0.5 text-xs font-semibold text-ink/70">
                        {t('settings.thisDevice')}
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted">{lastActiveLabel(session.lastUsedAt)}</p>
                </div>
              </div>

              {!session.isCurrent && (
                <button
                  type="button"
                  onClick={() => handleRevoke(session.id)}
                  disabled={revokingId === session.id}
                  className="shrink-0 text-sm font-medium text-red-600 hover:text-red-700 disabled:cursor-wait disabled:opacity-60"
                >
                  {revokingId === session.id ? t('common.revoking') : t('settings.revoke')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 border-t border-border pt-5">
        <Button
          type="button"
          onClick={handleLogoutAll}
          loading={loggingOutAll}
          loadingLabel={t('common.loggingOutEverywhere')}
        >
          {t('settings.logoutEverywhere')}
        </Button>
      </div>
    </SettingsCard>
  );
}

function PreferencesSection() {
  const { user, updateUser, language, currency } = useAuth();
  const { t, tServer } = useTranslation();
  const { countries, languages, currencies } = useLocalizedOptions();

  // Everything here is a PENDING selection local to this form. Nothing is applied
  // to the app (or saved) until "Update preferences" succeeds; country, language
  // and currency are independent and never change one another.
  const [country, setCountry] = useState(user?.country || '');
  const [pendingLanguage, setPendingLanguage] = useState(language);
  const [pendingCurrency, setPendingCurrency] = useState(currency);
  const [saving, setSaving] = useState(false);
  const [countryError, setCountryError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!country) {
      setCountryError('onboarding.selectRequired');
      return;
    }

    setSaving(true);
    try {
      const data = await updateProfile({
        country,
        language: pendingLanguage,
        currency: pendingCurrency,
      });
      // Committing the saved user is what switches the whole app to the new language.
      updateUser(data.user);
      // Announce in the language that was just applied, not the one being replaced.
      notify.success(translate(pendingLanguage, 'status.preferencesSaved'));
    } catch (error) {
      notify.error(tServer(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsCard title={t('settings.preferencesTitle')} subtitle={t('settings.preferencesSubtitle')}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Combobox
          label={t('dashboard.country')}
          items={countries}
          value={country}
          onChange={(code) => {
            setCountry(code);
            setCountryError('');
          }}
          placeholder={t('combobox.searchCountries')}
          error={countryError && t(countryError)}
        />
        <div className="flex flex-col gap-1.5">
          <Combobox
            label={t('settings.appLanguage')}
            items={languages}
            value={pendingLanguage}
            onChange={setPendingLanguage}
            placeholder={t('combobox.searchLanguages')}
          />
          <p className="text-xs text-muted">{t('settings.languageHint')}</p>
        </div>
        <Combobox
          label={t('dashboard.currency')}
          items={currencies}
          value={pendingCurrency}
          onChange={setPendingCurrency}
          placeholder={t('combobox.searchCurrencies')}
        />

        <div>
          <Button type="submit" loading={saving} loadingLabel={t('common.saving')}>
            {t('settings.savePreferences')}
          </Button>
        </div>
      </form>
    </SettingsCard>
  );
}

function DangerZoneSection() {
  const { user, markIntentionalLogout, clearSession } = useAuth();
  const { t, tServer } = useTranslation();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const isGoogle = user?.authProvider === 'google';

  const handleDelete = async (event) => {
    event.preventDefault();
    setError('');

    if (isGoogle && confirmText.trim().toUpperCase() !== 'DELETE') {
      setError(t('settings.typeDeleteToConfirm'));
      return;
    }
    if (!isGoogle && !password) {
      setError(t('settings.currentPasswordRequired'));
      return;
    }

    setDeleting(true);
    try {
      markIntentionalLogout();
      await deleteAccount(isGoogle ? { confirm: confirmText.trim() } : { password });
      notify.success(t('status.accountDeleted'));
      clearSession();
    } catch (err) {
      setError(tServer(err));
      setDeleting(false);
    }
  };

  return (
    <SettingsCard title={t('settings.dangerZoneTitle')} subtitle={t('settings.dangerZoneSubtitle')}>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-100"
        >
          <AlertTriangle className="h-4 w-4" />
          {t('settings.deleteAccount')}
        </button>
      ) : (
        <form onSubmit={handleDelete} noValidate className="flex flex-col gap-4 rounded-lg border border-red-200 bg-red-50/60 p-4">
          <p className="text-sm text-red-700">{t('settings.deleteAccountWarning')}</p>

          {isGoogle ? (
            <FormField
              label={t('settings.typeDeleteLabel')}
              value={confirmText}
              onChange={(event) => {
                setConfirmText(event.target.value);
                setError('');
              }}
              error={error}
            />
          ) : (
            <FormField
              label={t('settings.currentPassword')}
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError('');
              }}
              autoComplete="current-password"
              error={error}
            />
          )}

          <div className="flex items-center gap-3">
            <Button type="submit" loading={deleting} loadingLabel={t('common.deleting')}>
              {t('settings.confirmDeleteAccount')}
            </Button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setPassword('');
                setConfirmText('');
                setError('');
              }}
              disabled={deleting}
              className="text-sm text-muted hover:text-ink"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      )}
    </SettingsCard>
  );
}

function SettingsPage() {
  const { signOut } = useAuth();
  const { t } = useTranslation();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
  };

  return (
    <div className="min-h-screen bg-surface">
      <DashboardHeader />

      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-ink">{t('settings.title')}</h1>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            aria-busy={signingOut ? 'true' : undefined}
            className="flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-black/[0.03] disabled:cursor-wait disabled:opacity-70"
          >
            {signingOut && <Loader2 className="h-4 w-4 animate-spin" />}
            {signingOut ? t('common.signingOut') : t('settings.signOut')}
          </button>
        </div>

        <ProfileSection />
        <EmailSection />
        <PasswordSection />
        <DevicesSection />
        <PreferencesSection />
        <DangerZoneSection />
      </div>
    </div>
  );
}

export default SettingsPage;
