import { app, nativeImage } from 'electron'
import { readdir, readFile, stat, access } from 'fs/promises'
import { join, basename, extname, resolve } from 'path'
import { homedir } from 'os'
import Store from 'electron-store'

export interface IndexedApp {
  id: string
  name: string
  path: string
  icon?: string // base64 data URI
}

const store = new Store()
const CACHE_KEY = 'indexer:appCache'

// ─── Public API ──────────────────────────────────────────────

export async function indexApps(): Promise<IndexedApp[]> {
  const platform = process.platform
  let apps: IndexedApp[] = []

  try {
    if (platform === 'darwin') {
      apps = await indexMacOS()
    } else if (platform === 'win32') {
      apps = await indexWindows()
    } else {
      apps = await indexLinux()
    }
  } catch (err) {
    console.error('Indexing error:', err)
  }

  // Deduplicate by id
  const seen = new Set<string>()
  apps = apps.filter((a) => {
    if (seen.has(a.id)) return false
    seen.add(a.id)
    return true
  })

  // Sort alphabetically
  apps.sort((a, b) => a.name.localeCompare(b.name))

  // Cache
  store.set(CACHE_KEY, apps)
  return apps
}

export function getCachedApps(): IndexedApp[] {
  return (store.get(CACHE_KEY) as IndexedApp[] | undefined) || []
}

// ─── macOS ───────────────────────────────────────────────────

async function indexMacOS(): Promise<IndexedApp[]> {
  const dirs = [
    '/Applications',
    '/Applications/Utilities',
    '/System/Applications',
    '/System/Applications/Utilities',
    join(homedir(), 'Applications'),
    '/opt/homebrew/Caskroom'
  ]

  const apps: IndexedApp[] = []

  for (const dir of dirs) {
    if (!(await dirExists(dir))) continue

    try {
      const entries = await readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = join(dir, entry.name)

        if (entry.name.endsWith('.app')) {
          const name = entry.name.replace(/\.app$/, '')
          const icon = await extractMacIcon(fullPath)
          apps.push({
            id: `app:${name.toLowerCase().replace(/\s+/g, '-')}`,
            name,
            path: fullPath,
            icon
          })
        } else if (dir.includes('Caskroom') && entry.isDirectory()) {
          // Homebrew Cask: look for .app inside version dirs
          const caskApps = await findAppsInCaskDir(fullPath)
          apps.push(...caskApps)
        }
      }
    } catch {
      // Skip unreadable dirs
    }
  }

  return apps
}

async function findAppsInCaskDir(caskDir: string): Promise<IndexedApp[]> {
  const apps: IndexedApp[] = []
  try {
    const versions = await readdir(caskDir, { withFileTypes: true })
    for (const ver of versions) {
      if (!ver.isDirectory()) continue
      const verDir = join(caskDir, ver.name)
      const entries = await readdir(verDir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.name.endsWith('.app')) {
          const fullPath = join(verDir, entry.name)
          const name = entry.name.replace(/\.app$/, '')
          const icon = await extractMacIcon(fullPath)
          apps.push({
            id: `app:${name.toLowerCase().replace(/\s+/g, '-')}`,
            name,
            path: fullPath,
            icon
          })
        }
      }
    }
  } catch {
    // skip
  }
  return apps
}

async function extractMacIcon(appPath: string): Promise<string | undefined> {
  try {
    const plistPath = join(appPath, 'Contents', 'Info.plist')
    const plistData = await readFile(plistPath, 'utf-8')

    // Simple regex extraction for CFBundleIconFile
    const iconMatch = plistData.match(
      /<key>CFBundleIconFile<\/key>\s*<string>([^<]+)<\/string>/
    )
    if (!iconMatch) return undefined

    let iconName = iconMatch[1]
    if (!iconName.endsWith('.icns')) iconName += '.icns'

    const iconPath = join(appPath, 'Contents', 'Resources', iconName)
    if (!(await fileExists(iconPath))) return undefined

    const img = nativeImage.createFromPath(iconPath)
    if (img.isEmpty()) return undefined

    const resized = img.resize({ width: 32, height: 32 })
    return resized.toDataURL()
  } catch {
    return undefined
  }
}

// ─── Windows ─────────────────────────────────────────────────

async function indexWindows(): Promise<IndexedApp[]> {
  const apps: IndexedApp[] = []

  // Start Menu directories
  const startMenuDirs = [
    join(process.env.APPDATA || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
    join(
      process.env.PROGRAMDATA || 'C:\\ProgramData',
      'Microsoft',
      'Windows',
      'Start Menu',
      'Programs'
    )
  ]

  for (const dir of startMenuDirs) {
    if (!(await dirExists(dir))) continue
    const found = await scanDirRecursive(dir, '.lnk', 3)
    for (const lnkPath of found) {
      const name = basename(lnkPath, '.lnk')
      // Skip uninstall entries
      if (name.toLowerCase().includes('uninstall')) continue
      apps.push({
        id: `app:${name.toLowerCase().replace(/\s+/g, '-')}`,
        name,
        path: lnkPath,
        icon: undefined // Icons from .lnk require native bindings; fall back to generic
      })
    }
  }

  return apps
}

// ─── Linux ───────────────────────────────────────────────────

async function indexLinux(): Promise<IndexedApp[]> {
  const apps: IndexedApp[] = []

  const dataDirs = (process.env.XDG_DATA_DIRS || '/usr/share:/usr/local/share').split(':')
  const searchDirs = [
    ...dataDirs.map((d) => join(d, 'applications')),
    join(homedir(), '.local', 'share', 'applications')
  ]

  for (const dir of searchDirs) {
    if (!(await dirExists(dir))) continue

    try {
      const files = await scanDirRecursive(dir, '.desktop', 2)
      for (const filePath of files) {
        const entry = await parseDesktopFile(filePath)
        if (entry) apps.push(entry)
      }
    } catch {
      // skip
    }
  }

  return apps
}

async function parseDesktopFile(filePath: string): Promise<IndexedApp | undefined> {
  try {
    const content = await readFile(filePath, 'utf-8')

    // Only parse [Desktop Entry] section
    if (!content.includes('[Desktop Entry]')) return undefined

    const lines = content.split('\n')
    let inEntry = false
    const fields: Record<string, string> = {}

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed === '[Desktop Entry]') {
        inEntry = true
        continue
      }
      if (trimmed.startsWith('[') && inEntry) break
      if (!inEntry) continue

      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const value = trimmed.slice(eqIdx + 1).trim()
      // Only take the first value for each key (ignore localized ones)
      if (!key.includes('[') && !(key in fields)) {
        fields[key] = value
      }
    }

    // Skip NoDisplay and hidden entries
    if (fields['NoDisplay'] === 'true' || fields['Hidden'] === 'true') return undefined
    if (fields['Type'] !== 'Application') return undefined

    const name = fields['Name']
    if (!name) return undefined

    const execPath = fields['Exec'] || ''
    const icon = await resolveLinuxIcon(fields['Icon'])

    return {
      id: `app:${name.toLowerCase().replace(/\s+/g, '-')}`,
      name,
      path: execPath.split(' ')[0] || filePath, // strip %u %f etc
      icon
    }
  } catch {
    return undefined
  }
}

async function resolveLinuxIcon(iconField: string | undefined): Promise<string | undefined> {
  if (!iconField) return undefined

  // If it's an absolute path
  if (iconField.startsWith('/')) {
    return loadIconFromPath(iconField)
  }

  // Try common icon theme directories
  const sizes = ['48x48', '32x32', '64x64', '128x128', 'scalable']
  const categories = ['apps', 'applications']
  const extensions = ['.png', '.svg', '.xpm']
  const themeDirs = [
    '/usr/share/icons/hicolor',
    '/usr/share/icons/Adwaita',
    '/usr/share/pixmaps'
  ]

  // Check /usr/share/pixmaps first (common location)
  for (const ext of extensions) {
    const pixmapPath = `/usr/share/pixmaps/${iconField}${ext}`
    if (await fileExists(pixmapPath)) {
      return loadIconFromPath(pixmapPath)
    }
  }
  // Also check without extension in pixmaps
  if (await fileExists(`/usr/share/pixmaps/${iconField}`)) {
    return loadIconFromPath(`/usr/share/pixmaps/${iconField}`)
  }

  for (const themeDir of themeDirs) {
    if (themeDir.endsWith('pixmaps')) continue // already checked
    for (const size of sizes) {
      for (const cat of categories) {
        for (const ext of extensions) {
          const tryPath = join(themeDir, size, cat, `${iconField}${ext}`)
          if (await fileExists(tryPath)) {
            return loadIconFromPath(tryPath)
          }
        }
      }
    }
  }

  return undefined
}

async function loadIconFromPath(iconPath: string): Promise<string | undefined> {
  try {
    // Skip SVG - nativeImage doesn't support it well
    if (iconPath.endsWith('.svg') || iconPath.endsWith('.xpm')) return undefined

    const img = nativeImage.createFromPath(iconPath)
    if (img.isEmpty()) return undefined

    const resized = img.resize({ width: 32, height: 32 })
    return resized.toDataURL()
  } catch {
    return undefined
  }
}

// ─── Helpers ─────────────────────────────────────────────────

async function dirExists(dirPath: string): Promise<boolean> {
  try {
    await access(dirPath)
    const s = await stat(dirPath)
    return s.isDirectory()
  } catch {
    return false
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    const s = await stat(filePath)
    return s.isFile()
  } catch {
    return false
  }
}

async function scanDirRecursive(
  dir: string,
  ext: string,
  maxDepth: number,
  currentDepth = 0
): Promise<string[]> {
  if (currentDepth > maxDepth) return []

  const results: string[] = []
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isFile() && entry.name.endsWith(ext)) {
        results.push(fullPath)
      } else if (entry.isDirectory() && currentDepth < maxDepth) {
        const sub = await scanDirRecursive(fullPath, ext, maxDepth, currentDepth + 1)
        results.push(...sub)
      }
    }
  } catch {
    // Skip unreadable dirs
  }
  return results
}
