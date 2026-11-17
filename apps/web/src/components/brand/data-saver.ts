'use client';

import { useCallback, useSyncExternalStore } from 'react';

/** Remembered per device (browser), like the mobile app's setting. */
const KEY = 'azza.dataSaver';
const listeners = new Set<() => void>();
/** Fallback when storage is blocked (private mode): the choice lasts until the page is closed. */
let memory = false;

function read(): boolean {
  try {
    return window.localStorage.getItem(KEY) === '1';
  } catch {
    return memory;
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => e.key === KEY && cb();
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
}

/** `[on, set]` — data saver caps lesson videos to the lowest quality. Off on the server and when storage is blocked. */
export function useDataSaver(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(subscribe, read, () => false);
  const set = useCallback((next: boolean) => {
    memory = next;
    try {
      if (next) window.localStorage.setItem(KEY, '1');
      else window.localStorage.removeItem(KEY);
    } catch {
      // Private mode: `memory` keeps it.
    }
    listeners.forEach((l) => l());
  }, []);
  return [on, set];
}
