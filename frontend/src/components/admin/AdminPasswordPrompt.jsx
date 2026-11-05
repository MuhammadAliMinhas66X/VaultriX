import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Lock } from 'lucide-react';
import { registerAdminPasswordPrompt } from '../../services/adminPassword.js';

function AdminPasswordPrompt() {
  const [request, setRequest] = useState(null);
  const [value, setValue] = useState('');
  const resolver = useRef(null);

  useEffect(
    () =>
      registerAdminPasswordPrompt(
        (message) =>
          new Promise((resolve) => {
            resolver.current = resolve;
            setValue('');
            setRequest({ message });
          })
      ),
    []
  );

  const finish = (result) => {
    const resolve = resolver.current;
    resolver.current = null;
    setRequest(null);
    setValue('');
    if (resolve) resolve(result);
  };

  if (!request) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-4 backdrop-blur-[2px]" onClick={() => finish(null)}>
      <form
        role="dialog"
        aria-modal="true"
        aria-label="Confirm with your password"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          if (value) finish(value);
        }}
        className="w-full max-w-sm rounded-2xl border border-border bg-white p-6 shadow-2xl"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-white">
          <Lock className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>
        <h2 className="mt-4 text-lg font-semibold tracking-tight text-ink">Confirm with your password</h2>
        <p className="mt-1 text-sm text-muted">{request.message}</p>
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Your password"
          className="mt-4 h-11 w-full rounded-xl border border-border bg-white px-3.5 text-sm text-ink outline-none transition focus:border-ink"
        />
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => finish(null)}
            className="h-11 flex-1 rounded-xl border border-border text-sm font-medium text-ink outline-none transition hover:bg-surface focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!value}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-ink text-sm font-semibold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-40"
          >
            Confirm
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}

export default AdminPasswordPrompt;
