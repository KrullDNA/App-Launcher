import Store from 'electron-store'

export interface ShortcutCandidate {
  itemId: string
  count: number
  lastUsed: string // ISO timestamp
}

export interface ShortcutsData {
  [abbrev: string]: ShortcutCandidate[]
}

interface BackupEntry {
  date: string // YYYY-MM-DD
  data: ShortcutsData
}

const store = new Store()

const SHORTCUTS_KEY = 'shortcuts'
const BACKUPS_KEY = 'shortcuts:backups'
const LAST_BACKUP_KEY = 'shortcuts:lastBackupDate'
const MAX_BACKUPS = 7

// ─── Read helpers ────────────────────────────────────────────

function getAll(): ShortcutsData {
  return (store.get(SHORTCUTS_KEY) as ShortcutsData | undefined) || {}
}

function saveAll(data: ShortcutsData): void {
  store.set(SHORTCUTS_KEY, data)
}

// ─── Public API ──────────────────────────────────────────────

export function getShortcut(abbrev: string): ShortcutCandidate[] {
  const data = getAll()
  return data[abbrev] || []
}

export function recordUsage(abbrev: string, itemId: string): void {
  if (!abbrev.trim()) return

  const data = getAll()
  const candidates = data[abbrev] || []

  const existing = candidates.find((c) => c.itemId === itemId)
  if (existing) {
    existing.count += 1
    existing.lastUsed = new Date().toISOString()
  } else {
    candidates.push({
      itemId,
      count: 1,
      lastUsed: new Date().toISOString()
    })
  }

  // Sort by count descending
  candidates.sort((a, b) => b.count - a.count)
  data[abbrev] = candidates
  saveAll(data)

  // Run daily backup check
  maybeBackup()
}

export function getAllShortcuts(): ShortcutsData {
  return getAll()
}

export function deleteShortcut(abbrev: string): void {
  const data = getAll()
  delete data[abbrev]
  saveAll(data)
}

export function clearAll(): void {
  saveAll({})
}

// ─── Backup system ───────────────────────────────────────────

function todayString(): string {
  return new Date().toISOString().slice(0, 10)
}

function maybeBackup(): void {
  const today = todayString()
  const lastBackup = store.get(LAST_BACKUP_KEY) as string | undefined

  if (lastBackup === today) return // Already backed up today

  const backups = (store.get(BACKUPS_KEY) as BackupEntry[] | undefined) || []
  const data = getAll()

  backups.push({ date: today, data: JSON.parse(JSON.stringify(data)) })

  // Keep only the last 7
  while (backups.length > MAX_BACKUPS) {
    backups.shift()
  }

  store.set(BACKUPS_KEY, backups)
  store.set(LAST_BACKUP_KEY, today)
}

export function getBackups(): { date: string }[] {
  const backups = (store.get(BACKUPS_KEY) as BackupEntry[] | undefined) || []
  return backups.map((b) => ({ date: b.date }))
}

export function restoreBackup(date: string): boolean {
  const backups = (store.get(BACKUPS_KEY) as BackupEntry[] | undefined) || []
  const backup = backups.find((b) => b.date === date)
  if (!backup) return false

  saveAll(backup.data)
  return true
}

// ─── Query helpers for ranking ───────────────────────────────

/** Get the total launch count for an item across all abbreviations */
export function getGlobalLaunchCount(itemId: string): number {
  const data = getAll()
  let total = 0
  for (const candidates of Object.values(data)) {
    for (const c of candidates) {
      if (c.itemId === itemId) {
        total += c.count
      }
    }
  }
  return total
}

/** Get the last-used timestamp for an item across all abbreviations */
export function getLastUsed(itemId: string): string | null {
  const data = getAll()
  let latest: string | null = null
  for (const candidates of Object.values(data)) {
    for (const c of candidates) {
      if (c.itemId === itemId) {
        if (!latest || c.lastUsed > latest) {
          latest = c.lastUsed
        }
      }
    }
  }
  return latest
}

/** Get the max global launch count across all items */
export function getMaxGlobalLaunchCount(): number {
  const data = getAll()
  const totals = new Map<string, number>()
  for (const candidates of Object.values(data)) {
    for (const c of candidates) {
      totals.set(c.itemId, (totals.get(c.itemId) || 0) + c.count)
    }
  }
  let max = 0
  for (const count of totals.values()) {
    if (count > max) max = count
  }
  return max
}
