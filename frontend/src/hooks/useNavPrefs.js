import { useSyncExternalStore } from 'react';

// Which links show in the menu. Stored on this device. Everything is ON except Groups,
// which stays OFF until switched on (as before). Dashboard is always shown.
const STORAGE_KEY = 'vaultrix.navPrefs';
const OLD_GROUPS_KEY = 'vaultrix.groupsInMenu';
const listeners = new Set();
let cache = null;
let cacheRaw = null;

export const NAV_TOGGLES = ['income', 'expenses', 'bills', 'loans', 'salary', 'budgets', 'goals', 'committees', 'accounts', 'groups'];
const DEFAULTS = { groups: false };

const readRaw = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
};

const compute = (raw) => {
  let saved = {};
  try {
    saved = raw ? JSON.parse(raw) : {};
  } catch {
    saved = {};
  }
  const prefs = {};
  NAV_TOGGLES.forEach((id) => {
    prefs[id] = typeof saved[id] === 'boolean' ? saved[id] : DEFAULTS[id] === false ? false : true;
  });
  if (typeof saved.groups !== 'boolean') {
    try {
      if (window.localStorage.getItem(OLD_GROUPS_KEY) === '1') prefs.groups = true;
    } catch {
      // storage blocked
    }
  }
  return prefs;
};

const snapshot = () => {
  const raw = readRaw();
  if (cache === null || raw !== cacheRaw) {
    cacheRaw = raw;
    cache = compute(raw);
  }
  return cache;
};

export const setNavPref = (id, on) => {
  const next = { ...snapshot(), [id]: Boolean(on) };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // storage blocked: the switch just does not stick
  }
  cacheRaw = null;
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

const SERVER = compute('');
export const useNavPrefs = () => useSyncExternalStore(subscribe, snapshot, () => SERVER);
