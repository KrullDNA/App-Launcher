import React, { useEffect, useRef } from 'react'
import { useSearchStore } from '../stores/searchStore'

export function SearchBar(): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)
  const query = useSearchStore((s) => s.query)
  const setQuery = useSearchStore((s) => s.setQuery)
  const clearSearch = useSearchStore((s) => s.clearSearch)

  // Auto-focus on window show, clear on hide
  useEffect(() => {
    const cleanupShow = window.quicklaunch.onWindowShown(() => {
      inputRef.current?.focus()
    })
    const cleanupHide = window.quicklaunch.onWindowHidden(() => {
      clearSearch()
    })
    return () => {
      cleanupShow()
      cleanupHide()
    }
  }, [clearSearch])

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        height: '56px',
        padding: '0 20px'
      }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--text-muted)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0, marginRight: '12px' }}
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Type to launch..."
        autoFocus
        style={{
          flex: 1,
          height: '56px',
          backgroundColor: 'transparent',
          border: 'none',
          outline: 'none',
          color: 'var(--text-primary)',
          fontSize: '20px',
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          fontWeight: 400
        }}
      />
    </div>
  )
}
