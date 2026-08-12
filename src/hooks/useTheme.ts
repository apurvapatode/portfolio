import { useCallback, useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'theme'

/**
 * Resolution order: an explicit stored choice wins, otherwise follow the OS.
 * Kept as a standalone function because the inline script in index.html runs
 * the same logic before React mounts — see the comment there.
 */
export function resolveTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') return stored
  } catch {
    // Private browsing / storage disabled — fall through to the OS preference.
  }
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  // Keeps the browser UI (mobile address bar) in step with the page.
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'light' ? '#f7f7f9' : '#050506')
  // Lets non-React consumers react to the change — specifically the WebGL
  // canvas, which under reduced motion has already drawn its only frame.
  window.dispatchEvent(new CustomEvent('themechange', { detail: theme }))
}

export function useTheme() {
  // Read from the DOM rather than re-resolving: the inline script in
  // index.html has already set this, so this matches what is on screen and
  // avoids a flash on mount.
  const [theme, setTheme] = useState<Theme>(
    () => (document.documentElement.dataset.theme as Theme) || 'dark',
  )

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // Follow the OS while the user has not made an explicit choice.
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = (event: MediaQueryListEvent) => {
      try {
        if (localStorage.getItem(STORAGE_KEY)) return
      } catch {
        // Storage unavailable: no stored choice can exist, so follow the OS.
      }
      setTheme(event.matches ? 'light' : 'dark')
    }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // Non-fatal: the theme still applies for this session.
      }
      return next
    })
  }, [])

  return { theme, toggle }
}
