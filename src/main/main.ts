import {
  app,
  BrowserWindow,
  globalShortcut,
  Tray,
  Menu,
  screen,
  ipcMain,
  nativeImage
} from 'electron'
import { join } from 'path'
import Store from 'electron-store'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

const store = new Store()

const WINDOW_WIDTH = 680
const INPUT_HEIGHT = 72

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

  // Reposition to active monitor center
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
    // Fallback for macOS if Cmd+Space conflicts with Spotlight
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
}

app.whenReady().then(() => {
  createWindow()
  createTray()
  registerHotkey()
  setupIPC()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
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
