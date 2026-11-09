import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import './resources.js';
import { EMPTY_ENTRY, keyOf, load, readEntry, release, retain, setData, subscribe } from './dataStore.js';

export function useResource(name, params = null, { enabled = true, onError } = {}) {
  const key = keyOf(name, params);
  const entry = useSyncExternalStore(
    (listener) => subscribe(key, listener),
    () => readEntry(key),
    () => EMPTY_ENTRY
  );

  const paramsRef = useRef(params);
  paramsRef.current = params;
  const errorRef = useRef(onError);
  errorRef.current = onError;

  useEffect(() => {
    if (!enabled) return undefined;
    const mine = paramsRef.current;
    retain(name, mine);
    load(name, mine);
    return () => release(name, mine);
  }, [key, enabled, name]);

  useEffect(() => {
    if (entry.error && errorRef.current) errorRef.current(entry.error);
  }, [entry.errorStamp]);

  const reload = useCallback(() => load(name, paramsRef.current, { force: true }), [key, name]);
  const update = useCallback((updater) => setData(name, paramsRef.current, updater), [key, name]);

  return {
    data: entry.data,
    error: entry.error,
    loading: enabled && entry.data === undefined && !entry.error,
    refreshing: entry.loading && entry.data !== undefined,
    reload,
    update,
  };
}
