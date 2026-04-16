/// <reference types="vite/client" />

declare global {
  interface IndexedApp {
    id: string
    name: string
    path: string
    icon?: string
  }

  interface IndexedFile {
    id: string
    name: string
    path: string
    modifiedAt?: string
  }

  interface ShortcutCandidate {
    itemId: string
    count: number
    lastUsed: string
  }

  interface ShortcutsData {
    [abbrev: string]: ShortcutCandidate[]
  }

  interface ClipboardEntry {
    id: string
    text: string
    preview: string
    timestamp: string
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
      getFiles: () => Promise<IndexedFile[]>
      reindexFiles: () => Promise<IndexedFile[]>
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
    shell: {
      openPath: (filePath: string) => Promise<void>
      openExternal: (url: string) => Promise<void>
    }
    clipboard: {
      getHistory: () => Promise<ClipboardEntry[]>
      write: (text: string) => Promise<void>
    }
    system: {
      execute: (command: string) => Promise<void>
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
