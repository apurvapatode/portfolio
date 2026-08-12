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
  const fps = Math.round(stats.fps)

  // Smooth is the goal, and 60fps is the bar. Saying so in words means the
  // reader does not have to know what "16.7ms" implies to read the verdict.
  const verdict =
    stats.fps <= 0
      ? 'Measuring…'
      : fps >= 55
        ? 'Running smooth'
        : fps >= 30
          ? 'Slight stutter'
          : 'Struggling — try lowering Quality'

  return (
    <div className="w-full space-y-4 text-[12px]">
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-chalk">
            {stats.fps > 0 ? `${fps} frames per second` : '—'}
          </span>
          <span className="font-mono text-[11px] tabular-nums text-mute">
            {stats.frameMs > 0 ? `${stats.frameMs.toFixed(1)}ms` : ''}
          </span>
        </div>
        <BudgetBar value={stats.frameMs} budget={budget} />
        <p className="text-[11px] text-mute">{verdict}</p>
      </div>

      <p className="text-[11px] leading-relaxed text-mute">
        These numbers are live, measured on your own device. Drag Quality up
        and down in Controls and watch them move.
      </p>

      {/* The site quietly lowers its own quality on slower hardware, so say
          so — an unexplained soft image reads as a bug, whereas a named tier
          reads as the deliberate engineering it is. */}
      <div className="rounded-lg border border-ash p-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[11px] text-mute">Auto quality</span>
          <span className="font-mono text-[11px] uppercase text-acid">
            {stats.tier}
          </span>
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-mute">
          {stats.tier === 'high'
            ? 'Your device is keeping up, so the background runs at full detail.'
            : 'Detail and resolution were lowered automatically to keep the page responsive on this device.'}
        </p>
      </div>

      <div className="h-px bg-ash/60" />

      <div className="space-y-2 font-mono text-[11px]">
        <Row
          label="Worst recent frame"
          value={stats.p99Ms > 0 ? stats.p99Ms.toFixed(1) : '—'}
          sub="ms"
        />
        <Row
          label="Time spent drawing"
          value={stats.gpuMs >= 0 ? stats.gpuMs.toFixed(2) : 'not reported'}
          sub={stats.gpuMs >= 0 ? 'ms' : undefined}
        />
        <Row
          label="Pixels drawn"
          value={stats.width > 0 ? `${stats.width}×${stats.height}` : '—'}
        />
        <Row
          label="Pixels per second"
          value={
            stats.megaFragsPerSec > 0
              ? `${stats.megaFragsPerSec.toFixed(0)}M`
              : '—'
          }
        />
      </div>

      <div className="h-px bg-ash/60" />

      <div className="space-y-1.5">
        <span className="block text-[11px] text-mute">Your graphics card</span>
        <span className="block break-words font-mono text-[10px] leading-relaxed text-bone">
          {stats.renderer}
        </span>
      </div>

      {!stats.timerQuerySupported && (
        // Saying *why* a number is missing is the difference between a broken
        // readout and one that knows its own limits.
        <p className="text-[10px] leading-relaxed text-mute">
          Your browser won't report exact GPU drawing time — Safari and most
          phones withhold it to prevent fingerprinting. The frame rate above is
          measured a different way and is still accurate.
        </p>
      )}
    </div>
  )
}
