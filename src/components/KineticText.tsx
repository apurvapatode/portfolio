import { useInView } from '../hooks/useInView'
import { useReducedMotion } from '../hooks/useReducedMotion'

type Props = {
  text: string
  className?: string
  delay?: number
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span'
}

/**
 * Word-by-word mask reveal. Each word sits in an `overflow-hidden` wrapper and
 * slides up from below the clip edge.
 *
 * Accessibility: the split text is `aria-hidden` and the full string is exposed
 * once in a visually-hidden span, so screen readers read a sentence rather than
 * a stream of disconnected words.
 */
export function KineticText({ text, className = '', delay = 0, as: Tag = 'span' }: Props) {
  const { ref, inView } = useInView<HTMLDivElement>()
  const reducedMotion = useReducedMotion()
  const words = text.split(' ')

  if (reducedMotion) {
    return <Tag className={className}>{text}</Tag>
  }

  return (
    <Tag className={className}>
      <span className="sr-only">{text}</span>
      <span ref={ref as never} aria-hidden="true" className="inline">
        {words.map((word, index) => (
          <span key={`${word}-${index}`} className="inline-block overflow-hidden pb-[0.12em] align-bottom">
            <span
              className="inline-block will-change-transform"
              style={{
                transform: inView ? 'translateY(0)' : 'translateY(110%)',
                opacity: inView ? 1 : 0,
                transition: `transform 0.9s var(--ease-out-expo) ${delay + index * 0.045}s, opacity 0.6s ease ${delay + index * 0.045}s`,
              }}
            >
              {word}
            </span>
            {index < words.length - 1 && <span className="inline-block">&nbsp;</span>}
          </span>
        ))}
      </span>
    </Tag>
  )
}
