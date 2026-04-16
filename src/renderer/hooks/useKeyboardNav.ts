import { useEffect } from 'react'
import { useSearchStore, type SearchResult } from '../stores/searchStore'

export function useKeyboardNav(): void {
  const results = useSearchStore((s) => s.results)
  const selectedIndex = useSearchStore((s) => s.selectedIndex)
  const setSelectedIndex = useSearchStore((s) => s.setSelectedIndex)
  const query = useSearchStore((s) => s.query)
  const setToastMessage = useSearchStore((s) => s.setToastMessage)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (results.length === 0) return

      const maxIndex = Math.min(results.length - 1, 7)

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
          executeResult(selected, query, setToastMessage)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [results, selectedIndex, setSelectedIndex, query, setToastMessage])
}

export function executeResult(
  result: SearchResult,
  searchText: string,
  showToast: (msg: string) => void
): void {
  switch (result.action) {
    case 'copy-calc':
      if (result.actionData) {
        window.quicklaunch.clipboard.write(result.actionData)
        showToast('Copied!')
      }
      return
    case 'web-search':
      if (result.actionData) {
        const url = `https://www.google.com/search?q=${encodeURIComponent(result.actionData)}`
        window.quicklaunch.shell.openExternal(url)
      }
      return
    case 'system-cmd':
      if (result.actionData) {
        // Record shortcut for adaptive learning
        if (searchText.trim()) {
          window.quicklaunch.shortcuts.record(searchText.trim(), result.id)
        }
        window.quicklaunch.system.execute(result.actionData)
      }
      return
    case 'copy-clip':
      if (result.actionData) {
        window.quicklaunch.clipboard.write(result.actionData)
        showToast('Copied!')
      }
      return
    default:
      // App or File launch
      if (result.launchPath) {
        if (result.type === 'File') {
          window.quicklaunch.shell.openPath(result.launchPath)
          // Record for adaptive learning
          if (searchText.trim()) {
            window.quicklaunch.shortcuts.record(searchText.trim(), result.id)
          }
        } else {
          window.quicklaunch.app.launch(
            { id: result.id, name: result.name, path: result.launchPath },
            searchText
          )
        }
      }
  }
}
