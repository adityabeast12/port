// Bump ?v= in these imports and in index.html on every release so browsers never mix old and new files.
import { mountChat } from './chat.js?v=20261007';
import { mountDemo } from './agent-demo.js?v=20261007';
import { UNIVERSES, applyCopy, loadFont, mountEffects, setEffectsUniverse } from './universes.js?v=20261007';

const root = document.documentElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
let gl = null; // the particle scene, once three.js has loaded

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

/* ---------------- Multiverse ---------------- */
// Universe definitions (copy, fonts, colours, effects) live in universes.js.
let universe = 'console';
try { if (UNIVERSES[localStorage.getItem('universe')]) universe = localStorage.getItem('universe'); } catch { /* storage blocked */ }

function paintUniverse(u) {
  universe = u;
  const U = UNIVERSES[u];
  if (u === 'console') delete root.dataset.universe;
  else root.dataset.universe = u;
  applyCopy(u);
  setEffectsUniverse(u);
  $('[data-verse-label]').textContent = u === 'console' ? 'Multiverse' : U.name;
  $$('[data-verse-menu] [data-universe]').forEach((b) => b.setAttribute('aria-current', String(b.dataset.universe === u)));
  $('meta[name="theme-color"]').setAttribute('content', U.bg);
  if (gl) { gl.setColors(...U.particles); gl.setBlending(U.additive); }
  try { localStorage.setItem('universe', u); } catch { /* storage blocked */ }
  // Redraw the particle name in the universe's font once it has loaded.
  loadFont(u).then(() => { if (universe === u) buildName(true); });
}

// Jump universes through a portal that opens from the ball.
function switchUniverse(u) {
  if (u === universe) return;
  const ball = $('[data-verse-toggle]').getBoundingClientRect();
  const x = ball.left + ball.width / 2;
  const y = ball.top + ball.height / 2;
  loadFont(u); // start fetching the font before the portal opens
  if (!document.startViewTransition || reduced) { paintUniverse(u); return; }
  const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const t = document.startViewTransition(() => paintUniverse(u));
  t.ready.then(() => {
    root.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
      { duration: 750, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' },
    );
  }).catch(() => {});
}

const verseMenu = $('[data-verse-menu]');
const verseToggle = $('[data-verse-toggle]');
const setMenu = (open) => { verseMenu.hidden = !open; verseToggle.setAttribute('aria-expanded', String(open)); };
verseToggle.addEventListener('click', (e) => { e.stopPropagation(); setMenu(verseMenu.hidden); });
$$('[data-universe]', verseMenu).forEach((b) => b.addEventListener('click', () => { setMenu(false); switchUniverse(b.dataset.universe); }));
document.addEventListener('click', (e) => { if (!verseMenu.hidden && !e.target.closest('[data-verse]')) setMenu(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
mountEffects({ reduced });
paintUniverse(universe);

/* ---------------- Boot sequence ---------------- */
async function boot() {
  const el = $('[data-boot]');
  const lines = UNIVERSES[universe].boot;
  if (!reduced) {
    for (const [task, result] of lines) {
      el.innerHTML += `<span class="ok">[ ok ]</span> ${task} <span class="dim">… ${result}</span>\n`;
      await wait(150);
    }
    await wait(150);
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

/* ---------------- Hero: the name made of particles ---------------- */
// three.js (~690 KB) loads in the background: the page never waits for it,
// and if it fails the heading is shown as plain text instead.
const hero = $('.hero');
const heroCopy = $('.hero__copy');
const heroHint = $('.hero__hint');
let textLayout = '';

async function buildName(force = false) {
  if (!gl) return;
  const portrait = innerWidth / innerHeight < 1.1;
  const font = UNIVERSES[universe].font;
  const layout = `${portrait}-${Math.round(innerWidth / 80)}-${font}`;
  if (layout === textLayout && !force) return;
  textLayout = layout;
  // Sample the name only once its font is ready, or the shape uses a fallback font.
  await Promise.race([document.fonts?.load(`700 100px "${font}"`), wait(2500)]).catch(() => {});
  gl.setText(portrait ? ['ADITYA', 'SHUKLA'] : ['ADITYA SHUKLA'], {
    width: portrait ? 0.86 : 0.8,
    lift: portrait ? 0.2 : 0.22,
    font: `"${font}", Poppins, sans-serif`,
  });
}

import('./scene.js?v=20261007')
  .then(async ({ createScene }) => {
    gl = createScene($('#gl'), { reducedMotion: reduced });
    gl.setColors(...UNIVERSES[universe].particles);
    gl.setBlending(UNIVERSES[universe].additive);
    await buildName();
    gl.set({ shape: -1, opacity: 1, scale: 1, y: 0, snap: true });
    onHeroScroll();
    new IntersectionObserver(([e]) => gl.setVisible(e.isIntersecting)).observe(hero);
    let t;
    addEventListener('resize', () => { clearTimeout(t); t = setTimeout(buildName, 250); });
  })
  .catch((err) => {
    console.warn('3D hero unavailable.', err);
    root.classList.add('no-webgl');
  });

// Scrolling through the hero dissolves the name into the core sphere,
// then into the agent network.
function onHeroScroll() {
  const total = hero.offsetHeight - innerHeight;
  const p = clamp(-hero.getBoundingClientRect().top / total);
  const fade = 1 - smooth(0.03, 0.2, p);
  heroCopy.style.opacity = fade;
  heroCopy.style.transform = `translateY(${(1 - fade) * -30}px)`;
  heroHint.style.opacity = fade;
  if (!gl) return;
  const morph = p < 0.08 ? -1 : p < 0.5 ? -1 + smooth(0.08, 0.5, p) : smooth(0.5, 0.88, p);
  gl.set({ shape: morph, scale: 1 - 0.15 * smooth(0.08, 0.5, p), opacity: 1 - 0.5 * smooth(0.85, 1, p) });
}
let heroTicking = false;
addEventListener('scroll', () => {
  if (heroTicking) return;
  heroTicking = true;
  requestAnimationFrame(() => { onHeroScroll(); heroTicking = false; });
}, { passive: true });

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
$$('.reveal').forEach((el) => {
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

// The guardrail toggles switch on when the panel comes into view.
async function armPolicies(list) {
  await wait(250);
  list.classList.add('is-armed');
}

/* ---------------- Active tab ---------------- */
const tabs = $$('.bar__tabs a');
const tabIO = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    tabs.forEach((t) => t.classList.toggle('is-active', t.getAttribute('href') === '#' + e.target.id));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
tabs.map((t) => $(t.getAttribute('href'))).forEach((s) => s && tabIO.observe(s));

/* ---------------- Copy email ---------------- */
$$('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = 'Copied'; } catch { b.textContent = b.dataset.copy; }
  setTimeout(() => (b.textContent = 'Copy email'), 2000);
}));

/* ---------------- Go ---------------- */
mountDemo($('[data-demo]'), { reduced });
mountChat({ reduced });
boot();
