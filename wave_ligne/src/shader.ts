export const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

export const fragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform float uTime;
  uniform float uScrollSpeed;
  uniform float uWaveAmp;   // oscillation amplitude (in palette units, 0–1)
  uniform float uGrain;
  uniform float uSeam;

  uniform vec3 uColA;
  uniform vec3 uColB;
  uniform vec3 uColC;
  uniform vec3 uColD;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  // Loops through the 4 palette colours: A → B → C → D → A …
  vec3 palette(float t) {
    t = fract(t);
    float seg = t * 4.0;
    int i = int(floor(seg));
    float f = fract(seg);
    vec3 c0, c1;
    if      (i == 0) { c0 = uColA; c1 = uColB; }
    else if (i == 1) { c0 = uColB; c1 = uColC; }
    else if (i == 2) { c0 = uColC; c1 = uColD; }
    else             { c0 = uColD; c1 = uColA; }
    return mix(c0, c1, f);
  }

  void main() {
    vec2 uv = vUv;

    // Symmetric x: 0 at centre, 1 at edges
    float mx = abs(uv.x - 0.5) * 2.0;

    float t = uTime * uScrollSpeed;

    // Oscillating phase: the gradient slides back and forth sinusoidally
    float phase = sin(t) * uWaveAmp;

    // Sample: mx spans half the palette per half-screen, phase shifts it
    vec3 col = palette(mx * 0.5 + phase);

    // Dark seam at centre
    float dx = uv.x - 0.5;
    col *= 1.0 - exp(-(dx * dx) / 0.0015) * uSeam;

    // Film grain
    float g = (hash(gl_FragCoord.xy + floor(uTime * 30.0)) - 0.5) * uGrain;
    col = clamp(col + g, 0.0, 1.0);

    gl_FragColor = vec4(col, 1.0);
  }
`;
