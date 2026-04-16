import { create } from 'zustand'

export interface SearchResult {
  id: string
  name: string
  subtitle: string
  type: 'App' | 'File' | 'Calc' | 'Web' | 'System' | 'Clip'
  icon?: string
  isShortcut?: boolean
  launchPath?: string
}

interface SearchState {
  query: string
  results: SearchResult[]
  selectedIndex: number
  apps: IndexedApp[]
  shortcuts: ShortcutsData
  maxGlobalCount: number
  setQuery: (query: string) => void
  setResults: (results: SearchResult[]) => void
  setSelectedIndex: (index: number) => void
  setApps: (apps: IndexedApp[]) => void
  setShortcuts: (shortcuts: ShortcutsData) => void
  setMaxGlobalCount: (count: number) => void
  clearSearch: () => void
}

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  results: [],
  selectedIndex: 0,
  apps: [],
  shortcuts: {},
  maxGlobalCount: 0,
  setQuery: (query: string) => set({ query, selectedIndex: 0 }),
  setResults: (results: SearchResult[]) => set({ results }),
  setSelectedIndex: (index: number) => set({ selectedIndex: index }),
  setApps: (apps: IndexedApp[]) => set({ apps }),
  setShortcuts: (shortcuts: ShortcutsData) => set({ shortcuts }),
  setMaxGlobalCount: (count: number) => set({ maxGlobalCount: count }),
  clearSearch: () => set({ query: '', results: [], selectedIndex: 0 })
}))
