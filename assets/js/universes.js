// The multiverse: each universe rewrites the copy, loads its own display font,
// recolours the particles and adds its own click or cursor effect. Styling
// lives in universes.css. Inspired themes only: no character names or logos.

export const UNIVERSES = {
  console: {
    name: 'Console',
    bg: '#0a0c0b',
    particles: ['#dcebe2', '#3ee089', '#f5b23d'],
    additive: true,
    font: 'Poppins',
    boot: [['loading operator profile', 'aditya.shukla'], ['mounting agents', '4 banks live'], ['arming guardrails', 'ok'], ['connecting tracing', 'ok']],
    copy: {}, // the page's own text
  },

  web: {
    name: 'Web-slinger',
    bg: '#1d3fb3',
    particles: ['#ffffff', '#ffcc00', '#e8272f'],
    additive: true,
    font: 'Bangers',
    boot: [['web-shooters', 'loaded'], ['scanning the city', 'all quiet'], ['guardrails', 'armed'], ['villains', 'none detected']],
    copy: {
      status: 'All clear in the neighbourhood',
      'bar-cta': 'Swing by',
      'hero-role': '<span class="led"></span> AI Engineer by day · Agent builder by night · Nagpur',
      'hero-line': 'I spin AI agents that catch fraud before it lands.',
      'hero-btn': 'Try my agent!',
      'hero-hint': 'Click anywhere to shoot a web · scroll to dissolve the name',
      'demo-kicker': 'Issue #1',
      'demo-h2': 'Try to trick my agent',
      'demo-note': "It senses a scam before you finish typing. It's a simulation in your browser, with no real bank connected. Go on, try to break it.",
      'demo-hello': "Hey! I can check your balance, send money, add payees or block a lost card. What's the mission?",
      'deployments-kicker': 'Issue #2',
      'deployments-h2': 'Missions accomplished',
      'deployments-note': "Built for real banks. The names stay secret, like any good hero's.",
      'capabilities-kicker': 'Issue #3',
      'capabilities-h2': 'Powers unlocked',
      'guardrails-kicker': 'Issue #4',
      'guardrails-h2': 'Power without guardrails is a villain origin story',
      'guardrails-note': 'Every agent I build follows these rules from the very first commit. No exceptions.',
      'operator-kicker': 'Issue #5',
      'operator-h2': 'Origin story',
      'contact-title': 'Need a hero for your AI problem?',
      'contact-sub': 'Drop me a line. I swing back to every message personally.',
    },
  },

  sky: {
    name: 'Sky Guardian',
    bg: '#2c86ea',
    particles: ['#0b1e45', '#d81f2a', '#e5a300'],
    additive: false,
    font: 'Archivo Black',
    boot: [['cape', 'pressed'], ['x-ray on the data', 'clean'], ['flight systems', 'go'], ['guardrails', 'armed']],
    copy: {
      status: 'Skies clear · all systems go',
      'bar-cta': 'Call for help',
      'hero-line': 'Faster than a failing request. Stronger than a prompt injection.',
      'hero-hint': 'Click anywhere for heat vision · scroll to take flight',
      'demo-kicker': 'Test of strength',
      'demo-h2': 'Try to trick my agent',
      'demo-note': 'Built to be incorruptible. This simulation runs in your browser with no real bank connected. Try your worst.',
      'demo-hello': 'Hello, citizen! I can check your balance, send money, add payees or block a lost card. How can I help?',
      'deployments-kicker': 'Rescues',
      'deployments-h2': 'Rescues completed',
      'deployments-note': "Systems built to keep banks safe. The clients' identities stay secret.",
      'capabilities-kicker': 'Abilities',
      'capabilities-h2': 'Superpowers',
      'guardrails-kicker': 'The code',
      'guardrails-h2': 'Truth, trust and the audited way',
      'guardrails-note': 'Great power needs a code. These guardrails are on in every system I ship.',
      'operator-kicker': 'Secret identity',
      'operator-h2': 'Mild-mannered engineer. Mostly.',
      'contact-title': 'Up, up and deployed.',
      'contact-sub': 'Got a problem that needs a hero? I answer every call personally.',
    },
  },

  night: {
    name: 'Night Vigilante',
    bg: '#07080a',
    particles: ['#cfd3da', '#f5c518', '#7aa2c8'],
    additive: true,
    font: 'Bebas Neue',
    boot: [['cave systems', 'online'], ['night vision', 'engaged'], ['city watch', 'all quiet'], ['guardrails', 'armed']],
    copy: {
      status: 'Watching over the banks',
      'bar-cta': 'Light the signal',
      'hero-role': '<span class="led"></span> Case file · AI Engineer &amp; Solutions Consultant · Nagpur',
      'hero-line': 'I work in the dark so your agents run in the light.',
      'hero-hint': 'Shine your light on the name · click to fire a grapple · scroll to vanish',
      'demo-kicker': 'Interrogation room',
      'demo-h2': 'Try to break my agent',
      'demo-note': 'It has one rule and it never breaks it. This is a simulation in your browser with no real bank connected. Do your worst.',
      'demo-hello': "I'm listening. Balance, transfers, payees or a lost card. Keep it quick.",
      'deployments-kicker': 'Case log',
      'deployments-h2': 'Cases closed',
      'deployments-note': "Systems built to protect banks. The identities stay hidden. That's the point.",
      'capabilities-kicker': 'Utility belt',
      'capabilities-h2': 'Tools of the trade',
      'guardrails-kicker': 'The one rule',
      'guardrails-h2': 'No agent operates outside the rules',
      'guardrails-note': 'Not most of the time. Every time. These safeguards are armed in every system I ship.',
      'operator-kicker': 'Behind the mask',
      'operator-h2': 'The engineer in the shadows',
      'contact-title': 'Light the signal.',
      'contact-sub': 'When your AI problem gets dark, send a message. I answer every one.',
    },
  },
};

/* ---------------- Copy ---------------- */
const original = new Map(); // data-t key → the page's own HTML

export function applyCopy(u) {
  document.querySelectorAll('[data-t]').forEach((el) => {
    const key = el.dataset.t;
    if (!original.has(key)) original.set(key, el.innerHTML);
    el.innerHTML = UNIVERSES[u].copy[key] ?? original.get(key);
  });
}

/* ---------------- Fonts ----------------
   Universe fonts are self-hosted (declared in universes.css); the browser only
   downloads one when its universe is first opened. */
export async function loadFont(u) {
  try {
    await Promise.race([document.fonts.load(`400 100px "${UNIVERSES[u].font}"`), new Promise((r) => setTimeout(r, 2500))]);
  } catch { /* fall back silently */ }
}

/* ---------------- Effects ---------------- */
const NS = 'http://www.w3.org/2000/svg';
const layer = () => document.querySelector('.fx-layer');
const svgEl = (tag, attrs) => {
  const el = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
};
const skip = (target) => target.closest('input, textarea, [data-verse], .agent, .agent-fab');

// Web-slinger: a web line shoots from the nearest bottom corner and splats where you click.
function shootWeb(x, y) {
  const svg = svgEl('svg', {});
  const fromX = x < innerWidth / 2 ? 0 : innerWidth;
  const line = svgEl('line', { x1: fromX, y1: innerHeight, x2: x, y2: y, stroke: '#fff', 'stroke-width': 2.5, 'stroke-linecap': 'round' });
  const len = Math.hypot(x - fromX, y - innerHeight);
  line.style.strokeDasharray = len;
  line.style.strokeDashoffset = len;
  line.style.transition = 'stroke-dashoffset .14s linear';
  const splat = svgEl('g', { transform: `translate(${x} ${y}) scale(0.2)`, stroke: '#fff', 'stroke-width': 2, fill: 'none' });
  splat.style.transition = 'transform .18s cubic-bezier(.2,1.6,.4,1)';
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    splat.appendChild(svgEl('line', { x1: 0, y1: 0, x2: Math.cos(a) * 34, y2: Math.sin(a) * 34 }));
  }
  [12, 22, 32].forEach((r) => {
    const pts = Array.from({ length: 11 }, (_, i) => {
      const a = (i / 10) * Math.PI * 2;
      const rr = r * (i % 2 ? 0.86 : 1);
      return `${(Math.cos(a) * rr).toFixed(1)},${(Math.sin(a) * rr).toFixed(1)}`;
    });
    splat.appendChild(svgEl('polyline', { points: pts.join(' ') }));
  });
  svg.append(line, splat);
  svg.style.filter = 'drop-shadow(1px 1px 0 #111)';
  svg.style.transition = 'opacity .5s ease .7s';
  layer().appendChild(svg);
  requestAnimationFrame(() => {
    line.style.strokeDashoffset = 0;
    setTimeout(() => { splat.setAttribute('transform', `translate(${x} ${y}) scale(1)`); }, 120);
    setTimeout(() => { svg.style.opacity = 0; }, 60);
  });
  setTimeout(() => svg.remove(), 1400);
}

// Sky Guardian: two heat-vision beams from above converge on the point.
function heatVision(x, y) {
  const svg = svgEl('svg', {});
  const eyeY = -40;
  const cx = Math.min(Math.max(x, 60), innerWidth - 60);
  const defs = svgEl('defs', {});
  const f = svgEl('filter', { id: 'glow', x: '-50%', y: '-50%', width: '200%', height: '200%' });
  f.appendChild(svgEl('feGaussianBlur', { stdDeviation: 3 }));
  defs.appendChild(f);
  svg.appendChild(defs);
  [-16, 16].forEach((dx) => {
    svg.appendChild(svgEl('line', { x1: cx + dx, y1: eyeY, x2: x + dx / 6, y2: y, stroke: '#ff2a12', 'stroke-width': 12, opacity: 0.6, filter: 'url(#glow)' }));
    svg.appendChild(svgEl('line', { x1: cx + dx, y1: eyeY, x2: x + dx / 6, y2: y, stroke: '#ff3b1f', 'stroke-width': 4 }));
    svg.appendChild(svgEl('line', { x1: cx + dx, y1: eyeY, x2: x + dx / 6, y2: y, stroke: '#fff1c2', 'stroke-width': 1.5 }));
  });
  svg.appendChild(svgEl('circle', { cx: x, cy: y, r: 22, fill: '#ff3b1f', opacity: 0.75, filter: 'url(#glow)' }));
  svg.appendChild(svgEl('circle', { cx: x, cy: y, r: 5, fill: '#fff8dc' }));
  svg.style.transition = 'opacity .35s ease .35s';
  layer().appendChild(svg);
  requestAnimationFrame(() => { svg.style.opacity = 0; });
  setTimeout(() => svg.remove(), 800);
}

// Night Vigilante: a grapple line fires up to the rooftops from where you click.
function grapple(x, y) {
  const svg = svgEl('svg', {});
  const topX = x + (x < innerWidth / 2 ? 60 : -60);
  const line = svgEl('line', { x1: x, y1: y, x2: topX, y2: -10, stroke: '#d7dbe3', 'stroke-width': 2 });
  const len = Math.hypot(topX - x, y + 10);
  line.style.strokeDasharray = len;
  line.style.strokeDashoffset = len;
  line.style.transition = 'stroke-dashoffset .16s cubic-bezier(.2,.8,.3,1)';
  // The hook: three short prongs at the top end of the line.
  const hook = svgEl('g', { transform: `translate(${topX} 6)`, stroke: '#f5c518', 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round', opacity: 0 });
  hook.append(svgEl('path', { d: 'M0 0 L0 14 M0 14 L-9 6 M0 14 L9 6' }));
  hook.style.transition = 'opacity .1s ease .14s';
  const spark = svgEl('circle', { cx: x, cy: y, r: 3, fill: '#f5c518' });
  spark.style.transition = 'r .3s ease, opacity .3s ease';
  svg.append(line, hook, spark);
  svg.style.filter = 'drop-shadow(0 0 4px rgba(245,197,24,.6))';
  svg.style.transition = 'opacity .45s ease .55s';
  layer().appendChild(svg);
  requestAnimationFrame(() => {
    line.style.strokeDashoffset = 0;
    hook.setAttribute('opacity', 1);
    spark.setAttribute('r', 18);
    spark.style.opacity = 0;
    svg.style.opacity = 0;
  });
  setTimeout(() => svg.remove(), 1200);
}

let current = 'console';
export function setEffectsUniverse(u) { current = u; }

export function mountEffects({ reduced = false } = {}) {
  if (reduced) return;
  addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || skip(e.target)) return;
    if (current === 'web') shootWeb(e.clientX, e.clientY);
    else if (current === 'sky') heatVision(e.clientX, e.clientY);
    else if (current === 'night') grapple(e.clientX, e.clientY);
  }, { passive: true });

  // Night Vigilante: the flashlight follows the cursor or finger, and sweeps
  // across the name on its own when nobody is moving it.
  const spot = document.querySelector('.spot');
  let lastMove = -1e9;
  const aim = (x, y) => {
    const r = spot.getBoundingClientRect();
    spot.style.setProperty('--mx', x - r.left + 'px');
    spot.style.setProperty('--my', y - r.top + 'px');
  };
  addEventListener('pointermove', (e) => {
    if (current !== 'night') return;
    lastMove = performance.now();
    aim(e.clientX, e.clientY);
  }, { passive: true });
  const sweep = (t) => {
    requestAnimationFrame(sweep);
    if (current !== 'night' || document.hidden || t - lastMove < 2500) return;
    const r = spot.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const k = t / 2600;
    aim(r.left + r.width * (0.5 + Math.sin(k) * 0.34), r.top + r.height * (0.36 + Math.sin(k * 1.7) * 0.08));
  };
  requestAnimationFrame(sweep);
}
