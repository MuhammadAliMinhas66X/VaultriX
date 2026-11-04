import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'vaultrix.secure';
const EVENT = 'vaultrix:secure';

const read = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'on';
  } catch (error) {
    return false;
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

export const setSecureMode = (on) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
  } catch (error) {
    return;
  }
  window.dispatchEvent(new Event(EVENT));
};

export const useSecureMode = () => useSyncExternalStore(subscribe, read, () => false);

export const canFullscreen = () =>
  typeof document !== 'undefined' &&
  Boolean(document.documentElement.requestFullscreen) &&
  window.matchMedia('(pointer: fine)').matches;
