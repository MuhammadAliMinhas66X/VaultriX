import { Component } from 'react';
import { AlertTriangle, Copy, RefreshCw } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation.js';
import { notify } from '../i18n/notifications.js';

function Fallback({ error, onCopy }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink text-white shadow-sm">
        <AlertTriangle className="h-6 w-6" strokeWidth={1.75} />
      </span>
      <h2 className="text-xl font-semibold tracking-tight text-ink">{t('errors.crashTitle')}</h2>
      <p className="text-sm text-muted">{t('errors.crashBody')}</p>
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        <button type="button" onClick={() => window.location.reload()} className="flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent/40">
          <RefreshCw className="h-4 w-4" /> {t('errors.crashReload')}
        </button>
        <a href="/dashboard" className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium text-ink outline-none transition hover:bg-surface focus-visible:ring-2 focus-visible:ring-accent/40">
          {t('errors.crashHome')}
        </a>
        <button type="button" onClick={() => onCopy(error, t)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-muted outline-none transition hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/40">
          <Copy className="h-4 w-4" /> {t('errors.crashCopy')}
        </button>
      </div>
    </div>
  );
}

// Catches a rendering error so one broken screen shows a calm card instead of a
// blank white page. Give it a `resetKey` (the route) so it clears on navigation.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, resetKey: props.resetKey };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  static getDerivedStateFromProps(props, state) {
    if (props.resetKey !== state.resetKey) return { error: null, resetKey: props.resetKey };
    return null;
  }

  componentDidCatch(error, info) {
    // Keep a trace for the console; never send user data anywhere.
    console.error('Screen crashed:', error, info?.componentStack);
  }

  copy = (error, t) => {
    const text = `${window.location.pathname}\n${error?.message || error}\n${String(error?.stack || '').split('\n').slice(0, 6).join('\n')}`;
    try {
      navigator.clipboard.writeText(text).then(() => notify.success(t('errors.crashCopied')));
    } catch (failure) {
      return;
    }
  };

  render() {
    if (this.state.error) return <Fallback error={this.state.error} onCopy={this.copy} />;
    return this.props.children;
  }
}

export default ErrorBoundary;
