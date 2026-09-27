// Bump ?v= in these imports and in index.html on every release so browsers never mix old and new files.
import { mountChat } from './chat.js?v=20260927';

const root = document.documentElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------------- Smooth scroll ---------------- */
let lenis = null;
if (!reduced && window.Lenis) {
  lenis = new window.Lenis({ lerp: 0.1 });
  const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
}
$$('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    const target = id === '#top' ? 0 : $(id);
    if (target === null) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { offset: -70, duration: 1.2 });
    else window.scrollTo({ top: target === 0 ? 0 : target.getBoundingClientRect().top + window.scrollY - 70 });
  });
});

/* ---------------- Boot sequence ---------------- */
async function boot() {
  const el = $('[data-boot]');
  const lines = [
    ['loading operator profile', 'aditya.shukla'],
    ['mounting agents', '4 banks live'],
    ['arming guardrails', 'ok'],
    ['connecting tracing', 'ok'],
  ];
  if (!reduced) {
    for (const [task, result] of lines) {
      el.innerHTML += `<span class="ok">[ ok ]</span> ${task} <span class="dim">… ${result}</span>\n`;
      await wait(170);
    }
    await wait(200);
    const b = $('.boot');
    b.style.transition = 'opacity .45s ease';
    b.style.opacity = '0';
    await wait(450);
  }
  $('.boot').remove();
  root.classList.add('is-ready');
}

/* ---------------- Clock ---------------- */
const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Kolkata' });
const clock = $('[data-clock]');
const tick = () => (clock.textContent = fmt.format(new Date()));
tick();
setInterval(tick, 1000);
$('[data-year]').textContent = new Date().getFullYear();

/* ---------------- Core (3D orb) ---------------- */
const MODES = ['core', 'network', 'signal', 'guarded'];
// The 3D scene loads on its own, so if three.js or WebGL fails the rest of the page still works.
let gl = null;
try {
  const { createScene } = await import('./scene.js?v=20260927');
  gl = createScene($('#gl'), { reducedMotion: reduced });
  gl.set({ shape: 0, opacity: 1, scale: 0.9, y: 0, snap: true });
} catch (err) {
  console.warn('3D core unavailable.', err);
  root.classList.add('no-webgl');
}

const modeLabel = $('[data-mode]');
const modeButtons = $$('.core__modes button');
let mode = 0;
let userPicked = false;
function setMode(i) {
  mode = i;
  modeLabel.textContent = MODES[i];
  modeButtons.forEach((b) => b.classList.toggle('is-on', Number(b.dataset.shape) === i));
  if (!gl) return;
  // The waveform and guard rings read better slightly larger.
  gl.set({ shape: i, scale: i === 2 ? 0.75 : 0.9, activity: 1 });
  setTimeout(() => gl.set({ activity: 0 }), 450);
}
modeButtons.forEach((b) => b.addEventListener('click', () => { userPicked = true; setMode(Number(b.dataset.shape)); }));
// Cycle modes on its own until the visitor picks one.
if (!reduced) setInterval(() => { if (!userPicked && !document.hidden) setMode((mode + 1) % MODES.length); }, 4500);

// Only render the orb while its panel is on screen.
if (gl) {
  new IntersectionObserver(([e]) => gl.setVisible(e.isIntersecting)).observe($('.core'));
}

/* ---------------- Reveal, counters, policies ---------------- */
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    const el = e.target;
    io.unobserve(el);
    el.classList.add('is-in');
    $$('[data-count]', el).forEach(countUp);
    if (el.classList.contains('policies')) armPolicies(el);
  });
}, { rootMargin: '0px 0px -10% 0px' });
$$('.reveal').forEach((el, i) => {
  // Stagger items that sit side by side.
  const sibs = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
  el.style.transitionDelay = Math.min(sibs.indexOf(el) * 70, 350) + 'ms';
  io.observe(el);
});

function countUp(el) {
  const end = Number(el.dataset.count);
  if (reduced) return;
  const t0 = performance.now();
  const step = (t) => {
    const p = Math.min(1, (t - t0) / 1100);
    el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(step);
  };
  el.textContent = '0';
  requestAnimationFrame(step);
}

// The toggles switch on one by one when the panel comes into view.
async function armPolicies(list) {
  if (reduced) { list.classList.add('is-armed'); return; }
  await wait(250);
  list.classList.add('is-armed');
}

/* ---------------- Active tab ---------------- */
const tabs = $$('.bar__tabs a');
const sections = tabs.map((t) => $(t.getAttribute('href')));
const tabIO = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    tabs.forEach((t) => t.classList.toggle('is-active', t.getAttribute('href') === '#' + e.target.id));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
sections.forEach((s) => s && tabIO.observe(s));

/* ---------------- Live trace ---------------- */
const TRACE = [
  ['user', 'POST /chat  "Add my brother as a beneficiary and send ₹5,000"'],
  ['orchestrator', 'intent → beneficiary.add, transfer.initiate'],
  ['guardrail', 'pii.redact ✓  policy.scope ✓'],
  ['kyc_agent', 'OTP challenge sent'],
  ['kyc_agent', 'OTP verified ✓'],
  ['tool', 'core_banking.add_beneficiary → 200'],
  ['risk_agent', 'amount within daily limit ✓'],
  ['assistant', '"Beneficiary added. Confirm the ₹5,000 transfer?"'],
];
function traceLine([who, msg], ms) {
  const time = `<span class="t-time">+${String(ms).padStart(4, ' ')}ms</span>`;
  if (who === 'user' || who === 'assistant') return `${time}  <span class="t-user">${esc(msg)}</span>`;
  const tag = `<span class="t-tag">${who.padEnd(13, ' ')}</span>`;
  return `${time}  ${tag}${esc(msg).replace(/✓/g, '<span class="t-tag">✓</span>')}`;
}
async function runTrace() {
  const el = $('[data-trace]');
  const full = () => TRACE.map((l, i) => traceLine(l, i * 230 + 12)).join('\n');
  if (reduced) { el.innerHTML = full(); return; }
  for (;;) {
    let out = '';
    for (let i = 0; i < TRACE.length; i++) {
      out += traceLine(TRACE[i], i * 230 + 12) + '\n';
      el.innerHTML = out + '<span class="caret"></span>';
      await wait(i === 0 ? 700 : 480);
    }
    el.innerHTML = out + '<span class="t-time">trace complete · 1.8s · langfuse</span>';
    await wait(4000);
  }
}
new IntersectionObserver(([e], obs) => {
  if (e.isIntersecting) { obs.disconnect(); runTrace(); }
}).observe($('[data-trace]'));

/* ---------------- Copy email ---------------- */
$$('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = 'Copied'; } catch { b.textContent = b.dataset.copy; }
  setTimeout(() => (b.textContent = 'Copy email'), 2000);
}));

/* ---------------- Go ---------------- */
mountChat({ reduced });
boot();
