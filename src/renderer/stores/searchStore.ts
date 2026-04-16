import { create } from 'zustand'

export interface SearchResult {
  id: string
  name: string
  subtitle: string
  type: 'App' | 'File' | 'Calc' | 'Web' | 'System' | 'Clip'
  icon?: string
  isShortcut?: boolean
  launchPath?: string
  action?: string // for special actions: 'copy-calc', 'web-search', 'system-cmd', 'copy-clip'
  actionData?: string // data for the action (calc result, url, command, clip text)
}

interface SearchState {
  query: string
  results: SearchResult[]
  selectedIndex: number
  apps: IndexedApp[]
  files: IndexedFile[]
  shortcuts: ShortcutsData
  maxGlobalCount: number
  toastMessage: string
  setQuery: (query: string) => void
  setResults: (results: SearchResult[]) => void
  setSelectedIndex: (index: number) => void
  setApps: (apps: IndexedApp[]) => void
  setFiles: (files: IndexedFile[]) => void
  setShortcuts: (shortcuts: ShortcutsData) => void
  setMaxGlobalCount: (count: number) => void
  setToastMessage: (message: string) => void
  clearSearch: () => void
}

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  results: [],
  selectedIndex: 0,
  apps: [],
  files: [],
  shortcuts: {},
  maxGlobalCount: 0,
  toastMessage: '',
  setQuery: (query: string) => set({ query, selectedIndex: 0 }),
  setResults: (results: SearchResult[]) => set({ results }),
  setSelectedIndex: (index: number) => set({ selectedIndex: index }),
  setApps: (apps: IndexedApp[]) => set({ apps }),
  setFiles: (files: IndexedFile[]) => set({ files }),
  setShortcuts: (shortcuts: ShortcutsData) => set({ shortcuts }),
  setMaxGlobalCount: (count: number) => set({ maxGlobalCount: count }),
  setToastMessage: (message: string) => set({ toastMessage: message }),
  clearSearch: () => set({ query: '', results: [], selectedIndex: 0 })
}))
