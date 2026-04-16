import { useEffect } from 'react'
import { useSearchStore, type SearchResult } from '../stores/searchStore'

export function useKeyboardNav(): void {
  const results = useSearchStore((s) => s.results)
  const selectedIndex = useSearchStore((s) => s.selectedIndex)
  const setSelectedIndex = useSearchStore((s) => s.setSelectedIndex)
  const query = useSearchStore((s) => s.query)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (results.length === 0) return

      const maxIndex = Math.min(results.length - 1, 7) // max 8 visible items

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(selectedIndex >= maxIndex ? 0 : selectedIndex + 1)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(selectedIndex <= 0 ? maxIndex : selectedIndex - 1)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const selected = results[selectedIndex]
        if (selected) {
          launchResult(selected, query)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [results, selectedIndex, setSelectedIndex, query])
}

function launchResult(result: SearchResult, searchText: string): void {
  if (!result.launchPath) return
  window.quicklaunch.app.launch(
    { id: result.id, name: result.name, path: result.launchPath },
    searchText
  )
}
