import { createContext, useContext, useSyncExternalStore } from 'react';
import type { Store } from './store';
export const StoreCtx = createContext<Store>(null as any);
export function useStore() {
  const s = useContext(StoreCtx);
  useSyncExternalStore(f => s.subscribe(f), () => s.version);
  return s;
}
export const uid = () => crypto.randomUUID();
