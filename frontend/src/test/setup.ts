import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { toast } from '@heroui/react'

if (typeof globalThis.localStorage?.getItem !== 'function') {
  const values = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
    },
  })
}
if (typeof globalThis.matchMedia !== 'function') {
  Object.defineProperty(globalThis, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  })
}
if (typeof globalThis.ResizeObserver !== 'function') {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(globalThis, 'ResizeObserver', {
    configurable: true,
    value: ResizeObserverMock,
  })
}
await import('../i18n/config')

afterEach(() => {
  toast.clear()
  cleanup()
})
