import {
  app,
  BrowserWindow,
  globalShortcut,
  Tray,
  Menu,
  screen,
  ipcMain,
  nativeImage,
  shell
} from 'electron'
import { join } from 'path'
import { execFile, spawn } from 'child_process'
import Store from 'electron-store'
import { indexApps, getCachedApps, type IndexedApp } from './indexer'
import {
  getShortcut,
  recordUsage,
  getAllShortcuts,
  deleteShortcut,
  clearAll as clearAllShortcuts,
  getBackups,
  restoreBackup,
  getMaxGlobalLaunchCount
} from './shortcuts-db'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let reindexTimer: ReturnType<typeof setInterval> | null = null

const store = new Store()

const WINDOW_WIDTH = 680
const INPUT_HEIGHT = 72
const REINDEX_INTERVAL_MS = 30 * 60 * 1000 // 30 minutes

function createWindow(): void {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize
  const x = Math.round((screenWidth - WINDOW_WIDTH) / 2)
  const y = Math.round(screenHeight * 0.25)

  mainWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: INPUT_HEIGHT,
    x,
    y,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    hasShadow: true,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('blur', () => {
    hideWindow()
  })
}

function showWindow(): void {
  if (!mainWindow) return

  const cursorPoint = screen.getCursorScreenPoint()
  const activeDisplay = screen.getDisplayNearestPoint(cursorPoint)
  const { x: displayX, y: displayY, width: displayWidth, height: displayHeight } =
    activeDisplay.workArea

  const x = Math.round(displayX + (displayWidth - WINDOW_WIDTH) / 2)
  const y = Math.round(displayY + displayHeight * 0.25)

  mainWindow.setPosition(x, y)
  mainWindow.setSize(WINDOW_WIDTH, INPUT_HEIGHT)
  mainWindow.show()
  mainWindow.focus()
  mainWindow.webContents.send('window-shown')
}

function hideWindow(): void {
  if (!mainWindow || !mainWindow.isVisible()) return
  mainWindow.hide()
  mainWindow.webContents.send('window-hidden')
}

function toggleWindow(): void {
  if (!mainWindow) return
  if (mainWindow.isVisible()) {
    hideWindow()
  } else {
    showWindow()
  }
}

function registerHotkey(): void {
  const hotkey = process.platform === 'darwin' ? 'CommandOrControl+Space' : 'Ctrl+Space'

  const registered = globalShortcut.register(hotkey, toggleWindow)

  if (!registered && process.platform === 'darwin') {
    globalShortcut.register('CommandOrControl+Shift+Space', toggleWindow)
    console.log('Hotkey registered: Cmd+Shift+Space (fallback)')
  } else {
    console.log(`Hotkey registered: ${hotkey}`)
  }
}

function createTray(): void {
  const iconPath = join(__dirname, '../../assets/icons/tray-icon.png')
  const icon = nativeImage.createFromPath(iconPath)
  const trayIcon = icon.resize({ width: 16, height: 16 })

  tray = new Tray(trayIcon)
  tray.setToolTip('KDNA QuickLaunch')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show',
      click: () => showWindow()
    },
    {
      label: 'Settings',
      click: () => {
        // Placeholder for Session 6
        console.log('Settings clicked')
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    toggleWindow()
  })
}

// ─── App launching ───────────────────────────────────────────

async function launchApp(appItem: IndexedApp): Promise<void> {
  const appPath = appItem.path

  try {
    if (process.platform === 'win32') {
      // Windows: use start for .lnk files, shell.openPath for others
      if (appPath.endsWith('.lnk') || appPath.endsWith('.exe')) {
        execFile('cmd', ['/c', 'start', '', appPath], { windowsHide: true })
      } else {
        await shell.openPath(appPath)
      }
    } else if (process.platform === 'darwin') {
      // macOS: open the .app bundle
      execFile('open', [appPath])
    } else {
      // Linux: use the exec path from .desktop file
      // The path stored is already the executable command
      const parts = appPath.split(/\s+/)
      const cmd = parts[0]
      const args = parts.slice(1).filter((a) => !a.startsWith('%'))
      const child = spawn(cmd, args, { detached: true, stdio: 'ignore' })
      child.unref()
    }
  } catch (err) {
    console.error('Failed to launch app:', appPath, err)
    // Fallback to shell.openPath
    await shell.openPath(appPath)
  }
}

// ─── Indexing lifecycle ──────────────────────────────────────

function sendAppsToRenderer(apps: IndexedApp[]): void {
  if (!mainWindow) return
  mainWindow.webContents.send('indexer:apps-updated', apps)
}

async function runIndexing(): Promise<IndexedApp[]> {
  console.log('Indexing applications...')
  const apps = await indexApps()
  console.log(`Indexed ${apps.length} applications`)
  sendAppsToRenderer(apps)
  return apps
}

function startReindexTimer(): void {
  if (reindexTimer) clearInterval(reindexTimer)
  reindexTimer = setInterval(() => {
    runIndexing()
  }, REINDEX_INTERVAL_MS)
}

// ─── IPC ─────────────────────────────────────────────────────

function setupIPC(): void {
  ipcMain.handle('window:hide', () => {
    hideWindow()
  })

  ipcMain.handle('window:resize', (_event, height: number) => {
    if (!mainWindow) return
    mainWindow.setSize(WINDOW_WIDTH, Math.round(height))
  })

  ipcMain.handle('app:getInfo', () => ({
    version: app.getVersion(),
    platform: process.platform
  }))

  ipcMain.handle('settings:get', (_event, key: string) => {
    return store.get(key)
  })

  ipcMain.handle('settings:set', (_event, key: string, value: unknown) => {
    store.set(key, value)
  })

  // Indexer IPC
  ipcMain.handle('indexer:getApps', () => {
    return getCachedApps()
  })

  ipcMain.handle('indexer:reindex', async () => {
    return await runIndexing()
  })

  // Launch IPC
  ipcMain.handle('app:launch', async (_event, appData: IndexedApp, searchText?: string) => {
    // Record usage for adaptive learning
    if (searchText && searchText.trim()) {
      recordUsage(searchText.trim(), appData.id)
    }
    await launchApp(appData)
    hideWindow()
  })

  // Shortcuts IPC
  ipcMain.handle('shortcuts:get', (_event, abbrev: string) => {
    return getShortcut(abbrev)
  })

  ipcMain.handle('shortcuts:getAll', () => {
    return getAllShortcuts()
  })

  ipcMain.handle('shortcuts:record', (_event, abbrev: string, itemId: string) => {
    recordUsage(abbrev, itemId)
  })

  ipcMain.handle('shortcuts:delete', (_event, abbrev: string) => {
    deleteShortcut(abbrev)
  })

  ipcMain.handle('shortcuts:clearAll', () => {
    clearAllShortcuts()
  })

  ipcMain.handle('shortcuts:getBackups', () => {
    return getBackups()
  })

  ipcMain.handle('shortcuts:restoreBackup', (_event, date: string) => {
    return restoreBackup(date)
  })

  ipcMain.handle('shortcuts:getMaxGlobalCount', () => {
    return getMaxGlobalLaunchCount()
  })
}

// ─── App lifecycle ───────────────────────────────────────────

app.whenReady().then(async () => {
  createWindow()
  createTray()
  registerHotkey()
  setupIPC()

  // Load cached apps immediately, then re-index in background
  const cached = getCachedApps()
  if (cached.length > 0) {
    sendAppsToRenderer(cached)
  }

  // Initial index (background)
  await runIndexing()

  // Start periodic re-index
  startReindexTimer()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  if (reindexTimer) clearInterval(reindexTimer)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Prevent multiple instances
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    showWindow()
  })
}
