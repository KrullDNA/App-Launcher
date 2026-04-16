import { clipboard } from 'electron'

export interface ClipboardEntry {
  id: string
  text: string
  preview: string
  timestamp: string
}

const MAX_ENTRIES = 50
const POLL_INTERVAL = 500

let entries: ClipboardEntry[] = []
let lastText = ''
let pollTimer: ReturnType<typeof setInterval> | null = null

export function startClipboardMonitor(): void {
  if (pollTimer) return

  lastText = clipboard.readText()

  pollTimer = setInterval(() => {
    const text = clipboard.readText()
    if (!text || text === lastText) return

    lastText = text
    const entry: ClipboardEntry = {
      id: `clip:${Date.now()}`,
      text,
      preview: text.length > 80 ? text.slice(0, 80) + '...' : text,
      timestamp: new Date().toISOString()
    }

    // Add to front, deduplicate, trim
    entries = [entry, ...entries.filter((e) => e.text !== text)]
    if (entries.length > MAX_ENTRIES) {
      entries = entries.slice(0, MAX_ENTRIES)
    }
  }, POLL_INTERVAL)
}

export function stopClipboardMonitor(): void {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

export function getClipboardHistory(): ClipboardEntry[] {
  return entries
}

export function writeToClipboard(text: string): void {
  clipboard.writeText(text)
  lastText = text // Prevent re-recording
}
