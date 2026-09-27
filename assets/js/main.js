import { createScene } from './scene.js';

const { gsap, ScrollTrigger, Lenis } = window;
const root = document.documentElement;
const body = document.body;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

gsap.registerPlugin(ScrollTrigger);

/* ---------------- WebGL ---------------- */
let gl = null;
try {
  gl = createScene($('#gl'), { reducedMotion: reduced });
} catch (err) {
  console.warn('WebGL unavailable, using static background.', err);
  root.classList.add('no-webgl');
}

/* ---------------- Smooth scroll ---------------- */
let lenis = null;
if (!reduced && Lenis) {
  lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  lenis.stop();
  lenis.on('scroll', (e) => {
    ScrollTrigger.update();
    if (gl) gl.state.vel = gsap.utils.clamp(-1, 1, e.velocity / 40);
  });
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

$$('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    const target = id === '#top' ? 0 : $(id);
    if (target === null) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { duration: 1.6 });
    else window.scrollTo({ top: target === 0 ? 0 : target.getBoundingClientRect().top + window.scrollY, behavior: reduced ? 'auto' : 'smooth' });
  });
});

/* ---------------- Split text helpers ---------------- */
function splitWords(el) {
  const words = el.textContent.trim().split(/\s+/);
  el.innerHTML = words.map((w) => `<span class="w">${w}</span>`).join(' ');
  return $$('.w', el);
}

/* ---------------- Preloader + intro ---------------- */
function intro() {
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  const count = { v: 0 };
  const countEl = $('[data-count]');
  const bar = $('.loader__bar span');

  if (reduced) {
    tl.set('.loader', { autoAlpha: 0 })
      .set(['.hero__title .line > span', '.hero__word'], { y: 0 })
      .set(['.hero__top', '.hero__sub', '.hero__scroll', '.nav'], { opacity: 1 });
    return tl.add(done);
  }

  tl.to(count, {
    v: 100,
    duration: 1.8,
    ease: 'power2.inOut',
    onUpdate: () => {
      countEl.textContent = String(Math.round(count.v)).padStart(3, '0');
      bar.style.width = count.v + '%';
    },
  })
    .to('.loader__inner', { yPercent: -30, opacity: 0, duration: 0.6, ease: 'power3.in' }, '+=0.1')
    .to('.loader', { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' }, '-=0.2')
    .set('.loader', { display: 'none' });

  if (gl) tl.to(gl.uniforms.uIntro, { value: 1, duration: 2.6, ease: 'expo.out' }, '-=1.0');

  tl.to('.hero__word', { y: 0, duration: 1.6, stagger: 0.08 }, '-=2.2')
    .to('.hero__title .line > span', { y: 0, duration: 1.4, stagger: 0.1 }, '-=1.3')
    .to(['.nav', '.hero__top', '.hero__sub', '.hero__scroll'], { opacity: 1, duration: 1.2, stagger: 0.08, ease: 'power2.out' }, '-=1.0')
    .add(done, '-=1.2');
  return tl;
}

function done() {
  body.classList.remove('is-loading');
  root.classList.add('is-ready');
  if (lenis) lenis.start();
  ScrollTrigger.refresh();
}

/* ---------------- Scroll choreography ---------------- */
function scrollScenes() {
  // Horizontal work gallery (desktop).
  const mm = gsap.matchMedia();
  mm.add('(min-width: 901px)', () => {
    const track = $('.work__track');
    const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
    const tween = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: '.work',
        pin: '.work__pin',
        start: 'top top',
        end: () => '+=' + distance(),
        scrub: 0.6,
        invalidateOnRefresh: true,
        onUpdate: (self) => gsap.set('.work__progress span', { scaleX: self.progress }),
      },
    });
    // Cards swing in as they enter.
    if (!reduced) $$('.work__track .card').forEach((card) => {
      gsap.from(card, {
        rotateY: -18, z: -120, opacity: 0.25, transformPerspective: 1200, ease: 'none',
        scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left 100%', end: 'left 60%', scrub: true },
      });
    });
  });
  mm.add('(max-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
    $$('.work__track .card').forEach((card) => {
      gsap.from(card, { y: 50, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: card, start: 'top 90%' } });
    });
  });

  // Morph the particle field per section.
  if (gl) {
    $$('[data-shape]').forEach((sec) => {
      const shape = Number(sec.dataset.shape);
      const x = Number(sec.dataset.x || 0);
      const o = Number(sec.dataset.o || 1);
      ScrollTrigger.create({
        trigger: sec,
        start: 'top 55%',
        end: 'bottom 55%',
        onToggle: (self) => { if (self.isActive) gl.setShape(shape, x, o); },
      });
    });
    ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => {
        gl.state.scroll = self.progress;
        if (!lenis) gl.state.vel = gsap.utils.clamp(-1, 1, self.getVelocity() / 4000);
      },
    });
    // Let velocity settle back to zero when scrolling stops.
    gsap.ticker.add(() => { gl.state.vel *= 0.9; });
  }

  if (reduced) {
    $$('.about__lead .w').forEach((w) => (w.style.opacity = 1));
    $$('[data-counter]').forEach((el) => (el.textContent = el.dataset.counter));
    return;
  }

  // Hero name drifts apart as you leave.
  gsap.to('.hero__word:first-child', { xPercent: -8, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__word--it', { xPercent: 8, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__title', { yPercent: -30, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  // Marquee skews with scroll speed.
  const skew = gsap.quickTo('.marquee__track', 'skewX', { duration: 0.4, ease: 'power3' });
  ScrollTrigger.create({ onUpdate: (s) => skew(gsap.utils.clamp(-8, 8, s.getVelocity() / -300)) });

  // About paragraph lights up word by word.
  const words = $$('.about__lead .w');
  gsap.to(words, {
    opacity: 1,
    stagger: 0.1,
    ease: 'none',
    scrollTrigger: { trigger: '.about__lead', start: 'top 80%', end: 'bottom 45%', scrub: true },
  });

  gsap.from('.about__portrait', {
    clipPath: 'inset(100% 0 0 0)',
    duration: 1.6,
    ease: 'expo.out',
    scrollTrigger: { trigger: '.about__portrait', start: 'top 85%' },
  });

  // Counters.
  $$('[data-counter]').forEach((el) => {
    const end = Number(el.dataset.counter);
    const o = { v: 0 };
    gsap.to(o, {
      v: end,
      duration: 2,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%' },
      onUpdate: () => (el.textContent = Math.round(o.v)),
    });
  });

  // Headings and blocks reveal.
  $$('.section .h2, .work .h2').forEach((h) => {
    gsap.from(h, { y: 60, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 88%' } });
  });
  $$('.step, .pillar, .stack__row, .tl, .stat').forEach((el) => {
    gsap.from(el, { y: 40, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 92%' } });
  });

  gsap.from('.contact__title .line > span', {
    yPercent: 110, duration: 1.4, stagger: 0.1, ease: 'expo.out',
    scrollTrigger: { trigger: '.contact__title', start: 'top 80%' },
  });

}

/* ---------------- Agent trace ---------------- */
const TRACE = [
  ['t-user', '› user: "Add my brother as a beneficiary and send ₹5,000"'],
  ['t-dim', ''],
  ['t-tag', '[orchestrator] ', 'intent → beneficiary.add, transfer.initiate'],
  ['t-tag', '[guardrail]    ', 'pii.redact ', 'ok', ' · policy.scope ', 'ok'],
  ['t-tag', '[kyc_agent]    ', 'step 3/10 · OTP challenge sent'],
  ['t-tag', '[kyc_agent]    ', 'OTP verified ', 'ok'],
  ['t-tag', '[tool]         ', 'core_banking.add_beneficiary → 200'],
  ['t-tag', '[risk_agent]   ', 'amount within daily limit ', 'ok'],
  ['t-tag', '[tool]         ', 'core_banking.transfer (pending confirm)'],
  ['t-tag', '[langfuse]     ', 'trace a91f·e2 · 1.8s · 2,341 tok'],
  ['t-dim', ''],
  ['t-bot', '‹ assistant: "Done. Beneficiary added. Confirm ₹5,000 transfer?"'],
];

function renderLine(parts) {
  const [cls, ...rest] = parts;
  if (cls !== 't-tag') return `<span class="${cls}">${rest.join('')}</span>`;
  return rest.map((txt, i) => {
    if (i === 0) return `<span class="t-tag">${txt}</span>`;
    if (txt === 'ok') return `<span class="t-ok">✓</span>`;
    return txt;
  }).join('');
}

function trace() {
  const el = $('[data-trace]');
  if (!el) return;
  if (reduced) { el.innerHTML = TRACE.map(renderLine).join('\n'); return; }

  let running = false;
  let done = '';
  async function play() {
    if (running) return;
    running = true;
    while (true) {
      done = '';
      el.innerHTML = '';
      for (const line of TRACE) {
        const html = renderLine(line);
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        const plain = tmp.textContent;
        // Type the user line character by character, stream the rest.
        if (line[0] === 't-user' || line[0] === 't-bot') {
          for (let i = 1; i <= plain.length; i++) {
            el.innerHTML = done + `<span class="${line[0]}">${escapeHtml(plain.slice(0, i))}</span><span class="caret"></span>`;
            await wait(line[0] === 't-user' ? 22 : 16);
          }
        }
        done += html + '\n';
        el.innerHTML = done + '<span class="caret"></span>';
        await wait(line[1] === '' ? 120 : 380);
      }
      await wait(4200);
    }
  }
  ScrollTrigger.create({ trigger: el, start: 'top 85%', once: true, onEnter: play });
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------------- Cursor + magnetic ---------------- */
function cursor() {
  if (!finePointer) return;
  body.classList.add('has-cursor');
  const c = $('.cursor');
  const dot = $('.cursor__dot');
  const ring = $('.cursor__ring');
  const label = $('.cursor__label');
  const dx = gsap.quickTo(dot, 'x', { duration: 0.08 });
  const dy = gsap.quickTo(dot, 'y', { duration: 0.08 });
  const rx = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' });
  const ry = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' });
  gsap.set([dot, ring], { x: -100, y: -100 });

  window.addEventListener('pointermove', (e) => { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); }, { passive: true });

  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest('[data-cursor]');
    if (!t) return;
    label.textContent = t.dataset.cursor;
    c.classList.add('is-hover');
  });
  document.addEventListener('pointerout', (e) => {
    const t = e.target.closest('[data-cursor]');
    if (!t || t.contains(e.relatedTarget)) return;
    c.classList.remove('is-hover');
  });

  $$('[data-magnetic], .btn, .nav__cta').forEach((el) => {
    const mx = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    const my = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      mx((e.clientX - r.left - r.width / 2) * 0.25);
      my((e.clientY - r.top - r.height / 2) * 0.35);
    });
    el.addEventListener('pointerleave', () => { mx(0); my(0); });
  });

  // Subtle 3D tilt on cards.
  $$('.pillar').forEach((el) => {
    const rX = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3' });
    const rY = gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3' });
    gsap.set(el, { transformPerspective: 900 });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      rY(((e.clientX - r.left) / r.width - 0.5) * 8);
      rX(((e.clientY - r.top) / r.height - 0.5) * -8);
    });
    el.addEventListener('pointerleave', () => { rX(0); rY(0); });
  });
}

/* ---------------- Small things ---------------- */
function clock() {
  const el = $('[data-clock]');
  const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  const tick = () => (el.textContent = fmt.format(new Date()));
  tick();
  setInterval(tick, 15000);
  $('[data-year]').textContent = new Date().getFullYear();
}

function copyEmail() {
  const btn = $('[data-copy]');
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.copy);
      btn.textContent = 'Copied ✓';
    } catch {
      btn.textContent = btn.dataset.copy;
    }
    setTimeout(() => (btn.textContent = 'Copy email'), 2200);
  });
}

/* ---------------- Boot ---------------- */
splitWords($('.about__lead'));
clock();
copyEmail();
cursor();
trace();

const start = () => { scrollScenes(); intro(); window.__booted = true; };
if (document.fonts && document.fonts.ready) {
  Promise.race([document.fonts.ready, wait(2500)]).then(start);
} else {
  start();
}
