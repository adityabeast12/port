import { createScene } from './scene.js';
import { TOPICS, PROJECTS, WELCOME, FALLBACK } from './kb.js';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, el = document) => el.querySelector(s);

const scroller = $('[data-scroll]');
const log = $('[data-log]');
const welcome = $('[data-welcome]');
const form = $('[data-form]');
const input = $('[data-input]');
const send = $('[data-send]');

/* ---------------- Background orb ---------------- */
let gl = null;
try {
  gl = createScene($('#gl'), { reducedMotion: reduced });
} catch (err) {
  console.warn('WebGL unavailable, using plain background.', err);
  document.documentElement.classList.add('no-webgl');
}

// In the welcome state the orb sits small above the greeting; once the chat
// starts it grows and fades behind the conversation.
const SPHERE_RADIUS = 1.85; // core shape in scene.js, plus its surface jitter
function orbWelcome(snap = false) {
  if (!gl) return;
  // Fit the orb into the placeholder above the greeting.
  const r = $('.welcome__orb').getBoundingClientRect();
  const half = gl.halfHeight();
  const toWorld = (2 * half) / window.innerHeight;
  const cy = r.top + r.height / 2;
  gl.set({
    shape: 0,
    opacity: 1,
    y: (window.innerHeight / 2 - cy) * toWorld,
    scale: ((r.height / 2) * toWorld) / SPHERE_RADIUS,
    snap,
  });
}
function orbChat(shape) {
  if (!gl) return;
  gl.set({ shape, opacity: 0.22, scale: 1, y: 0 });
}

/* ---------------- Helpers ---------------- */
const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const h = (html) => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};

// Keep the view pinned to the newest message unless the reader scrolled up.
let stick = true;
scroller.addEventListener('scroll', () => {
  stick = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 80;
}, { passive: true });
const toBottom = (force = false) => {
  if (force || stick) scroller.scrollTop = scroller.scrollHeight;
};

/* ---------------- Routing ---------------- */
function route(text) {
  const q = ' ' + text.toLowerCase().replace(/[^\w\s.;'-]/g, ' ').replace(/\s+/g, ' ') + ' ';
  let best = null;
  let bestScore = 0;
  for (const [id, t] of Object.entries(TOPICS)) {
    let score = 0;
    for (const k of t.keys) {
      // Short keys must match whole words ("ml" should not match "html").
      const hit = k.trim().length <= 3
        ? new RegExp(`\\b${k.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(q)
        : q.includes(k);
      if (hit) score += k.length;
    }
    if (score > bestScore) { best = id; bestScore = score; }
  }
  return best;
}

/* ---------------- Rich blocks ---------------- */
const BLOCKS = {
  stats: () => h(`
    <div class="b-stats">
      <div><b>4</b><span>banks running my agentic assistant</span></div>
      <div><b>2+</b><span>years shipping GenAI to production</span></div>
      <div><b>3</b><span>ML models with business impact</span></div>
      <div><b>10</b><span>state real-time onboarding flow</span></div>
    </div>`),

  projects: () => {
    const el = h('<div class="b-projects"></div>');
    PROJECTS.forEach((p) => {
      const card = h(`
        <button class="b-project" type="button">
          <span class="b-project__meta">${esc(p.meta)}</span>
          <span class="b-project__title">${esc(p.title)}</span>
          <span class="b-project__blurb">${esc(p.blurb)}</span>
          <span class="b-project__more">Ask about this →</span>
        </button>`);
      card.addEventListener('click', () => ask(p.id));
      el.appendChild(card);
    });
    return el;
  },

  trace: () => {
    const lines = [
      ['user', '> "Add my brother as a beneficiary and send ₹5,000"'],
      ['tag', 'orchestrator', 'intent: beneficiary.add, transfer.initiate'],
      ['tag', 'guardrail', 'pii.redact ✓  policy.scope ✓'],
      ['tag', 'kyc_agent', 'OTP challenge sent → verified ✓'],
      ['tag', 'tool', 'core_banking.add_beneficiary → 200'],
      ['tag', 'risk_agent', 'within daily limit ✓'],
      ['tag', 'langfuse', 'trace a91f · 1.8s · 2,341 tokens'],
      ['bot', '< "Beneficiary added. Confirm the ₹5,000 transfer?"'],
    ];
    const el = h('<pre class="b-trace"></pre>');
    el.innerHTML = lines.map((l) => {
      if (l[0] === 'tag') return `<span class="t-tag">[${esc(l[1])}]</span>${' '.repeat(Math.max(1, 14 - l[1].length))}${esc(l[2]).replace(/✓/g, '<span class="t-ok">✓</span>')}`;
      return `<span class="t-${l[0]}">${esc(l[1])}</span>`;
    }).join('\n');
    return el;
  },

  states: () => {
    const names = ['Greet', 'Consent', 'Identity', 'OTP', 'Verify', 'Documents', 'Capture', 'Review', 'Confirm', 'Done'];
    return h(`<ol class="b-states">${names.map((n, i) => `<li style="--i:${i}"><span>${String(i + 1).padStart(2, '0')}</span>${n}</li>`).join('')}</ol>`);
  },

  sql: () => h(`
    <div class="b-sql">
      <p class="b-sql__q">“Top 5 branches by new accounts this quarter?”</p>
      <pre><b>SELECT</b> branch, COUNT(*) <b>AS</b> new_accounts
<b>FROM</b> accounts
<b>WHERE</b> opened_at &gt;= :quarter_start
<b>GROUP BY</b> branch
<b>ORDER BY</b> new_accounts <b>DESC</b>
<b>LIMIT</b> 5;</pre>
    </div>`),

  stack: () => {
    const rows = [
      ['AI / ML', 'LLMs, RAG, prompt engineering, multi-agent systems, machine learning, vector databases'],
      ['Frameworks', 'CrewAI, LangChain, AutoGen'],
      ['Voice AI', 'Gemini Live API, ElevenLabs, LiveKit, Twilio (SIP and outbound)'],
      ['Responsible AI', 'Guardrails, AI governance, Langfuse, model monitoring'],
      ['Engineering', 'Python, SQL, FastAPI, Streamlit, React'],
      ['Documents', 'LlamaParse, Docling, multi-parser pipelines'],
      ['Security', 'Burp Suite, VAPT testing'],
    ];
    return h(`<dl class="b-rows">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`);
  },

  pillars: () => {
    const items = [
      ['Guardrails', 'Policy checks on every input and output, scope limits and PII handling, so an agent knows what it must never do.'],
      ['Observability', 'Every agent step is traced in Langfuse, including latency, tokens, tool calls and failures.'],
      ['Governance', 'Models are monitored after launch, with a clear trail from each decision back to its data.'],
      ['Security', 'VAPT testing with Burp Suite, because an assistant that can move money has to hold up against attackers.'],
    ];
    return h(`<div class="b-grid">${items.map(([t, d]) => `<div class="b-card"><b>${t}</b><p>${d}</p></div>`).join('')}</div>`);
  },

  steps: () => {
    const items = [
      ['Decompose', 'Break the problem into requirements, data flows and service boundaries. I own the requirement breakdown and the sprint board.'],
      ['Prototype', 'Build a working POC quickly with Streamlit or React on FastAPI, using AI-assisted development to iterate faster.'],
      ['Orchestrate', 'Connect agents, tools, retrieval and document pipelines (LlamaParse, Docling) into one system.'],
      ['Govern', 'Add guardrails, tracing and monitoring from day one, then present results to stakeholders.'],
    ];
    return h(`<ol class="b-steps">${items.map(([t, d], i) => `<li><span>${String(i + 1).padStart(2, '0')}</span><div><b>${t}</b><p>${d}</p></div></li>`).join('')}</ol>`);
  },

  timeline: () => h(`
    <ol class="b-steps b-steps--time">
      <li><span>2024 – now</span><div><b>AI Solutions Consultant</b><p>Systems &amp; GenAI Applications. I architect and ship agentic assistants, voice agents and ML models for banks and insurers in India and abroad, and I manage the sprint board and the developers.</p></div></li>
      <li><span>2024</span><div><b>Business Analyst</b><p>Same organisation. I turned stakeholder needs into specifications, then moved into hands-on engineering.</p></div></li>
      <li><span>Education</span><div><b>B.Tech, Computer Science &amp; Engineering</b><p>G.H. Raisoni College of Engineering, Nagpur. CGPA 8.98.</p></div></li>
    </ol>`),

  contact: () => {
    const el = h(`
      <div class="b-contact">
        <a class="btn btn--primary" href="mailto:adityabshukla12@gmail.com">adityabshukla12@gmail.com</a>
        <button class="btn" type="button" data-copy>Copy email</button>
        <a class="btn" href="https://www.linkedin.com/in/aditya-shukla-2a86991b4/" target="_blank" rel="noopener">LinkedIn</a>
      </div>`);
    const copy = $('[data-copy]', el);
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText('adityabshukla12@gmail.com');
        copy.textContent = 'Copied';
      } catch {
        copy.textContent = 'adityabshukla12@gmail.com';
      }
      setTimeout(() => (copy.textContent = 'Copy email'), 2000);
    });
    return el;
  },

  chips: (b) => h(`<ul class="b-chips">${b.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`),
};

/* ---------------- Messages ---------------- */
function userMessage(text) {
  const el = h(`<div class="msg msg--user"><p></p></div>`);
  $('p', el).textContent = text;
  log.appendChild(el);
}

function botMessage() {
  const el = h(`
    <div class="msg msg--bot">
      <img class="msg__avatar" src="assets/img/aditya.webp" alt="" width="28" height="28">
      <div class="msg__body">
        <div class="status"><span class="status__spin"></span><span class="status__text"></span></div>
      </div>
    </div>`);
  log.appendChild(el);
  return el;
}

// Stream a paragraph word by word, keeping **bold** runs intact.
async function streamParagraph(container, text) {
  const p = document.createElement('p');
  container.appendChild(p);
  const parts = text.split(/(\*\*[^*]+\*\*)/).filter(Boolean);
  for (const part of parts) {
    const bold = part.startsWith('**');
    const target = bold ? p.appendChild(document.createElement('strong')) : p;
    const words = (bold ? part.slice(2, -2) : part).split(/(\s+)/);
    for (const w of words) {
      target.append(w);
      if (w.trim()) {
        toBottom();
        await wait(14);
      }
    }
  }
}

function chipsRow(ids, cls = 'suggest suggest--inline') {
  const row = h(`<div class="${cls}"></div>`);
  ids.filter((id) => TOPICS[id]).forEach((id) => {
    const b = h(`<button type="button" class="chip">${esc(TOPICS[id].q)}</button>`);
    b.addEventListener('click', () => ask(id));
    row.appendChild(b);
  });
  return row;
}

/* ---------------- Conversation ---------------- */
let busy = false;
let started = false;

async function ask(topicId, typed) {
  if (busy) return;
  const topic = TOPICS[topicId] || FALLBACK;
  const question = typed || topic.q;

  busy = true;
  send.disabled = true;
  if (!started) {
    started = true;
    document.body.classList.add('is-chatting');
  }
  // Earlier follow-up chips are stale once a new question is asked.
  log.querySelectorAll('.suggest--inline').forEach((n) => n.remove());

  userMessage(question);
  toBottom(true);
  stick = true;

  const msg = botMessage();
  const body = $('.msg__body', msg);
  const status = $('.status', msg);
  $('.status__text', msg).textContent = topic.status + '…';
  toBottom(true);

  if (gl) { orbChat(topic.shape); gl.set({ activity: 1 }); }
  await wait(650 + Math.random() * 350);
  status.classList.add('is-done');
  if (gl) gl.set({ activity: 0 });

  for (const para of topic.text) await streamParagraph(body, para);
  for (const b of topic.blocks) {
    const el = BLOCKS[b.type](b);
    el.classList.add('block');
    body.appendChild(el);
    toBottom();
    await wait(120);
  }
  if (topic.next?.length) {
    msg.after(chipsRow(topic.next));
  }
  toBottom();

  busy = false;
  send.disabled = !input.value.trim();
}

function reset() {
  if (busy) return;
  started = false;
  document.body.classList.remove('is-chatting');
  log.innerHTML = '';
  scroller.scrollTop = 0;
  orbWelcome();
}

/* ---------------- Wiring ---------------- */
$('[data-suggest]').appendChild(chipsRow(WELCOME, 'suggest__grid'));
$('[data-reset]').addEventListener('click', reset);

// Measure only once the chips are in, and again whenever the layout shifts
// (fonts loading, rotating a phone, resizing the window).
orbWelcome(true);
new ResizeObserver(() => { if (!started) orbWelcome(); }).observe($('.chat__inner'));
window.addEventListener('resize', () => { if (!started) orbWelcome(); });

input.addEventListener('input', () => { send.disabled = busy || !input.value.trim(); });
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text || busy) return;
  input.value = '';
  send.disabled = true;
  ask(route(text), text);
});

// Let people link straight to a topic, e.g. …/port/#banking
const fromHash = location.hash.slice(1);
if (TOPICS[fromHash]) ask(fromHash);
