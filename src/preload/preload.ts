import { contextBridge, ipcRenderer } from 'electron'

export interface IndexedApp {
  id: string
  name: string
  path: string
  icon?: string
}

export interface ShortcutCandidate {
  itemId: string
  count: number
  lastUsed: string
}

export interface ShortcutsData {
  [abbrev: string]: ShortcutCandidate[]
}

const api = {
  window: {
    hide: (): Promise<void> => ipcRenderer.invoke('window:hide'),
    resize: (height: number): Promise<void> => ipcRenderer.invoke('window:resize', height)
  },
  app: {
    getInfo: (): Promise<{ version: string; platform: string }> =>
      ipcRenderer.invoke('app:getInfo'),
    launch: (appData: IndexedApp, searchText?: string): Promise<void> =>
      ipcRenderer.invoke('app:launch', appData, searchText)
  },
  indexer: {
    getApps: (): Promise<IndexedApp[]> => ipcRenderer.invoke('indexer:getApps'),
    reindex: (): Promise<IndexedApp[]> => ipcRenderer.invoke('indexer:reindex'),
    onAppsUpdated: (callback: (apps: IndexedApp[]) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, apps: IndexedApp[]): void =>
        callback(apps)
      ipcRenderer.on('indexer:apps-updated', handler)
      return () => {
        ipcRenderer.removeListener('indexer:apps-updated', handler)
      }
    }
  },
  shortcuts: {
    get: (abbrev: string): Promise<ShortcutCandidate[]> =>
      ipcRenderer.invoke('shortcuts:get', abbrev),
    getAll: (): Promise<ShortcutsData> =>
      ipcRenderer.invoke('shortcuts:getAll'),
    record: (abbrev: string, itemId: string): Promise<void> =>
      ipcRenderer.invoke('shortcuts:record', abbrev, itemId),
    delete: (abbrev: string): Promise<void> =>
      ipcRenderer.invoke('shortcuts:delete', abbrev),
    clearAll: (): Promise<void> =>
      ipcRenderer.invoke('shortcuts:clearAll'),
    getBackups: (): Promise<{ date: string }[]> =>
      ipcRenderer.invoke('shortcuts:getBackups'),
    restoreBackup: (date: string): Promise<boolean> =>
      ipcRenderer.invoke('shortcuts:restoreBackup', date),
    getMaxGlobalCount: (): Promise<number> =>
      ipcRenderer.invoke('shortcuts:getMaxGlobalCount')
  },
  settings: {
    get: <T>(key: string): Promise<T | undefined> => ipcRenderer.invoke('settings:get', key),
    set: <T>(key: string, value: T): Promise<void> => ipcRenderer.invoke('settings:set', key, value)
  },
  onWindowShown: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('window-shown', handler)
    return () => {
      ipcRenderer.removeListener('window-shown', handler)
    }
  },
  onWindowHidden: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('window-hidden', handler)
    return () => {
      ipcRenderer.removeListener('window-hidden', handler)
    }
  }
}

contextBridge.exposeInMainWorld('quicklaunch', api)
