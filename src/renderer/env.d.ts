/// <reference types="vite/client" />

declare global {
  interface IndexedApp {
    id: string
    name: string
    path: string
    icon?: string
  }

  interface QuickLaunchAPI {
    window: {
      hide: () => Promise<void>
      resize: (height: number) => Promise<void>
    }
    app: {
      getInfo: () => Promise<{ version: string; platform: string }>
      launch: (appData: IndexedApp) => Promise<void>
    }
    indexer: {
      getApps: () => Promise<IndexedApp[]>
      reindex: () => Promise<IndexedApp[]>
      onAppsUpdated: (callback: (apps: IndexedApp[]) => void) => () => void
    }
    settings: {
      get: <T>(key: string) => Promise<T | undefined>
      set: <T>(key: string, value: T) => Promise<void>
    }
    onWindowShown: (callback: () => void) => () => void
    onWindowHidden: (callback: () => void) => () => void
  }

  interface Window {
    quicklaunch: QuickLaunchAPI
  }
}

export {}
