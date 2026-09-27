import { createScene } from './scene.js';
import { mountChat } from './chat.js';

const { gsap, ScrollTrigger, Lenis } = window;
const root = document.documentElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const desktop = window.matchMedia('(min-width: 761px)');
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

// If a script fails to load, never leave the page stuck behind the loader.
if (!gsap || !ScrollTrigger) {
  root.classList.add('boot-failed');
  root.classList.remove('js');
  throw new Error('GSAP failed to load');
}
gsap.registerPlugin(ScrollTrigger);

/* ---------------- Smooth scroll ---------------- */
let lenis = null;
if (!reduced && Lenis) {
  lenis = new Lenis({ lerp: 0.1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
$$('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const target = a.getAttribute('href') === '#top' ? 0 : $(a.getAttribute('href'));
    if (target === null) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.4 });
    else window.scrollTo({ top: target === 0 ? 0 : target.getBoundingClientRect().top + window.scrollY });
  });
});

/* ---------------- Nav hides on the way down ---------------- */
const nav = $('.nav');
let lastY = 0;
ScrollTrigger.create({
  onUpdate: (self) => {
    const y = self.scroll();
    nav.classList.toggle('is-hidden', y > 300 && y > lastY && !document.body.classList.contains('agent-open'));
    lastY = y;
  },
});

/* ---------------- 3D particle orb (origin section) ---------------- */
let gl = null;
try {
  gl = createScene($('#gl'), { reducedMotion: reduced });
  gl.set({ shape: 0, opacity: 1, scale: 0.8, y: 0.9, snap: true });
  gl.setVisible(false);
} catch (err) {
  console.warn('WebGL unavailable.', err);
  root.classList.add('no-webgl');
}

/* ---------------- Loader + hero intro ---------------- */
function intro() {
  const count = { v: 0 };
  const el = $('[data-count]');
  const tl = gsap.timeline();
  if (reduced) {
    gsap.set('.loader', { display: 'none' });
    return tl;
  }
  tl.to(count, { v: 100, duration: 1.2, ease: 'power2.inOut', onUpdate: () => (el.textContent = Math.round(count.v)) })
    .to('.loader', { yPercent: -100, duration: 0.8, ease: 'power4.inOut' })
    .set('.loader', { display: 'none' })
    .from('.hero__first', { yPercent: 60, opacity: 0, duration: 0.9, ease: 'power4.out' }, '-=0.3')
    .from('.hero__last', { yPercent: 60, opacity: 0, duration: 0.9, ease: 'power4.out' }, '-=0.75')
    .from(['.hero__file', '.hero__tagline'], { y: 20, opacity: 0, duration: 0.6, stagger: 0.08 }, '-=0.5')
    .from('.hero__photo', { y: -120, rotate: 20, opacity: 0, duration: 0.9, ease: 'back.out(1.6)' }, '-=0.6')
    .from('.hero__sticker', { scale: 0, rotate: -40, duration: 0.6, ease: 'back.out(2.2)' }, '-=0.6')
    .from('.hero__stamp', { scale: 2.4, opacity: 0, duration: 0.35, ease: 'power4.in' }, '-=0.2');
  return tl;
}

/* ---------------- Scroll scenes ---------------- */
function scenes() {
  const mm = gsap.matchMedia();

  // Origin: pinned for four pages; the orb morphs with each caption.
  const panels = $$('.panel');
  const pageEl = $('[data-page]');
  let page = 0;
  const showPage = (i) => {
    if (i === page) return;
    page = i;
    panels.forEach((p, j) => p.classList.toggle('is-active', j === i));
    pageEl.textContent = String(i + 1).padStart(2, '0');
    if (gl) gl.set({ shape: i, activity: 1 });
    if (gl) setTimeout(() => gl.set({ activity: 0 }), 500);
  };
  ScrollTrigger.create({
    trigger: '.origin',
    pin: '.origin__pin',
    start: 'top top',
    end: () => '+=' + window.innerHeight * 3,
    onUpdate: (self) => showPage(Math.min(panels.length - 1, Math.floor(self.progress * panels.length * 0.999))),
  });
  // Render the orb only while any part of the origin section is on screen.
  ScrollTrigger.create({
    trigger: '.origin',
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => gl?.setVisible(self.isActive),
  });

  // Skills: horizontal scroll on desktop.
  mm.add('(min-width: 761px)', () => {
    const track = $('.skills__track');
    const intro = $('.skills__intro');
    const distance = () => Math.max(0, track.scrollWidth + intro.offsetWidth - window.innerWidth);
    gsap.to([intro, track], {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: '.skills',
        pin: '.skills__pin',
        start: 'top top',
        end: () => '+=' + distance(),
        scrub: 0.6,
        invalidateOnRefresh: true,
      },
    });
  });

  if (reduced) return;

  // Hero drifts as you leave.
  gsap.to('.hero__photo', { y: 120, rotate: 14, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__sticker', { y: 80, rotate: -20, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__first', { xPercent: -6, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__last', { xPercent: 6, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  // The rule: words punch in one at a time.
  const rule = $('.rule__text');
  rule.innerHTML = rule.innerHTML.replace(/(<em>.*?<\/em>|[^\s<]+)/g, '<span class="w">$1</span>');
  gsap.from('.rule__text .w', {
    opacity: 0.08, y: 10, stagger: 0.12, ease: 'none',
    scrollTrigger: { trigger: '.rule', start: 'top 70%', end: 'center 50%', scrub: true },
  });

  // Case files drop onto the desk.
  $$('.case').forEach((c, i) => {
    gsap.from(c, {
      y: 80, rotate: i % 2 ? 4 : -4, opacity: 0, duration: 0.9, ease: 'back.out(1.4)',
      scrollTrigger: { trigger: c, start: 'top 90%' },
    });
  });
  $$('.case__stamp, .dossier__stamp').forEach((s) => {
    gsap.from(s, { scale: 2.6, opacity: 0, duration: 0.3, ease: 'power4.in', scrollTrigger: { trigger: s, start: 'top 80%' } });
  });

  // Headings slam in.
  $$('.cases .display, .record .display, .skills__intro .display').forEach((d) => {
    gsap.from(d, { y: 60, opacity: 0, duration: 0.8, ease: 'power4.out', scrollTrigger: { trigger: d, start: 'top 85%' } });
  });
  gsap.from('.record__stats > div', { y: 30, opacity: 0, stagger: 0.08, duration: 0.6, ease: 'back.out(1.6)', scrollTrigger: { trigger: '.record__stats', start: 'top 85%' } });
  gsap.from('.dossier', { rotate: 8, y: 80, opacity: 0, duration: 1, ease: 'back.out(1.3)', scrollTrigger: { trigger: '.dossier', start: 'top 85%' } });

  // Contact title.
  gsap.from('.contact__title span', { yPercent: 40, opacity: 0, stagger: 0.12, duration: 0.9, ease: 'power4.out', scrollTrigger: { trigger: '.contact__title', start: 'top 80%' } });

  // Mobile: skills slide in one by one instead of scrolling sideways.
  mm.add('(max-width: 760px)', () => {
    $$('.skill').forEach((s) => gsap.from(s, { x: -40, opacity: 0, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: s, start: 'top 88%' } }));
  });
}

/* ---------------- Boot ---------------- */
$('[data-year]').textContent = new Date().getFullYear();
mountChat({ reduced });

const start = () => {
  scenes();
  intro();
  ScrollTrigger.refresh();
  root.classList.add('is-ready');
};
if (document.fonts?.ready) Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]).then(start);
else start();
