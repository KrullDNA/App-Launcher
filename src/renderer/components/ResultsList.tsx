import React from 'react'
import { useSearchStore } from '../stores/searchStore'
import { ResultItem } from './ResultItem'
import { executeResult } from '../hooks/useKeyboardNav'

const MAX_VISIBLE = 8

export function ResultsList(): React.JSX.Element | null {
  const results = useSearchStore((s) => s.results)
  const selectedIndex = useSearchStore((s) => s.selectedIndex)
  const setSelectedIndex = useSearchStore((s) => s.setSelectedIndex)
  const query = useSearchStore((s) => s.query)
  const setToastMessage = useSearchStore((s) => s.setToastMessage)

  if (results.length === 0) return null

  const visibleResults = results.slice(0, MAX_VISIBLE)

  return (
    <div>
      {/* Divider */}
      <div
        style={{
          height: '1px',
          backgroundColor: 'var(--divider)',
          margin: '0 16px'
        }}
      />
      <div
        className="results-scroll"
        style={{
          maxHeight: `${MAX_VISIBLE * 52}px`,
          overflowY: results.length > MAX_VISIBLE ? 'auto' : 'hidden'
        }}
      >
        {visibleResults.map((result, index) => (
          <ResultItem
            key={result.id}
            result={result}
            isSelected={index === selectedIndex}
            onMouseEnter={() => setSelectedIndex(index)}
            onClick={() => executeResult(result, query, setToastMessage)}
          />
        ))}
      </div>
    </div>
  )
}
