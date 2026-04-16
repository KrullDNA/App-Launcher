import { useEffect, useRef } from 'react'
import Fuse, { type IFuseOptions } from 'fuse.js'
import { useSearchStore, type SearchResult } from '../stores/searchStore'
import { scoreAndSort } from '../utils/scoring'
import { isCalcExpression, evaluateExpression } from '../utils/calculator'

const appFuseOptions: IFuseOptions<IndexedApp> = {
  keys: [
    { name: 'name', weight: 1.0 },
    { name: 'path', weight: 0.3 }
  ],
  threshold: 0.4,
  includeScore: true,
  minMatchCharLength: 1
}

const fileFuseOptions: IFuseOptions<IndexedFile> = {
  keys: [
    { name: 'name', weight: 1.0 },
    { name: 'path', weight: 0.3 }
  ],
  threshold: 0.4,
  includeScore: true,
  minMatchCharLength: 1
}

// System commands available in search
const SYSTEM_COMMANDS: SearchResult[] = [
  { id: 'sys:lock', name: 'Lock Screen', subtitle: 'Lock the computer', type: 'System', action: 'system-cmd', actionData: 'lock' },
  { id: 'sys:sleep', name: 'Sleep', subtitle: 'Put computer to sleep', type: 'System', action: 'system-cmd', actionData: 'sleep' },
  { id: 'sys:restart', name: 'Restart', subtitle: 'Restart the computer', type: 'System', action: 'system-cmd', actionData: 'restart' },
  { id: 'sys:shutdown', name: 'Shut Down', subtitle: 'Shut down the computer', type: 'System', action: 'system-cmd', actionData: 'shutdown' },
  { id: 'sys:emptytrash', name: 'Empty Trash', subtitle: 'Empty the trash / recycle bin', type: 'System', action: 'system-cmd', actionData: 'emptytrash' }
]

const systemFuse = new Fuse(SYSTEM_COMMANDS, {
  keys: [{ name: 'name', weight: 1.0 }, { name: 'subtitle', weight: 0.3 }],
  threshold: 0.4,
  includeScore: true
})

export function useSearch(): void {
  const query = useSearchStore((s) => s.query)
  const apps = useSearchStore((s) => s.apps)
  const files = useSearchStore((s) => s.files)
  const shortcuts = useSearchStore((s) => s.shortcuts)
  const maxGlobalCount = useSearchStore((s) => s.maxGlobalCount)
  const setResults = useSearchStore((s) => s.setResults)
  const appFuseRef = useRef<Fuse<IndexedApp> | null>(null)
  const fileFuseRef = useRef<Fuse<IndexedFile> | null>(null)

  // Rebuild Fuse indices when data changes
  useEffect(() => {
    appFuseRef.current = new Fuse(apps, appFuseOptions)
  }, [apps])

  useEffect(() => {
    fileFuseRef.current = new Fuse(files, fileFuseOptions)
  }, [files])

  // Search when query or shortcuts change
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const allResults: SearchResult[] = []
    const fuseScores = new Map<string, number>()

    // ─── Web search: '?' prefix ──────────────────────────
    if (query.startsWith('?') && query.length > 1) {
      const searchQuery = query.slice(1).trim()
      if (searchQuery) {
        allResults.push({
          id: 'web:search',
          name: `Search web for: ${searchQuery}`,
          subtitle: 'Open in default browser',
          type: 'Web',
          action: 'web-search',
          actionData: searchQuery
        })
        setResults(allResults)
        return
      }
    }

    // ─── Clipboard history: 'clip' ───────────────────────
    if (query.toLowerCase() === 'clip' || query.toLowerCase().startsWith('clip ')) {
      window.quicklaunch.clipboard.getHistory().then((entries) => {
        const clipResults: SearchResult[] = entries.map((entry) => ({
          id: entry.id,
          name: entry.preview,
          subtitle: new Date(entry.timestamp).toLocaleTimeString(),
          type: 'Clip' as const,
          action: 'copy-clip',
          actionData: entry.text
        }))
        setResults(clipResults)
      })
      return
    }

    // ─── Calculator ──────────────────────────────────────
    if (isCalcExpression(query)) {
      const calc = evaluateExpression(query)
      if (calc) {
        allResults.push({
          id: 'calc:result',
          name: calc.expression,
          subtitle: `= ${calc.result}`,
          type: 'Calc',
          action: 'copy-calc',
          actionData: calc.result
        })
      }
    }

    // ─── System commands ─────────────────────────────────
    const sysResults = systemFuse.search(query, { limit: 3 })
    for (const r of sysResults) {
      fuseScores.set(r.item.id, r.score ?? 1.0)
      allResults.push(r.item)
    }

    // ─── App search with blended ranking ─────────────────
    const appFuse = appFuseRef.current
    if (appFuse) {
      const fuseResults = appFuse.search(query, { limit: 20 })

      const appResults: SearchResult[] = fuseResults.map((r) => {
        fuseScores.set(r.item.id, r.score ?? 1.0)
        return {
          id: r.item.id,
          name: r.item.name,
          subtitle: r.item.path,
          type: 'App' as const,
          icon: r.item.icon,
          launchPath: r.item.path
        }
      })

      // Include shortcut candidates Fuse missed
      const candidates = shortcuts[query] || []
      for (const candidate of candidates) {
        if (!appResults.find((r) => r.id === candidate.itemId)) {
          const app = apps.find((a) => a.id === candidate.itemId)
          if (app) {
            fuseScores.set(app.id, 0.8)
            appResults.push({
              id: app.id,
              name: app.name,
              subtitle: app.path,
              type: 'App' as const,
              icon: app.icon,
              launchPath: app.path
            })
          }
        }
      }

      // Apply blended ranking to app results
      const ranked = scoreAndSort(appResults, fuseScores, {
        query,
        shortcuts,
        maxGlobalCount
      })

      allResults.push(...ranked)
    }

    // ─── File search ─────────────────────────────────────
    const fileFuse = fileFuseRef.current
    if (fileFuse) {
      const fileResults = fileFuse.search(query, { limit: 5 })
      for (const r of fileResults) {
        allResults.push({
          id: r.item.id,
          name: r.item.name,
          subtitle: r.item.path,
          type: 'File',
          launchPath: r.item.path
        })
      }
    }

    setResults(allResults)
  }, [query, apps, files, shortcuts, maxGlobalCount, setResults])
}
