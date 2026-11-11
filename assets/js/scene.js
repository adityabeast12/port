// WebGL particle field for the hero. The name is written onto the screen left
// to right, like a pen; scrolling turns it into the agent loop (particles that
// flow around a figure-eight, through four stations) and then into a live trace
// waterfall, the record of one agent run, filled in span by span as a cursor
// sweeps across it. Shapes are attributes blended in the vertex shader, so
// morphing costs nothing on the CPU.
//   morph -1 · the name      morph 0 · the agent loop      morph 1 · the trace

import * as THREE from '../vendor/three.module.min.js';

const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const gauss = () => {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

// One agent run, as a tracing tool shows it: [name, start, end, kind, duration]
// kind 0 run · 1 model · 2 tool or check · 3 person
export const SPANS = [
  ['agent.run', 0.0, 1.0, 0, '3.1 s'],
  ['guardrail.input', 0.01, 0.07, 2, '40 ms'],
  ['llm.plan', 0.07, 0.3, 1, '690 ms'],
  ['tool.get_invoice', 0.3, 0.47, 2, '520 ms'],
  ['llm.decide', 0.47, 0.66, 1, '590 ms'],
  ['approval.human', 0.66, 0.88, 3, '680 ms'],
  ['tool.send_email', 0.88, 0.97, 2, '280 ms'],
];
export const STATIONS = ['decide', 'call a tool', 'read the result', 'check · ask a person'];
const TL = { x0: -4.1, x1: 4.1, top: 1.95, step: 0.52, bar: 0.2 };
const rowY = (i) => TL.top - i * TL.step;
const CURSOR_SPEED = 0.11;
const cursorAt = (t) => ((t * CURSOR_SPEED) % 1) * 1.3 - 0.15;

// The trace: bars filled with particles, a moving "now" cursor, an axis, dust.
function trace(n, pos, tl, kind) {
  const weights = SPANS.map(([, a, b]) => Math.max(0.05, b - a));
  const wsum = weights.reduce((s, x) => s + x, 0);
  for (let i = 0; i < n; i++) {
    const r = Math.random();
    let p, t, k;
    if (r < 0.86) {
      // pick a span proportional to its length
      let x = Math.random() * wsum, s = 0;
      while (x > weights[s]) { x -= weights[s]; s++; }
      const [, a, b, kk] = SPANS[s];
      t = a + Math.random() * (b - a);
      const y = rowY(s) + (Math.random() - 0.5) * TL.bar;
      p = [TL.x0 + t * (TL.x1 - TL.x0), y, (Math.random() - 0.5) * 0.08];
      k = kk;
    } else if (r < 0.885) {
      t = Math.random(); // position along the cursor's height
      p = [0, TL.top + 0.35 - t * (SPANS.length * TL.step + 0.3), 0.02];
      k = 4;
    } else if (r < 0.925) {
      t = Math.random();
      const tick = Math.random() < 0.25;
      const tt = tick ? Math.round(t * 10) / 10 : t;
      p = [TL.x0 + tt * (TL.x1 - TL.x0), rowY(SPANS.length - 1) - 0.42 - (tick ? Math.random() * 0.12 : 0), 0];
      k = 5;
    } else {
      t = -1;
      p = [rand(-6, 6), rand(-3.2, 3.2), rand(-2, 1)];
      k = 5;
    }
    pos.set(p, i * 3); tl[i] = t; kind[i] = k;
  }
}

// Name shape: draw the text to an offscreen canvas and scatter particles over
// its filled pixels. boxW is the width the text should span in world units.
function textShape(n, out, lines, boxW, yOffset, font, weight = 700, spacing = '0px') {
  const W = 1400;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.font = `${weight} 200px ${font}`;
  ctx.letterSpacing = spacing;
  const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
  const size = Math.floor((200 * W * 0.97) / widest);
  const lineH = size * 1.02;
  const H = Math.ceil(lineH * lines.length + size * 0.25);
  c.width = W;
  c.height = H;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.letterSpacing = spacing;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, W / 2, H / 2 + (i - (lines.length - 1) / 2) * lineH));

  const data = ctx.getImageData(0, 0, W, H).data;
  const on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && data[(y * W + x) * 4 + 3] > 140;
  // Outline pixels get extra particles so the letters read crisply, and the
  // name is extruded into a shallow block so it shows depth when it tilts.
  const edge = [];
  const fill = [];
  for (let y = 0; y < H; y += 2) {
    for (let x = 0; x < W; x += 2) {
      if (!on(x, y)) continue;
      const isEdge = !on(x - 3, y) || !on(x + 3, y) || !on(x, y - 3) || !on(x, y + 3);
      (isEdge ? edge : fill).push(x, y);
    }
  }
  const scale = boxW / W;
  const boxH = H * scale;
  const depth = boxH * 0.05;
  const dust = Math.floor(n * 0.05);
  const pick = (arr) => { const k = Math.floor(Math.random() * (arr.length / 2)) * 2; return [arr[k], arr[k + 1]]; };
  for (let i = 0; i < n; i++) {
    if (i < dust || edge.length + fill.length === 0) {
      out.set([rand(-1, 1) * boxW * 0.75, rand(-1, 1) * boxH * 1.4 + yOffset, rand(-2, 1.5)], i * 3);
      continue;
    }
    const r = Math.random();
    let px, py, z;
    if (r < 0.46 && edge.length) {
      [px, py] = pick(edge);
      z = Math.random() < 0.85 ? depth : -depth;
    } else if (r < 0.58 && edge.length) {
      [px, py] = pick(edge);
      z = rand(-depth, depth);
    } else {
      [px, py] = pick(fill.length ? fill : edge);
      z = depth - Math.abs(gauss()) * depth * 0.35;
    }
    out.set([(px - W / 2 + rand(-0.8, 0.8)) * scale, -(py - H / 2 + rand(-0.8, 0.8)) * scale + yOffset, z], i * 3);
  }
}

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uMorph;
  uniform float uIntro;
  uniform float uSize;
  uniform float uVel;
  uniform float uScale;
  uniform vec3  uMouse;
  uniform float uRepel;    // 1 = the cursor pushes particles, 0 = off
  uniform float uSheen;    // strength of the light sweep across the name
  uniform float uNameHW;   // half width of the name, for the writing intro
  uniform vec2  uLoopS;    // loop scale (x, y)
  uniform float uPortrait; // 1 = stand the loop upright on tall screens
  uniform vec2  uTraceS;   // trace scale (x, y)
  uniform float uCursor;   // where the trace has been recorded up to (0..1)
  attribute vec3 aName;
  attribute vec3 aTrace;
  attribute float aU;      // place along the loop
  attribute vec2 aOff;     // offset across the loop's ribbon
  attribute float aTL;     // place along the trace timeline
  attribute float aKind;   // trace span kind
  attribute float aRand;
  varying float vRand;
  varying float vAlpha;
  varying float vSheen;
  varying float vPx;
  varying float vKind;
  varying float vTraceW;

  float w(float i) { return clamp(1.0 - abs(uMorph - i), 0.0, 1.0); }

  // A figure-eight with depth: the agent's loop.
  vec3 loopAt(float u) {
    float t = u * 6.2831853;
    float s = sin(t), c = cos(t), d = 1.0 + s * s;
    vec3 p = vec3(3.7 * c / d, 2.5 * s * c / d, 0.9 * s);
    if (uPortrait > 0.5) p = vec3(p.y * 1.1, p.x, p.z);
    return p * vec3(uLoopS, 1.0);
  }

  void main() {
    float wT = w(-1.0), wL = w(0.0), wR = w(1.0);

    // The loop: particles flow along the curve and bunch up at four stations.
    float u = fract(aU + uTime * 0.028 * (0.75 + 0.5 * aRand));
    u -= 0.013 * sin(25.1327 * (u - 0.125));
    vec3 lp = loopAt(u);
    vec3 tg = normalize(loopAt(u + 0.002) - lp + vec3(1e-5));
    vec3 nrm = normalize(vec3(-tg.y, tg.x, 0.0) + vec3(1e-5));
    lp += nrm * aOff.x + vec3(0.0, 0.0, aOff.y);
    // A bright packet laps the loop faster than the flow.
    float pk = fract(uTime * 0.085);
    float dpk = abs(fract(u - pk + 0.5) - 0.5);
    float packet = 1.0 - smoothstep(0.0, 0.035, dpk);

    // The trace: the cursor rides across the timeline; bars to its left are recorded.
    vec3 tp = aTrace;
    float cur = clamp(uCursor, 0.0, 1.0);
    if (aKind > 3.5 && aKind < 4.5) tp.x = mix(${TL.x0.toFixed(2)}, ${TL.x1.toFixed(2)}, cur);
    tp.xy *= uTraceS;
    float isBar = step(aKind, 3.5) * step(-0.5, aTL);
    float recorded = isBar > 0.5 ? 1.0 - smoothstep(uCursor - 0.012, uCursor + 0.004, aTL) : 1.0;
    float fresh = isBar * (1.0 - smoothstep(0.0, 0.05, abs(aTL - uCursor)));

    vec3 p = aName * wT + lp * wL + tp * wR;

    // Stagger the morph per particle so shapes dissolve rather than slide.
    float t = uTime * 0.6 + aRand * 6.2831;
    float settled = max(max(wT, wL), wR);
    float amp = 0.02 + (1.0 - settled) * 0.9 * aRand;
    p += vec3(sin(t + p.y * 1.7), cos(t * 0.9 + p.x * 1.3), sin(t * 1.1 + p.z * 1.5)) * amp;

    // Intro: the name is written left to right. Particles wait at the pen's
    // nib, which moves across, and fly from it to their place in the letters.
    float xn = clamp(aName.x / max(uNameHW, 0.1) * 0.5 + 0.5, 0.0, 1.0);
    float k = clamp((uIntro * 1.45 - xn * 0.45 - aRand * 0.08) / 0.92, 0.0, 1.0);
    k = k * k * (3.0 - 2.0 * k);
    float front = clamp((uIntro * 1.45 - 0.46) / 0.45, 0.0, 1.0);
    vec3 pen = vec3(mix(-uNameHW, uNameHW, front), aName.y * 0.18 + (aRand - 0.5) * 0.3, 0.8);
    p = mix(pen, p, k);

    vec4 world = modelMatrix * vec4(p, 1.0);
    vec2 d = world.xy - uMouse.xy;
    float dist = length(d);
    float force = smoothstep(mix(1.4, 0.95, wT) * uScale, 0.0, dist) * uRepel * mix(1.0, 0.55, wT) * (1.0 - wR * 0.7);
    world.xy += normalize(d + 0.0001) * force * 0.55 * uScale;
    world.z += force * 0.4 * uScale;
    world.y += uVel * (aRand - 0.5) * 0.6;

    vec4 mv = viewMatrix * world;
    gl_Position = projectionMatrix * mv;

    float size = uSize * mix(0.55 + aRand * 0.9, 0.8 + aRand * 0.35, max(wT, wR)) * mix(0.75, 1.0, uScale) * mix(0.9, 0.6, wT);
    size *= 1.0 + packet * wL * 0.9 + fresh * wR * 0.8;
    size *= mix(1.0, mix(0.7, 1.0, recorded), wR);
    float band = mod(uTime * 2.4, 26.0) - 13.0;
    vSheen = smoothstep(1.1, 0.0, abs(p.x + p.y * 0.4 - band)) * wT * uSheen + packet * wL * 0.9 + fresh * wR;
    size *= 1.0 + force * 1.5;
    gl_PointSize = clamp(size / -mv.z, uSize * 0.035, uSize * 0.28);
    vPx = gl_PointSize;

    vRand = aRand;
    vKind = aKind;
    vTraceW = wR;
    float dim = mix(1.0, mix(0.13, 1.0, recorded) * (aKind > 4.5 ? 0.4 : aKind > 3.5 ? 0.55 : 1.0), wR);
    // Where the loop crosses itself the two strands overlap; keep it from blooming.
    dim *= mix(1.0, mix(0.5, 1.0, smoothstep(0.0, 1.1, abs(uPortrait > 0.5 ? lp.y : lp.x))), wL);
    vAlpha = smoothstep(18.0, 3.0, -mv.z) * mix(0.03, 1.0, smoothstep(0.0, 0.3, k)) * dim;
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uColA;
  uniform vec3 uColB;
  uniform vec3 uColC;
  uniform float uOpacity;
  varying float vRand;
  varying float vAlpha;
  varying float vSheen;
  varying float vPx;
  varying float vKind;
  varying float vTraceW;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    // A crisp disc with a one-pixel anti-aliased edge, lightly shaded to the rim.
    float a = 1.0 - smoothstep(0.5 - 1.0 / vPx, 0.5, d);
    a *= mix(1.0, 0.72, smoothstep(0.0, 0.5, d));
    vec3 col = uColA;
    col = mix(col, uColB, step(0.9, vRand));
    col = mix(col, uColC, step(0.985, vRand));
    // In the trace, colour says who acted: model spans, tools and checks, a person.
    vec3 kc = vKind < 0.5 ? uColA : vKind < 1.5 ? uColB : vKind < 2.5 ? uColC : vKind < 3.5 ? mix(uColB, uColC, 0.5) : vKind < 4.5 ? uColA : uColA;
    col = mix(col, kc, vTraceW);
    col = mix(col, vec3(1.0), clamp(vSheen, 0.0, 1.0) * 0.85);
    gl_FragColor = vec4(col, a * vAlpha * uOpacity * (1.0 + vSheen));
  }
`;

export function createScene(canvas, { reducedMotion = false, labels = null } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  // Render at the screen's real pixel density (up to 3x on phones), otherwise
  // the browser stretches the canvas and every particle looks blurry.
  const dpr = Math.min(window.devicePixelRatio || 1, window.matchMedia('(max-width: 900px)').matches ? 3 : 2);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 8);

  const mobile = window.matchMedia('(max-width: 900px)').matches;
  const N = mobile ? 9000 : 16000;

  const sName = new Float32Array(N * 3);
  const sTrace = new Float32Array(N * 3);
  const aU = new Float32Array(N);
  const aOff = new Float32Array(N * 2);
  const aTL = new Float32Array(N);
  const aKind = new Float32Array(N);
  const r = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    r[i] = Math.random();
    aU[i] = Math.random();
    // most particles ride the ribbon; a few drift around it as a halo
    const halo = Math.random() < 0.1;
    aOff[i * 2] = gauss() * (halo ? 0.35 : 0.07);
    aOff[i * 2 + 1] = gauss() * (halo ? 0.35 : 0.07);
    sName[i * 3] = (Math.random() - 0.5) * 8; sName[i * 3 + 1] = (Math.random() - 0.5) * 3;
  }
  trace(N, sTrace, aTL, aKind);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(sTrace, 3)); // required; the shader uses aTrace
  const nameAttr = new THREE.BufferAttribute(sName, 3);
  geo.setAttribute('aName', nameAttr);
  geo.setAttribute('aTrace', new THREE.BufferAttribute(sTrace, 3));
  geo.setAttribute('aU', new THREE.BufferAttribute(aU, 1));
  geo.setAttribute('aOff', new THREE.BufferAttribute(aOff, 2));
  geo.setAttribute('aTL', new THREE.BufferAttribute(aTL, 1));
  geo.setAttribute('aKind', new THREE.BufferAttribute(aKind, 1));
  geo.setAttribute('aRand', new THREE.BufferAttribute(r, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 12);

  const uniforms = {
    uTime: { value: 0 },
    uMorph: { value: -1 },
    uIntro: { value: reducedMotion ? 1 : 0 },
    uSize: { value: (mobile ? 58 : 46) * dpr },
    uVel: { value: 0 },
    uScale: { value: 1 },
    uOpacity: { value: 1 },
    uMouse: { value: new THREE.Vector3(99, 99, 0) },
    uRepel: { value: 1 },
    uSheen: { value: 1 },
    uNameHW: { value: 4 },
    uLoopS: { value: new THREE.Vector2(1, 1) },
    uPortrait: { value: 0 },
    uTraceS: { value: new THREE.Vector2(1, 1) },
    uCursor: { value: 0 },
    uColA: { value: new THREE.Color('#dcebe2') },
    uColB: { value: new THREE.Color('#3ee089') },
    uColC: { value: new THREE.Color('#f5b23d') },
  };

  const mat = new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const group = new THREE.Group();
  group.add(new THREE.Points(geo, mat));
  scene.add(group);

  // ---- labels: the loop's four stations and the trace's spans ----
  const lab = { stations: [], spans: [] };
  if (labels) {
    const el = (cls, html) => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; labels.appendChild(d); return d; };
    STATIONS.forEach((s, i) => lab.stations.push(el('glabel glabel--station', `<i>${i + 1}</i>${s}`)));
    SPANS.forEach(([name, , , , dur]) => lab.spans.push(el('glabel glabel--span', `${name}<em>${dur}</em>`)));
  }

  const state = { morph: -1, opacity: 1, y: 0, scale: 1, scroll: 0, vel: 0 };
  const pointer = { x: 0, y: 0, tx: 0, ty: 0, active: false };

  function onPointer(e) {
    const rc = canvas.getBoundingClientRect();
    const inside = e.clientX >= rc.left && e.clientX <= rc.right && e.clientY >= rc.top && e.clientY <= rc.bottom;
    const c = (v) => Math.max(-1.5, Math.min(1.5, v));
    pointer.tx = c(((e.clientX - rc.left) / rc.width) * 2 - 1);
    pointer.ty = c(-((e.clientY - rc.top) / rc.height) * 2 + 1);
    pointer.active = inside;
  }
  window.addEventListener('pointermove', onPointer, { passive: true });
  document.addEventListener('pointerleave', () => { pointer.active = false; });

  let halfW = 5, halfH = 3;
  function resize() {
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = w / h < 1 ? 8 + (1 - w / h) * 6 : 8;
    camera.updateProjectionMatrix();
    halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    halfW = halfH * camera.aspect;
    const portrait = w / h < 0.9;
    uniforms.uPortrait.value = portrait ? 1 : 0;
    // Fit the loop and the trace inside the frame, leaving room for captions.
    const loopW = portrait ? 2.6 : 7.6, loopH = portrait ? 7.6 : 5.0;
    const ls = Math.min(1.15, (halfW * 1.7) / loopW, (halfH * 1.35) / loopH);
    uniforms.uLoopS.value.set(ls, ls);
    const tx = Math.min(1.1, (halfW * 1.72) / (TL.x1 - TL.x0));
    const ty = Math.min(1.05, (halfH * 1.25) / 4.2);
    uniforms.uTraceS.value.set(tx, ty);
  }
  resize();
  new ResizeObserver(resize).observe(canvas);

  const clock = new THREE.Clock();
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  let raf = 0;
  let running = true;
  let visible = true;
  let introT = reducedMotion ? 1 : 0;
  let nameReady = false; // the writing starts once the name's shape exists

  // Same maths as the shader, for placing the labels.
  function loopAt(u, out) {
    const t = u * Math.PI * 2, s = Math.sin(t), c = Math.cos(t), d = 1 + s * s;
    let x = (3.7 * c) / d, y = (2.5 * s * c) / d; const z = 0.9 * s;
    if (uniforms.uPortrait.value > 0.5) { const ox = x; x = y * 1.1; y = ox; }
    return out.set(x * uniforms.uLoopS.value.x, y * uniforms.uLoopS.value.y, z);
  }
  const widths = new Map();
  function place(el, v, op, w, hgt, centred) {
    if (op < 0.02) { if (el.style.opacity !== '0') el.style.opacity = '0'; return; }
    tmp2.copy(v).applyMatrix4(group.matrixWorld).project(camera);
    if (!widths.has(el) || !widths.get(el)) widths.set(el, el.offsetWidth);
    const lw = widths.get(el);
    // Keep every label fully on screen, even on narrow phones.
    let x = ((tmp2.x + 1) / 2) * w;
    x = centred ? Math.min(w - lw / 2 - 6, Math.max(lw / 2 + 6, x)) : Math.min(w - lw - 6, Math.max(6, x));
    el.style.transform = `translate(${x.toFixed(1)}px, ${(((1 - tmp2.y) / 2) * hgt).toFixed(1)}px) ${centred ? 'translate(-50%, -50%)' : 'translate(0, -100%)'}`;
    el.style.opacity = op.toFixed(3);
  }

  function frame() {
    raf = requestAnimationFrame(frame);
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    uniforms.uTime.value = reducedMotion ? 4 : t;

    const k = 1 - Math.pow(0.001, dt);
    uniforms.uMorph.value += (state.morph - uniforms.uMorph.value) * k * 0.9;
    uniforms.uVel.value += (state.vel - uniforms.uVel.value) * k;
    uniforms.uScale.value += (state.scale - uniforms.uScale.value) * k * 0.6;
    group.scale.setScalar(uniforms.uScale.value);
    uniforms.uOpacity.value += (state.opacity - uniforms.uOpacity.value) * k * 1.2;
    const cursor = reducedMotion ? 0.8 : cursorAt(t);
    uniforms.uCursor.value = cursor;

    pointer.x += (pointer.tx - pointer.x) * k * 0.8;
    pointer.y += (pointer.ty - pointer.y) * k * 0.8;

    const m = uniforms.uMorph.value;
    const wT = Math.max(0, 1 - Math.abs(m + 1)), wL = Math.max(0, 1 - Math.abs(m)), wR = Math.max(0, 1 - Math.abs(m - 1));
    // The name tilts toward the cursor so its depth shows and sways when idle;
    // the loop turns slowly to show its depth; the trace faces you like a chart.
    const sway = pointer.active || reducedMotion ? 0 : 1;
    const nameY = pointer.x * 0.26 * (1 - sway) + Math.sin(t * 0.45) * 0.09 * sway;
    const nameX = pointer.y * -0.16 * (1 - sway) + Math.sin(t * 0.33) * 0.04 * sway;
    const loopY = (reducedMotion ? 0 : Math.sin(t * 0.22) * 0.5) + pointer.x * 0.25;
    const loopX = -0.18 + pointer.y * -0.12;
    const trY = pointer.x * 0.1, trX = pointer.y * -0.06;
    group.rotation.y = nameY * wT + loopY * wL + trY * wR;
    group.rotation.x = nameX * wT + loopX * wL + trX * wR;
    const yTarget = state.y + state.scroll * -0.4;
    group.position.y += (yTarget - group.position.y) * k * 0.6;
    group.updateMatrixWorld();

    if (introT < 1 && nameReady) {
      introT = Math.min(1, introT + dt * 0.42);
      uniforms.uIntro.value = introT;
    }

    if (pointer.active) {
      tmp.set(pointer.x, pointer.y, 0.5).unproject(camera).sub(camera.position).normalize();
      const dist = -camera.position.z / tmp.z;
      uniforms.uMouse.value.copy(camera.position).addScaledVector(tmp, dist);
    } else {
      uniforms.uMouse.value.set(99, 99, 0);
    }

    renderer.render(scene, camera);

    if (labels && (wL > 0.02 || wR > 0.02 || labels.dataset.on)) {
      labels.dataset.on = wL > 0.02 || wR > 0.02 ? '1' : '';
      const W = canvas.clientWidth, H = canvas.clientHeight, op = uniforms.uOpacity.value;
      const portrait = uniforms.uPortrait.value > 0.5;
      lab.stations.forEach((el, i) => {
        loopAt(0.125 + i * 0.25, tmp);
        // sit each label just outside the ribbon, away from the centre
        if (portrait) tmp.x += Math.sign(tmp.x) * 0.4; else tmp.y += Math.sign(tmp.y) * 0.5;
        place(el, tmp, Math.pow(wL, 2) * op, W, H, true);
      });
      const ts = uniforms.uTraceS.value;
      lab.spans.forEach((el, i) => {
        const [, a] = SPANS[i];
        tmp.set((TL.x0 + a * (TL.x1 - TL.x0)) * ts.x, (rowY(i) + 0.17) * ts.y, 0);
        el.classList.toggle('is-rec', cursor > a);
        place(el, tmp, Math.pow(wR, 2) * op * (cursor > a ? 1 : 0.28), W, H, false);
      });
    }
  }
  frame();

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden && visible;
    if (running) clock.getDelta();
  });

  return {
    state,
    uniforms,
    // Build the name shape. lines: e.g. ['ADITYA SHUKLA'] or ['ADITYA', 'SHUKLA'].
    // width: fraction of the visible width the name spans; lift: fraction of
    // the half-height to move it up (leaving room for text underneath).
    setText(lines, { width = 0.86, lift = 0.2, font = 'Poppins, sans-serif', weight = 700, spacing = '0px' } = {}) {
      const boxW = halfW * 2 * width;
      textShape(N, sName, lines, boxW, halfH * lift, font, weight, spacing);
      uniforms.uNameHW.value = boxW / 2;
      nameAttr.needsUpdate = true;
      nameReady = true;
    },
    setColors(a, b, c) {
      uniforms.uColA.value.set(a);
      uniforms.uColB.value.set(b);
      uniforms.uColC.value.set(c);
    },
    // Glowing (additive) particles vanish on light backgrounds, so light
    // universes can switch to normal blending with darker colours.
    setBlending(additive) {
      mat.blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending;
      mat.needsUpdate = true;
    },
    halfHeight() { return halfH; },
    // Update any of: shape, y, opacity, scale.
    set(o) {
      if (o.shape !== undefined) state.morph = o.shape;
      if (o.y !== undefined) state.y = o.y;
      if (o.scale !== undefined) state.scale = o.scale;
      if (o.repel !== undefined) uniforms.uRepel.value = o.repel;
      if (o.sheen !== undefined) uniforms.uSheen.value = o.sheen;
      if (o.opacity !== undefined) state.opacity = o.opacity < 1 && mobile ? o.opacity * 0.7 : o.opacity;
      if (o.snap) {
        uniforms.uScale.value = state.scale;
        group.scale.setScalar(state.scale);
        group.position.y = state.y;
        uniforms.uMorph.value = state.morph;
      }
    },
    setVisible(v) {
      visible = v;
      running = v && !document.hidden;
      if (running) clock.getDelta();
    },
    destroy() { cancelAnimationFrame(raf); renderer.dispose(); },
  };
}
