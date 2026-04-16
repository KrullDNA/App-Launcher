import React, { useEffect, useCallback, useState } from 'react'
import { SearchBar } from './components/SearchBar'
import { ResultsList } from './components/ResultsList'
import { useTheme } from './hooks/useTheme'
import { useKeyboardNav } from './hooks/useKeyboardNav'
import { useSearch } from './hooks/useSearch'
import { useSearchStore } from './stores/searchStore'

const INPUT_HEIGHT = 72 // Must match main.ts
const ITEM_HEIGHT = 52
const DIVIDER_HEIGHT = 1
const MAX_VISIBLE = 8

function Toast(): React.JSX.Element | null {
  const toastMessage = useSearchStore((s) => s.toastMessage)
  const setToastMessage = useSearchStore((s) => s.setToastMessage)

  useEffect(() => {
    if (!toastMessage) return
    const timer = setTimeout(() => setToastMessage(''), 1500)
    return () => clearTimeout(timer)
  }, [toastMessage, setToastMessage])

  if (!toastMessage) return null

  return (
    <div
      className="toast-enter"
      style={{
        position: 'fixed',
        bottom: '12px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'var(--accent)',
        color: '#FFFFFF',
        padding: '6px 16px',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: 500,
        zIndex: 100,
        pointerEvents: 'none',
        opacity: 0.95
      }}
    >
      {toastMessage}
    </div>
  )
}

function App(): React.JSX.Element {
  const [visible, setVisible] = useState(true)
  const results = useSearchStore((s) => s.results)
  const setApps = useSearchStore((s) => s.setApps)
  const setFiles = useSearchStore((s) => s.setFiles)
  const setShortcuts = useSearchStore((s) => s.setShortcuts)
  const setMaxGlobalCount = useSearchStore((s) => s.setMaxGlobalCount)

  // Activate theme system
  useTheme()

  // Activate Fuse.js search with blended ranking
  useSearch()

  // Activate keyboard navigation
  useKeyboardNav()

  // Load shortcuts data
  const refreshShortcuts = useCallback(async () => {
    const [shortcuts, maxCount] = await Promise.all([
      window.quicklaunch.shortcuts.getAll(),
      window.quicklaunch.shortcuts.getMaxGlobalCount()
    ])
    setShortcuts(shortcuts)
    setMaxGlobalCount(maxCount)
  }, [setShortcuts, setMaxGlobalCount])

  // Load indexed apps + files + shortcuts on mount
  useEffect(() => {
    window.quicklaunch.indexer.getApps().then((apps) => {
      if (apps.length > 0) setApps(apps)
    })

    window.quicklaunch.indexer.getFiles().then((files) => {
      setFiles(files)
    })

    const cleanup = window.quicklaunch.indexer.onAppsUpdated((apps) => {
      setApps(apps)
    })

    refreshShortcuts()

    return cleanup
  }, [setApps, setFiles, refreshShortcuts])

  // Refresh shortcuts when window is shown
  useEffect(() => {
    const cleanup = window.quicklaunch.onWindowShown(() => {
      setVisible(true)
      refreshShortcuts()
    })
    return cleanup
  }, [refreshShortcuts])

  // Handle Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        window.quicklaunch.window.hide()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Hide animation state
  useEffect(() => {
    const cleanup = window.quicklaunch.onWindowHidden(() => {
      setVisible(false)
    })
    return cleanup
  }, [])

  // Dynamic window resize based on result count
  useEffect(() => {
    const resultCount = Math.min(results.length, MAX_VISIBLE)
    const resultsHeight = resultCount > 0 ? resultCount * ITEM_HEIGHT + DIVIDER_HEIGHT : 0
    const totalHeight = INPUT_HEIGHT + resultsHeight
    window.quicklaunch.window.resize(totalHeight)
  }, [results.length])

  return (
    <div
      className={`launcher-wrapper ${visible ? '' : 'launcher-hidden'}`}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--bg-primary)',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        position: 'relative'
      }}
    >
      <SearchBar />
      <ResultsList />
      <Toast />
    </div>
  )
}

export default App
