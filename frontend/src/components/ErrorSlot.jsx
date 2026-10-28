import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import InlineAlert from './InlineAlert.jsx';
import { registerSlot } from '../i18n/notifications.js';

const VISIBLE_MS = 15000;
const ARM_MS = 600;

function ErrorSlot({ className = '' }) {
  const ref = useRef(null);
  const [item, setItem] = useState(null);

  useEffect(() => registerSlot({ el: ref.current, show: setItem }), []);

  useEffect(() => {
    if (!item) return undefined;
    const scope = ref.current ? ref.current.closest('[data-error-scope], form') : null;
    let armed = false;
    const arm = setTimeout(() => {
      armed = true;
    }, ARM_MS);
    const hide = setTimeout(() => setItem(null), VISIBLE_MS);
    const onInput = () => {
      if (armed) setItem(null);
    };
    if (scope) scope.addEventListener('input', onInput);
    return () => {
      clearTimeout(arm);
      clearTimeout(hide);
      if (scope) scope.removeEventListener('input', onInput);
    };
  }, [item]);

  return (
    <div ref={ref} className={`empty:hidden ${className}`}>
      <AnimatePresence initial={false}>
        {item && <InlineAlert key={item.stamp} tone={item.tone} title={item.title} message={item.message} onDismiss={() => setItem(null)} />}
      </AnimatePresence>
    </div>
  );
}

export default ErrorSlot;
