/// <reference types="vite/client" />

interface QuickLaunchAPI {
  window: {
    hide: () => void
  }
  app: {
    getInfo: () => Promise<{ version: string; platform: string }>
  }
  onWindowShown: (callback: () => void) => () => void
}

declare global {
  interface Window {
    quicklaunch: QuickLaunchAPI
  }
}

export {}
