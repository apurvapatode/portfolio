import { useEffect, useId, useRef, useState } from 'react'
import { HERO_PARAMS, PRESETS, type ParamKey, type ParamValues } from '../webgl/heroParams'
import { PerfHud } from './PerfHud'
import type { GpuStats } from '../hooks/useGpuProfiler'

type Tab = 'params' | 'source' | 'perf'

export type ShaderLabProps = {
  open: boolean
  onClose: () => void
  params: ParamValues
  onParamChange: (key: ParamKey, value: number) => void
  onPreset: (values: Partial<ParamValues>) => void
  onReset: () => void
  source: string
  onSourceApply: (source: string) => void
  onSourceReset: () => void
  compileLog: string
  compileOk: boolean
  stats: GpuStats
}

export function ShaderLab({
  open,
  onClose,
  params,
  onParamChange,
  onPreset,
  onReset,
  source,
  onSourceApply,
  onSourceReset,
  compileLog,
  compileOk,
  stats,
}: ShaderLabProps) {
  const [tab, setTab] = useState<Tab>('params')
  const [draft, setDraft] = useState(source)
  const panelRef = useRef<HTMLDivElement>(null)
  const headingId = useId()

  // Pull external source changes (preset load, reset) into the editor, but only
  // when the user is not mid-edit — clobbering someone's typing would be worse
  // than showing a slightly stale draft.
  const dirty = draft !== source
  useEffect(() => {
    if (!dirty) setDraft(source)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source])

  // Escape closes; focus moves into the panel on open so keyboard users are not
  // stranded at the bottom of the document.
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    panelRef.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  // Anchored top-right on desktop, directly under the trigger that opens it —
  // the panel appears where the click happened rather than across the screen.
  // The trigger hides itself while this is open, so the overlap is moot. On
  // small screens it becomes a full-width bottom sheet, since a 380px floating
  // panel would leave almost no shader visible behind it.
  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby={headingId}
      tabIndex={-1}
      // Snaps the custom cursor's trailing ring to 1:1 in here — see Cursor.tsx.
      data-cursor-precise
      className="fixed inset-x-3 bottom-3 z-50 flex max-h-[70svh] flex-col overflow-hidden rounded-2xl border border-ash bg-ink/95 shadow-2xl backdrop-blur-xl outline-none md:inset-x-auto md:bottom-auto md:right-6 md:top-24 md:max-h-[min(78svh,640px)] md:w-[380px]"
    >
      <header className="flex items-start justify-between gap-3 border-b border-ash px-4 py-3">
        <div>
          <h2 id={headingId} className="text-sm font-medium text-chalk">
            Play with the background
          </h2>
          <p className="mt-1 text-[11px] leading-relaxed text-mute">
            Everything behind this panel is drawn by code. Drag a slider and
            watch it change.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          data-cursor="pointer"
          aria-label="Close"
          className="shrink-0 rounded-full border border-ash px-3 py-1 font-mono text-[11px] text-bone transition-colors hover:border-chalk hover:text-chalk"
        >
          Close
        </button>
      </header>

      <nav className="flex border-b border-ash" aria-label="Sections">
        {([
          ['params', 'Controls'],
          ['source', 'The code'],
          ['perf', 'Speed'],
        ] as [Tab, string][]).map(([id, name]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            data-cursor="pointer"
            aria-current={tab === id ? 'true' : undefined}
            className={`flex-1 px-3 py-2.5 text-[12px] transition-colors ${
              tab === id
                ? 'bg-smoke font-medium text-chalk'
                : 'text-mute hover:text-bone'
            }`}
          >
            {name}
          </button>
        ))}
      </nav>

      {/* data-lenis-prevent: Lenis captures wheel events at the window and
          drives scroll via transform, so without this the page scrolls
          underneath instead of the panel scrolling internally. */}
      <div
        data-lenis-prevent
        className="flex-1 overflow-y-auto overscroll-contain p-4"
      >
        {tab === 'params' && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => onPreset(preset.values)}
                  data-cursor="pointer"
                  className="rounded-full border border-ash px-3 py-1 font-mono text-[10px] text-bone transition-colors hover:border-acid hover:text-acid"
                >
                  {preset.name}
                </button>
              ))}
            </div>

            {HERO_PARAMS.map((spec) => {
              const value = params[spec.key]
              // Percentages read as "how much" far better than raw floats like
              // 0.006. The real number still matters to the small audience who
              // wants it, so it sits next to the term in the tooltip title.
              const pct = Math.round(
                ((value - spec.min) / (spec.max - spec.min)) * 100,
              )
              return (
                <div key={spec.key} className="space-y-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <label
                      htmlFor={`param-${spec.key}`}
                      className="text-[13px] text-chalk"
                    >
                      {spec.label}{' '}
                      <span
                        className="font-mono text-[10px] text-mute"
                        title={`${spec.key} = ${value}`}
                      >
                        {spec.term}
                      </span>
                    </label>
                    <span className="shrink-0 font-mono text-[11px] tabular-nums text-acid">
                      {spec.integer ? `${value.toFixed(0)}/${spec.max}` : `${pct}%`}
                    </span>
                  </div>
                  <input
                    id={`param-${spec.key}`}
                    type="range"
                    min={spec.min}
                    max={spec.max}
                    step={spec.step}
                    value={value}
                    data-cursor="pointer"
                    onChange={(event) =>
                      onParamChange(spec.key, Number(event.target.value))
                    }
                    // h-6 gives a ~24px touch target on mobile while the visual
                    // track stays thin via the thumb styling in index.css.
                    className="h-6 w-full cursor-pointer appearance-none bg-transparent accent-acid"
                  />
                  <p className="text-[11px] leading-relaxed text-mute">
                    {spec.hint}
                  </p>
                </div>
              )
            })}

            <button
              type="button"
              onClick={onReset}
              data-cursor="pointer"
              className="w-full rounded-full border border-ash px-4 py-2.5 text-[12px] text-bone transition-colors hover:border-chalk hover:text-chalk"
            >
              Put everything back
            </button>
          </div>
        )}

        {tab === 'source' && (
          <div className="space-y-3">
            <p className="text-[11px] leading-relaxed text-mute">
              This is the actual code drawing the background, running right now
              on your graphics card. Change anything and press Compile — if you
              break it, your GPU's own error message shows up below, and the
              original keeps running until you fix it.
            </p>

            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              spellCheck={false}
              data-lenis-prevent
              aria-label="Background shader code"
              className="h-56 w-full resize-y rounded-lg border border-ash bg-void p-3 font-mono text-[10px] leading-relaxed text-bone outline-none focus:border-acid md:h-64"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onSourceApply(draft)}
                disabled={!dirty}
                data-cursor="pointer"
                className="flex-1 rounded-full bg-acid px-4 py-2.5 text-[12px] font-medium text-void transition-opacity disabled:opacity-30"
              >
                Compile
              </button>
              <button
                type="button"
                onClick={() => {
                  onSourceReset()
                  setTab('source')
                }}
                data-cursor="pointer"
                className="rounded-full border border-ash px-4 py-2.5 text-[12px] text-bone transition-colors hover:border-chalk hover:text-chalk"
              >
                Undo my edits
              </button>
            </div>

            {compileLog && (
              <div
                role="status"
                className={`space-y-1.5 rounded-lg border p-3 ${
                  compileOk ? 'border-ash' : 'border-ember/60'
                }`}
              >
                {!compileOk && (
                  <p className="text-[11px] font-medium text-ember">
                    That didn't compile — the background is still running the
                    original.
                  </p>
                )}
                <pre
                  data-lenis-prevent
                  className={`max-h-28 overflow-auto whitespace-pre-wrap font-mono text-[10px] leading-relaxed ${
                    compileOk ? 'text-mute' : 'text-ember'
                  }`}
                >
                  {compileLog}
                </pre>
              </div>
            )}

            {!compileLog && compileOk && (
              <p role="status" className="text-[11px] text-acid">
                ✓ Compiled — that's your code on screen now.
              </p>
            )}
          </div>
        )}

        {tab === 'perf' && <PerfHud stats={stats} />}
      </div>
    </div>
  )
}
