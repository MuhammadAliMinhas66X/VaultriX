import { useEffect, useRef, useState } from 'react';
import { animate } from 'framer-motion';
import { useAppReducedMotion } from '../hooks/useMotionPreference.js';

function AnimatedAmount({ value, format, className = '' }) {
  const reduced = useAppReducedMotion();
  const [shown, setShown] = useState(reduced ? value : 0);
  const latest = useRef(reduced ? value : 0);

  useEffect(() => {
    if (reduced) {
      latest.current = value;
      setShown(value);
      return undefined;
    }
    const controls = animate(latest.current, value, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (next) => {
        latest.current = next;
        setShown(next);
      },
    });
    return () => controls.stop();
  }, [value, reduced]);

  return (
    <span className={className} aria-label={format(value)}>
      <span aria-hidden="true">{format(shown)}</span>
    </span>
  );
}

export default AnimatedAmount;
