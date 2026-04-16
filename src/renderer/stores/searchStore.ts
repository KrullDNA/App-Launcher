import { create } from 'zustand'

export interface SearchResult {
  id: string
  name: string
  subtitle: string
  type: 'App' | 'File' | 'Calc' | 'Web' | 'System' | 'Clip'
  icon?: string
  isShortcut?: boolean
}

interface SearchState {
  query: string
  results: SearchResult[]
  selectedIndex: number
  setQuery: (query: string) => void
  setResults: (results: SearchResult[]) => void
  setSelectedIndex: (index: number) => void
  clearSearch: () => void
}

const MOCK_APPS: SearchResult[] = [
  { id: 'app:chrome', name: 'Google Chrome', subtitle: 'Web Browser', type: 'App', isShortcut: true },
  { id: 'app:vscode', name: 'Visual Studio Code', subtitle: 'Code Editor', type: 'App', isShortcut: true },
  { id: 'app:figma', name: 'Figma', subtitle: 'Design Tool', type: 'App' },
  { id: 'app:slack', name: 'Slack', subtitle: 'Messaging', type: 'App' },
  { id: 'app:spotify', name: 'Spotify', subtitle: 'Music Player', type: 'App', isShortcut: true },
  { id: 'app:terminal', name: 'Terminal', subtitle: 'System Utility', type: 'App' }
]

function filterMockResults(query: string): SearchResult[] {
  if (!query.trim()) return []
  const q = query.toLowerCase()
  return MOCK_APPS.filter(
    (app) =>
      app.name.toLowerCase().includes(q) ||
      app.subtitle.toLowerCase().includes(q)
  )
}

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  results: [],
  selectedIndex: 0,
  setQuery: (query: string) =>
    set({
      query,
      results: filterMockResults(query),
      selectedIndex: 0
    }),
  setResults: (results: SearchResult[]) => set({ results }),
  setSelectedIndex: (index: number) => set({ selectedIndex: index }),
  clearSearch: () => set({ query: '', results: [], selectedIndex: 0 })
}))
