// Atlas, a small polar bear that strolls along the bottom of the screen.
// On the portfolio, clicking him offers the Agent Atlas guide; on the guide
// itself he sits on the tour dock and talks while the narration plays.
// An original character: a cartoon polar bear with a scarf in the universe's
// colour, plus a prop in some universes (a cape, a torch).

export const BEAR_SVG = `
<svg class="buddy__bear" viewBox="0 0 124 94" aria-hidden="true" focusable="false">
  <ellipse class="b-shadow" cx="60" cy="89" rx="33" ry="3.6"/>
  <g class="b-beam"><path d="M112 64 L192 36 L192 92 Z"/></g>
  <g class="b-body">
    <g class="b-leg b-leg--bf"><rect x="33" y="58" width="15" height="25" rx="7.5"/></g>
    <g class="b-leg b-leg--ff"><rect x="70" y="58" width="15" height="25" rx="7.5"/></g>
    <circle class="b-fur b-tail" cx="24" cy="48" r="5"/>
    <ellipse class="b-fur b-torso" cx="57" cy="55" rx="34" ry="23"/>
    <path class="b-cape" d="M78 42 Q52 35 25 50 Q39 63 53 69 Q64 58 81 51 Z"/>
    <g class="b-leg b-leg--bn"><rect class="b-fur" x="41" y="60" width="15.5" height="25" rx="7.75"/><path class="b-pad" d="M44.5 82 h8.5"/></g>
    <g class="b-leg b-leg--fn"><rect class="b-fur" x="79" y="60" width="15.5" height="25" rx="7.75"/><path class="b-pad" d="M82.5 82 h8.5"/></g>
    <g class="b-torch"><rect x="95" y="61" width="16" height="6.5" rx="2.4"/><rect class="b-torch__lens" x="109" y="60" width="4" height="8.5" rx="1.6"/></g>
    <path class="b-scarf" d="M76 46 Q87 57 101 54 L100.5 61 Q86 64 73 53 Z"/>
    <path class="b-scarf b-scarf__tail" d="M78 53 Q70 61 60 60 L62 66 Q72 66 81 57 Z"/>
    <g class="b-head">
      <circle class="b-fur b-ear" cx="81" cy="23" r="6.4"/>
      <circle class="b-fur" cx="93" cy="38" r="19.5"/>
      <circle class="b-fur b-ear" cx="96" cy="20.5" r="6.2"/>
      <circle class="b-ear__in" cx="96" cy="21" r="2.8"/>
      <ellipse class="b-snout" cx="108" cy="44.5" rx="10" ry="7.8"/>
      <ellipse class="b-nose" cx="115.5" cy="41" rx="3.6" ry="2.9"/>
      <ellipse class="b-mouth" cx="110.5" cy="50.5" rx="2.6" ry=".9"/>
      <ellipse class="b-blush" cx="97" cy="44.5" rx="3.4" ry="2.1"/>
      <g class="b-eye"><circle cx="99" cy="34" r="3.1"/><circle class="b-glint" cx="100.1" cy="32.9" r="1"/></g>
    </g>
  </g>
</svg>`;

// A tiny bear face for buttons and the tour dock.
export const BEAR_FACE = `<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false"><circle cx="9" cy="10" r="6" fill="#fff" stroke="#23313b" stroke-width="2"/><circle cx="31" cy="10" r="6" fill="#fff" stroke="#23313b" stroke-width="2"/><circle cx="20" cy="22" r="15" fill="#fff" stroke="#23313b" stroke-width="2"/><ellipse cx="20" cy="27" rx="7" ry="5.2" fill="#eef3f6"/><ellipse cx="20" cy="25" rx="3" ry="2.3" fill="#23313b"/><circle cx="14" cy="19" r="2" fill="#23313b"/><circle cx="26" cy="19" r="2" fill="#23313b"/></svg>`;

export function mountBuddy({ reduced = false, mode = 'site', href = 'atlas/', avoid = [], onActivate } = {}) {
  const root = document.createElement('div');
  root.className = 'buddy';
  root.innerHTML = `
    <div class="buddy__card" role="dialog" aria-label="Atlas, your guide" hidden>
      <button type="button" class="buddy__x" aria-label="Close">×</button>
      <p class="buddy__hello"><b>Hi, I'm Atlas.</b> I show people how AI agents really work: what they are, how they use your systems safely, seven live demos, and the rules in 13 regions.</p>
      <div class="buddy__actions">
        <a class="buddy__go" href="${href}?tour=1">Take the 12-minute tour</a>
        <a class="buddy__alt" href="${href}">Look around myself</a>
      </div>
    </div>
    <span class="buddy__hi" aria-hidden="true">${mode === 'site' ? 'Psst… how do agents work?' : 'Need a guide?'}</span>
    <button type="button" class="buddy__btn" aria-label="${mode === 'site' ? 'Atlas the polar bear: open the guide to how AI agents work' : 'Atlas the polar bear: open the guided tour'}">${BEAR_SVG}</button>`;
  document.body.appendChild(root);
  const btn = root.querySelector('.buddy__btn');
  const card = root.querySelector('.buddy__card');
  const W = () => btn.offsetWidth || 84;

  let x = -120, target = 0, dir = 1, state = 'walk', until = 0, dock = null, hovering = false;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const set = (cls, on) => root.classList.toggle(cls, on);

  // The strip between the fixed corner buttons that the bear may walk in.
  function bounds() {
    let lo = 12, hi = innerWidth - W() - 12;
    for (const sel of avoid) {
      const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
      if (!el || !el.offsetParent && getComputedStyle(el).position !== 'fixed') continue;
      const r = el.getBoundingClientRect();
      if (!r.width || r.bottom < innerHeight - 140) continue;
      if (r.left < innerWidth / 2) lo = Math.max(lo, r.right + 10);
      else hi = Math.min(hi, r.left - W() - 10);
    }
    return [lo, Math.max(lo, hi)];
  }
  function pickTarget() {
    const [lo, hi] = bounds();
    target = hi - lo < 40 ? (lo + hi) / 2 : rnd(lo, hi);
    if (Math.abs(target - x) < 60) target = x < (lo + hi) / 2 ? hi : lo;
  }
  function idle(ms) {
    state = 'idle'; until = performance.now() + ms;
    set('is-walking', false);
    if (Math.random() < 0.35) wave();
  }
  function wave() { set('is-waving', true); setTimeout(() => set('is-waving', false), 1900); }

  function openCard() {
    card.hidden = false; set('is-open', true); idle(1e9); wave();
    // keep the card on screen
    const r = card.getBoundingClientRect();
    card.style.setProperty('--shift', Math.min(0, innerWidth - 12 - r.right) + Math.max(0, 12 - r.left) + 'px');
    card.querySelector('.buddy__go').focus({ preventScroll: true });
  }
  function closeCard() { card.hidden = true; set('is-open', false); idle(rnd(1500, 3000)); }
  btn.addEventListener('click', () => {
    if (onActivate) { onActivate(); return; }
    if (card.hidden) openCard(); else closeCard();
  });
  root.querySelector('.buddy__x').addEventListener('click', closeCard);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !card.hidden) { closeCard(); btn.focus(); } });
  document.addEventListener('click', (e) => { if (!card.hidden && !root.contains(e.target)) closeCard(); });
  btn.addEventListener('pointerenter', () => { hovering = true; if (state === 'walk') idle(1e9); });
  btn.addEventListener('pointerleave', () => { hovering = false; if (card.hidden) idle(rnd(600, 1400)); });
  btn.addEventListener('focus', () => { if (state === 'walk') idle(1e9); });

  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (document.hidden) return;
    if (dock) {
      const r = dock();
      if (r) {
        root.style.transform = `translate(${Math.round(r.right - W() - 14)}px, ${Math.round(r.top - innerHeight + 12)}px)`;
        set('is-docked', true); set('is-walking', false); set('is-left', false);
        return;
      }
    }
    set('is-docked', false);
    if (reduced) {
      const [lo, hi] = bounds();
      x = hi; set('is-left', true);
    } else if (state === 'walk') {
      const step = 42 * dt;
      dir = target > x ? 1 : -1;
      x += dir * Math.min(step, Math.abs(target - x));
      set('is-walking', true); set('is-left', dir < 0);
      if (Math.abs(target - x) < 0.5) idle(rnd(2200, 6000));
    } else if (now > until && !hovering && card.hidden) {
      pickTarget(); state = 'walk';
    }
    const [lo, hi] = bounds();
    if (x > hi + 1 && state !== 'walk') { target = hi; state = 'walk'; }
    root.style.transform = `translate(${Math.round(x)}px, 0)`;
  }
  // Fade in somewhere along the walkway once the page has settled.
  setTimeout(() => {
    const [lo, hi] = bounds();
    x = lo + (hi - lo) * (0.15 + Math.random() * 0.3);
    root.style.transform = `translate(${Math.round(x)}px, 0)`;
    root.classList.add('is-in'); idle(1200); requestAnimationFrame(frame);
  }, reduced ? 0 : 1600);

  return {
    el: root,
    // Sit on top of another element (the tour dock); pass null to walk again.
    dockTo(fn) { if (fn === dock) return; const was = dock; dock = fn; if (!fn && was) idle(800); },
    setTalking(on) { set('is-talking', !!on); },
    wave,
  };
}
