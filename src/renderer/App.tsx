import { useEffect, useRef } from 'react'

function App(): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const cleanup = window.quicklaunch.onWindowShown(() => {
      inputRef.current?.focus()
    })
    return cleanup
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        window.quicklaunch.window.hide()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#1E1E2E',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
      }}
    >
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
          stroke="#888888"
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
          placeholder="Type to launch..."
          autoFocus
          style={{
            flex: 1,
            height: '56px',
            backgroundColor: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#E0E0E0',
            fontSize: '20px',
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            fontWeight: 400
          }}
        />
      </div>
    </div>
  )
}

export default App
