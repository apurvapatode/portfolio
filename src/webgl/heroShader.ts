export const HERO_VERT = /* glsl */ `#version 300 es
layout(location = 0) in vec2 aPosition;
out vec2 vUv;

void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`

/**
 * Domain-warped FBM over a signed-distance metaball field.
 *
 * The visual is built in three passes inside one fragment shader:
 *   1. A slow-drifting fluid field (FBM warped by another FBM) for the base.
 *   2. Three metaballs smooth-min'd together, one of which tracks the pointer.
 *   3. Chromatic offset + film grain + vignette as the finishing grade.
 */
export const HERO_FRAG = /* glsl */ `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform vec2  uResolution;
uniform vec2  uPointer;      // normalised, smoothed on the CPU
uniform float uTime;
uniform float uIntensity;    // 0..1 master dial, eased on scroll
uniform vec3  uColorA;
uniform vec3  uColorB;
uniform vec3  uColorC;

// -- Live-tunable parameters ----------------------------------------------
// Exposed to the in-page shader playground. Every default below reproduces
// the literal that used to be hard-coded at the same site, so the shipped
// visual is bit-identical with the playground closed.
uniform float uWarp;         // domain-warp strength      (default 4.0)
uniform float uScale;        // field frequency           (default 1.8)
uniform float uSpeed;        // time multiplier           (default 0.35)
uniform float uTravel;       // field pan per viewport scrolled (default 0.6)
uniform float uBallRadius;   // pointer metaball radius   (default 0.22)
uniform float uSmooth;       // smin blend factor         (default 0.45)
uniform float uRim;          // rim-light gain            (default 0.5)
uniform float uAberration;   // chromatic offset          (default 0.006)
uniform float uGrain;        // film grain amount         (default 0.035)
uniform float uVignette;     // vignette depth            (default 0.5)
uniform int   uOctaves;      // FBM octaves               (default 5)
uniform int   uWarpLayers;   // 1 or 2 warp passes        (default 2)

// -- World-scroll drive -----------------------------------------------------
// The field is the whole page's ground, and these two are how the page talks
// to it. Both are written by the scroll camera in ShaderCanvas; a shader
// compiled without them (an older edit in the lab) simply stands still.
uniform float uScroll;       // smoothed scroll position, in viewport heights
uniform float uEnergy;       // 0..1 — scroll velocity, spiky up, slow down

// -- Hash / noise ----------------------------------------------------------

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

// Gradient noise. Quintic interpolant keeps the second derivative continuous,
// which matters here because we feed the output back in as a warp.
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);

  return mix(
    mix(dot(hash2(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
        dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
    mix(dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
        dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
    u.y
  );
}

// 5 octaves by default: past this the detail lands below one pixel at our DPR
// cap. The loop bound is a compile-time constant with a runtime break because
// GLSL ES 3.0 requires loops to be provably bounded for unrolling — a bare
// "i < uOctaves" would force the driver into a dynamic loop and cost more
// than the octaves it saves. (No backticks here: this comment lives inside a
// template literal, and one would terminate the shader string.)
const int MAX_OCTAVES = 8;

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < MAX_OCTAVES; i++) {
    if (i >= uOctaves) break;
    value += amplitude * noise(p);
    p *= 2.02;          // non-integer lacunarity avoids axis-aligned banding
    amplitude *= 0.5;
  }
  return value;
}

// -- Field construction ----------------------------------------------------

// Two warp layers cost 5 fbm() calls; one costs 3. The second layer adds the
// fine curling filaments — lovely on a desktop GPU, and invisible once the
// image is being upscaled from 40% resolution on a phone. uWarpLayers lets
// the quality governor drop it, which removes 40% of the shader's total work.
// The warp strength arrives as an argument rather than being read from uWarp
// directly, because scroll energy modulates it per frame in main().
float warpedField(vec2 p, float t, float warpAmt) {
  vec2 q = vec2(fbm(p + vec2(0.0, t * 0.12)), fbm(p + vec2(5.2, 1.3 - t * 0.09)));

  if (uWarpLayers < 2) {
    return fbm(p + warpAmt * q);
  }

  vec2 r = vec2(
    fbm(p + warpAmt * q + vec2(1.7, 9.2) + t * 0.06),
    fbm(p + warpAmt * q + vec2(8.3, 2.8) - t * 0.05)
  );
  return fbm(p + warpAmt * r);
}

// Polynomial smooth minimum — merges the metaballs without a crease.
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float metaballs(vec2 uv, vec2 pointer, float t) {
  float d = length(uv - pointer) - uBallRadius;
  d = smin(d, length(uv - vec2(sin(t * 0.4) * 0.5, cos(t * 0.31) * 0.3)) - 0.3, uSmooth);
  d = smin(d, length(uv - vec2(cos(t * 0.23) * 0.6, sin(t * 0.37) * 0.4)) - 0.26, uSmooth);
  return d;
}

void main() {
  // Aspect-correct coordinates centred on the viewport.
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);
  float t = uTime * uSpeed;

  vec2 pointer = uPointer * vec2(uResolution.x / uResolution.y, 1.0) * 0.5;

  // Scroll is a camera move, not a redecoration: the same continuous field,
  // sampled further along. Scrolling toward the footer pans the fluid upward
  // past the reader at uTravel field-units per viewport — a fraction of the
  // content's speed, so it reads as a deep layer, not an attached texture.
  vec2 world = uv * uScale;
  world.y -= uScroll * uTravel;

  // Velocity stirs the field: a fling tightens the swirl while it lasts. The
  // metaballs stay in screen space on purpose — they are the companions that
  // travel with you while the world streams past.
  float warpAmt = uWarp * (1.0 + 0.6 * uEnergy);

  float field = warpedField(world, t, warpAmt);
  float balls = metaballs(uv, pointer, t);

  // Pointer proximity locally boosts the warp so the field "leans" toward you.
  float proximity = 1.0 - smoothstep(0.0, 0.9, length(uv - pointer));
  float mask = smoothstep(0.35, -0.15, balls) * (0.55 + 0.45 * proximity);
  float blend = clamp(field * 1.6 + 0.5, 0.0, 1.0);

  vec3 color = mix(uColorA, uColorB, blend);

  // The accent is deliberately restrained: it reads as a glow inside the
  // metaball rather than flooding the frame, so headline type stays legible.
  // Scroll energy feeds it — motion is the one moment extra colour is earned,
  // because the reader is watching the page move, not reading over it.
  color = mix(color, uColorC, mask * (0.16 + 0.1 * uEnergy) * uIntensity);

  // Fresnel-ish rim where the metaball boundary crosses the noise ridges.
  // This thin bright edge is where the accent colour actually earns its place.
  float rim = smoothstep(0.05, 0.0, abs(balls - 0.02));
  color += uColorC * rim * uRim * (1.0 + 0.8 * uEnergy) * uIntensity;

  // Chromatic aberration.
  //
  // This used to call warpedField() a second time at a radial offset, which
  // doubled the cost of the most expensive function in the shader — 25 extra
  // noise() evaluations per pixel — to tint one channel. The offset is tiny
  // (a fraction of a pixel at typical values), so the resampled field is very
  // nearly the original plus its own gradient along dir. Approximating it
  // with the screen-space derivative gives a visually equivalent split for
  // two hardware-accelerated instructions instead of a second field.
  vec2 dir = normalize(uv + 1e-5);
  float radius = length(uv);
  float gradient = dot(vec2(dFdx(field), dFdy(field)), dir);
  float shifted = field - gradient * uAberration * radius * 140.0;
  color.r = mix(color.r, mix(uColorA, uColorB, clamp(shifted * 1.6 + 0.5, 0.0, 1.0)).r, 0.6);

  // Grain, tied to time so it shimmers rather than sitting static.
  float grain = fract(sin(dot(gl_FragCoord.xy + t, vec2(12.9898, 78.233))) * 43758.5453);
  color += (grain - 0.5) * uGrain;

  color *= 1.0 - uVignette * smoothstep(0.5, 1.25, radius);   // vignette
  color = pow(max(color, 0.0), vec3(0.9));              // lift the shadows

  fragColor = vec4(color, 1.0);
}
`
