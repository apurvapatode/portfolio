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

  // Anchored top-right on desktop so it never covers the hero CTA or the
  // trigger button in the bottom bar; full-width sheet on small screens, where
  // a 380px floating panel would leave no shader visible at all.
  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby={headingId}
      tabIndex={-1}
      className="fixed inset-x-3 bottom-3 z-50 flex max-h-[70svh] flex-col overflow-hidden rounded-2xl border border-ash bg-ink/95 shadow-2xl backdrop-blur-xl outline-none md:inset-x-auto md:bottom-auto md:right-4 md:top-24 md:max-h-[min(78svh,640px)] md:w-[380px]"
    >
      <header className="flex items-center justify-between gap-3 border-b border-ash px-4 py-3">
        <div>
          <h2
            id={headingId}
            className="font-mono text-[11px] uppercase tracking-[0.2em] text-chalk"
          >
            Shader Lab
          </h2>
          <p className="mt-0.5 text-[10px] text-mute">
            Live GLSL — edits recompile in-browser
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          data-cursor="pointer"
          aria-label="Close shader lab"
          className="rounded-full border border-ash px-2.5 py-1 font-mono text-[11px] text-bone transition-colors hover:border-chalk hover:text-chalk"
        >
           esc
        </button>
      </header>

      <nav className="flex border-b border-ash" aria-label="Shader lab sections">
        {(['params', 'source', 'perf'] as Tab[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            data-cursor="pointer"
            aria-current={tab === id ? 'true' : undefined}
            className={`flex-1 px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.15em] transition-colors ${
              tab === id
                ? 'bg-smoke text-chalk'
                : 'text-mute hover:text-bone'
            }`}
          >
            {id === 'perf' ? 'GPU' : id}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto overscroll-contain p-4">
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
              return (
                <div key={spec.key} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <label
                      htmlFor={`param-${spec.key}`}
                      className="font-mono text-[11px] text-chalk"
                    >
                      {spec.label}
                    </label>
                    <span className="font-mono text-[11px] tabular-nums text-acid">
                      {spec.integer ? value.toFixed(0) : value.toFixed(3)}
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
                    className="h-1 w-full cursor-pointer appearance-none rounded-full bg-ash accent-acid"
                  />
                  <p className="text-[10px] leading-relaxed text-mute">
                    {spec.hint}
                  </p>
                </div>
              )
            })}

            <button
              type="button"
              onClick={onReset}
              data-cursor="pointer"
              className="w-full rounded-full border border-ash px-4 py-2 font-mono text-[11px] text-bone transition-colors hover:border-chalk hover:text-chalk"
            >
              Reset to shipped values
            </button>
          </div>
        )}

        {tab === 'source' && (
          <div className="space-y-3">
            <p className="text-[10px] leading-relaxed text-mute">
              This is the live fragment shader. Edit and apply — it compiles
              against the real WebGL2 context. Errors come straight from your
              GPU driver.
            </p>

            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              spellCheck={false}
              aria-label="Fragment shader source"
              className="h-64 w-full resize-y rounded-lg border border-ash bg-void p-3 font-mono text-[10px] leading-relaxed text-bone outline-none focus:border-acid"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onSourceApply(draft)}
                disabled={!dirty}
                data-cursor="pointer"
                className="flex-1 rounded-full bg-acid px-4 py-2 font-mono text-[11px] text-void transition-opacity disabled:opacity-30"
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
                className="rounded-full border border-ash px-4 py-2 font-mono text-[11px] text-bone transition-colors hover:border-chalk hover:text-chalk"
              >
                Restore
              </button>
            </div>

            {compileLog && (
              <pre
                role="status"
                className={`max-h-32 overflow-auto whitespace-pre-wrap rounded-lg border p-3 font-mono text-[10px] leading-relaxed ${
                  compileOk
                    ? 'border-ash text-mute'
                    : 'border-ember/60 text-ember'
                }`}
              >
                {compileLog}
              </pre>
            )}

            {!compileLog && compileOk && (
              <p role="status" className="font-mono text-[10px] text-acid">
                ✓ Compiled and linked.
              </p>
            )}
          </div>
        )}

        {tab === 'perf' && <PerfHud stats={stats} />}
      </div>
    </div>
  )
}
