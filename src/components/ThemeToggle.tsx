import { useTheme } from '../hooks/useTheme'

/**
 * Sun/moon toggle. Both icons are always in the DOM and cross-fade, so the
 * button never reflows and there is no icon-swap flicker mid-transition.
 */
export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const isLight = theme === 'light'

  return (
    <button
      type="button"
      onClick={toggle}
      data-cursor="pointer"
      // The label states the destination, not the current state — that is what
      // a screen-reader user needs to know before activating it.
      aria-label={`Switch to ${isLight ? 'dark' : 'light'} theme`}
      title={`Switch to ${isLight ? 'dark' : 'light'} theme`}
      className="grid h-9 w-9 place-items-center rounded-full border border-ash text-chalk transition-colors hover:border-acid hover:text-acid"
    >
      <span className="relative block h-4 w-4">
        {/* Sun */}
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className={`absolute inset-0 h-4 w-4 transition-[opacity,transform] duration-300 ${
            isLight ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'
          }`}
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
        </svg>

        {/* Moon */}
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`absolute inset-0 h-4 w-4 transition-[opacity,transform] duration-300 ${
            isLight ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100'
          }`}
        >
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        </svg>
      </span>
    </button>
  )
}
