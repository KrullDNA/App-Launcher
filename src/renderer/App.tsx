import React, { useEffect, useState } from 'react'
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

function App(): React.JSX.Element {
  const [visible, setVisible] = useState(true)
  const results = useSearchStore((s) => s.results)
  const setApps = useSearchStore((s) => s.setApps)

  // Activate theme system
  useTheme()

  // Activate Fuse.js search
  useSearch()

  // Activate keyboard navigation
  useKeyboardNav()

  // Load indexed apps on mount + listen for updates
  useEffect(() => {
    // Load cached apps immediately
    window.quicklaunch.indexer.getApps().then((apps) => {
      if (apps.length > 0) setApps(apps)
    })

    // Listen for re-index updates
    const cleanup = window.quicklaunch.indexer.onAppsUpdated((apps) => {
      setApps(apps)
    })
    return cleanup
  }, [setApps])

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

  // Show/hide animation state
  useEffect(() => {
    const cleanupShow = window.quicklaunch.onWindowShown(() => {
      setVisible(true)
    })
    const cleanupHide = window.quicklaunch.onWindowHidden(() => {
      setVisible(false)
    })
    return () => {
      cleanupShow()
      cleanupHide()
    }
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
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
      }}
    >
      <SearchBar />
      <ResultsList />
    </div>
  )
}

export default App
