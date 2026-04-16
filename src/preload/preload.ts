import { contextBridge, ipcRenderer } from 'electron'

const api = {
  window: {
    hide: (): Promise<void> => ipcRenderer.invoke('window:hide'),
    resize: (height: number): Promise<void> => ipcRenderer.invoke('window:resize', height)
  },
  app: {
    getInfo: (): Promise<{ version: string; platform: string }> =>
      ipcRenderer.invoke('app:getInfo')
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
