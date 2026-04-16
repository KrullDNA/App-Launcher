/// <reference types="vite/client" />

interface QuickLaunchAPI {
  window: {
    hide: () => Promise<void>
    resize: (height: number) => Promise<void>
  }
  app: {
    getInfo: () => Promise<{ version: string; platform: string }>
  }
  settings: {
    get: <T>(key: string) => Promise<T | undefined>
    set: <T>(key: string, value: T) => Promise<void>
  }
  onWindowShown: (callback: () => void) => () => void
  onWindowHidden: (callback: () => void) => () => void
}

declare global {
  interface Window {
    quicklaunch: QuickLaunchAPI
  }
}

export {}
