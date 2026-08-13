import { useCallback, useState } from 'react'
import { ShaderCanvas } from '../webgl/ShaderCanvas'
import { HERO_FRAG } from '../webgl/heroShader'
import { DEFAULT_PARAMS, type ParamKey, type ParamValues } from '../webgl/heroParams'
import { ShaderLab } from './ShaderLab'
import { useGpuProfiler } from '../hooks/useGpuProfiler'

export type ShaderFieldProps = {
  /** The lab sheet's visibility. Owned by App — the invitation to open it
      lives in the hero, a component this one never renders. */
  labOpen: boolean
  onCloseLab: () => void
}

/**
 * The field the whole site sits on.
 *
 * One canvas, pinned to the viewport behind every section. The page is not a
 * hero image followed by flat pages — it is one continuous fluid that the
 * reader travels through: scroll pans it (heroShader's uScroll), scroll
 * velocity stirs it (uEnergy), and the palette belongs to whichever section
 * the camera is passing (worldScene.ts). The shader lab still edits this one
 * canvas, which now means editing the entire site's ground, live.
 *
 * Stacking is the delicate part. The wrapper sits at z:-10 in the root
 * stacking context, which paints above the html background but below every
 * in-flow section — no section needs a z-index of its own for its text to
 * clear the field. Two things keep that true, and both are load-bearing:
 * nothing between this wrapper and <html> may create a stacking context, and
 * body's background must stay transparent (index.css) — negative-z elements
 * paint below in-flow backgrounds, so an opaque body would erase the field.
 */
export function ShaderField({ labOpen, onCloseLab }: ShaderFieldProps) {
  const [params, setParams] = useState<ParamValues>(DEFAULT_PARAMS)
  const [source, setSource] = useState(HERO_FRAG)
  const [compile, setCompile] = useState({ ok: true, log: '' })

  // The HUD's profiler still only publishes while the lab is open — nobody is
  // reading a readout that is not on screen.
  const { stats, record, describe } = useGpuProfiler(labOpen)

  const handleParamChange = useCallback((key: ParamKey, value: number) => {
    setParams((prev) => ({ ...prev, [key]: value }))
    // Reduced-motion draws a single frame, so it needs a nudge to redraw.
    window.dispatchEvent(new Event('shaderparams'))
  }, [])

  const handlePreset = useCallback((values: Partial<ParamValues>) => {
    setParams((prev) => ({ ...prev, ...values }))
    window.dispatchEvent(new Event('shaderparams'))
  }, [])

  const handleReset = useCallback(() => {
    setParams(DEFAULT_PARAMS)
    window.dispatchEvent(new Event('shaderparams'))
  }, [])

  const handleSourceReset = useCallback(() => setSource(HERO_FRAG), [])

  const handleCompile = useCallback(
    (result: { ok: boolean; log: string }) => setCompile(result),
    [],
  )

  return (
    <>
      <div aria-hidden="true" className="grain fixed inset-0 -z-10 overflow-hidden">
        <ShaderCanvas
          params={params}
          fragmentSource={source}
          onCompile={handleCompile}
          onFrame={record}
          onInfo={describe}
          profiling={labOpen}
        />

        {/* Legibility scrims, page-wide. Both are the page background at
            partial alpha, so they work in either theme: they push the field
            toward the ground colour rather than toward black specifically.
            The gradient leaves the middle of the viewport clearest — content
            scrolls across the field's brightest band while headlines near the
            edges get the extra cover they need. Softer than the old hero
            scrim's solid bottom on purpose: nothing fades to a flat colour
            any more, because the world does not end at the fold. */}
        <div className="absolute inset-0 bg-void/60" />
        <div className="absolute inset-0 bg-gradient-to-b from-void/70 via-void/15 to-void/70" />
      </div>

      <ShaderLab
        open={labOpen}
        onClose={onCloseLab}
        params={params}
        onParamChange={handleParamChange}
        onPreset={handlePreset}
        onReset={handleReset}
        source={source}
        onSourceApply={setSource}
        onSourceReset={handleSourceReset}
        compileLog={compile.log}
        compileOk={compile.ok}
        stats={stats}
      />
    </>
  )
}
