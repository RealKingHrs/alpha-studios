import { useSyncExternalStore } from 'react';
import { safeGet, safeSet } from '../util/storage';
import { award, parseEarned } from './motion/achievements';

const KEY = 'alpha:achievements';
const EMPTY: string[] = [];

/** A tiny store outside React, so the server render and the first client render agree, then the saved list loads. */
let earned: string[] = EMPTY;
let loaded = false;
let toast: string | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function load() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  earned = parseEarned(safeGet(KEY));
}

export function earn(id: string) {
  load();
  const next = award(earned, id);
  if (!next.isNew) return;
  earned = next.earned;
  toast = id;
  safeSet(KEY, JSON.stringify(earned));
  emit();
  setTimeout(() => {
    if (toast === id) {
      toast = null;
      emit();
    }
  }, 4200);
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  load();
  return () => void listeners.delete(l);
};

export const useEarned = () =>
  useSyncExternalStore(
    subscribe,
    () => {
      load();
      return earned;
    },
    () => EMPTY,
  );

export const useToast = () =>
  useSyncExternalStore(
    subscribe,
    () => toast,
    () => null,
  );
