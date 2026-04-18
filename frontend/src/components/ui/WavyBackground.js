import { useEffect, useRef } from 'react';

// Config
const ZOOM_FACTOR         = 0.3;
const BASE_WAVE_AMPLITUDE = 0.2;
const RANDOM_WAVE_FACTOR  = 0.15;
const WAVE_FREQUENCY      = 4.0;
const TIME_FACTOR         = 0.25;
const BASE_SWIRL_STRENGTH = 1.2;
const SWIRL_TIME_MULT     = 5.0;
const NOISE_SWIRL_FACTOR  = 0.2;
const FBM_OCTAVES         = 10;

// Blue ocean palette (original AI Input Hero template colors)
const seaColors = [
  [0.00, 0.02, 0.05],
  [0.00, 0.04, 0.09],
  [0.00, 0.06, 0.14],
  [0.00, 0.09, 0.20],
  [0.00, 0.12, 0.28],
  [0.00, 0.16, 0.36],
  [0.00, 0.22, 0.45],
  [0.00, 0.28, 0.54],
  [0.00, 0.35, 0.62],
  [0.00, 0.42, 0.70],
  [0.02, 0.50, 0.78],
  [0.04, 0.58, 0.84],
  [0.08, 0.66, 0.88],
  [0.14, 0.74, 0.92],
  [0.22, 0.82, 0.95],
  [0.32, 0.88, 0.97],
  [0.46, 0.93, 0.98],
  [0.62, 0.96, 0.99],
  [0.80, 0.98, 1.00],
  [1.00, 1.00, 1.00],
];

function buildFragmentShader() {
  const colorArraySrc = seaColors.map(c => `vec3(${c[0]}, ${c[1]}, ${c[2]})`).join(',\n  ');
  return `#version 300 es
precision highp float;
out vec4 outColor;

uniform vec2 uResolution;
uniform float uTime;

#define NUM_COLORS 20

vec3 seaColors[NUM_COLORS] = vec3[](
  ${colorArraySrc}
);

vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float noise2D(vec2 v) {
  const vec4 C = vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0,i1.y,1.0)) + i.x + vec3(0.0,i1.x,1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x  = 2.0*fract(p*C.www) - 1.0;
  vec3 h  = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.792843 - 0.853734*(a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x *x0.x  + h.x *x0.y;
  g.yz = a0.yz*x12.xz + h.yz*x12.yw;
  return 130.0*dot(m, g);
}

float fbm(vec2 st) {
  float value = 0.0, amplitude = 0.5, freq = 1.0;
  for (int i = 0; i < ${FBM_OCTAVES}; i++) {
    value += amplitude * noise2D(st * freq);
    freq *= 2.0; amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec2 uv = (gl_FragCoord.xy / uResolution.xy) * 2.0 - 1.0;
  uv.x *= uResolution.x / uResolution.y;
  uv *= float(${ZOOM_FACTOR});

  float t = uTime * float(${TIME_FACTOR});
  float waveAmp = float(${BASE_WAVE_AMPLITUDE}) + float(${RANDOM_WAVE_FACTOR}) * noise2D(vec2(t, 27.7));

  uv.x += waveAmp * sin(uv.y * float(${WAVE_FREQUENCY}) + t);
  uv.y += waveAmp * sin(uv.x * float(${WAVE_FREQUENCY}) - t);

  float r = length(uv);
  float angle = atan(uv.y, uv.x);
  float swirlStrength = float(${BASE_SWIRL_STRENGTH}) * (1.0 - smoothstep(0.0, 1.0, r));
  angle += swirlStrength * sin(uTime + r * float(${SWIRL_TIME_MULT}));
  uv = vec2(cos(angle), sin(angle)) * r;

  float n = fbm(uv);
  n += float(${NOISE_SWIRL_FACTOR}) * sin(t + n * 3.0);
  float noiseVal = 0.5 * (n + 1.0);

  float idx = clamp(noiseVal, 0.0, 1.0) * float(NUM_COLORS - 1);
  int iLow  = int(floor(idx));
  int iHigh = int(min(float(iLow + 1), float(NUM_COLORS - 1)));
  float f   = fract(idx);

  vec3 color = mix(seaColors[iLow], seaColors[iHigh], f);

  float alpha = (iLow == 0 && iHigh == 0) ? 0.0 : 1.0;
  outColor = vec4(color, alpha);
}`;
}

const VERT = `#version 300 es
precision mediump float;
in vec2 aPosition;
void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }`;

export default function WavyBackground({ style }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas.getContext('webgl2', { alpha: true });
    if (!gl) return;

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };

    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, buildFragmentShader()));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'aPosition');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes  = gl.getUniformLocation(prog, 'uResolution');
    const uTime = gl.getUniformLocation(prog, 'uTime');

    const resize = () => {
      canvas.width  = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const t0 = performance.now();
    let raf;
    const draw = (now) => {
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(prog);
      gl.bindVertexArray(vao);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (now - t0) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: '100%', ...style }}
    />
  );
}
