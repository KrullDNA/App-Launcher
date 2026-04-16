import { useEffect, useRef } from 'react'
import Fuse, { type IFuseOptions } from 'fuse.js'
import { useSearchStore, type SearchResult } from '../stores/searchStore'
import { scoreAndSort } from '../utils/scoring'

const fuseOptions: IFuseOptions<IndexedApp> = {
  keys: [
    { name: 'name', weight: 1.0 },
    { name: 'path', weight: 0.3 }
  ],
  threshold: 0.4,
  includeScore: true,
  minMatchCharLength: 1
}

export function useSearch(): void {
  const query = useSearchStore((s) => s.query)
  const apps = useSearchStore((s) => s.apps)
  const shortcuts = useSearchStore((s) => s.shortcuts)
  const maxGlobalCount = useSearchStore((s) => s.maxGlobalCount)
  const setResults = useSearchStore((s) => s.setResults)
  const fuseRef = useRef<Fuse<IndexedApp> | null>(null)

  // Rebuild Fuse index when apps change
  useEffect(() => {
    fuseRef.current = new Fuse(apps, fuseOptions)
  }, [apps])

  // Search when query or shortcuts change
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const fuse = fuseRef.current
    if (!fuse) {
      setResults([])
      return
    }

    const fuseResults = fuse.search(query, { limit: 20 })

    // Build raw results + Fuse score map
    const fuseScores = new Map<string, number>()
    const rawResults: SearchResult[] = fuseResults.map((r) => {
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

    // Also include shortcut candidates that Fuse might have missed
    const candidates = shortcuts[query] || []
    for (const candidate of candidates) {
      if (!rawResults.find((r) => r.id === candidate.itemId)) {
        const app = apps.find((a) => a.id === candidate.itemId)
        if (app) {
          fuseScores.set(app.id, 0.8) // Give a mediocre fuzzy score since it wasn't a Fuse match
          rawResults.push({
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

    // Apply blended ranking
    const ranked = scoreAndSort(rawResults, fuseScores, {
      query,
      shortcuts,
      maxGlobalCount
    })

    setResults(ranked)
  }, [query, apps, shortcuts, maxGlobalCount, setResults])
}
