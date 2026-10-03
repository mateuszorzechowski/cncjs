import { useCallback, useEffect, useState } from 'react';

/*
 * State that outlives the screen it is on (Mateusz, 2026-10-03: *"po wyjściu
 * z sondy i ponownym powrocie powinno przechodzić do aktualnego kroku"*): the
 * probe wizard's step and choices, kept in this page's memory by name while
 * the screen is away, and read by anything else that asks for the same name —
 * the menu, which marks a wizard under way. Gone with a reload, as a wizard
 * begun and never finished should be.
 */
const kept = new Map();
const listeners = new Map();

const tell = (key) => {
  for (const listener of listeners.get(key) || []) {
    listener(kept.get(key));
  }
};

/** Like `useState`, the value kept under `key` across unmounts and shared with every user of the key. */
const useKept = (key, initial) => {
  const [value, setValue] = useState(() => {
    if (!kept.has(key)) {
      kept.set(key, typeof initial === 'function' ? initial() : initial);
    }
    return kept.get(key);
  });

  useEffect(() => {
    const all = listeners.get(key) || new Set();
    all.add(setValue);
    listeners.set(key, all);
    setValue(kept.get(key));
    return () => all.delete(setValue);
  }, [key]);

  const set = useCallback((next) => {
    const value = typeof next === 'function' ? next(kept.get(key)) : next;
    kept.set(key, value);
    tell(key);
  }, [key]);

  return [value, set];
};

export default useKept;
