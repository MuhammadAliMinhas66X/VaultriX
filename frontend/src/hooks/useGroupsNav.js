import { useSyncExternalStore } from 'react';

// Whether Groups shows in the menu. Off until switched on in Settings. Stored on this device.
const STORAGE_KEY = 'vaultrix.groupsInMenu';
const listeners = new Set();

const read = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

export const setGroupsInMenu = (on) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? '1' : '0');
  } catch {
    // storage blocked: the switch just stays off
  }
  listeners.forEach((listener) => listener());
};

const subscribe = (listener) => {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
};

export const useGroupsInMenu = () => useSyncExternalStore(subscribe, read, () => false);
