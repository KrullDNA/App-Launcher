import { contextBridge, ipcRenderer } from 'electron'

const api = {
  window: {
    hide: (): Promise<void> => ipcRenderer.invoke('window:hide')
  },
  app: {
    getInfo: (): Promise<{ version: string; platform: string }> =>
      ipcRenderer.invoke('app:getInfo')
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
