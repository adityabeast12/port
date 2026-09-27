// WebGL particle field: ~10k points that morph between five shapes as the
// visitor scrolls. Each shape is stored as its own attribute and blended in
// the vertex shader, so morphing costs nothing on the CPU.
//   0 core sphere · 1 agent network · 2 waveform · 3 guarded core · 4 galaxy

import * as THREE from '../vendor/three.module.min.js';

const SHAPES = 5;

const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const gauss = () => {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

function sphere(n, out) {
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const shell = Math.random() < 0.82;
    const r = shell ? 1.75 * (0.96 + Math.random() * 0.06) : 1.75 * Math.cbrt(Math.random()) * 0.85;
    const y = 1 - (i / (n - 1)) * 2;
    const rr = Math.sqrt(1 - y * y);
    const th = golden * i;
    out.set([Math.cos(th) * rr * r, y * r, Math.sin(th) * rr * r], i * 3);
  }
}

// Orchestrator at the centre, specialist agents around it, message paths between.
function network(n, out) {
  const nodes = [[0, 0, 0]];
  const k = 7;
  for (let i = 0; i < k; i++) {
    const a = (i / k) * Math.PI * 2 + 0.3;
    const y = Math.sin(i * 2.1) * 0.9;
    nodes.push([Math.cos(a) * 2.7, y, Math.sin(a) * 2.7]);
  }
  const edges = [];
  for (let i = 1; i <= k; i++) {
    edges.push([0, i]);
    edges.push([i, (i % k) + 1]);
  }
  for (let i = 0; i < n; i++) {
    const t = Math.random();
    let p;
    if (t < 0.34) {
      const ni = Math.random() < 0.3 ? 0 : 1 + Math.floor(Math.random() * k);
      const s = ni === 0 ? 0.32 : 0.16;
      const c = nodes[ni];
      p = [c[0] + gauss() * s, c[1] + gauss() * s, c[2] + gauss() * s];
    } else if (t < 0.9) {
      const e = edges[Math.floor(Math.random() * edges.length)];
      const a = nodes[e[0]], b = nodes[e[1]];
      const u = Math.random();
      const j = 0.035;
      p = [a[0] + (b[0] - a[0]) * u + gauss() * j, a[1] + (b[1] - a[1]) * u + gauss() * j, a[2] + (b[2] - a[2]) * u + gauss() * j];
    } else {
      const r = rand(3.5, 7);
      const th = rand(0, Math.PI * 2), ph = Math.acos(rand(-1, 1));
      p = [r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * 0.6, r * Math.sin(ph) * Math.sin(th)];
    }
    out.set(p, i * 3);
  }
  return { nodes, edges };
}

function wave(n, out) {
  const cols = Math.ceil(Math.sqrt(n * 2.2));
  const rows = Math.ceil(n / cols);
  for (let i = 0; i < n; i++) {
    const cx = i % cols, cz = Math.floor(i / cols);
    const x = (cx / (cols - 1) - 0.5) * 11;
    const z = (cz / (rows - 1) - 0.5) * 5;
    out.set([x, -0.6, z], i * 3);
  }
}

// A small core wrapped by two guard rings and an outer boundary.
function guarded(n, out) {
  for (let i = 0; i < n; i++) {
    const t = Math.random();
    let p;
    if (t < 0.3) {
      const r = 0.75 * Math.cbrt(Math.random());
      const th = rand(0, Math.PI * 2), ph = Math.acos(rand(-1, 1));
      p = [r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)];
    } else if (t < 0.72) {
      const R = 1.7, rr = 0.05;
      const a = rand(0, Math.PI * 2), b = rand(0, Math.PI * 2);
      const x = (R + rr * Math.cos(b)) * Math.cos(a);
      const y = rr * Math.sin(b);
      const z = (R + rr * Math.cos(b)) * Math.sin(a);
      // Tilt each ring toward the camera, then turn the second one so they cross.
      const tilt = 1.2;
      let q = [x, y * Math.cos(tilt) - z * Math.sin(tilt), y * Math.sin(tilt) + z * Math.cos(tilt)];
      if (Math.random() < 0.5) {
        const r2 = 1.1;
        q = [q[0] * Math.cos(r2) - q[1] * Math.sin(r2), q[0] * Math.sin(r2) + q[1] * Math.cos(r2), q[2]];
      }
      p = q;
    } else {
      const r = 2.55 + gauss() * 0.02;
      const th = rand(0, Math.PI * 2), ph = Math.acos(rand(-1, 1));
      p = [r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)];
    }
    out.set(p, i * 3);
  }
}

function galaxy(n, out) {
  const arms = 3;
  for (let i = 0; i < n; i++) {
    const r = Math.pow(Math.random(), 0.7) * 5;
    const arm = (i % arms) / arms * Math.PI * 2;
    const spin = r * 0.9;
    const sc = 0.35 * (1 - r / 6);
    out.set([
      Math.cos(arm + spin) * r + gauss() * sc,
      gauss() * 0.12 * (1.2 - r / 5),
      Math.sin(arm + spin) * r + gauss() * sc,
    ], i * 3);
  }
}

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uMorph;
  uniform float uIntro;
  uniform float uSize;
  uniform float uVel;
  uniform float uActivity;
  uniform float uScale;
  uniform vec3  uMouse;
  attribute vec3 aS1;
  attribute vec3 aS2;
  attribute vec3 aS3;
  attribute vec3 aS4;
  attribute float aRand;
  varying float vRand;
  varying float vAlpha;

  float w(float i) { return clamp(1.0 - abs(uMorph - i), 0.0, 1.0); }

  void main() {
    float w0 = w(0.0), w1 = w(1.0), w2 = w(2.0), w3 = w(3.0), w4 = w(4.0);
    vec3 p = position * w0 + aS1 * w1 + aS2 * w2 + aS3 * w3 + aS4 * w4;

    // Stagger the morph a little per particle so shapes dissolve rather than slide.
    float t = uTime * 0.6 + aRand * 6.2831;
    float settled = max(max(w0, w1), max(max(w2, w3), w4));
    float amp = 0.025 + (1.0 - settled) * 0.9 * aRand + uActivity * 0.07;
    p += vec3(sin(t + p.y * 1.7), cos(t * 0.9 + p.x * 1.3), sin(t * 1.1 + p.z * 1.5)) * amp;

    // Waveform: travelling ripples like a voice signal.
    p.y += w2 * (sin(p.x * 1.15 + uTime * 1.5) * 0.45 + cos(p.z * 1.6 - uTime * 1.1) * 0.22 + sin((p.x + p.z) * 2.4 + uTime * 2.0) * 0.08);

    // Breathing core.
    p *= 1.0 + w0 * sin(uTime * 0.8) * 0.02;

    // Intro: particles gather from a wide, scattered cloud.
    vec3 scatter = normalize(p + vec3(0.001)) * (6.0 + aRand * 6.0);
    p = mix(scatter, p, uIntro);

    vec4 world = modelMatrix * vec4(p, 1.0);

    // Mouse repulsion in world space.
    vec2 d = world.xy - uMouse.xy;
    float dist = length(d);
    float force = smoothstep(1.4 * uScale, 0.0, dist);
    world.xy += normalize(d + 0.0001) * force * 0.55 * uScale;
    world.z += force * 0.4 * uScale;

    // Scroll velocity stretches the field vertically.
    world.y += uVel * (aRand - 0.5) * 0.6;

    vec4 mv = viewMatrix * world;
    gl_Position = projectionMatrix * mv;

    float size = uSize * (0.55 + aRand * 0.9) * mix(0.75, 1.0, uScale);
    size *= 1.0 + force * 1.5;
    gl_PointSize = min(size / -mv.z, uSize * 0.28);

    vRand = aRand;
    vAlpha = smoothstep(18.0, 3.0, -mv.z) * (0.35 + 0.65 * uIntro) * (1.0 + uActivity * 0.5);
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uColA;
  uniform vec3 uColB;
  uniform vec3 uColC;
  uniform float uOpacity;
  varying float vRand;
  varying float vAlpha;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.0, d);
    a = pow(a, 1.6);
    vec3 col = uColA;
    col = mix(col, uColB, step(0.9, vRand));
    col = mix(col, uColC, step(0.985, vRand));
    gl_FragColor = vec4(col, a * vAlpha * uOpacity);
  }
`;

export function createScene(canvas, { reducedMotion = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 8);

  const mobile = window.matchMedia('(max-width: 900px)').matches;
  const N = mobile ? 5200 : 11000;

  const s0 = new Float32Array(N * 3);
  const s1 = new Float32Array(N * 3);
  const s2 = new Float32Array(N * 3);
  const s3 = new Float32Array(N * 3);
  const s4 = new Float32Array(N * 3);
  const r = new Float32Array(N);
  sphere(N, s0);
  const net = network(N, s1);
  wave(N, s2);
  guarded(N, s3);
  galaxy(N, s4);
  for (let i = 0; i < N; i++) r[i] = Math.random();

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(s0, 3));
  geo.setAttribute('aS1', new THREE.BufferAttribute(s1, 3));
  geo.setAttribute('aS2', new THREE.BufferAttribute(s2, 3));
  geo.setAttribute('aS3', new THREE.BufferAttribute(s3, 3));
  geo.setAttribute('aS4', new THREE.BufferAttribute(s4, 3));
  geo.setAttribute('aRand', new THREE.BufferAttribute(r, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 12);

  const uniforms = {
    uTime: { value: 0 },
    uMorph: { value: 0 },
    uIntro: { value: reducedMotion ? 1 : 0 },
    uSize: { value: (mobile ? 58 : 46) * dpr },
    uVel: { value: 0 },
    uActivity: { value: 0 },
    uScale: { value: 1 },
    uOpacity: { value: 1 },
    uMouse: { value: new THREE.Vector3(99, 99, 0) },
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
  const points = new THREE.Points(geo, mat);
  group.add(points);

  // Crisp connection lines for the network shape.
  const linePos = [];
  for (const [a, b] of net.edges) linePos.push(...net.nodes[a], ...net.nodes[b]);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePos, 3));
  const lineMat = new THREE.LineBasicMaterial({ color: 0x3ee089, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const lines = new THREE.LineSegments(lineGeo, lineMat);
  group.add(lines);

  scene.add(group);

  // ---- state driven from outside ----
  const state = {
    morph: 0,        // target shape
    x: 0,            // target horizontal offset as a fraction of the half-viewport
    opacity: 1,      // dim the field behind text-heavy sections
    y: 0,            // vertical offset in world units
    scale: 1,
    activity: 0,     // 0 idle, 1 "thinking"
    scroll: 0,       // 0..1 page progress
    vel: 0,
  };
  const pointer = { x: 0, y: 0, tx: 0, ty: 0, active: false };

  // Size and pointer are measured against the canvas itself, so the scene
  // works both full-screen and inside a smaller panel.
  function onPointer(e) {
    const r = canvas.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    const c = (v) => Math.max(-1.5, Math.min(1.5, v));
    pointer.tx = c(((e.clientX - r.left) / r.width) * 2 - 1);
    pointer.ty = c(-((e.clientY - r.top) / r.height) * 2 + 1);
    pointer.active = inside;
  }
  window.addEventListener('pointermove', onPointer, { passive: true });
  document.addEventListener('pointerleave', () => { pointer.active = false; });

  function resize() {
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Keep the composition framed on portrait shapes.
    camera.position.z = w / h < 1 ? 8 + (1 - w / h) * 6 : 8;
    camera.updateProjectionMatrix();
  }
  resize();
  new ResizeObserver(resize).observe(canvas);

  const clock = new THREE.Clock();
  const tmp = new THREE.Vector3();
  let raf = 0;
  let running = true;
  let visible = true; // false while the canvas is scrolled off screen
  let rotY = 0;
  let introT = reducedMotion ? 1 : 0;

  function frame() {
    raf = requestAnimationFrame(frame);
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    uniforms.uTime.value = reducedMotion ? 0 : t;

    // Ease toward targets.
    const k = 1 - Math.pow(0.001, dt);
    uniforms.uMorph.value += (state.morph - uniforms.uMorph.value) * k * 0.9;
    uniforms.uVel.value += (state.vel - uniforms.uVel.value) * k;
    uniforms.uActivity.value += (state.activity - uniforms.uActivity.value) * k * 0.7;
    uniforms.uScale.value += (state.scale - uniforms.uScale.value) * k * 0.6;
    group.scale.setScalar(uniforms.uScale.value);

    pointer.x += (pointer.tx - pointer.x) * k * 0.8;
    pointer.y += (pointer.ty - pointer.y) * k * 0.8;

    const aspect = camera.aspect;
    const halfW = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z * aspect;
    const offset = aspect > 1.1 ? state.x * halfW : 0;
    uniforms.uOpacity.value += (state.opacity - uniforms.uOpacity.value) * k * 1.2;
    group.position.x += (offset - group.position.x) * k * 0.6;

    if (!reducedMotion) rotY += dt * (0.08 + uniforms.uActivity.value * 0.9);
    const m = uniforms.uMorph.value;
    // The waveform reads best from a low, near-frontal angle.
    const waveW = Math.max(0, 1 - Math.abs(m - 2));
    group.rotation.y = rotY * (1 - waveW) + pointer.x * 0.25;
    group.rotation.x = pointer.y * -0.15 + waveW * 0.28 + Math.max(0, 1 - Math.abs(m - 4)) * 0.55;
    const yTarget = state.y + state.scroll * -0.4;
    group.position.y += (yTarget - group.position.y) * k * 0.6;

    // Gather the particles in on first load.
    if (introT < 1) {
      introT = Math.min(1, introT + dt * 0.45);
      uniforms.uIntro.value = 1 - Math.pow(1 - introT, 3);
    }

    lineMat.opacity = Math.max(0, 1 - Math.abs(m - 1)) * 0.22 * uniforms.uOpacity.value;

    // Project pointer onto the z=0 plane in world space.
    if (pointer.active) {
      tmp.set(pointer.x, pointer.y, 0.5).unproject(camera).sub(camera.position).normalize();
      const dist = -camera.position.z / tmp.z;
      uniforms.uMouse.value.copy(camera.position).addScaledVector(tmp, dist);
    } else {
      uniforms.uMouse.value.set(99, 99, 0);
    }

    renderer.render(scene, camera);
  }
  frame();

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden && visible;
    if (running) clock.getDelta();
  });

  return {
    state,
    uniforms,
    // Half the visible height of the z=0 plane, in world units.
    halfHeight() { return Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z; },
    // Update any of: shape, x, y, opacity, scale, activity.
    set(o) {
      if (o.shape !== undefined) state.morph = o.shape;
      if (o.x !== undefined) state.x = o.x;
      if (o.y !== undefined) state.y = o.y;
      if (o.scale !== undefined) state.scale = o.scale;
      if (o.activity !== undefined) state.activity = o.activity;
      // Text sits on top of the field on narrow screens, so dim it further there.
      if (o.opacity !== undefined) state.opacity = o.opacity < 1 && mobile ? o.opacity * 0.7 : o.opacity;
      // Jump straight to the target instead of easing (used for first placement).
      if (o.snap) {
        uniforms.uScale.value = state.scale;
        group.scale.setScalar(state.scale);
        group.position.y = state.y;
        uniforms.uMorph.value = state.morph;
      }
    },
    // Pause rendering while the canvas is off screen.
    setVisible(v) {
      visible = v;
      running = v && !document.hidden;
      if (running) clock.getDelta();
    },
    destroy() { cancelAnimationFrame(raf); renderer.dispose(); },
  };
}
