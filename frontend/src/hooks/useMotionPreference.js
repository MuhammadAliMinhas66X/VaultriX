import { useSyncExternalStore } from 'react';
import { useReducedMotion } from 'framer-motion';

const STORAGE_KEY = 'vaultrix.motion';
const EVENT = 'vaultrix:motion';

const read = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'always' ? 'always' : 'system';
  } catch (error) {
    return 'system';
  }
};

const subscribe = (listener) => {
  window.addEventListener(EVENT, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener('storage', listener);
  };
};

export const setMotionMode = (mode) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode === 'always' ? 'always' : 'system');
  } catch (error) {
    return;
  }
  window.dispatchEvent(new Event(EVENT));
};

export const useMotionMode = () => useSyncExternalStore(subscribe, read, () => 'system');

export const useAppReducedMotion = () => {
  const system = useReducedMotion();
  const mode = useMotionMode();
  return mode === 'always' ? false : Boolean(system);
};
