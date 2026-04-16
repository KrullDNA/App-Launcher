/// <reference types="vite/client" />

declare global {
  interface IndexedApp {
    id: string
    name: string
    path: string
    icon?: string
  }

  interface ShortcutCandidate {
    itemId: string
    count: number
    lastUsed: string
  }

  interface ShortcutsData {
    [abbrev: string]: ShortcutCandidate[]
  }

  interface QuickLaunchAPI {
    window: {
      hide: () => Promise<void>
      resize: (height: number) => Promise<void>
    }
    app: {
      getInfo: () => Promise<{ version: string; platform: string }>
      launch: (appData: IndexedApp, searchText?: string) => Promise<void>
    }
    indexer: {
      getApps: () => Promise<IndexedApp[]>
      reindex: () => Promise<IndexedApp[]>
      onAppsUpdated: (callback: (apps: IndexedApp[]) => void) => () => void
    }
    shortcuts: {
      get: (abbrev: string) => Promise<ShortcutCandidate[]>
      getAll: () => Promise<ShortcutsData>
      record: (abbrev: string, itemId: string) => Promise<void>
      delete: (abbrev: string) => Promise<void>
      clearAll: () => Promise<void>
      getBackups: () => Promise<{ date: string }[]>
      restoreBackup: (date: string) => Promise<boolean>
      getMaxGlobalCount: () => Promise<number>
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
