import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      clear: () => store.clear(),
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
      get length() { return store.size },
      key: (i: number) => [...store.keys()][i] ?? null,
    },
    writable: false,
    configurable: true,
  })
}
