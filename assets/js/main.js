import { createScene } from './scene.js';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

/* ---------------- WebGL ---------------- */
let gl = null;
try {
  gl = createScene($('#gl'), { reducedMotion: reduced });
} catch (err) {
  console.warn('WebGL unavailable, using plain background.', err);
  document.documentElement.classList.add('no-webgl');
}

/* ---------------- Particle shape per section ---------------- */
if (gl) {
  const sections = $$('[data-shape]');
  const pick = () => {
    // The active section is the one crossing the middle of the viewport.
    const mid = window.innerHeight * 0.5;
    const sec = sections.find((s) => {
      const r = s.getBoundingClientRect();
      return r.top <= mid && r.bottom > mid;
    }) || sections[0];
    gl.setShape(Number(sec.dataset.shape), Number(sec.dataset.x || 0), Number(sec.dataset.o || 1), Number(sec.dataset.ym || 0));
  };

  let lastY = window.scrollY;
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      gl.state.vel = Math.max(-1, Math.min(1, (y - lastY) / 60));
      const max = document.documentElement.scrollHeight - window.innerHeight;
      gl.state.scroll = max > 0 ? y / max : 0;
      lastY = y;
      pick();
      ticking = false;
    });
  }, { passive: true });
  window.addEventListener('resize', pick);
  pick();
}

/* ---------------- Nav border once scrolled ---------------- */
const nav = $('.nav');
const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 8);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ---------------- Reveal on scroll ---------------- */
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('is-in');
    io.unobserve(e.target);
  });
}, { rootMargin: '0px 0px -8% 0px' });

// Stagger siblings that enter together.
$$('.reveal').forEach((el) => {
  const siblings = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
  const i = siblings.indexOf(el);
  if (i > 0) el.style.transitionDelay = Math.min(i * 60, 300) + 'ms';
  io.observe(el);
});

/* ---------------- Counters ---------------- */
if (!reduced) {
  const cio = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      cio.unobserve(e.target);
      const el = e.target;
      const end = Number(el.dataset.counter);
      const t0 = performance.now();
      const dur = 1200;
      const step = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      };
      el.textContent = '0';
      requestAnimationFrame(step);
    });
  }, { threshold: 0.6 });
  $$('[data-counter]').forEach((el) => cio.observe(el));
}

/* ---------------- Agent trace ---------------- */
const TRACE = [
  ['t-user', '> user: "Add my brother as a beneficiary and send ₹5,000"'],
  ['', ''],
  ['t-tag', '[orchestrator] ', 'intent: beneficiary.add, transfer.initiate'],
  ['t-tag', '[guardrail]    ', 'pii.redact ', 'ok', '  policy.scope ', 'ok'],
  ['t-tag', '[kyc_agent]    ', 'OTP challenge sent'],
  ['t-tag', '[kyc_agent]    ', 'OTP verified ', 'ok'],
  ['t-tag', '[tool]         ', 'core_banking.add_beneficiary -> 200'],
  ['t-tag', '[risk_agent]   ', 'within daily limit ', 'ok'],
  ['t-tag', '[langfuse]     ', 'trace a91f  1.8s  2,341 tokens'],
  ['', ''],
  ['t-bot', '< assistant: "Beneficiary added. Confirm the ₹5,000 transfer?"'],
];

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function renderLine([cls, ...rest]) {
  if (cls !== 't-tag') return cls ? `<span class="${cls}">${esc(rest.join(''))}</span>` : '';
  return rest.map((txt, i) => {
    if (i === 0) return `<span class="t-tag">${esc(txt)}</span>`;
    if (txt === 'ok') return '<span class="t-ok">✓</span>';
    return esc(txt);
  }).join('');
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function trace() {
  const el = $('[data-trace]');
  const full = TRACE.map(renderLine).join('\n');
  // Show the full trace up front so the box is never empty.
  el.innerHTML = full;
  if (reduced) return;

  async function play() {
    for (;;) {
      let done = '';
      for (const line of TRACE) {
        const html = renderLine(line);
        if (line[0] === 't-user' || line[0] === 't-bot') {
          const text = line[1];
          for (let i = 1; i <= text.length; i += 2) {
            el.innerHTML = done + `<span class="${line[0]}">${esc(text.slice(0, i))}</span><span class="caret"></span>`;
            await wait(18);
          }
        }
        done += html + '\n';
        el.innerHTML = done + '<span class="caret"></span>';
        await wait(line[1] === '' ? 100 : 320);
      }
      el.innerHTML = full;
      await wait(5000);
    }
  }
  const tio = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) { tio.disconnect(); play(); }
  }, { threshold: 0.4 });
  tio.observe(el);
}
trace();

/* ---------------- Small things ---------------- */
$('[data-year]').textContent = new Date().getFullYear();

const copy = $('[data-copy]');
copy.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(copy.dataset.copy);
    copy.textContent = 'Copied';
  } catch {
    copy.textContent = copy.dataset.copy;
  }
  setTimeout(() => (copy.textContent = 'Copy email'), 2000);
});
