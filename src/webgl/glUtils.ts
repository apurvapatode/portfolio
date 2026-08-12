/**
 * Minimal WebGL2 helpers. Deliberately dependency-free: the whole GPU layer of
 * this site is a single fullscreen triangle running a fragment shader, so
 * pulling in a scene graph library would cost ~150kb for nothing.
 */

/** A compile/link failure, carrying the driver's log for display in the UI. */
export type CompileResult =
  | { ok: true; program: WebGLProgram }
  | { ok: false; log: string }

export function createShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): { ok: true; shader: WebGLShader } | { ok: false; log: string } {
  const shader = gl.createShader(type)
  if (!shader) return { ok: false, log: 'Could not allocate shader object.' }

  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? 'Unknown compile error.'
    gl.deleteShader(shader)
    return { ok: false, log }
  }

  return { ok: true, shader }
}

/**
 * Compiles and links a program, returning the driver's log on failure rather
 * than only console-logging it — the shader playground renders that log back to
 * the user, so it has to survive as a value.
 */
export function compileProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
): CompileResult {
  const vertex = createShader(gl, gl.VERTEX_SHADER, vertexSource)
  if (!vertex.ok) return { ok: false, log: vertex.log }

  const fragment = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource)
  if (!fragment.ok) {
    gl.deleteShader(vertex.shader)
    return { ok: false, log: fragment.log }
  }

  const program = gl.createProgram()
  if (!program) {
    gl.deleteShader(vertex.shader)
    gl.deleteShader(fragment.shader)
    return { ok: false, log: 'Could not allocate program object.' }
  }

  gl.attachShader(program, vertex.shader)
  gl.attachShader(program, fragment.shader)
  gl.linkProgram(program)

  // Shaders are reference-counted by the program; safe to release our handles.
  gl.deleteShader(vertex.shader)
  gl.deleteShader(fragment.shader)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? 'Unknown link error.'
    gl.deleteProgram(program)
    return { ok: false, log }
  }

  return { ok: true, program }
}

/** Convenience wrapper for callers that only care whether it worked. */
export function createProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
): WebGLProgram | null {
  const result = compileProgram(gl, vertexSource, fragmentSource)
  if (result.ok) return result.program
  if (import.meta.env.DEV) console.error('Shader program failed:', result.log)
  return null
}

/**
 * A single oversized triangle covering the viewport. Cheaper than two triangles
 * for a quad — no diagonal seam, one less vertex, and no overdraw on the edge.
 */
export function createFullscreenTriangle(gl: WebGL2RenderingContext) {
  const vao = gl.createVertexArray()
  const buffer = gl.createBuffer()

  gl.bindVertexArray(vao)
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  )
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  gl.bindVertexArray(null)

  return { vao, buffer }
}

/**
 * Reads the unmasked GPU string when the driver allows it.
 *
 * Browsers increasingly spoof or withhold this for fingerprinting reasons, and
 * Safari never exposed it, so every branch here is reachable in the wild.
 */
export function getRendererName(gl: WebGL2RenderingContext): string {
  const ext = gl.getExtension('WEBGL_debug_renderer_info')
  if (ext) {
    const name = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
    if (typeof name === 'string' && name.length > 0) return name
  }
  const fallback = gl.getParameter(gl.RENDERER)
  return typeof fallback === 'string' && fallback.length > 0 ? fallback : 'unknown'
}

/**
 * Wraps `EXT_disjoint_timer_query_webgl2` into a one-query-in-flight sampler.
 *
 * GPU timing is asynchronous by nature: the result of a query is not readable
 * until the GPU has actually retired the commands, which is typically one or
 * two frames after we issued them. Calling `getQueryParameter` before then
 * would stall the pipeline and make the very thing we are measuring slower.
 * So this keeps at most one query outstanding and simply reports the newest
 * result whenever it becomes ready.
 *
 * The extension is absent on Safari and on most mobile drivers, and even where
 * present the GPU may signal `GPU_DISJOINT` (a clock change or context switch
 * invalidated the timing) — in both cases we report -1 and the HUD falls back
 * to CPU frame time.
 */
export function createGpuTimer(gl: WebGL2RenderingContext) {
  const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2')

  if (!ext) {
    return {
      supported: false,
      begin() {},
      end() {},
      /** Newest completed sample in ms, or -1 when none is available. */
      read: () => -1,
      dispose() {},
    }
  }

  const TIME_ELAPSED = ext.TIME_ELAPSED_EXT
  const GPU_DISJOINT = ext.GPU_DISJOINT_EXT

  let pending: WebGLQuery | null = null
  let active = false
  let latest = -1

  return {
    supported: true,

    begin() {
      if (pending) return // one in flight at a time
      const query = gl.createQuery()
      if (!query) return
      pending = query
      active = true
      gl.beginQuery(TIME_ELAPSED, query)
    },

    end() {
      if (!active) return
      gl.endQuery(TIME_ELAPSED)
      active = false
    },

    read(): number {
      if (!pending || active) return latest

      // A disjoint event means every in-flight timing is garbage, not just
      // late — discard rather than report a wrong number.
      if (gl.getParameter(GPU_DISJOINT)) {
        gl.deleteQuery(pending)
        pending = null
        latest = -1
        return latest
      }

      if (!gl.getQueryParameter(pending, gl.QUERY_RESULT_AVAILABLE)) return latest

      const nanoseconds = gl.getQueryParameter(pending, gl.QUERY_RESULT) as number
      gl.deleteQuery(pending)
      pending = null
      latest = nanoseconds / 1e6
      return latest
    },

    dispose() {
      if (active) {
        gl.endQuery(TIME_ELAPSED)
        active = false
      }
      if (pending) {
        gl.deleteQuery(pending)
        pending = null
      }
    },
  }
}

export type GpuTimer = ReturnType<typeof createGpuTimer>

/**
 * Caps the backing store at 2x DPR. Retina phones report 3-4x, which quadruples
 * fragment cost for a difference nobody can see on a noise-based shader.
 */
export function resizeCanvas(
  canvas: HTMLCanvasElement,
  gl: WebGL2RenderingContext,
  maxDpr = 2,
): boolean {
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr)
  const width = Math.floor(canvas.clientWidth * dpr)
  const height = Math.floor(canvas.clientHeight * dpr)

  if (canvas.width === width && canvas.height === height) return false
  if (width === 0 || height === 0) return false

  canvas.width = width
  canvas.height = height
  gl.viewport(0, 0, width, height)
  return true
}
