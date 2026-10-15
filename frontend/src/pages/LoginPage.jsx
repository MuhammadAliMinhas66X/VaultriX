import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import AuthLayout from '../components/AuthLayout.jsx';
import FormField from '../components/FormField.jsx';
import EmailField from '../components/EmailField.jsx';
import Button from '../components/Button.jsx';
import Captcha, { captchaEnabled } from '../components/Captcha.jsx';
import GoogleAuthButton from '../components/GoogleAuthButton.jsx';
import PageLoader from '../components/PageLoader.jsx';
import LockScreen from '../components/LockScreen.jsx';
import { login, getLoginStatus } from '../services/authService.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from '../i18n/useTranslation.js';
import { notify } from '../i18n/notifications.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const formatCountdown = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSession } = useAuth();
  const { t, tServer } = useTranslation();
  const redirectTo = location.state?.from?.pathname || '/dashboard';

  const [email, setEmail] = useState(location.state?.email || '');
  const [emailStatus, setEmailStatus] = useState('idle');
  const [captchaToken, setCaptchaToken] = useState(null);
  const captchaRef = useRef(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loginBlocked, setLoginBlocked] = useState(false);
  const [lockUntil, setLockUntil] = useState(null);
  const [lockTier, setLockTier] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (new URLSearchParams(location.search).get('google_error')) {
      notify.error(t('auth.googleFailed'));
      navigate('/login', { replace: true });
    }
  }, []);

  // The lock is tracked on the server against the account, not the browser,
  // so it shows the same countdown after a refresh or from a different device.
  useEffect(() => {
    const value = email.trim();
    if (!EMAIL_PATTERN.test(value)) return undefined;

    const timer = setTimeout(() => {
      getLoginStatus(value).then((data) => {
        if (data?.locked && data.lockUntil) {
          setLockUntil(new Date(data.lockUntil));
          setLockTier(data.lockTier || 1);
        } else {
          setLockUntil(null);
          setLockTier(0);
        }
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [email]);

  useEffect(() => {
    if (!lockUntil) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [lockUntil]);

  const isLocked = Boolean(lockUntil) && now < lockUntil.getTime();
  const secondsRemaining = isLocked ? Math.max(0, Math.ceil((lockUntil.getTime() - now) / 1000)) : 0;

  useEffect(() => {
    if (lockUntil && now >= lockUntil.getTime()) {
      setLockUntil(null);
    }
  }, [now, lockUntil]);

  const proceedAfterAuth = (data) => {
    setSession(data);
    setRedirecting(true);
    setTimeout(() => {
      const destination = data.user.onboardingCompleted ? redirectTo : '/onboarding';
      navigate(destination, { replace: true });
    }, 500);
  };

  const validate = () => {
    const next = {};
    if (!email.trim()) next.email = 'auth.emailRequired';
    else if (!EMAIL_PATTERN.test(email.trim()) || emailStatus === 'invalid') next.email = 'auth.emailInvalid';
    else if (emailStatus === 'disposable') next.email = 'auth.emailDisposable';
    if (!password) next.password = 'auth.passwordRequired';
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate() || isLocked) return;

    setLoading(true);
    try {
      const data = await login({ email: email.trim(), password, captchaToken });
      proceedAfterAuth(data);
    } catch (error) {
      notify.error(tServer(error));
      captchaRef.current?.reset();
      setLoading(false);
      setLoginBlocked(true);
      if (error?.data?.lockUntil) {
        setLockUntil(new Date(error.data.lockUntil));
        setLockTier(error.data.lockTier || 1);
      }
    }
  };

  const clearError = (field) => {
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    setLoginBlocked(false);
  };

  if (redirecting) {
    return <PageLoader label={t('auth.settingUp')} />;
  }

  if (isLocked && lockTier >= 2) {
    return <LockScreen display={formatCountdown(secondsRemaining)} />;
  }

  return (
    <AuthLayout title={t('auth.loginTitle')} subtitle={t('auth.loginSubtitle')}>
      <GoogleAuthButton onError={(message) => notify.error(message)} />

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted">{t('auth.or')}</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <EmailField
          label={t('auth.emailLabel')}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            clearError('email');
          }}
          placeholder={t('auth.emailPlaceholder')}
          checkProvider
          onStatusChange={setEmailStatus}
          error={fieldErrors.email && t(fieldErrors.email)}
        />

        <div className="relative">
          <FormField
            label={t('auth.passwordLabel')}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              clearError('password');
            }}
            placeholder={t('auth.passwordPlaceholder')}
            autoComplete="current-password"
            error={fieldErrors.password && t(fieldErrors.password)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
            className="absolute right-3 top-9 text-muted hover:text-ink"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            state={{ email: email.trim() }}
            className="text-sm text-muted hover:text-ink"
          >
            {t('auth.forgotPassword')}
          </Link>
        </div>

        {isLocked && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            {t('auth.lockedMessage', { time: formatCountdown(secondsRemaining) })}
          </div>
        )}

        <Captcha ref={captchaRef} onToken={setCaptchaToken} />

        <Button
          type="submit"
          loading={loading}
          loadingLabel={t('auth.signingIn')}
          disabled={isLocked || loginBlocked || (captchaEnabled && !captchaToken)}
        >
          {captchaEnabled && !captchaToken ? t('captcha.verifying') : t('auth.signIn')}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {t('auth.noAccount')}{' '}
        <Link to="/signup" className="font-medium text-ink hover:underline">
          {t('auth.createOne')}
        </Link>
      </p>
    </AuthLayout>
  );
}

export default LoginPage;
