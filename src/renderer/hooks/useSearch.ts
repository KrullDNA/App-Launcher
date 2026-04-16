import { useEffect, useRef } from 'react'
import Fuse, { type IFuseOptions } from 'fuse.js'
import { useSearchStore, type SearchResult } from '../stores/searchStore'

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
  const setResults = useSearchStore((s) => s.setResults)
  const fuseRef = useRef<Fuse<IndexedApp> | null>(null)

  // Rebuild Fuse index when apps change
  useEffect(() => {
    fuseRef.current = new Fuse(apps, fuseOptions)
  }, [apps])

  // Search when query changes
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

    const fuseResults = fuse.search(query, { limit: 12 })

    const results: SearchResult[] = fuseResults.map((r) => ({
      id: r.item.id,
      name: r.item.name,
      subtitle: r.item.path,
      type: 'App' as const,
      icon: r.item.icon,
      launchPath: r.item.path
    }))

    setResults(results)
  }, [query, apps, setResults])
}
