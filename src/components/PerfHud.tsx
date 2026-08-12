import type { GpuStats } from '../hooks/useGpuProfiler'

/**
 * A bar that fills toward a budget rather than a max. 16.7ms is the 60fps
 * frame budget, so "how full is the bar" reads directly as "how close am I to
 * dropping a frame" — which is the only question a frame-time number answers.
 */
function BudgetBar({ value, budget }: { value: number; budget: number }) {
  const ratio = budget > 0 ? Math.min(value / budget, 1) : 0
  const tone =
    ratio < 0.6 ? 'bg-acid' : ratio < 0.85 ? 'bg-[#ffb020]' : 'bg-ember'

  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-ash/60">
      <div
        className={`h-full rounded-full transition-[width] duration-200 ${tone}`}
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  )
}

function Row({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-mute">{label}</span>
      <span className="text-right tabular-nums text-chalk">
        {value}
        {sub && <span className="ml-1 text-[10px] text-mute">{sub}</span>}
      </span>
    </div>
  )
}

export function PerfHud({ stats }: { stats: GpuStats }) {
  const budget = 1000 / 60

  return (
    <div className="w-full space-y-3 font-mono text-[11px] leading-none">
      <div className="space-y-2">
        <Row
          label="Frame"
          value={stats.frameMs > 0 ? stats.frameMs.toFixed(2) : '—'}
          sub="ms median"
        />
        <BudgetBar value={stats.frameMs} budget={budget} />
      </div>

      <Row
        label="FPS"
        value={stats.fps > 0 ? Math.round(stats.fps).toString() : '—'}
      />

      <Row
        label="p99 frame"
        value={stats.p99Ms > 0 ? stats.p99Ms.toFixed(2) : '—'}
        sub="ms"
      />

      <div className="space-y-2">
        <Row
          label="GPU draw"
          value={stats.gpuMs >= 0 ? stats.gpuMs.toFixed(3) : 'n/a'}
          sub={stats.gpuMs >= 0 ? 'ms' : undefined}
        />
        {stats.gpuMs >= 0 && <BudgetBar value={stats.gpuMs} budget={budget} />}
      </div>

      <div className="h-px bg-ash/60" />

      <Row
        label="Backing store"
        value={stats.width > 0 ? `${stats.width}×${stats.height}` : '—'}
      />
      <Row label="DPR cap" value={`${stats.dpr}×`} />
      <Row
        label="Fill rate"
        value={
          stats.megaFragsPerSec > 0 ? stats.megaFragsPerSec.toFixed(0) : '—'
        }
        sub="Mfrag/s"
      />

      <div className="h-px bg-ash/60" />

      <div className="space-y-1.5">
        <span className="block text-mute">GPU</span>
        <span className="block break-words text-[10px] leading-relaxed text-bone">
          {stats.renderer}
        </span>
      </div>

      {!stats.timerQuerySupported && (
        // Saying *why* the number is missing is the difference between a broken
        // HUD and a HUD that knows its own limits.
        <p className="text-[10px] leading-relaxed text-mute">
          EXT_disjoint_timer_query unavailable — Safari and most mobile drivers
          withhold it. Frame time is CPU-side and still accurate.
        </p>
      )}
    </div>
  )
}
