import { useEffect, useState } from 'react'

export type ThemeMode = 'system' | 'dark' | 'light'

function getSystemTheme(): 'dark' | 'light' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getResolvedTheme(mode: ThemeMode): 'dark' | 'light' {
  return mode === 'system' ? getSystemTheme() : mode
}

export function useTheme(): {
  mode: ThemeMode
  resolved: 'dark' | 'light'
  setMode: (mode: ThemeMode) => void
} {
  const [mode, setModeState] = useState<ThemeMode>('system')

  // Load saved theme on mount
  useEffect(() => {
    window.quicklaunch.settings.get<ThemeMode>('theme').then((saved) => {
      if (saved) setModeState(saved)
    })
  }, [])

  const resolved = getResolvedTheme(mode)

  // Apply data-theme attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolved)
  }, [resolved])

  // Listen for system theme changes
  useEffect(() => {
    if (mode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (): void => {
      document.documentElement.setAttribute('data-theme', getSystemTheme())
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [mode])

  const setMode = (newMode: ThemeMode): void => {
    setModeState(newMode)
    window.quicklaunch.settings.set('theme', newMode)
  }

  return { mode, resolved, setMode }
}
