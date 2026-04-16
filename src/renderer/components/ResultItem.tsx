import React from 'react'
import type { SearchResult } from '../stores/searchStore'

interface ResultItemProps {
  result: SearchResult
  isSelected: boolean
  onMouseEnter: () => void
  onClick: () => void
}

const TYPE_COLORS: Record<string, string> = {
  App: 'var(--accent)',
  File: '#8BC34A',
  Calc: '#FF9800',
  Web: '#E91E63',
  System: '#9C27B0',
  Clip: '#00BCD4'
}

function AppIcon({ name }: { name: string }): React.JSX.Element {
  const hue = name.charCodeAt(0) * 7 % 360
  return (
    <div
      style={{
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        backgroundColor: `hsl(${hue}, 50%, 45%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
        fontWeight: 600,
        color: '#FFFFFF',
        flexShrink: 0
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

export function ResultItem({ result, isSelected, onMouseEnter, onClick }: ResultItemProps): React.JSX.Element {
  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      style={{
        display: 'flex',
        alignItems: 'center',
        height: '52px',
        padding: '0 20px',
        cursor: 'pointer',
        position: 'relative',
        backgroundColor: isSelected ? 'var(--selected-bg)' : 'transparent',
        transition: 'background-color 80ms ease'
      }}
    >
      {/* Accent bar for selected item */}
      {isSelected && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: '8px',
            bottom: '8px',
            width: '3px',
            borderRadius: '0 2px 2px 0',
            backgroundColor: 'var(--accent)'
          }}
        />
      )}

      {/* Icon */}
      <div style={{ marginRight: '12px' }}>
        <AppIcon name={result.name} />
      </div>

      {/* Title + subtitle */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span
            style={{
              fontSize: '15px',
              fontWeight: 500,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {result.name}
          </span>
          {result.isShortcut && (
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="var(--accent)"
              style={{ flexShrink: 0, opacity: 0.7 }}
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          )}
        </div>
        <div
          style={{
            fontSize: '12px',
            fontWeight: 400,
            color: 'var(--text-muted)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {result.subtitle}
        </div>
      </div>

      {/* Type badge */}
      <div
        style={{
          fontSize: '10px',
          fontWeight: 500,
          padding: '2px 8px',
          borderRadius: '10px',
          backgroundColor: 'var(--badge-bg)',
          color: TYPE_COLORS[result.type] || 'var(--text-muted)',
          flexShrink: 0,
          marginLeft: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}
      >
        {result.type}
      </div>
    </div>
  )
}
