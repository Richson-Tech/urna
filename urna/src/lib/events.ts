/**
 * In-memory event bus — one EventEmitter-ish per election code. Suits
 * our single-process deployment target; if we ever horizontally scale
 * this app, swap this for Redis pub/sub or Postgres LISTEN/NOTIFY. The
 * API surface is deliberately tiny to make that swap easy.
 */

type Listener = () => void;

const listeners = new Map<string, Set<Listener>>();

export function subscribe(code: string, fn: Listener): () => void {
  let set = listeners.get(code);
  if (!set) {
    set = new Set();
    listeners.set(code, set);
  }
  set.add(fn);
  return () => {
    set!.delete(fn);
    if (set!.size === 0) listeners.delete(code);
  };
}

export function emit(code: string): void {
  const set = listeners.get(code);
  if (!set) return;
  for (const fn of set) {
    try {
      fn();
    } catch {
      /* listener errors shouldn't break the emit loop */
    }
  }
}
