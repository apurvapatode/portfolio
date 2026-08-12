/**
 * Minimal WebGL2 helpers. Deliberately dependency-free: the whole GPU layer of
 * this site is a single fullscreen triangle running a fragment shader, so
 * pulling in a scene graph library would cost ~150kb for nothing.
 */

export function createShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null

  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    if (import.meta.env.DEV) {
      console.error('Shader compile failed:', gl.getShaderInfoLog(shader))
    }
    gl.deleteShader(shader)
    return null
  }

  return shader
}

export function createProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
): WebGLProgram | null {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource)
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource)
  if (!vertexShader || !fragmentShader) return null

  const program = gl.createProgram()
  if (!program) return null

  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)

  // Shaders are reference-counted by the program; safe to release our handles.
  gl.deleteShader(vertexShader)
  gl.deleteShader(fragmentShader)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    if (import.meta.env.DEV) {
      console.error('Program link failed:', gl.getProgramInfoLog(program))
    }
    gl.deleteProgram(program)
    return null
  }

  return program
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
